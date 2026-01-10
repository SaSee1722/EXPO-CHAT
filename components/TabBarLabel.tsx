import React from 'react';
import { GradientText } from './GradientText';
import { Typography } from '@/constants/theme';

interface TabBarLabelProps {
    focused: boolean;
    children: string;
}

/**
 * Custom tab bar label with gradient text for active tabs
 */
export const TabBarLabel: React.FC<TabBarLabelProps> = ({ focused, children }) => {
    if (focused) {
        return (
            <GradientText style={{ ...Typography.caption, fontWeight: '700' }}>
                {children}
            </GradientText>
        );
    }

    return null; // Hide label when not focused for cleaner look
};
