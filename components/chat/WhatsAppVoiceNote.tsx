import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

interface WhatsAppVoiceNoteProps {
    onRecordingComplete: (uri: string, duration: number) => void;
    onCancel: () => void;
}

export default function WhatsAppVoiceNote({ onRecordingComplete, onCancel }: WhatsAppVoiceNoteProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [uri, setUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [time, setTime] = useState(0);

    const waveAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isInitialized = useRef(false);

    useEffect(() => {
        if (isRecording) startTimer();
        else stopTimer();
    }, [isRecording]);

    useEffect(() => {
        // Auto-start recording when component mounts (only once)
        if (!isInitialized.current) {
            isInitialized.current = true;
            startRecording();
        }

        return () => {
            // Cleanup on unmount
            const cleanup = async () => {
                try {
                    if (recording) {
                        await recording.stopAndUnloadAsync();
                    }
                    if (sound) {
                        await sound.unloadAsync();
                    }
                } catch (error) {
                    console.log('Cleanup error:', error);
                }
            };
            cleanup();
            stopTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTime((t) => t + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startWave = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(waveAnim, {
                    toValue: 1.4,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(waveAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const startRecording = async () => {
        try {
            // Clean up any existing recording first
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    console.log("Error cleaning up existing recording:", e);
                }
                setRecording(null);
            }

            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                console.log("Permission to access microphone denied");
                onCancel();
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            setTime(0);
            startWave();
        } catch (err) {
            console.log("Recording error", err);
            onCancel();
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;

            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const recordingUri = recording.getURI();

            if (recordingUri) {
                console.log('[WhatsAppVoiceNote] Recording URI:', recordingUri);
                setUri(recordingUri);
                setRecording(null);
            } else {
                console.error("No URI available after recording");
                onCancel();
            }
        } catch (e) {
            console.log("Error stopping recording:", e);
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
            console.log("Error canceling recording:", e);
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
                        // If it's already finished, restart it
                        if (status.didJustFinish || (status.positionMillis === status.durationMillis)) {
                            await sound.setPositionAsync(0);
                        }
                        await sound.playAsync();
                        setIsPlaying(true);
                    }
                }
            } else {
                if (uri) {
                    const { sound: newSound } = await Audio.Sound.createAsync(
                        { uri },
                        { shouldPlay: true }
                    );
                    setSound(newSound);
                    setIsPlaying(true);

                    newSound.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded) {
                            if (status.didJustFinish) {
                                setIsPlaying(false);
                                newSound.setPositionAsync(0); // Reset for next play
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    };

    const handleSend = async () => {
        if (sound) {
            try {
                await sound.unloadAsync();
            } catch (e) {
                console.log('Error unloading preview sound:', e);
            }
        }
        if (uri) {
            // Convert seconds to milliseconds for consistency with existing system
            onRecordingComplete(uri, time * 1000);
        }
    };

    const handleDiscard = async () => {
        if (sound) {
            try {
                await sound.unloadAsync();
            } catch (e) {
                console.log('Error unloading preview sound:', e);
            }
        }
        onCancel();
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    // If we have a recorded URI, show the preview/playback UI
    if (uri) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={handleDiscard} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={24} color="#FF4B4B" />
                </TouchableOpacity>

                <View style={styles.voiceBubble}>
                    <TouchableOpacity onPress={playSound} style={styles.playButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                        {[...Array(20)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    {
                                        height: Math.random() * 20 + 10,
                                        backgroundColor: isPlaying ? "#FFF" : "rgba(255,255,255,0.6)",
                                    },
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={styles.timeText}>{formatTime(time)}</Text>
                </View>

                <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        );
    }

    // Recording UI
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={cancelRecording} style={styles.iconButton}>
                <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>

            <View style={styles.recordingContent}>
                <View style={styles.recordingCenter}>
                    <Animated.View
                        style={[
                            styles.wave,
                            { transform: [{ scale: waveAnim }] },
                        ]}
                    />
                    <View style={styles.micButton}>
                        <Ionicons name="mic" size={26} color="#FFF" />
                    </View>
                </View>

                <View style={styles.timerContainer}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>{formatTime(time)}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
                <View style={styles.stopIconInner} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1C1C1E",
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },

    recordingContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    recordingContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    recordingCenter: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },

    micButton: {
        backgroundColor: "#25D366",
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },

    wave: {
        position: "absolute",
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(37, 211, 102, 0.3)",
    },

    timerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF3B30",
    },

    recordingText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
        fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
    },

    slideHint: {
        color: "#888",
        fontSize: 12,
        marginLeft: 12,
    },

    cancelHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        position: "absolute",
        left: 0,
    },

    cancelText: {
        color: "#FF4B4B",
        fontSize: 12,
        fontWeight: "600",
    },

    voiceBubble: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#075E54",
        padding: 12,
        borderRadius: 20,
        gap: 10,
    },

    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },

    waveformContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 30,
        gap: 2,
    },

    waveBar: {
        width: 3,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.6)",
    },

    timeText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "500",
    },

    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#25D366",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },

    iconButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },

    stopButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 59, 48, 0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },

    stopIconInner: {
        width: 14,
        height: 14,
        backgroundColor: "#FF3B30",
        borderRadius: 3,
    },
});
