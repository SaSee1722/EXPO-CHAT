import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/template';
import { useProfileContext } from '@/context/ProfileContext';

interface ProfileGuardProps {
    children: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
    const { user, initialized: authInitialized } = useAuth();
    const { profile, loading: profileLoading, error: profileError, refreshProfile } = useProfileContext();
    const router = useRouter();
    const pathname = usePathname();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        if (!authInitialized || !navigationState?.key) return;

        if (!user) {
            if (pathname !== '/auth') {
                router.replace('/auth');
            }
            return;
        }

        if (pathname === '/setup-profile') return;

        // ONLY redirect if there is NO error and we are sure the profile is missing
        if (!profileLoading && !profile && !profileError) {
            router.replace('/setup-profile');
        }
    }, [authInitialized, user, profile, profileLoading, profileError, pathname, router, navigationState?.key]);

    // Handle Network Error State
    if (user && profileError && !profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Connection Issue</Text>
                <Text style={styles.errorText}>We&apos;re having trouble reaching the server.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refreshProfile()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isActuallyOnSetup = pathname === '/setup-profile';
    const shouldShowSetup = !profileLoading && !profile && user && !profileError;

    if (shouldShowSetup && !isActuallyOnSetup) {
        return (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#87CEEB" />
            </View>
        );
    }

    return (
        <>
            {children}
            {user && profileLoading && !isActuallyOnSetup && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#87CEEB" />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        zIndex: 999,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    errorTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10
    },
    errorText: {
        color: '#888',
        textAlign: 'center',
        marginBottom: 30
    },
    retryBtn: {
        backgroundColor: '#87CEEB',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25
    },
    retryText: {
        color: '#000',
        fontWeight: 'bold'
    }
});
