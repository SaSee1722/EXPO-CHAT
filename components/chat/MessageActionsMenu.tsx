import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageActionsMenuProps {
    visible: boolean;
    onClose: () => void;
    onReply?: () => void;
    onDelete?: () => void;
    onDeleteForEveryone?: () => void;
    isOwnMessage?: boolean;
}

export function MessageActionsMenu({ visible, onClose, onReply, onDelete, onDeleteForEveryone, isOwnMessage }: MessageActionsMenuProps) {
    const [fadeAnim] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible, fadeAnim]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    {onReply && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onReply(); onClose(); }}>
                            <Ionicons name="arrow-undo" size={20} color="#87CEEB" />
                            <Text style={styles.actionText}>Reply</Text>
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onDelete(); onClose(); }}>
                            <Ionicons name="trash-outline" size={20} color="#FF4458" />
                            <Text style={styles.actionText}>Delete for Me</Text>
                        </TouchableOpacity>
                    )}
                    {isOwnMessage && onDeleteForEveryone && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onDeleteForEveryone(); onClose(); }}>
                            <Ionicons name="trash" size={20} color="#FF4458" />
                            <Text style={styles.actionText}>Delete for Everyone</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 8,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 12,
    },
    actionText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
});
