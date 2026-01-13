// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const payload = await req.json()
        const { record, table, type } = payload

        console.log(`[Push Notification] Incoming webhook: ${table} ${type}`);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Determine Sender and Receiver
        const isCall = table === 'calls' || !!record.caller_id;
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
            console.error('[Push Notification] Receiver ID not found');
            return new Response(JSON.stringify({ error: 'Receiver not found' }), { status: 200 })
        }

        // 2. Get Profiles
        const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', receiverId)
            .single()

        if (!receiverProfile?.push_token) {
            console.log(`[Push Notification] No token for receiver ${receiverId}`);
            return new Response(JSON.stringify({ message: 'No push token for receiver' }), { status: 200 })
        }

        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, photos')
            .eq('id', senderId)
            .single()

        const senderName = senderProfile?.display_name || 'Someone'
        const senderPhoto = senderProfile?.photos?.[0] || null;

        // 3. Get Receiver's Total Unread Count
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

        const totalUnread = (unreadCount || 0);

        // 4. Construct Notification Payload
        let title = senderName;
        let body = '';

        if (isCall) {
            title = 'Incoming Call';
            body = `${senderName} is calling you...`;
        } else {
            // Show content if possible, or fallback
            if (record.type === 'text') {
                body = record.content;
            } else if (record.type === 'image') {
                body = '📷 Photo';
            } else if (record.type === 'video') {
                body = '🎥 Video';
            } else if (record.type === 'audio') {
                body = '🎵 Voice message';
            } else {
                body = 'New message received';
            }
        }

        const expoPayload = {
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

        console.log(`[Push Notification] Sending to ${receiverProfile.push_token}`);

        // 5. Send to Expo Push Service
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(expoPayload),
        })

        const responseData = await res.json();
        console.log('[Push Notification] Expo result:', responseData);

        return new Response(
            JSON.stringify(responseData),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (err) {
        console.error('[Push Notification] Internal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
