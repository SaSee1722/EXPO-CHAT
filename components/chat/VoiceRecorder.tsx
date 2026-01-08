import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets, useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

interface VoiceRecorderProps {
    onRecordingComplete: (uri: string, duration: number) => void;
    onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const [duration, setDuration] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [savedUri, setSavedUri] = useState<string | null>(null);
    const [savedDuration, setSavedDuration] = useState(0);

    const player = useAudioPlayer(savedUri);

    const timerRef = useRef<any>(null);
    const blinkOpacity = useSharedValue(1);

    const startRecording = useCallback(async () => {
        try {
            const { granted } = await AudioModule.requestRecordingPermissionsAsync();
            if (!granted) {
                onCancel();
                return;
            }

            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            audioRecorder.record();

            const start = Date.now();
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);

            // Simple blinking animation
            blinkOpacity.value = withRepeat(
                withSequence(withTiming(0.3, { duration: 500 }), withTiming(1, { duration: 500 })),
                -1,
                true
            );

        } catch (err) {
            console.error('[VoiceRecorder] Start Error:', err);
            onCancel();
        }
    }, [audioRecorder, onCancel, blinkOpacity]);

    const stopRecording = async () => {
        try {
            if (timerRef.current) clearInterval(timerRef.current);

            const finalDur = duration;

            // Get URI BEFORE calling stop()
            const recordingUri = audioRecorder.uri;
            console.log('[VoiceRecorder] Recording URI before stop:', recordingUri);
            console.log('[VoiceRecorder] Recording duration (seconds):', finalDur);

            if (!recordingUri) {
                console.error('[VoiceRecorder] ❌ No URI available - recording may have failed');
                onCancel();
                return;
            }

            // Verify the URI format is valid
            if (!recordingUri.startsWith('file://') && !recordingUri.startsWith('data:')) {
                console.error('[VoiceRecorder] ❌ Invalid URI format:', recordingUri);
                onCancel();
                return;
            }

            await audioRecorder.stop();

            console.log('[VoiceRecorder] ✅ Recording stopped successfully');
            setSavedUri(recordingUri);
            setSavedDuration(finalDur);
            setIsFinished(true);

        } catch (err) {
            console.error('[VoiceRecorder] ❌ Stop Error:', err);
            onCancel();
        }
    };

    const handleSend = () => {
        if (savedUri) {
            // Duration is in seconds, convert to milliseconds for metadata
            onRecordingComplete(savedUri, savedDuration * 1000);
        }
    };

    const handleCancel = () => {
        if (audioRecorder.isRecording) audioRecorder.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        onCancel();
    };

    useEffect(() => {
        startRecording();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [startRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // PREVIEW UI
    if (isFinished && savedUri) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={24} color="#FF4B4B" />
                </TouchableOpacity>

                <View style={styles.previewCenter}>
                    <TouchableOpacity
                        onPress={() => player.playing ? player.pause() : player.play()}
                        style={styles.playBtn}
                    >
                        <Ionicons name={player.playing ? "pause" : "play"} size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewTitle}>Voice Message</Text>
                        <Text style={styles.previewDuration}>{formatTime(savedDuration)}</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        );
    }

    // RECORDING UI
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                <Ionicons name="close" size={26} color="#888" />
            </TouchableOpacity>

            <View style={styles.recordingCenter}>
                <Animated.View style={[styles.redDot, { opacity: blinkOpacity }]} />
                <Text style={styles.timerText}>{formatTime(duration)}</Text>
            </View>

            <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
                <View style={styles.stopIconInner} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 30,
        paddingHorizontal: 12,
        height: 56,
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconButton: {
        width: 40,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    redDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
    },
    timerText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
    },
    stopButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopIconInner: {
        width: 14,
        height: 14,
        backgroundColor: '#FF3B30',
        borderRadius: 3,
    },
    previewCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        gap: 12,
    },
    playBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#63B3ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewInfo: {
        flex: 1,
    },
    previewTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    previewDuration: {
        color: '#999',
        fontSize: 12,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#63B3ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
