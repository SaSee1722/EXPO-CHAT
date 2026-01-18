import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface CircularProgressProps {
    progress: number; // 0 to 1
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    showIcon?: boolean;
    iconName?: any;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    progress,
    size = 40,
    strokeWidth = 3,
    color = '#FFF',
    backgroundColor = 'rgba(255,255,255,0.2)',
    showIcon = true,
    iconName = 'close'
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const safeProgress = Math.min(Math.max(progress, 0), 1);
    const strokeDashoffset = circumference - (safeProgress * circumference);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute' }}>
                <Svg width={size} height={size}>
                    {/* Background Circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={backgroundColor}
                        strokeWidth={strokeWidth}
                        fill="rgba(0,0,0,0.4)"
                    />
                    {/* Progress Circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>
            </View>
            {showIcon && (
                <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={iconName} size={size * 0.5} color={color} />
                </View>
            )}
        </View>
    );
};
