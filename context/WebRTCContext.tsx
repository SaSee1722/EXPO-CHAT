import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/template';
import { webrtcService } from '@/services/webrtcService';
import { matchService } from '@/services/matchService';

interface WebRTCContextType {
    isInitialized: boolean;
}

const WebRTCContext = createContext<WebRTCContextType>({ isInitialized: false });

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
    const { user, initialized: authInitialized } = useAuth();
    const [isInitialized, setIsInitialized] = useState(false);
    const channelRef = React.useRef<any>(null);

    useEffect(() => {
        if (!user || !authInitialized) {
            setIsInitialized(false);
            return;
        }

        // Initialize WebRTC globally for incoming calls
        const initWebRTC = async () => {
            try {
                console.log('[WebRTCProvider] Initializing global WebRTC for user:', user.id);

                // Clean up any existing channel first
                const client = matchService.getSupabaseClient();
                const channelName = `calls:${user.id}`;

                // Thoroughly clean up any existing channels with this name or ref
                const existingChannels = client.getChannels().filter(ch => ch.topic === `realtime:${channelName}`);
                if (channelRef.current) existingChannels.push(channelRef.current);

                for (const ch of existingChannels) {
                    try {
                        await client.removeChannel(ch);
                    } catch (err) {
                        console.log('[WebRTCProvider] Error removing channel:', err);
                    }
                }
                channelRef.current = null;

                // Subscribe to incoming calls
                const callChannel = client.channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'calls',
                            filter: `receiver_id=eq.${user.id}`,
                        },
                        async (payload) => {
                            const call = payload.new as any;
                            console.log('[WebRTCProvider] 📞 Incoming call detected:', call.id);

                            // Initialize WebRTC for this specific call
                            await webrtcService.initialize(
                                user.id,
                                call.match_id,
                                true, // isReceiver
                                call.call_type === 'video'
                            );
                        }
                    );

                // Subscribe
                callChannel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[WebRTCProvider] ✅ Global WebRTC subscribed: ${channelName}`);
                        setIsInitialized(true);
                    }
                });

                channelRef.current = callChannel;
                console.log('[WebRTCProvider] ✅ Global WebRTC initialized');
            } catch (error) {
                console.error('[WebRTCProvider] Failed to initialize WebRTC:', error);
                setIsInitialized(false);
            }
        };

        initWebRTC();

        // Cleanup function
        return () => {
            console.log('[WebRTCProvider] Cleaning up WebRTC');
            if (channelRef.current) {
                const supabase = matchService.getSupabaseClient();
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            webrtcService.cleanup();
            setIsInitialized(false);
        };
    }, [user?.id, authInitialized]);

    return (
        <WebRTCContext.Provider value={{ isInitialized }}>
            {children}
        </WebRTCContext.Provider>
    );
}

export function useWebRTC() {
    const context = useContext(WebRTCContext);
    if (context === undefined) {
        throw new Error('useWebRTC must be used within a WebRTCProvider');
    }
    return context;
}
