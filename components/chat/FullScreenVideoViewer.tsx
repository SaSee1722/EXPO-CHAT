import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// FullScreenVideoViewer.tsx

interface FullScreenVideoViewerProps {
    visible: boolean;
    videoUri: string;
    onClose: () => void;
}

export function FullScreenVideoViewer({ visible, videoUri, onClose }: FullScreenVideoViewerProps) {
    const insets = useSafeAreaInsets();

    const getSafeUri = (uri: string) => {
        if (!uri) return '';
        if (uri.startsWith('http')) return encodeURI(uri);
        return uri;
    };

    const player = useVideoPlayer(getSafeUri(videoUri), (player) => {
        player.loop = false;
        player.muted = false; // Ensure audio is ON in full screen
        if (visible) {
            player.play();
        }
    });

    React.useEffect(() => {
        if (videoUri) {
            player.replaceAsync(getSafeUri(videoUri));
            if (visible) player.play();
        }

        if (!visible) {
            player.pause();
        }
    }, [visible, videoUri, player]);

    if (!videoUri) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <TouchableOpacity
                    style={[styles.closeButton, { top: insets.top + 10 }]}
                    onPress={onClose}
                >
                    <Ionicons name="close" size={30} color="#FFF" />
                </TouchableOpacity>

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

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: width,
        height: height * 0.8,
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
    }
});
