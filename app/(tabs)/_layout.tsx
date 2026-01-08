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
          backgroundColor: '#000000', // Pure black background
          borderTopColor: '#1A1A1A',
          height: Platform.select({
            ios: insets.bottom + 60,
            android: insets.bottom + 60,
            default: 70,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: insets.bottom + 8,
            android: insets.bottom + 8,
            default: 8,
          }),
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
