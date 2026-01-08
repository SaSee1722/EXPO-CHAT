import React from 'react';
import { GradientText } from './GradientText';

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
            <GradientText style={{ fontSize: 12, fontWeight: '600' }}>
                {children}
            </GradientText>
        );
    }

    return null; // Hide label when not focused for cleaner look
};
