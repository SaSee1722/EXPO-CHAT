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

    // 3. Get Receiver's Total Unread Count across ALL their matches
    const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${receiverId},user2_id.eq.${receiverId}`);

    const matchIds = matches?.map(m => m.id) || [];

    const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .neq('sender_id', receiverId)
        .neq('status', 'read');

    const totalUnread = (unreadCount || 0) + 1;

    const senderPhoto = senderProfile?.photos?.[0] || null;

    // 4. Construct Notification Payload
    const title = senderName;
    let body = '1 new message';

    if (isCall) {
        body = record.call_type === 'video' ? 'Incoming Video Call...' : 'Incoming Voice Call...';
    } else {
        // WhatsApp style privacy: "3 new messages"
        body = totalUnread > 1 ? `${totalUnread} new messages` : '1 new message';
    }

    const payload = {
        to: receiverProfile.push_token,
        sound: 'default',
        title: title,
        body: body,
        priority: 'high',
        channelId: isCall ? 'calls' : 'default',
        badge: totalUnread,
        data: {
            matchId: matchId,
            senderId: senderId,
            senderName: senderName,
            senderAvatar: senderPhoto,
            type: isCall ? 'call' : 'message',
            callId: isCall ? record.id : null,
            callType: isCall ? record.call_type : null
        },
        mutableContent: true,
    }

    // 5. Send to Expo Push Service
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

    return new Response(
        JSON.stringify(responseData),
        { headers: { "Content-Type": "application/json" } },
    )
})
