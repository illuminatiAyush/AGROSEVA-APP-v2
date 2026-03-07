import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // Import Stack
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

// SCREENS
import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import CameraScreen from '@/screens/CameraScreen';
import MonitorScreen from '@/screens/MonitorScreen';
import ResourcesScreen from '@/screens/ResourcesScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import OtpScreen from '@/screens/OtpScreen';
import PHMonitoringScreen from '@/screens/PHMonitoringScreen';
import FarmSetupScreen from '@/screens/FarmSetupScreen';
import SensorPlannerScreen from '@/screens/SensorPlannerScreen';
import CropSelectionScreen from '@/screens/CropSelectionScreen';
import SchemesScreen from '@/screens/SchemesScreen';
import { useTranslation } from '@/utils/i18n';
import { useNotificationStore } from '@/store/useNotificationStore';

// 1. Define the Tab Navigator (The Main App)
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const t = useTranslation();
  const hasUnread = useNotificationStore((state) => state.hasUnread);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { height: 60, paddingBottom: 10 },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === t('tabDashboard')) iconName = 'grid';
          else if (route.name === t('tabMonitor')) iconName = 'pulse';
          else if (route.name === t('tabPhMonitor')) iconName = 'flask';
          else if (route.name === t('tabScan')) iconName = 'scan-circle';
          else if (route.name === t('tabResources')) iconName = 'water';
          else if (route.name === t('tabCrops')) iconName = 'leaf';
          else if (route.name === t('tabSettings')) iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name={t('tabDashboard')}
        component={DashboardScreen}
        options={{ tabBarLabel: t('tabDashboard') }}
      />
      <Tab.Screen
        name={t('tabMonitor')}
        component={MonitorScreen}
        options={{ tabBarLabel: t('tabMonitor') }}
      />
      <Tab.Screen
        name={t('tabPhMonitor')}
        component={PHMonitoringScreen}
        options={{ tabBarLabel: t('tabPhMonitor') }}
      />
      <Tab.Screen
        name={t('tabScan')}
        component={CameraScreen}
        options={{ tabBarLabel: t('tabScan') }}
      />
      <Tab.Screen
        name={t('tabResources')}
        component={ResourcesScreen}
        options={{ tabBarLabel: t('tabResources') }}
      />
      <Tab.Screen
        name={t('tabCrops')}
        component={CropSelectionScreen}
        options={{ tabBarLabel: t('tabCrops') }}
      />
      <Tab.Screen
        name={t('tabSettings')}
        component={SettingsScreen}
        options={{ tabBarLabel: t('tabSettings') }}
      />
    </Tab.Navigator>
  );
}

// 2. Define the Root Stack (Login -> Tabs)
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* Login -> OTP -> Tabs */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OtpVerification" component={OtpScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="FarmSetup" component={FarmSetupScreen} />
        <Stack.Screen name="SensorPlanner" component={SensorPlannerScreen} />
        <Stack.Screen name="Schemes" component={SchemesScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}