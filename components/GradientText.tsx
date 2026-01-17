import React from 'react';
import { Text, TextStyle, StyleSheet, useColorScheme, View, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Colors } from '@/constants/theme';

interface GradientTextProps {
    children: React.ReactNode;
    style?: TextStyle;
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

    const gradientColors: readonly [string, string, ...string[]] = colors || [
        theme.primary,
        theme.secondary,
    ];

    // Separate layout styles from text styles
    const {
        flex,
        height,
        width,
        margin,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        position,
        top,
        bottom,
        left,
        right,
        zIndex,
        ...textStyle
    } = (style || {}) as any;

    const containerStyle: ViewStyle = {
        flex,
        height,
        width,
        margin,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        position,
        top,
        bottom,
        left,
        right,
        zIndex,
    };

    const adjustedTextStyle = textStyle;

    return (
        <View style={containerStyle}>
            <MaskedView
                maskElement={
                    <Text style={[styles.text, adjustedTextStyle]}>
                        {children}
                    </Text>
                }
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Text style={[styles.text, adjustedTextStyle, { opacity: 0 }]}>
                        {children}
                    </Text>
                </LinearGradient>
            </MaskedView>
        </View>
    );
};

const styles = StyleSheet.create({
    text: {
        fontWeight: '700',
    },
});
