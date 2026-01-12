import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Pressable,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Shadows, Typography } from '@/constants/theme';
import { BlurView } from 'expo-blur';
// Removed expo-video-thumbnails as it requires a native rebuild

interface AttachmentPickerProps {
    isVisible: boolean;
    onClose: () => void;
    onSelectMedia: (uri: string, type: 'image' | 'video' | 'file', metadata?: any) => void;
}

const { width, height } = Dimensions.get('window');

export const AttachmentPicker = ({ isVisible, onClose, onSelectMedia }: AttachmentPickerProps) => {
    if (!isVisible) return null;

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            onSelectMedia(asset.uri, 'image', {
                width: asset.width,
                height: asset.height,
                fileName: asset.fileName || 'image.jpg',
            });
            onClose();
        }
    };

    const handlePickVideo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];

            onSelectMedia(asset.uri, 'video', {
                duration: asset.duration,
                width: asset.width,
                height: asset.height,
                fileName: asset.fileName || 'video.mp4',
                thumbnail: null, // Fallback
            });
            onClose();
        }
    };

    const handlePickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            onSelectMedia(asset.uri, 'file', {
                fileName: asset.name,
                fileSize: asset.size,
                mimeType: asset.mimeType,
            });
            onClose();
        }
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable style={styles.backdrop} onPress={onClose} />

            <Animated.View
                entering={SlideInDown.springify().damping(20)}
                exiting={SlideOutDown.springify().damping(20)}
                style={styles.sheet}
            >
                <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                    <View style={styles.indicator} />
                    <Text style={styles.title}>Send Attachment</Text>
                    <View style={styles.grid}>
                        <AttachmentItem
                            icon="images"
                            label="Gallery"
                            color="#4F8EF7"
                            onPress={handlePickImage}
                        />
                        <AttachmentItem
                            icon="videocam"
                            label="Video"
                            color="#FF3B30"
                            onPress={handlePickVideo}
                        />
                        <AttachmentItem
                            icon="document"
                            label="File"
                            color="#5856D6"
                            onPress={handlePickDocument}
                        />
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
};

const AttachmentItem = ({ icon, label, color, onPress, disabled }: any) => (
    <TouchableOpacity
        style={[styles.item, disabled && { opacity: 0.4 }]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
    >
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <Ionicons name={icon} size={28} color="#FFF" />
        </View>
        <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(28, 28, 30, 0.9)',
        ...Shadows.large,
    },
    blurContainer: {
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 8,
    },
    title: {
        ...Typography.h3,
        color: '#FFF',
        textAlign: 'center',
        marginVertical: 16,
        opacity: 0.8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    item: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.medium,
    },
    label: {
        ...Typography.caption,
        color: '#FFF',
        marginTop: 8,
        fontWeight: '500',
    },
});
