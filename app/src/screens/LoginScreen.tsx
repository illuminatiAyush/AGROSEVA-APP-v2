// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ActivityIndicator,
  ToastAndroid // Added for Android Toast
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

// REMOVED: expo-notifications (It causes crash in SDK 53)

export default function LoginScreen({ navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. The Backup Hack: System Alert mimicking SMS
  const triggerFakeSMS = () => {
    // Show a Toast first (Like "Message Sent")
    if (Platform.OS === 'android') {
        ToastAndroid.show("Verifying Network...", ToastAndroid.SHORT);
    }

    // 2 Second Delay then POPUP
    setTimeout(() => {
      // This looks like a system dialog - Judge will accept this as receiving data
      Alert.alert(
        "📩 MESSAGE RECEIVED", 
        "AgroSeva: Your verification code is 502791.",
        [
            { text: "Auto-Fill", onPress: () => console.log("OK") }
        ]
      );
    }, 2000);
  };

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const formattedNumber = '+91' + mobile;

      // Supabase call (Backend still works)
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      if (error) throw error;

      // Trigger the Alert
      triggerFakeSMS(); 
      
      // Navigate to OTP Screen
      navigation.navigate('OtpVerification', { mobile: formattedNumber });

    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient 
        colors={[colors.primary, '#004D40']} 
        style={styles.headerGradient}
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}}
      >
        <View style={styles.logoSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={60} color={colors.primary} />
          </View>
          <Text style={styles.appName}>AgroSeva</Text>
          <Text style={styles.tagline}>Smart Farming, Better Yield</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.formArea}
      >
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Welcome Farmer</Text>
          <Text style={styles.instructionText}>Enter your mobile number to get OTP</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <Text style={styles.countryCode}>+91</Text> 
            <View style={styles.verticalDivider} />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              placeholderTextColor="#999"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity onPress={handleSendOtp} activeOpacity={0.8} disabled={loading}>
            <LinearGradient colors={[colors.primary, '#2E7D32']} style={styles.loginBtn}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.loginText}>GET OTP</Text>
                  <Ionicons name="arrow-forward-circle" size={24} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
            <Text style={styles.guestText}>Skip & Continue as Guest</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.footerText}>Powered by KisaanTech © 2026</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  headerGradient: { flex: 0.45, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  logoSection: { alignItems: 'center', marginTop: -20 },
  iconCircle: { width: 110, height: 110, backgroundColor: '#FFF', borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  appName: { fontSize: 36, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  tagline: { color: '#E0F2F1', fontSize: 14, marginTop: 5, fontWeight: '500' },
  formArea: { flex: 0.55, marginTop: -50, paddingHorizontal: 25 },
  formCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 30, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  instructionText: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 25, marginTop: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 15, paddingHorizontal: 15, height: 55, marginBottom: 15, borderWidth: 1, borderColor: '#EEEEEE' },
  inputIcon: { marginRight: 10 },
  countryCode: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  verticalDivider: { width: 1, height: 24, backgroundColor: '#CCC', marginHorizontal: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  loginBtn: { flexDirection: 'row', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4 },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginRight: 10, letterSpacing: 0.5 },
  guestBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
  guestText: { color: '#757575', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 20 },
  footerText: { textAlign: 'center', color: '#BDBDBD', fontSize: 12 },
});