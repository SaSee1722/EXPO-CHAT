import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Modal,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WhatsAppVoiceNoteProps {
    onRecordingComplete: (uri: string, duration: number) => void;
    onCancel: () => void;
    onRecordingStart?: () => void;
}

export default function WhatsAppVoiceNote({ onRecordingComplete, onCancel, onRecordingStart }: WhatsAppVoiceNoteProps) {
    const insets = useSafeAreaInsets();
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [uri, setUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [isInitializing, setIsInitializing] = useState(false);

    const waveAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    // Trigger slide animation when recording or previewing starts/stops
    useEffect(() => {
        if (isRecording || uri) {
            Animated.spring(slideAnim, {
                toValue: -(insets.bottom + 85),
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [isRecording, uri, insets.bottom]);

    useEffect(() => {
        return () => {
            const cleanup = async () => {
                try {
                    if (recording) {
                        await recording.stopAndUnloadAsync();
                    }
                    if (sound) {
                        await sound.unloadAsync();
                    }
                } catch (error) {
                    console.log('[WhatsAppVoiceNote] Cleanup error:', error);
                }
            };
            cleanup();
        };
    }, [recording, sound]);

    const startWave = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(waveAnim, {
                    toValue: 1.5,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(waveAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const onRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
        if (status.durationMillis) {
            setTime(Math.floor(status.durationMillis / 1000));
        }
    };

    const startRecording = async () => {
        if (isInitializing) return;

        try {
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                onCancel();
                return;
            }

            setIsInitializing(true);

            if (recording) {
                try { await recording.stopAndUnloadAsync(); } catch { }
                setRecording(null);
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                interruptionModeIOS: 1,
                interruptionModeAndroid: 1,
            });

            const newRecording = new Audio.Recording();
            newRecording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);
            newRecording.setProgressUpdateInterval(200);

            await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await newRecording.startAsync();

            setRecording(newRecording);
            setIsRecording(true);
            setTime(0);
            startWave();
            if (onRecordingStart) onRecordingStart();
        } catch (err) {
            console.log("[WhatsAppVoiceNote] ❌ Recording error:", err);
            onCancel();
        } finally {
            setIsInitializing(false);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;

            setIsRecording(false);
            const status = await recording.stopAndUnloadAsync();
            const recordingUri = recording.getURI();

            if (recordingUri) {
                setUri(recordingUri);
                if (status.durationMillis) {
                    setTime(Math.floor(status.durationMillis / 1000));
                }
                setRecording(null);
            } else {
                onCancel();
            }
        } catch (e) {
            console.log("[WhatsAppVoiceNote] Error stopping recording:", e);
            onCancel();
        }
    };

    const cancelRecording = async () => {
        try {
            if (recording) {
                await recording.stopAndUnloadAsync();
            }
            setRecording(null);
            setIsRecording(false);
            onCancel();
        } catch (e) {
            console.log("[WhatsAppVoiceNote] Error canceling recording:", e);
            onCancel();
        }
    };

    const playSound = async () => {
        try {
            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        if (status.didJustFinish || (status.positionMillis === status.durationMillis)) {
                            await sound.setPositionAsync(0);
                        }
                        await sound.playAsync();
                        setIsPlaying(true);
                    }
                }
            } else if (uri) {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true }
                );
                setSound(newSound);
                setIsPlaying(true);
                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setIsPlaying(false);
                    }
                });
            }
        } catch (error) {
            console.error("[WhatsAppVoiceNote] Error playing sound:", error);
        }
    };

    const handleSend = async () => {
        if (sound) await sound.unloadAsync();
        if (uri) {
            const finalDuration = Math.max(time, 1);
            onRecordingComplete(uri, finalDuration * 1000);
            setUri(null);
            setTime(0);
            setSound(null);
        }
    };

    const handleDiscard = async () => {
        if (sound) await sound.unloadAsync();
        setUri(null);
        setTime(0);
        onCancel();
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <View style={styles.container}>
            {/* 1. The Mic Trigger Button (Stays in the input bar) */}
            {!isRecording && !uri && (
                <TouchableOpacity
                    onPress={startRecording}
                    style={[styles.micButtonSmall, isInitializing && { opacity: 0.5 }]}
                    disabled={isInitializing}
                >
                    <Ionicons name="mic" size={24} color="#000" />
                </TouchableOpacity>
            )}

            {/* 2. The Overarching UI - Using Modal to ensure it shows at the TOP of the whole screen */}
            <Modal
                visible={isRecording || !!uri}
                transparent={true}
                animationType="none"
                pointerEvents="box-none"
            >
                <View style={styles.modalContent} pointerEvents="box-none">
                    <Animated.View style={[
                        styles.bottomBanner,
                        { transform: [{ translateY: slideAnim }] }
                    ]}>
                        <View style={styles.bannerInner}>
                            {uri ? (
                                // --- PREVIEW MODE ---
                                <>
                                    <TouchableOpacity onPress={handleDiscard} style={styles.bannerActionBtn}>
                                        <View style={[styles.circleIcon, { backgroundColor: '#FF4B4B20' }]}>
                                            <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.voicePreviewPill}>
                                        <TouchableOpacity onPress={playSound} style={styles.playBtnSmall}>
                                            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFF" />
                                        </TouchableOpacity>
                                        <View style={styles.wavePreview}>
                                            {[...Array(15)].map((_, i) => (
                                                <View
                                                    key={i}
                                                    style={[styles.waveBar, { height: 10 + (Math.sin(i * 0.8) * 6) }]}
                                                />
                                            ))}
                                        </View>
                                        <Text style={styles.bannerTimeText}>{formatTime(time)}</Text>
                                    </View>

                                    <TouchableOpacity onPress={handleSend} style={styles.bannerActionBtn}>
                                        <View style={[styles.circleIcon, { backgroundColor: '#25D36620' }]}>
                                            <Ionicons name="send" size={20} color="#25D366" />
                                        </View>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                // --- RECORDING MODE ---
                                <>
                                    <TouchableOpacity onPress={cancelRecording} style={styles.bannerActionBtn}>
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <View style={styles.recordingIndicator}>
                                        <View style={styles.pulseContainer}>
                                            <Animated.View style={[styles.pulseWave, { transform: [{ scale: waveAnim }] }]} />
                                            <View style={styles.micDot}>
                                                <Ionicons name="mic" size={16} color="#FFF" />
                                            </View>
                                        </View>
                                        <View style={styles.timerRow}>
                                            <View style={styles.redDot} />
                                            <Text style={styles.bannerTimeText}>{formatTime(time)}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity onPress={stopRecording} style={styles.bannerActionBtn}>
                                        <View style={styles.stopBtn}>
                                            <Ionicons name="stop" size={20} color="#FFF" />
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    micButtonSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#87CEEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        shadowColor: "#87CEEB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    bottomBanner: {
        position: 'absolute',
        width: SCREEN_WIDTH * 0.94,
        backgroundColor: '#1C1C1E',
        borderRadius: 30,
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    bannerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    bannerActionBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        color: '#888',
        fontSize: 15,
        fontWeight: '700',
    },
    recordingIndicator: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    pulseContainer: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseWave: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(37, 211, 102, 0.4)',
    },
    micDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    bannerTimeText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    stopBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#FF3B30",
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    voicePreviewPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 22,
        padding: 6,
        paddingRight: 14,
        gap: 12,
    },
    playBtnSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wavePreview: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2.5,
    },
    waveBar: {
        width: 2.5,
        backgroundColor: '#87CEEB',
        borderRadius: 1.5,
    },
    circleIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
