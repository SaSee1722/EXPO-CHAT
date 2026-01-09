import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} from 'react-native-webrtc';
import { Audio } from 'expo-av';
import { Platform, PermissionsAndroid } from 'react-native';
import { getSupabaseClient } from '@/template';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Device from 'expo-device';

const configuration = {
    iceServers: [
        // Twilio STUN (free, no credentials needed)
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        // Free TURN fallback
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
    ],
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
};

type SignalingEvent =
    | { type: 'offer'; payload: RTCSessionDescription }
    | { type: 'answer'; payload: RTCSessionDescription }
    | { type: 'candidate'; payload: RTCIceCandidate }
    | { type: 'ready' }
    | { type: 'bye' };

class WebRTCService {
    peerConnection: RTCPeerConnection | null = null;
    localStream: MediaStream | undefined;
    remoteStream: MediaStream | undefined;
    channel: RealtimeChannel | null = null;
    userId: string | null = null;
    matchId: string | null = null;
    remoteCandidates: RTCIceCandidate[] = [];
    isRemoteDescriptionSet = false;

    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onLocalStream: ((stream: MediaStream) => void) | null = null;
    onConnectionStateChange: ((state: string) => void) | null = null;
    public onIncomingCall: ((payload: any) => void) | null = null;
    public onCallAccepted: (() => void) | null = null;

    setRemoteStreamCallback(callback: (stream: MediaStream) => void) {
        this.onRemoteStream = callback;
        if (this.remoteStream) callback(this.remoteStream);
    }

    setLocalStreamCallback(callback: (stream: MediaStream) => void) {
        this.onLocalStream = callback;
        if (this.localStream) callback(this.localStream);
    }

    setConnectionStateChangeCallback(callback: (state: string) => void) {
        this.onConnectionStateChange = callback;
        if (this.peerConnection) callback(this.peerConnection.connectionState);
    }

