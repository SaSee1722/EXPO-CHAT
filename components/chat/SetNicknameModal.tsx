/**
 * SetNicknameModal.tsx
 * Premium modal for setting/editing/clearing a contact nickname (alias).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlias } from '@/context/AliasContext';

interface SetNicknameModalProps {
    visible: boolean;
    profileId: string;
    realName: string;
    onClose: () => void;
}

export function SetNicknameModal({ visible, profileId, realName, onClose }: SetNicknameModalProps) {
    const { aliases, saveAlias, removeAlias } = useAlias();
    const currentAlias = aliases[profileId] ?? '';
    const inputRef = useRef<TextInput>(null);
    const [input, setInput] = useState(currentAlias);

    // Sync input when alias changes externally or modal opens
    // Defer keyboard focus by 80ms so the modal renders first
    useEffect(() => {
        if (visible) {
            setInput(aliases[profileId] ?? '');
            const t = setTimeout(() => inputRef.current?.focus(), 80);
            return () => clearTimeout(t);
        }
    }, [visible, profileId, aliases]);

    const handleSave = async () => {
        await saveAlias(profileId, input);
        onClose();
    };

    const handleClear = async () => {
        await removeAlias(profileId);
        setInput('');
        onClose();
    };

    const hasAlias = !!currentAlias;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.card}>
                    {/* No BlurView — solid background renders instantly */}

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="pricetag" size={20} color="#87CEEB" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Set Nickname</Text>
                            <Text style={styles.subtitle} numberOfLines={1}>
                                Only visible to you · {realName}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>

                    {/* Input */}
                    <View style={styles.inputWrap}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder={`e.g. My Bestie, ${realName.split(' ')[0]}...`}
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={input}
                            onChangeText={setInput}
                            maxLength={40}
                            returnKeyType="done"
                            onSubmitEditing={handleSave}
                            selectionColor="#87CEEB"
                        />
                        {input.length > 0 && (
                            <TouchableOpacity onPress={() => setInput('')} style={styles.clearInput}>
                                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.charCount}>{input.length}/40</Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {hasAlias && (
                            <TouchableOpacity style={styles.removeBtn} onPress={handleClear}>
                                <Ionicons name="trash-outline" size={16} color="#FF4458" />
                                <Text style={styles.removeBtnText}>Remove</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, !input.trim() && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={!input.trim() && !hasAlias}
                        >
                            <Text style={styles.saveBtnText}>
                                {input.trim() ? 'Save Nickname' : 'Cancel'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    card: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        backgroundColor: '#111116',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(135,206,235,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        marginTop: 1,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(135,206,235,0.25)',
        paddingHorizontal: 14,
        minHeight: 50,
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 12,
    },
    clearInput: {
        padding: 4,
    },
    charCount: {
        color: 'rgba(255,255,255,0.25)',
        fontSize: 11,
        textAlign: 'right',
        marginTop: 6,
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,68,88,0.3)',
        backgroundColor: 'rgba(255,68,88,0.08)',
    },
    removeBtnText: {
        color: '#FF4458',
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#87CEEB',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: 'rgba(135,206,235,0.25)',
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
});
