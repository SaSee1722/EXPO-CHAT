import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarLabel } from '@/components/TabBarLabel';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.select({
            ios: insets.bottom + 16,
            android: 16,
            default: 16,
          }),
          left: 16,
          right: 16,
          backgroundColor: 'rgba(18, 18, 18, 0.8)',
          backdropFilter: 'blur(20px)',
          borderTopWidth: 0,
          borderRadius: 32,
          height: 68,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 15,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
          tabBarLabel: ({ focused }) => <TabBarLabel focused={focused}>Discover</TabBarLabel>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          tabBarLabel: ({ focused }) => <TabBarLabel focused={focused}>Matches</TabBarLabel>,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => <Ionicons name="call" size={size} color={color} />,
          tabBarLabel: ({ focused }) => <TabBarLabel focused={focused}>Calls</TabBarLabel>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarLabel: ({ focused }) => <TabBarLabel focused={focused}>Profile</TabBarLabel>,
        }}
      />
    </Tabs>
  );
}
