import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaCacheService } from '../../services/mediaCacheService';

const { width, height } = Dimensions.get('window');

interface FullScreenVideoViewerProps {
    visible: boolean;
    videoUri: string;
    onClose: () => void;
}

export function FullScreenVideoViewer({ visible, videoUri, onClose }: FullScreenVideoViewerProps) {
    const insets = useSafeAreaInsets();
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

    const getSafeUri = (uri: string) => {
        if (!uri) return '';
        if (uri.startsWith('http')) return encodeURI(uri);
        return uri;
    };

    const player = useVideoPlayer(getSafeUri(videoUri), (player) => {
        player.loop = false;
        player.muted = false;
        if (visible) player.play();
    });

    React.useEffect(() => {
        if (videoUri) {
            player.replaceAsync(getSafeUri(videoUri));
            if (visible) player.play();
        }
        if (!visible) {
            player.pause();
            setSaveState('idle');
        }
    }, [visible, videoUri, player]);

    if (!videoUri) return null;

    /**
     * Save to Gallery — EXPLICIT USER ACTION ONLY.
     * Never called automatically. Only fires when user taps the save icon.
     */
    const handleSaveToGallery = async () => {
        if (saveState === 'saving' || !videoUri) return;
        setSaveState('saving');
        // Use the local URI if available (already cached), otherwise use the remote URL
        const success = await mediaCacheService.saveToGallery(videoUri);
        setSaveState(success ? 'saved' : 'failed');
        setTimeout(() => setSaveState('idle'), 2000);
    };

    const saveIcon =
        saveState === 'saving' ? 'hourglass-outline' :
        saveState === 'saved' ? 'checkmark-circle' :
        saveState === 'failed' ? 'close-circle' :
        'download-outline';

    const saveColor =
        saveState === 'saved' ? '#4CAF50' :
        saveState === 'failed' ? '#FF4458' : '#FFF';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Top bar: Close (left) + Save to Gallery (right) */}
                <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>

                    {/* Explicit save button — never fires automatically */}
                    <TouchableOpacity style={styles.iconBtn} onPress={handleSaveToGallery}>
                        <Ionicons name={saveIcon as any} size={26} color={saveColor} />
                        {saveState === 'saved' && <Text style={styles.savedLabel}>Saved!</Text>}
                        {saveState === 'failed' && <Text style={styles.failedLabel}>Failed</Text>}
                    </TouchableOpacity>
                </View>

                <VideoView
                    style={styles.video}
                    player={player}
                    fullscreenOptions={{ enable: true }}
                    allowsPictureInPicture
                    contentFit="contain"
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    savedLabel: {
        color: '#4CAF50',
        fontSize: 13,
        fontWeight: '700',
    },
    failedLabel: {
        color: '#FF4458',
        fontSize: 13,
        fontWeight: '700',
    },
    video: {
        width: width,
        height: height * 0.8,
    },
});
