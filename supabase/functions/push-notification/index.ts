// @ts-nocheck
// Follow this setup guide to integrate the function with your Supabase project:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const { record, table } = await req.json()

    // table can be 'messages' or 'calls' depending on webhook setup
    const isCall = table === 'calls' || !!record.caller_id;

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Determine Sender and Receiver
    const senderId = isCall ? record.caller_id : record.sender_id;
    let receiverId = isCall ? record.receiver_id : null;
    const matchId = record.match_id;

    if (!isCall) {
        // Get match details to find the receiver for messages
        const { data: match } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .eq('id', matchId)
            .single()

        if (match) {
            receiverId = match.user1_id === senderId ? match.user2_id : match.user1_id
        }
    }

    if (!receiverId) {
        return new Response(JSON.stringify({ error: 'Receiver not found' }), { status: 404 })
    }

    // 2. Get Profiles
    const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', receiverId)
        .single()

    if (!receiverProfile?.push_token) {
        return new Response(JSON.stringify({ message: 'No push token for receiver' }), { status: 200 })
    }

    const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', senderId)
        .single()

    const senderName = senderProfile?.display_name || 'Gossip User'

    // 3. Construct Notification Payload
    let title = senderName;
    let body = record.content || '';

    if (isCall) {
        title = `📞 ${senderName}`;
        body = record.call_type === 'video' ? 'Incoming Video Call...' : 'Incoming Voice Call...';
    } else {
        body = record.type === 'image' ? '📷 Photo' :
            record.type === 'audio' ? '🎵 Audio Message' :
                record.type === 'video' ? '🎥 Video' :
                    record.content;
    }

    const payload = {
        to: receiverProfile.push_token,
        sound: 'default',
        title: title,
        body: body,
        priority: isCall ? 'high' : 'normal',
        channelId: isCall ? 'calls' : 'default',
        data: {
            matchId: matchId,
            senderId: senderId,
            senderName: senderName,
            type: isCall ? 'call' : 'message',
            callId: isCall ? record.id : null,
            callType: isCall ? record.call_type : null
        },
        badge: 1,
    }

    // 4. Send to Expo Push Service
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const responseData = await res.json();

    // 5. If it's a message and notification was accepted, mark as 'delivered' in DB
    // Note: Expo returns 200 even if some tokens fail, but 'data' array contains status.
    // We'll optimistically mark as delivered if the fetch succeeded and it's a message.
    if (!isCall && res.ok) {
        await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .eq('id', record.id)
            .eq('status', 'sent'); // Only move from sent -> delivered
    }

    return new Response(
        JSON.stringify(responseData),
        { headers: { "Content-Type": "application/json" } },
    )
})
