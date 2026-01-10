import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/theme';
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
          bottom: 24,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(12, 12, 12, 0.9)',
          borderTopWidth: 0,
          borderRadius: 32,
          height: 64,
          paddingTop: 4,
          paddingBottom: 4,
          paddingHorizontal: 8,
          ...Shadows.large,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
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