    async initialize(userId: string, matchId: string, shouldAcquireMedia = false, isVideo = true) {
        console.log(`[WebRTC] Initialize: ${userId} in ${matchId}`);

        if (this.channel && this.matchId === matchId) {
            console.log('[WebRTC] Already initialized for this match');
            if (shouldAcquireMedia && !this.localStream) {
                await this.startLocalStream(isVideo);
            }
            return;
        }

        if (this.channel && this.matchId !== matchId) {
            console.log('[WebRTC] Cleaning up previous match');
            this.cleanup('new_match');
        }

        this.userId = userId;
        this.matchId = matchId;
        this.isRemoteDescriptionSet = false;
        this.remoteCandidates = [];

        // Configure audio for calls
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                playThroughEarpieceAndroid: false,
                shouldDuckAndroid: true,
                interruptionModeIOS: 1,
                interruptionModeAndroid: 1,
            });
            console.log('[WebRTC] Audio mode configured');
        } catch (e) {
            console.error('[WebRTC] Audio setup error:', e);
        }

        // Fetch fresh Twilio TURN credentials
        await this.updateTwilioCredentials();

        this.setupSignaling(matchId);
        this.createPeerConnection();

        if (shouldAcquireMedia) {
            await this.startLocalStream(isVideo);
        }
    }

    async updateTwilioCredentials() {
        try {
            console.log('[WebRTC] Fetching Twilio TURN credentials...');
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.functions.invoke('get-turn-credentials');

            if (error) {
                console.warn('[WebRTC] Failed to fetch Twilio credentials:', error);
                return;
            }

            if (data?.iceServers) {
                (configuration as any).iceServers = data.iceServers;
                console.log('[WebRTC] ✅ Using Twilio TURN servers');
            }
        } catch (e) {
            console.warn('[WebRTC] Twilio credential fetch error, using fallback:', e);
        }
    }

    setupSignaling(matchId: string) {
        const supabase = getSupabaseClient();
        if (this.channel) this.channel.unsubscribe();

        console.log(`[WebRTC] Setting up signaling for ${matchId}`);
        this.channel = supabase.channel(`signaling:${matchId}`);

        this.channel
            .on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => {
                if (payload.userId === this.userId) return;
                this.handleSignalingMessage(payload.message, payload.userId);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[WebRTC] Signaling channel ready');
                    this.sendSignal({ type: 'ready' });
                }
            });
    }

    async startLocalStream(isVideo = true) {
        if (this.localStream) {
            console.log('[WebRTC] Local stream already exists');
            return;
        }

        try {
            console.log('[WebRTC] Requesting media permissions...');

            // Request permissions
            if (Platform.OS === 'android') {
                const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
                if (isVideo) permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
                await PermissionsAndroid.requestMultiple(permissions);
            } else {
                await Audio.requestPermissionsAsync();
            }

            const isSimulator = !Device.isDevice && Platform.OS === 'ios';
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: isVideo ? {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 },
                    facingMode: 'user'
                } : false,
            };

            let stream;
            try {
                stream = (await mediaDevices.getUserMedia(constraints as any)) as MediaStream;
                console.log('[WebRTC] Media acquired successfully');
            } catch (err) {
                if (isSimulator && isVideo) {
                    console.log('[WebRTC] Video failed on simulator, trying audio only');
                    stream = (await mediaDevices.getUserMedia({ audio: true, video: false })) as MediaStream;
                } else {
                    throw err;
                }
            }

            this.localStream = stream;

            // Enable all tracks
            stream.getTracks().forEach(track => {
                track.enabled = true;
                console.log(`[WebRTC] Local ${track.kind} track enabled`);
            });

            if (this.onLocalStream) this.onLocalStream(stream);

            // Add tracks to peer connection if it exists
            if (this.peerConnection) {
                console.log('[WebRTC] Adding local tracks to peer connection');
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection?.addTrack(track, this.localStream!);
                });
            }
        } catch (error) {
            console.error('[WebRTC] Media acquisition error:', error);
            throw error;
        }
    }

    createPeerConnection() {
        if (this.peerConnection) {
            console.log('[WebRTC] Peer connection already exists');
            return;
        }

        console.log('[WebRTC] Creating peer connection');
        this.peerConnection = new RTCPeerConnection(configuration);

        // ICE candidate handler
        (this.peerConnection as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                console.log('[WebRTC] Sending ICE candidate');
                this.sendSignal({ type: 'candidate', payload: event.candidate });
            }
        };

        // Track handler
        (this.peerConnection as any).ontrack = (event: any) => {
            console.log(`[WebRTC] Remote track received: ${event.track?.kind}`);
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                console.log('[WebRTC] Remote stream set');

                // Force enable all remote tracks
                event.streams[0].getTracks().forEach((track: any) => {
                    track.enabled = true;
                    console.log(`[WebRTC] Remote ${track.kind} track enabled`);
                });

                if (this.onRemoteStream && this.remoteStream) this.onRemoteStream(this.remoteStream);
            }
        };

        // Connection state handler
        (this.peerConnection as any).onconnectionstatechange = () => {
            if (!this.peerConnection) return;
            const state = this.peerConnection.connectionState;
            console.log(`[WebRTC] Connection state: ${state}`);
            if (this.onConnectionStateChange) this.onConnectionStateChange(state);
        };

        // ICE connection state handler
        (this.peerConnection as any).oniceconnectionstatechange = () => {
            if (!this.peerConnection) return;
            const state = this.peerConnection.iceConnectionState;
            console.log(`[WebRTC] ICE connection state: ${state}`);
        };

        // ICE gathering state handler
        (this.peerConnection as any).onicegatheringstatechange = () => {
            if (!this.peerConnection) return;
            const state = this.peerConnection.iceGatheringState;
            console.log(`[WebRTC] ICE gathering state: ${state}`);
        };

        // Add local tracks if they exist
        if (this.localStream) {
            console.log('[WebRTC] Adding existing local tracks');
            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });
        }
    }

    async handleSignalingMessage(message: any, userId?: string) {
        console.log(`[WebRTC] Received signal: ${message.type}`);

        if (message.type === 'call_start') {
            if (this.onIncomingCall) this.onIncomingCall(message.payload);
            return;
        }

        if (message.type === 'call_accepted') {
            if (this.onCallAccepted) this.onCallAccepted();
            return;
        }

        if (!this.peerConnection) this.createPeerConnection();
        const pc = this.peerConnection!;

        try {
            switch (message.type) {
                case 'ready':
                    console.log('[WebRTC] Remote peer ready');
                    break;

                case 'offer':
                    console.log('[WebRTC] Processing offer');
                    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    this.sendSignal({ type: 'answer', payload: answer });

                    this.isRemoteDescriptionSet = true;

                    // Add buffered candidates
                    if (this.remoteCandidates.length > 0) {
                        console.log(`[WebRTC] Adding ${this.remoteCandidates.length} buffered candidates`);
                        for (const cand of this.remoteCandidates) {
                            await pc.addIceCandidate(cand).catch(e => console.warn('[WebRTC] Candidate error:', e));
                        }
                        this.remoteCandidates = [];
                    }
                    break;

                case 'answer':
                    console.log('[WebRTC] Processing answer');
                    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
                    this.isRemoteDescriptionSet = true;

                    // Add buffered candidates
                    if (this.remoteCandidates.length > 0) {
                        console.log(`[WebRTC] Adding ${this.remoteCandidates.length} buffered candidates`);
                        for (const cand of this.remoteCandidates) {
                            await pc.addIceCandidate(cand).catch(e => console.warn('[WebRTC] Candidate error:', e));
                        }
                        this.remoteCandidates = [];
                    }
                    break;

                case 'candidate':
                    const candidate = new RTCIceCandidate(message.payload);
                    if (this.isRemoteDescriptionSet) {
                        await pc.addIceCandidate(candidate).catch(e => console.warn('[WebRTC] Candidate error:', e));
                    } else {
                        console.log('[WebRTC] Buffering candidate');
                        this.remoteCandidates.push(candidate);
                    }
                    break;

                case 'bye':
                    console.log('[WebRTC] Remote peer ended call');
                    this.cleanup('remote_bye');
                    break;
            }
        } catch (e) {
            console.error(`[WebRTC] Error handling ${message.type}:`, e);
        }
    }

    async createOffer() {
        if (!this.peerConnection) {
            console.warn('[WebRTC] No peer connection');
            return;
        }

        try {
            console.log('[WebRTC] Creating offer');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(offer);
            this.sendSignal({ type: 'offer', payload: offer });
            console.log('[WebRTC] Offer sent');
        } catch (e) {
            console.error('[WebRTC] Create offer error:', e);
        }
    }

    sendSignal(message: SignalingEvent) {
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { userId: this.userId, message },
            });
        }
    }

    notifyCallStarted(payload: any) {
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { userId: this.userId, message: { type: 'call_start', payload } },
            });
        }
    }

    notifyCallAccepted() {
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { userId: this.userId, message: { type: 'call_accepted' } },
            });
        }
    }

    toggleAudio(isEnabled: boolean) {
        this.localStream?.getAudioTracks().forEach(track => {
            track.enabled = isEnabled;
            console.log(`[WebRTC] Audio ${isEnabled ? 'enabled' : 'disabled'}`);
        });
    }

    toggleVideo(isEnabled: boolean) {
        this.localStream?.getVideoTracks().forEach(track => {
            track.enabled = isEnabled;
            console.log(`[WebRTC] Video ${isEnabled ? 'enabled' : 'disabled'}`);
        });
    }

    switchCamera() {
        this.localStream?.getVideoTracks().forEach(track => {
            if ((track as any)._switchCamera) {
                (track as any)._switchCamera();
            }
        });
    }

    cleanup(reason?: string) {
        console.log(`[WebRTC] Cleanup: ${reason || 'unknown'}`);

        if (reason !== 'remote_bye' && this.channel) {
            this.sendSignal({ type: 'bye' });
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream.release();
            this.localStream = undefined;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }

        this.remoteStream = undefined;
        this.isRemoteDescriptionSet = false;
        this.remoteCandidates = [];
        this.userId = null;
        this.matchId = null;
    }

    async toggleSoundOutput(isSpeaker: boolean) {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                playThroughEarpieceAndroid: !isSpeaker,
                interruptionModeIOS: 1,
                interruptionModeAndroid: 1,
            });
            console.log(`[WebRTC] Speaker ${isSpeaker ? 'ON' : 'OFF'}`);
        } catch (e) {
            console.error('[WebRTC] Speaker toggle error:', e);
        }
    }
}

export const webrtcService = new WebRTCService();
