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
import WaterStressDetailScreen from '@/screens/WaterStressDetailScreen';
import WaterStressLiveScanScreen from '@/screens/WaterStressLiveScanScreen';
import { MarketScreen } from '@/screens/market';

// 1. Define the Tab Navigator (The Main App)
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { height: 60, paddingBottom: 10 },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = 'grid';
          else if (route.name === 'Monitor') iconName = 'pulse'; 
          else if (route.name === 'pH Monitor') iconName = 'flask';
          else if (route.name === 'Scan') iconName = 'scan-circle'; 
          else if (route.name === 'Resources') iconName = 'water';
          else if (route.name === 'Crops') iconName = 'leaf';
          else if (route.name === 'Market') iconName = 'storefront';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Monitor" component={MonitorScreen} />
      <Tab.Screen name="pH Monitor" component={PHMonitoringScreen} />
      <Tab.Screen name="Scan" component={CameraScreen} />
      <Tab.Screen name="Resources" component={ResourcesScreen} />
      <Tab.Screen name="Crops" component={CropSelectionScreen} />
      {/* <Tab.Screen name="Market" component={MarketScreen} /> */}
      <Tab.Screen name="Settings" component={SettingsScreen} />
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

        {/* Water Stress Analysis Screens */}
        <Stack.Screen name="WaterStressDetail" component={WaterStressDetailScreen} />
        <Stack.Screen name="WaterStressLiveScan" component={WaterStressLiveScanScreen} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}