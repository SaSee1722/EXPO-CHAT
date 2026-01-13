import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';
import { Typography } from '../../constants/theme';

interface VideoMessageProps {
    message: Message;
    isOwn: boolean;
    isDownloaded: boolean;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({ message, isOwn, isDownloaded }) => {
    return (
        <View style={styles.container}>
            {message.media_url ? (
                <Image
                    source={{ uri: message.media_url }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.thumbnail, styles.placeholder]}>
                    <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.3)" />
                </View>
            )}

            <View style={styles.overlay}>
                {message.metadata?.isUploading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <View style={styles.playButton}>
                        <Ionicons name="play" size={30} color="#FFF" />
                    </View>
                )}
            </View>

            {!isDownloaded && !message.metadata?.isUploading && (
                <View style={styles.downloadIndicator}>
                    <Ionicons name="cloud-download" size={16} color="#FFF" />
                    <Text style={styles.downloadText}>
                        {message.metadata?.fileSize
                            ? `${(message.metadata.fileSize / 1024 / 1024).toFixed(1)}MB`
                            : 'Download'}
                    </Text>
                </View>
            )}
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
    downloadIndicator: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    downloadText: {
        ...Typography.caption,
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
    },
});
