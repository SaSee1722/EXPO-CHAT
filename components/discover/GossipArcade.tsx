import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { GradientText } from '../GradientText';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLATFORMS = [
    {
        id: 'crazygames',
        name: 'CrazyGames',
        url: 'https://www.crazygames.com',
        brandIcon: require('../../assets/images/platforms/crazygames-icon.jpg'),
        color: '#6E3CFF',
        description: 'Epic High-Octane Action',
        hideSelectors: ['.header', '.footer', '.sidebar', '#header', '#footer', '.ad-box'],
        topGames: [
            { id: 'vex-7', title: 'Vex 7', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/vex-7.png', url: 'https://www.crazygames.com/embed/vex-7' },
            { id: 'shellshockers', title: 'Shell Shock', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/shell-shockers.png', url: 'https://www.crazygames.com/embed/shellshockers' },
            { id: 'moto-x3m', title: 'Moto X3M', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/moto-x3m.png', url: 'https://www.crazygames.com/embed/moto-x3m' },
            { id: 'drift-hunters', title: 'Drift Hunters', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/drift-hunters.png', url: 'https://www.crazygames.com/embed/drift-hunters' },
            { id: 'smash-karts', title: 'Smash Karts', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/smash-karts.png', url: 'https://www.crazygames.com/embed/smash-karts' },
        ]
    },
    {
        id: 'poki',
        name: 'Poki',
        url: 'https://poki.com',
        brandIcon: 'https://poki.com/favicon.ico',
        color: '#007AFF',
        description: 'Popular Casual Hits',
        hideSelectors: ['#header', '#footer', '.ad-box', '.poki-header'],
        topGames: [
            { id: 'stickman-hook', title: 'Stick Hook', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/stickman-hook.png', url: 'https://poki.com/en/g/stickman-hook' },
            { id: 'subway-surfers', title: 'Subway Surf', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/subway-surfers.png', url: 'https://poki.com/en/g/subway-surfers' },
            { id: 'temple-run-2', title: 'Temple Run', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/temple-run-2.png', url: 'https://poki.com/en/g/temple-run-2' },
            { id: 'uno-online', title: 'Uno Online', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/uno-online.png', url: 'https://poki.com/en/g/uno-online' },
            { id: 'crossy-road', title: 'Crossy Road', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/crossy-road.png', url: 'https://poki.com/en/g/crossy-road' },
        ]
    },
    {
        id: 'playhop',
        name: 'Playhop',
        url: 'https://playhop.com',
        brandIcon: 'https://playhop.com/favicon.ico',
        color: '#AF52DE',
        description: 'Instant Mobile Fun',
        hideSelectors: ['.header-wrapper', '.footer-wrapper'],
        topGames: [
            { id: '2048', title: '2048', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/2048.png', url: 'https://playhop.com/game/2048' },
            { id: 'bubble-shooter', title: 'Bubble Shoot', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/bubble-shooter.png', url: 'https://playhop.com/game/bubble-shooter' },
            { id: 'solitaire', title: 'Solitaire', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/solitaire.png', url: 'https://playhop.com/game/solitaire' },
            { id: 'chess', title: 'Pure Chess', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/chess-online.png', url: 'https://playhop.com/game/chess' },
            { id: 'mahjong', title: 'Mahjong', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/mahjongg-dimensions.png', url: 'https://playhop.com/game/mahjong' },
        ]
    },
    {
        id: 'agame',
        name: 'Agame',
        url: 'https://www.agame.com',
        brandIcon: 'https://www.agame.com/favicon.ico',
        color: '#4CD964',
        description: 'Classic Arcade Hits',
        hideSelectors: ['#header-wrapper', '#footer-wrapper', '.ad-banner'],
        topGames: [
            { id: 'fireboy-watergirl', title: 'Fire & Water', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/fireboy-and-watergirl-the-forest-temple.png', url: 'https://www.agame.com/game/fireboy-and-watergirl-1-the-forest-temple' },
            { id: 'bob-thief', title: 'Bob Robber', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/bob-the-robber.png', url: 'https://www.agame.com/game/bob-the-robber' },
            { id: 'snail-bob', title: 'Snail Bob', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/snail-bob.png', url: 'https://www.agame.com/game/snail-bob' },
            { id: 'troll-face', title: 'Troll Face', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/troll-face-quest-video-memes.png', url: 'https://www.agame.com/game/troll-face-quest-video-memes' },
            { id: 'instagirls', title: 'Dress Up', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/funny-haircut.png', url: 'https://www.agame.com/game/instagirls-dress-up' },
        ]
    },
    {
        id: 'pogo',
        name: 'Pogo',
        url: 'https://www.pogo.com',
        brandIcon: require('../../assets/images/platforms/pogo-icon.jpg'),
        color: '#2D4F94',
        description: 'Premium Board Games',
        hideSelectors: ['.site-header', '.site-footer'],
        topGames: [
            { id: 'pogo-poppit', title: 'Poppit!', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/bubble-shooter.png', url: 'https://www.pogo.com/games/poppit' },
            { id: 'pogo-word', title: 'Word Whomp', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/word-search.png', url: 'https://www.pogo.com/games/word-whomp' },
            { id: 'pogo-turbo', title: 'Turbo 21', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/uno-online.png', url: 'https://www.pogo.com/games/turbo-21' },
            { id: 'pogo-mahjong', title: 'Safari Mahjong', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/mahjongg-dimensions.png', url: 'https://www.pogo.com/games/mahjong-safari' },
            { id: 'pogo-solitaire', title: 'Solitaire', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/solitaire.png', url: 'https://www.pogo.com/games/solitaire-blitz' },
        ]
    },
    {
        id: 'arkadium',
        name: 'Arkadium',
        url: 'https://www.arkadium.com/free-online-games/',
        brandIcon: 'https://www.arkadium.com/favicon.ico',
        color: '#FF2D55',
        description: 'Elite Brain Training',
        hideSelectors: ['.header-container', '.footer-container'],
        topGames: [
            { id: 'ark-spider', title: 'Spider Sol', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/solitaire.png', url: 'https://www.arkadium.com/games/spider-solitaire/' },
            { id: 'ark-cross', title: 'Daily Cross', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/word-search.png', url: 'https://www.arkadium.com/games/daily-crossword/' },
            { id: 'ark-bubble', title: 'Ark Bubble', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/bubble-shooter.png', url: 'https://www.arkadium.com/games/bubble-shooter/' },
            { id: 'ark-mah', title: 'Mahjongg', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/mahjongg-dimensions.png', url: 'https://www.arkadium.com/games/mahjongg-candy/' },
            { id: 'ark-out', title: 'Outspell', thumb: 'https://img.poki.com/cdn-cgi/image/quality=78,width=280,height=156,fit=cover/scrabble-sprint.png', url: 'https://www.arkadium.com/games/outspell/' },
        ]
    }
];

export function GossipArcade() {
    const [activeGame, setActiveGame] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const getInjectionJS = (selectors: string[]) => `
        (function() {
            const hide = () => {
                const selectors = ${JSON.stringify(selectors)};
                selectors.forEach(s => {
                    document.querySelectorAll(s).forEach(el => el.style.display = 'none');
                });
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.overflow = 'hidden';
            };
            hide();
            setTimeout(hide, 1000);
            setTimeout(hide, 3000);
            setInterval(hide, 5000);
        })();
        true;
    `;

    const openGame = (url: string, selectors: string[], name: string) => {
        setActiveGame({ url, selectors, name });
    };

    const renderPlatformCard = (platform: any) => (
        <View key={platform.id} style={[styles.platformWrapper, { borderColor: platform.color + '60' }]}>
            <TouchableOpacity
                style={styles.platformHeader}
                onPress={() => openGame(platform.url, platform.hideSelectors, platform.name)}
                activeOpacity={0.7}
            >
                <View style={[styles.mainIcon, { backgroundColor: platform.color + '15' }]}>
                    <Image
                        source={typeof platform.brandIcon === 'string' ? { uri: platform.brandIcon } : platform.brandIcon}
                        style={styles.brandImg}
                        contentFit="contain"
                    />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    <Text style={styles.platformDesc}>{platform.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>

            <View style={styles.topGamesContainer}>
                <Text style={styles.topGamesLabel}>Try out our top rated games</Text>
                <View style={styles.gamesTagsRow}>
                    {platform.topGames.map((game: any) => (
                        <TouchableOpacity
                            key={game.id}
                            style={[styles.gameTag, { borderColor: platform.color + 'AA', backgroundColor: platform.color + '15' }]}
                            onPress={() => openGame(game.url, platform.hideSelectors, game.title)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.gameTagText}>{game.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    if (activeGame) {
        return (
            <View style={styles.fullGameView}>
                <WebView
                    source={{
                        uri: activeGame.url,
                    }}
                    style={styles.webview}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    injectedJavaScript={getInjectionJS(activeGame.selectors)}
                    scalesPageToFit={true}
                    originWhitelist={['*']}
                    scrollEnabled={true}
                    thirdPartyCookiesEnabled={true}
                    sharedCookiesEnabled={true}
                    userAgent={Platform.OS === 'ios'
                        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
                        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                />

                <View style={[styles.backOverlay, { top: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setActiveGame(null)}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.activeTitle}>{activeGame.name.toUpperCase()}</Text>
                </View>

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#87CEEB" />
                        <Text style={styles.loadingText}>BOOTING GAME ENGINE...</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
                <View style={styles.header}>
                    <GradientText style={styles.mainTitle}>GOSSIP ARCADE</GradientText>
                    <Text style={styles.subTitle}>Select your gaming dimension</Text>
                </View>

                {PLATFORMS.map(renderPlatformCard)}

                <View style={styles.footerInfo}>
                    <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.footerText}>All systems operational</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    mainTitle: {
        color: '#FFF',
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -1,
    },
    subTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    platformWrapper: {
        backgroundColor: '#0F0F0F',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 2,
        paddingVertical: 16,
    },
    platformHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    mainIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    brandImg: {
        width: 32,
        height: 32,
    },
    headerInfo: {
        flex: 1,
    },
    platformName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    platformDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    topGamesContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    topGamesLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 8,
    },
    gamesTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    gameTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1.5,
    },
    gameTagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    fullGameView: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 10000,
    },
    webview: {
        flex: 1,
    },
    backOverlay: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    activeTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        marginLeft: 12,
        letterSpacing: 2,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    loadingText: {
        color: '#FFF',
        marginTop: 20,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
        opacity: 0.5,
    },
    footerText: {
        color: '#FFF',
        fontSize: 12,
        marginLeft: 6,
    }
});
