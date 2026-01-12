import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shadows } from '@/constants/theme';

interface VoiceRecorderProps {
    onRecordingComplete: (uri: string, duration: number) => void;
    onCancel: () => void;
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onRecordingComplete,
    onCancel,
    isRecording,
    setIsRecording,
}) => {
    const [duration, setDuration] = useState(0);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackUri, setPlaybackUri] = useState<string | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isStartingRef = useRef(false);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const timerRef = useRef<any>(null);
    const durationRef = useRef(0);
    const startTimeRef = useRef<number>(0);
    const isStoppingRef = useRef(false);
    const isMountedRef = useRef(true);
    const lastRecordingTimeRef = useRef<number>(0);

    useEffect(() => {
        const checkPermission = async () => {
            const { status } = await Audio.getPermissionsAsync();
            if (status !== 'granted') await Audio.requestPermissionsAsync();
        };
        checkPermission();

        return () => {
            isMountedRef.current = false;
            // Only cleanup on unmount if we're not actively recording
            if (!recordingRef.current || isStoppingRef.current) {
                cleanup();
            }
        };
    }, []);

    const cleanup = async () => {
        const timeSinceRecording = Date.now() - lastRecordingTimeRef.current;

        // Don't cleanup if actively recording (less than 5 seconds since start)
        if (recordingRef.current && !isStoppingRef.current && timeSinceRecording < 5000) {
            console.log(`[VoiceRecorder] ⚠️ Skipping cleanup - recording active (${Math.floor(timeSinceRecording / 1000)}s ago)`);
            return;
        }

        console.log('[VoiceRecorder] 🧹 cleanup');

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
            } catch (e) { }
            recordingRef.current = null;
        }

        if (soundRef.current) {
            try { await soundRef.current.unloadAsync(); } catch (e) { }
            soundRef.current = null;
        }
    };

    const startPulse = () => {
        pulseAnim.setValue(1);
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const startRecording = async () => {
        if (isStartingRef.current) {
            console.log('[VoiceRecorder] ⚠️ Already starting');
            return;
        }

        console.log('[VoiceRecorder] 🟢 Starting...');
        isStartingRef.current = true;
        isStoppingRef.current = false;

        try {
            // Force cleanup any existing recording first
            if (recordingRef.current) {
                console.log('[VoiceRecorder] ⚠️ Cleaning up existing recording...');
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch (e) {
                    console.log('[VoiceRecorder] Existing recording already stopped');
                }
                recordingRef.current = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const { status } = await Audio.getPermissionsAsync();
            if (status !== 'granted') {
                const requested = await Audio.requestPermissionsAsync();
                if (requested.status !== 'granted') throw new Error('Permission denied');
            }

            durationRef.current = 0;
            setDuration(0);
            setIsRecording(true);
            setIsPreviewMode(false);
            setPlaybackUri(null);
            startPulse();
            startTimeRef.current = Date.now();

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            console.log('[VoiceRecorder] ✅ Recording created');
            recordingRef.current = newRecording;
            lastRecordingTimeRef.current = Date.now();

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (!isMountedRef.current) return;
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                if (elapsed !== durationRef.current) {
                    durationRef.current = elapsed;
                    setDuration(elapsed);
                }
            }, 100) as any;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err) {
            console.error('[VoiceRecorder] ❌ Start failed:', err);
            handleReset();
        } finally {
            isStartingRef.current = false;
        }
    };

    const stopRecording = async () => {
        if (isStoppingRef.current) return;

        console.log(`[VoiceRecorder] 🛑 Stopping (${durationRef.current}s)`);
        isStoppingRef.current = true;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Wait for start to finish if needed
        if (isStartingRef.current) {
            let checks = 0;
            while (isStartingRef.current && checks < 20) {
                await new Promise(r => setTimeout(r, 100));
                checks++;
            }
        }

        const activeRecording = recordingRef.current;
        if (!activeRecording) {
            console.log('[VoiceRecorder] ⚠️ No recording to stop');
            isStoppingRef.current = false;
            handleReset();
            return;
        }

        try {
            // CRITICAL: Get URI BEFORE stopping, otherwise file gets deleted!
            const uri = activeRecording.getURI();
            const finalDuration = Math.max(durationRef.current, Math.round((Date.now() - startTimeRef.current) / 1000));

            console.log(`[VoiceRecorder] Recording URI before stop: ${uri}`);
            console.log(`[VoiceRecorder] Recording duration (seconds): ${finalDuration}`);

            await activeRecording.stopAndUnloadAsync();
            recordingRef.current = null;

            console.log('[VoiceRecorder] ✅ Recording stopped successfully');

            if (uri && (finalDuration >= 1 || (Date.now() - startTimeRef.current) > 500)) {
                setDuration(finalDuration);
                setPlaybackUri(uri);
                setIsPreviewMode(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
                console.log('[VoiceRecorder] ⚠️ Too short');
                handleReset();
            }
        } catch (err) {
            console.error('[VoiceRecorder] ❌ Stop failed:', err);
            handleReset();
        } finally {
            isStoppingRef.current = false;
        }
    };

    const handleReset = () => {
        cleanup();
        setIsRecording(false);
        setIsPreviewMode(false);
        setIsPlaying(false);
        setPlaybackUri(null);
        setDuration(0);
        durationRef.current = 0;
        onCancel();
    };

    const handleSend = () => {
        if (playbackUri && durationRef.current > 0) {
            onRecordingComplete(playbackUri, durationRef.current);
            handleReset();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const togglePlayback = async () => {
        if (!playbackUri) return;

        try {
            if (soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await soundRef.current.pauseAsync();
                        setIsPlaying(false);
                    } else if (status.didJustFinish || status.positionMillis === status.durationMillis) {
                        await soundRef.current.replayAsync();
                        setIsPlaying(true);
                    } else {
                        await soundRef.current.playAsync();
                        setIsPlaying(true);
                    }
                    return;
                }
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: playbackUri },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
                }
            );
            soundRef.current = sound;
            setIsPlaying(true);
        } catch (err) {
            console.error('[VoiceRecorder] ❌ Playback failed:', err);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={isRecording ? styles.activeContainer : styles.inactiveContainer}>
            {!isRecording ? (
                <TouchableOpacity
                    onPress={startRecording}
                    style={styles.micButton}
                >
                    <Ionicons name="mic" size={24} color={Colors.dark.primary} />
                </TouchableOpacity>
            ) : (
                <View style={styles.recorderStrip}>
                    {isPreviewMode ? (
                        <View style={styles.reviewBar}>
                            <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={togglePlayback} style={styles.playBtn}>
                                <Ionicons name={isPlaying ? "pause" : "play"} size={26} color={Colors.dark.primary} />
                            </TouchableOpacity>

                            <View style={styles.reviewTimer}>
                                <Text style={styles.timer}>{formatTime(duration)}</Text>
                            </View>

                            <TouchableOpacity onPress={handleSend} style={styles.sendFab}>
                                <Ionicons name="send" size={22} color="#000" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.recordingBar}>
                            <View style={styles.timerGroup}>
                                <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />
                                <Text style={styles.timer}>{formatTime(duration)}</Text>
                            </View>

                            <View style={styles.recordingStatus}>
                                <Text style={styles.statusText}>Recording...</Text>
                            </View>

                            <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
                                <View style={styles.stopSquare} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    inactiveContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeContainer: {
        position: 'absolute',
        top: 0,
        left: -12,
        right: -6,
        height: 54,
        backgroundColor: '#000',
        borderRadius: 27,
        zIndex: 10000,
        elevation: 5,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    recorderStrip: {
        flex: 1,
        justifyContent: 'center',
    },
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timerGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 70,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        marginRight: 8,
    },
    timer: {
        ...Typography.chat,
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    recordingStatus: {
        flex: 1,
        alignItems: 'center',
    },
    statusText: {
        ...Typography.caption,
        color: '#888',
        fontSize: 14,
    },
    stopButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopSquare: {
        width: 14,
        height: 14,
        backgroundColor: '#FF3B30',
        borderRadius: 2,
    },
    reviewBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBtn: {
        padding: 8,
    },
    playBtn: {
        padding: 8,
        marginLeft: 10,
    },
    reviewTimer: {
        flex: 1,
        paddingLeft: 20,
    },
    sendFab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.dark.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.medium,
    },
});
