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
import { LinearGradient } from 'expo-linear-gradient';

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
                        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                        />

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

                {showVideo && localStream && !isCameraOff && (
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
                                    <>
                                        <Animated.View style={[styles.pulseCircle, pulseStyle, { opacity: 0.15 }]} />
                                        <Animated.View style={[styles.pulseCircle, pulseStyle, { width: 190, height: 190, opacity: 0.1 }]} />
                                    </>
                                )}
                                <View style={styles.avatarGlow}>
                                    <Image source={{ uri: photoUrl }} style={styles.avatar} />
                                </View>
                            </View>
                        )}
                        <Text style={styles.name}>{otherProfile?.display_name || 'Gossip User'}</Text>
                        <View style={styles.statusContainer}>
                            <Text style={styles.status}>
                                {call.status === 'active' ? formatTime(timer) :
                                    call.status === 'calling' ? (isIncoming ? `INCOMING ${call.call_type?.toUpperCase()}` : 'CALLING...') :
                                        call.status?.toUpperCase()}
                            </Text>
                            {call.status === 'active' && (
                                <View style={styles.secureBadge}>
                                    <Ionicons name="shield-checkmark" size={12} color="#87CEEB" />
                                    <Text style={styles.secureText}>SECURE</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.connectionStatus}>
                            {webrtcService.peerConnection?.connectionState === 'connected' ? '• Signal Optimized' :
                                webrtcService.peerConnection?.connectionState === 'connecting' ? 'Establishing Line...' :
                                    webrtcService.peerConnection?.connectionState === 'failed' ? 'Retrying Connection...' : ''}
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
                                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                    <Ionicons name="close" size={36} color="#FFF" />
                                    <Text style={styles.btnLabel}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onAccept} style={[styles.iconBtn, styles.acceptBtn]}>
                                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                    <Ionicons name="call" size={32} color="#FFF" />
                                    <Text style={styles.btnLabel}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (call.status === 'active' || (call.status === 'calling' && !isIncoming)) ? (
                            <View style={[styles.activeActions, showVideo && styles.activeActionsVideo]}>
                                <View style={styles.activeRow}>
                                    <TouchableOpacity
                                        onPress={toggleMute}
                                        style={[styles.midBtn, isMuted && styles.activeStateBtn]}
                                        activeOpacity={0.8}
                                    >
                                        <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
                                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#FFF" />
                                        <Text style={styles.miniLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={onEnd}
                                        style={[styles.iconBtn, styles.rejectBtn, styles.largeBtn]}
                                        activeOpacity={0.9}
                                    >
                                        <Ionicons name="call" size={36} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={toggleSpeaker}
                                        style={[styles.midBtn, isSpeakerOn && styles.activeStateBtn]}
                                        activeOpacity={0.8}
                                    >
                                        <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
                                        <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={26} color="#FFF" />
                                        <Text style={styles.miniLabel}>Speaker</Text>
                                    </TouchableOpacity>
                                </View>
                                {call.call_type === 'video' && (
                                    <View style={styles.videoControlsRow}>
                                        <TouchableOpacity
                                            onPress={toggleCamera}
                                            style={[styles.cameraToggle, isCameraOff && styles.activeStateBtn]}
                                            activeOpacity={0.8}
                                        >
                                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                            <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={20} color="#FFF" />
                                            <Text style={styles.cameraText}>{isCameraOff ? "Video Off" : "Video On"}</Text>
                                        </TouchableOpacity>

                                        {!isCameraOff && (
                                            <TouchableOpacity
                                                onPress={() => webrtcService.switchCamera()}
                                                style={styles.switchCamBtn}
                                                activeOpacity={0.8}
                                            >
                                                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                                <Ionicons name="camera-reverse" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
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
    bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
    content: { flex: 1, justifyContent: 'space-between', paddingVertical: 100, alignItems: 'center' },
    contentVideoMode: { justifyContent: 'flex-end', paddingVertical: 50 },
    topSection: { alignItems: 'center' },
    avatarWrapper: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    avatarGlow: {
        width: 154,
        height: 154,
        borderRadius: 77,
        backgroundColor: 'rgba(135, 206, 235, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#87CEEB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#FFF' },
    pulseCircle: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: '#87CEEB' },
    name: { fontSize: 36, fontWeight: '900', color: '#FFF', marginBottom: 8, letterSpacing: -0.5 },
    statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    status: { fontSize: 16, color: '#87CEEB', fontWeight: '800', letterSpacing: 2 },
    secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(135, 206, 235, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    secureText: { fontSize: 10, color: '#87CEEB', fontWeight: '900', letterSpacing: 1 },
    bottomSection: { width: '100%', paddingHorizontal: 30 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    activeActions: { alignItems: 'center', gap: 40 },
    activeActionsVideo: { marginBottom: 30 },
    activeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
    iconBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    btnLabel: { position: 'absolute', bottom: -25, color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    acceptBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#FF4458' },
    largeBtn: { width: 88, height: 88, borderRadius: 44, shadowColor: '#FF4458', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
    midBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    activeStateBtn: { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderColor: '#FFF' },
    miniLabel: { fontSize: 10, color: '#FFF', fontWeight: '700', marginTop: 4, opacity: 0.8 },
    cameraToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    cameraText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
    videoControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    switchCamBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    localVideoWrapper: { position: 'absolute', top: 50, right: 20, width: 110, height: 165, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10 },
    localVideo: { width: '100%', height: '100%' },
    permissionWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 68, 88, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 6 },
    permissionText: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
    connectionStatus: { color: '#87CEEB', fontSize: 13, marginTop: 4, opacity: 0.7, fontWeight: '600', letterSpacing: 0.5 },
});
