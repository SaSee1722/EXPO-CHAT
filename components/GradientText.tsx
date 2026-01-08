import React from 'react';
import { Text, TextStyle, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Colors } from '@/constants/theme';

interface GradientTextProps {
    children: React.ReactNode;
    style?: TextStyle | TextStyle[];
    colors?: readonly [string, string, ...string[]];
}

/**
 * GradientText component for displaying text with a gradient effect
 * Uses black → sky blue → baby pink gradient by default
 */
export const GradientText: React.FC<GradientTextProps> = ({
    children,
    style,
    colors
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Default gradient colors: Black → Sky Blue → Baby Pink
    const gradientColors: readonly [string, string, ...string[]] = colors || [
        theme.gradientStart,  // Black
        theme.gradientMiddle, // Sky Blue
        theme.gradientEnd,    // Baby Pink
    ];

    return (
        <MaskedView
            maskElement={
                <Text style={[styles.text, style]}>
                    {children}
                </Text>
            }
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={[styles.text, style, { opacity: 0 }]}>
                    {children}
                </Text>
            </LinearGradient>
        </MaskedView>
    );
};

const styles = StyleSheet.create({
    text: {
        fontWeight: 'bold',
    },
});
