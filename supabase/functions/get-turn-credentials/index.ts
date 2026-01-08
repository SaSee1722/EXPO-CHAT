import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

serve(async (req) => {
    try {
        // Verify user is authenticated
        const authHeader = req.headers.get('Authorization')!
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Generate TURN credentials using Twilio API
        const ttl = 86400 // 24 hours
        const username = `${Math.floor(Date.now() / 1000) + ttl}:${user.id}`

        // Create HMAC-SHA1 signature
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(TWILIO_AUTH_TOKEN),
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        )

        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(username)
        )

        const credential = btoa(String.fromCharCode(...new Uint8Array(signature)))

        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
                urls: 'turn:global.turn.twilio.com:3478?transport=udp',
                username: username,
                credential: credential
            },
            {
                urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
                username: username,
                credential: credential
            },
            {
                urls: 'turn:global.turn.twilio.com:443?transport=tcp',
                username: username,
                credential: credential
            }
        ]

        return new Response(JSON.stringify({ iceServers }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
