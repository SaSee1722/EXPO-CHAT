import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { PinInput } from './PinInput';

interface PinSetupModalProps {
    visible: boolean;
    onComplete: (pin: string) => void;
    onCancel: () => void;
}

export function PinSetupModal({ visible, onComplete, onCancel }: PinSetupModalProps) {
    const [step, setStep] = useState<'initial' | 'confirm'>('initial');
    const [initialPin, setInitialPin] = useState('');
    const [error, setError] = useState('');

    const handleInitialPin = (pin: string) => {
        setInitialPin(pin);
        setStep('confirm');
        setError('');
    };

    const handleConfirmPin = (pin: string) => {
        if (pin === initialPin) {
            onComplete(pin);
            // Reset state
            setStep('initial');
            setInitialPin('');
            setError('');
        } else {
            setError('PINs do not match');
            setTimeout(() => {
                setError('');
                setStep('initial');
                setInitialPin('');
            }, 1500);
        }
    };

    const handleCancel = () => {
        setStep('initial');
        setInitialPin('');
        setError('');
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            {step === 'initial' ? (
                <PinInput
                    key="initial-pin"
                    title="Set PIN"
                    subtitle="Enter a 4-digit PIN to lock this chat"
                    onComplete={handleInitialPin}
                    onCancel={handleCancel}
                />
            ) : (
                <PinInput
                    key="confirm-pin"
                    title="Confirm PIN"
                    subtitle="Re-enter your PIN to confirm"
                    onComplete={handleConfirmPin}
                    onCancel={handleCancel}
                    error={error}
                />
            )}
        </Modal>
    );
}
