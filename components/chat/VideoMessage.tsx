import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Message } from '../../types';

interface VideoMessageProps {
    message: Message;
    isOwn: boolean;
    isDownloaded: boolean;
    localUri?: string | null;
    uploadProgress?: number;
    downloadProgress?: number;
    isDownloading?: boolean;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({ message, isOwn, isDownloaded, localUri, uploadProgress, downloadProgress, isDownloading }) => {
    const player = useVideoPlayer(localUri || message.media_url || '', (player) => {
        player.loop = false;
        player.muted = true;
        player.pause();
    });

    return (
        <View style={styles.container}>
            {message.media_url ? (
                <VideoView
                    player={player}
                    style={styles.thumbnail}
                    contentFit="cover"
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                />
            ) : (
                <View style={[styles.thumbnail, styles.placeholder]}>
                    <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.3)" />
                </View>
            )}

            <View style={styles.overlay}>
                {!!message.metadata?.isUploading ? (
                    <View style={styles.progressContainer}>
                        <CircularProgress
                            progress={uploadProgress || 0}
                            size={60}
                            strokeWidth={4}
                            iconName="close"
                        />
                        {uploadProgress !== undefined && uploadProgress > 0 && (
                            <Text style={styles.progressText}>{Math.round(uploadProgress * 100)}%</Text>
                        )}
                    </View>
                ) : (isDownloading && downloadProgress !== undefined && downloadProgress < 1) ? (
                    <View style={styles.progressContainer}>
                        <CircularProgress
                            progress={downloadProgress}
                            size={60}
                            strokeWidth={4}
                            iconName="close"
                        />
                        <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
                    </View>
                ) : !isDownloaded ? (
                    <View style={styles.progressContainer}>
                        <CircularProgress
                            progress={0}
                            size={60}
                            strokeWidth={4}
                            iconName="cloud-download-outline"
                        />
                        {message.metadata?.fileSize && (
                            <Text style={styles.sizeText}>
                                {(message.metadata.fileSize / 1024 / 1024).toFixed(1)} MB
                            </Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.playButton}>
                        <Ionicons name="play" size={30} color="#FFF" />
                    </View>
                )}
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 240,
        height: 240,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#1A1A1A',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressText: {
        position: 'absolute',
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        top: '65%', // Position below the icon
    },
    sizeText: {
        position: 'absolute',
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
        top: '65%',
    }
});
