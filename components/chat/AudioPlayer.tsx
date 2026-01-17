import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { mediaCacheService } from '../../services/mediaCacheService';

interface AudioPlayerProps {
    url: string;
    isOwn: boolean;
    duration?: number;
    messageId?: string;
    disabled?: boolean;
}

export function AudioPlayer({ url, isOwn, duration, messageId, disabled }: AudioPlayerProps) {
    const player = useAudioPlayer(url);
    const [position, setPosition] = useState(0);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    const lastUrl = useRef(url);

    // Ensure player source is updated if URL changes (e.g., from local optimistic to remote)
    useEffect(() => {
        if (url && url !== lastUrl.current) {
            player.replace(url);
            lastUrl.current = url;
        }
    }, [url, player]);

    // Calculate total waveform width for precise clipping
    const totalWaveformWidth = (30 * 2.2) + (29 * 2.2);

    // Waveform heights
    const bars = useMemo(() => {
        return Array.from({ length: 30 }, () => 4 + Math.random() * 12);
    }, []);

    const pulseAnim = useRef(new Animated.Value(0)).current;

    // Smooth progress animation
    const smoothProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const checkLocal = async () => {
            if (!url) return;
            const cached = await mediaCacheService.getLocalUri(messageId || 'temp', 'audio', url);
            if (cached) {
                setIsDownloaded(true);
            }
        };
        checkLocal();
    }, [url, messageId, isOwn]);

    // Track active player status
    useEffect(() => {
        setIsPlaying(player.playing);
    }, [player.playing]);

    useEffect(() => {
        let interval: any;

        if (isPlaying) {
            setHasEnded(false);

            // Energetic Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 400, useNativeDriver: false })
                ])
            ).start();

            // Ultra High-frequency polling for smooth waveform (16ms = 60fps)
            interval = setInterval(() => {
                const current = (player.currentTime || 0) * 1000;
                const total = (player.duration || 0) * 1000;

                setPosition(current);

                // Update smooth progress value
                if (total > 0) {
                    smoothProgress.setValue(current / total);
                }

                // End detection
                if (player.duration > 0 && player.currentTime >= player.duration - 0.05) {
                    player.pause();
                    player.seekTo(0);
                    setPosition(0);
                    smoothProgress.setValue(0);
                    setHasEnded(true);
                    setIsPlaying(false);
                }
            }, 16);
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(0);

            const current = (player.currentTime || 0) * 1000;
            const total = (player.duration || 0) * 1000;

            if (current > 0 && !hasEnded) {
                setPosition(current);
                if (total > 0) smoothProgress.setValue(current / total);
            } else {
                smoothProgress.setValue(0);
            }
        }

        return () => {
            if (interval) clearInterval(interval);
            pulseAnim.stopAnimation();
        };
    }, [isPlaying, player, pulseAnim, hasEnded, smoothProgress]);

    const handlePlayPause = async () => {
        if (disabled) return;
        if (!isDownloaded && !isDownloading) {
            try {
                setIsDownloading(true);
                const downloaded = await mediaCacheService.downloadMedia(url, messageId || 'temp', 'audio');
                if (downloaded) {
                    setIsDownloaded(true);
                }
            } catch (e) {
                console.error('[AudioPlayer] Download failed:', e);
            } finally {
                setIsDownloading(false);
            }
        }

        if (player.playing) {
            player.pause();
            setIsPlaying(false);
        } else {
            if (hasEnded) {
                player.seekTo(0);
                setPosition(0);
                smoothProgress.setValue(0);
                setHasEnded(false);
            }
            player.play();
            setIsPlaying(true);
        }
    };

    const formatTime = (ms: number) => {
        const totalSecs = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate duration in MS
    const totalMs = (player.duration > 0 ? player.duration * 1000 : duration) || 0;

    // Display logic
    const displayMs = (isPlaying || (position > 0 && !hasEnded)) ? position : totalMs;

    // Animated width for the filled portion
    const fillWidth = smoothProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, totalWaveformWidth],
        extrapolate: 'clamp'
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn} activeOpacity={0.8}>
                {isDownloading ? (
                    <ActivityIndicator size="small" color={isOwn ? '#000' : '#87CEEB'} />
                ) : (
                    <Ionicons
                        name={!isDownloaded ? 'cloud-download' : (isPlaying ? 'pause' : 'play')}
                        size={32}
                        color={isOwn ? '#000' : '#87CEEB'}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.waveformWrap}>
                <View style={styles.waveformInner}>
                    {/* Background Layer (Unplayed) */}
                    <View style={styles.barsLayer}>
                        {bars.map((baseH, i) => (
                            <View
                                key={`bg-${i}`}
                                style={[
                                    styles.bar,
                                    {
                                        height: baseH * 2,
                                        backgroundColor: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
                                    }
                                ]}
                            />
                        ))}
                    </View>

                    {/* Active Layer (Played - Colored and Pulsing) */}
                    <Animated.View
                        style={[
                            styles.barsLayer,
                            styles.activeBarsLayer,
                            { width: fillWidth }
                        ]}
                    >
                        {bars.map((baseH, i) => {
                            // Scale up slightly when playing for that "alive" look
                            const finalH = isPlaying
                                ? pulseAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [baseH * 2, (baseH + 5) * 2]
                                })
                                : baseH * 2;

                            return (
                                <Animated.View
                                    key={`active-${i}`}
                                    style={[
                                        styles.bar,
                                        {
                                            height: finalH,
                                            backgroundColor: isOwn ? '#000' : '#87CEEB'
                                        }
                                    ]}
                                />
                            );
                        })}
                    </Animated.View>
                </View>

                <Text style={[styles.timer, { color: isOwn ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }]}>
                    {formatTime(displayMs)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        minWidth: 190,
        maxWidth: 240,
    },
    playBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformWrap: {
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    waveformInner: {
        height: 35,
        justifyContent: 'center',
    },
    barsLayer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 35,
        gap: 2.2,
    },
    activeBarsLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
    },
    bar: {
        width: 2.2,
        borderRadius: 1.5,
    },
    timer: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
});
