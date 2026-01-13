// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log('[Push Notification] Full Payload received:', JSON.stringify(payload));

        // Supabase Webhooks can wrap the record in different ways depending on configuration
        const record = payload.record || payload.new || payload;
        const table = payload.table || (record.match_id && !record.caller_id ? 'messages' : 'calls');
        const type = payload.type || 'INSERT';

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Determine Sender and Receiver
        const isCall = table === 'calls' || !!record.caller_id;
        const senderId = isCall ? record.caller_id : record.sender_id;
        const matchId = record.match_id;
        let receiverId = isCall ? record.receiver_id : null;

        if (!isCall && matchId) {
            const { data: match } = await supabase
                .from('matches')
                .select('user1_id, user2_id')
                .eq('id', matchId)
                .single()

            if (match) {
                receiverId = match.user1_id === senderId ? match.user2_id : match.user1_id
            }
        }

        console.log(`[Push Notification] Processing: Table=${table}, Sender=${senderId}, Receiver=${receiverId}`);

        if (!receiverId) {
            console.warn('[Push Notification] ⚠️ No receiver identified.');
            return new Response(JSON.stringify({ error: 'No receiver' }), { status: 200 });
        }

        // 2. Get Receiver Token
        const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('push_token, display_name')
            .eq('id', receiverId)
            .single()

        if (!receiverProfile?.push_token) {
            console.log(`[Push Notification] ⚠️ No push token found for user ${receiverId}`);
            return new Response(JSON.stringify({ message: 'No push token' }), { status: 200 })
        }

        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', senderId)
            .single()

        const senderName = senderProfile?.display_name || 'Someone'

        // 3. Get Unread Count for badge
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .neq('sender_id', receiverId)
            .neq('status', 'read');

        // 4. Construct and Send to Expo
        const unreadTotal = (count || 0) + 1;
        const bodyText = isCall
            ? 'Incoming call...'
            : `${unreadTotal} new message${unreadTotal > 1 ? 's' : ''}`;

        const expoPayload = {
            to: receiverProfile.push_token,
            sound: 'default',
            title: senderName,
            body: bodyText,
            badge: (count || 0) + 1,
            priority: 'high',
            data: {
                matchId,
                type: isCall ? 'call' : 'message',
                callId: isCall ? record.id : null,
                senderName: senderName
            }
        }

        console.log(`[Push Notification] 📤 Sending to Expo: ${receiverProfile.push_token}`);

        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expoPayload),
        })

        const responseData = await res.json();
        console.log('[Push Notification] Expo result:', JSON.stringify(responseData));

        // 5. Update status to delivered if successful
        const expoStatus = responseData?.data?.[0]?.status || responseData?.data?.status;
        if (!isCall && record.id && expoStatus === 'ok') {
            await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('id', record.id);
            console.log(`[Push Notification] ✅ Message ${record.id} status set to delivered`);
        }

        return new Response(JSON.stringify(responseData), { status: 200 })
    } catch (err) {
        console.error('[Push Notification] ❌ Fatal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
