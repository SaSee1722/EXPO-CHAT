import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { useAuth } from '@/template';

import { Profile, Call } from '@/types';
import { webrtcService } from '@/services/webrtcService';

interface CallOverlayProps {
    visible: boolean;
    call: Partial<Call>;
    otherProfile: Profile | null;
    isIncoming: boolean;
    onAccept: () => void;
    onReject: () => void;
    onEnd: () => void;
}

export function CallOverlay({
    visible,
    call,
    otherProfile,
    isIncoming,
    onAccept,
    onReject,
    onEnd
}: CallOverlayProps) {
    const { user } = useAuth();
    const [timer, setTimer] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(call.call_type === 'voice'); // Default speaker ON for voice
    const [permissionError, setPermissionError] = useState(false);

    const intervalRef = useRef<any>(null);
    const pulse = useSharedValue(1);

    // Effect for initializing WebRTC when call becomes active
    useEffect(() => {
        if (visible && call.status === 'active' && user?.id && call.match_id) {
            console.log(`[CallOverlay] Initializing WebRTC for ${call.call_type} call`);

            const startWebRTC = async () => {
                try {
                    if (call.call_type === 'voice') {
                        await webrtcService.toggleSoundOutput(true);
                    }

                    await webrtcService.initialize(user.id, call.match_id!, true, call.call_type === 'video');

                    webrtcService.setLocalStreamCallback((stream) => {
                        console.log('[CallOverlay] Received local stream');
                        setLocalStream(stream);
                        setPermissionError(false);
                        if (call.call_type === 'voice') {
                            webrtcService.toggleVideo(false);
                        }
                    });

                    webrtcService.setRemoteStreamCallback((stream) => {
                        console.log('[CallOverlay] Received remote stream');
                        setRemoteStream(stream);
                    });

                    if (user.id === call.caller_id) {
                        setTimeout(() => {
                            webrtcService.createOffer();
                        }, 2000);
                    }
                } catch (err) {
                    console.error('[CallOverlay] Handshake Error:', err);
                    setPermissionError(true);
                }
            };

            startWebRTC();
        }
    }, [visible, call.status, user?.id, call.match_id, call.caller_id, call.call_type]);

    // Separate effect for teardown
    useEffect(() => {
        if (!visible || call.status === 'ended' || call.status === 'rejected') {
            if (webrtcService.matchId) {
                console.log('[CallOverlay] Teardown triggered');
                webrtcService.cleanup('overlay_exit');
                setLocalStream(null);
                setRemoteStream(null);
            }
        }
    }, [visible, call.status]);

    // Timer logic
    useEffect(() => {
        if (visible && call.status === 'active') {
            intervalRef.current = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimer(0);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [visible, call.status]);

    // UI Pulse animation for 'calling' state
    useEffect(() => {
        if (visible && call.status === 'calling') {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            pulse.value = 1;
        }
    }, [visible, call.status, pulse]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: interpolate(pulse.value, [1, 1.2], [1, 0.6], Extrapolate.CLAMP)
    }));

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        webrtcService.toggleAudio(!newMuted);
    };

    const toggleCamera = () => {
        const newCameraOff = !isCameraOff;
        setIsCameraOff(newCameraOff);
        webrtcService.toggleVideo(!newCameraOff);
    };

    const toggleSpeaker = async () => {
        const newSpeakerOn = !isSpeakerOn;
        setIsSpeakerOn(newSpeakerOn);
        await webrtcService.toggleSoundOutput(newSpeakerOn);
    };

    if (!visible) return null;

    const photoUrl = otherProfile?.photos?.[0] || 'https://via.placeholder.com/150';
    const showVideo = call.call_type === 'video' && call.status === 'active';

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.container}>
                {showVideo ? (
                    <RTCView
                        streamURL={remoteStream?.toURL() || localStream?.toURL()}
                        style={StyleSheet.absoluteFillObject}
                        objectFit="cover"
                        zOrder={0}
                    />
                ) : (
                    <>
                        <Image source={{ uri: photoUrl }} style={styles.bgImage} />
                        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

                        {/* Always render an RTCView for audio calls to ensure sound output on all platforms */}
                        {remoteStream && (
                            <RTCView
                                streamURL={remoteStream.toURL()}
                                style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                                zOrder={-1}
                            />
                        )}
                    </>
                )}

                {showVideo && localStream && !isCameraOff && remoteStream && (
                    <View style={styles.localVideoWrapper}>
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.localVideo}
                            objectFit="cover"
                            zOrder={1}
                        />
                    </View>
                )}

                <View style={[styles.content, showVideo && styles.contentVideoMode]}>
                    <View style={styles.topSection}>
                        {!showVideo && (
                            <View style={styles.avatarWrapper}>
                                {call.status === 'calling' && (
                                    <Animated.View style={[styles.pulseCircle, pulseStyle]} />
                                )}
                                <Image source={{ uri: photoUrl }} style={styles.avatar} />
                            </View>
                        )}
                        <Text style={styles.name}>{otherProfile?.display_name || 'Gossip User'}</Text>
                        <Text style={styles.status}>
                            {call.status === 'active' ? formatTime(timer) :
                                call.status === 'calling' ? (isIncoming ? `Incoming ${call.call_type === 'video' ? 'Video' : 'Voice'} Call...` : 'Calling...') :
                                    call.status}
                        </Text>
                        <Text style={styles.connectionStatus}>
                            {webrtcService.peerConnection?.connectionState === 'connected' ? '• Secure Connection' :
                                webrtcService.peerConnection?.connectionState === 'connecting' ? 'Optimizing Signal...' :
                                    webrtcService.peerConnection?.connectionState === 'failed' ? 'Connection Unstable - Retrying...' : ''}
                        </Text>

                        {permissionError && (
                            <TouchableOpacity
                                style={styles.permissionWarning}
                                onPress={() => {
                                    setPermissionError(false);
                                    if (user?.id && call.match_id) {
                                        webrtcService.initialize(user.id, call.match_id, true);
                                    }
                                }}
                            >
                                <Ionicons name="warning" size={20} color="#FFD700" />
                                <Text style={styles.permissionText}>Microphone Access Required</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.bottomSection}>
                        {(call.status === 'calling' && isIncoming) ? (
                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={onReject} style={[styles.iconBtn, styles.rejectBtn]}>
                                    <Ionicons name="close" size={32} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onAccept} style={[styles.iconBtn, styles.acceptBtn]}>
                                    <Ionicons name="call" size={32} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (call.status === 'active' || (call.status === 'calling' && !isIncoming)) ? (
                            <View style={[styles.activeActions, showVideo && styles.activeActionsVideo]}>
                                <View style={styles.activeRow}>
                                    <TouchableOpacity onPress={toggleMute} style={[styles.midBtn, isMuted && styles.activeStateBtn]}>
                                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#FFF" />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={onEnd} style={[styles.iconBtn, styles.rejectBtn, styles.largeBtn]}>
                                        <Ionicons name="call-outline" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={toggleSpeaker} style={[styles.midBtn, isSpeakerOn && styles.activeStateBtn]}>
                                        <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                {call.call_type === 'video' && (
                                    <TouchableOpacity onPress={toggleCamera} style={[styles.cameraToggle, isCameraOff && styles.activeStateBtn]}>
                                        <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={20} color="#FFF" />
                                        <Text style={styles.cameraText}>{isCameraOff ? "Camera Off" : "Camera On"}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
    content: { flex: 1, justifyContent: 'space-between', paddingVertical: 100, alignItems: 'center' },
    contentVideoMode: { justifyContent: 'flex-end', paddingVertical: 50 },
    topSection: { alignItems: 'center' },
    avatarWrapper: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#87CEEB' },
    pulseCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#87CEEB' },
    name: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
    status: { fontSize: 18, color: '#87CEEB', fontWeight: '600', letterSpacing: 1 },
    bottomSection: { width: '100%', paddingHorizontal: 40 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    activeActions: { alignItems: 'center', gap: 30 },
    activeActionsVideo: { marginBottom: 20 },
    activeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
    iconBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#FF4458' },
    largeBtn: { width: 84, height: 84, borderRadius: 42 },
    midBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    activeStateBtn: { backgroundColor: '#FF4458' },
    cameraToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
    cameraText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    localVideoWrapper: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF', zIndex: 10 },
    localVideo: { width: '100%', height: '100%' },
    permissionWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 68, 88, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 6 },
    permissionText: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
    connectionStatus: { color: '#87CEEB', fontSize: 12, marginTop: 4, opacity: 0.8, fontWeight: '500' },
});
