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
import { useTranslation } from '@/utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import * as LocalAuthentication from 'expo-local-authentication';

// REMOVED: expo-notifications (It causes crash in SDK 53)

export default function LoginScreen({ navigation }: any) {
  const t = useTranslation();
  const { biometricEnabled } = useUserStore();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticatingBiometric, setIsAuthenticatingBiometric] = useState(false);

  // 1. The Backup Hack: System Alert mimicking SMS
  const triggerFakeSMS = (formattedNumber: string) => {
    // Show a Toast first (Like "Message Sent")
    if (Platform.OS === 'android') {
      ToastAndroid.show("Verifying Network...", ToastAndroid.SHORT);
    }

    // 2 Second Delay then POPUP
    setTimeout(() => {
      // This looks like a system dialog
      Alert.alert(
        "Message from VM-Kisaan",
        `AgroSeva: Your verification code is 502791.`,
        [
          {
            text: t('autoFill'), onPress: () => {
              // Pass the code gracefully to the next screen context or alert
              navigation.navigate('OtpVerification', { mobile: formattedNumber, autoFillCode: '502791' });
            }
          }
        ]
      );
    }, 2000);
  };

  // 2. Biometric Check Effect
  React.useEffect(() => {
    const checkBiometric = async () => {
      if (!biometricEnabled) return; // Only process if they opted in from Settings

      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          setIsAuthenticatingBiometric(true);
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login to AgroSeva',
            cancelLabel: 'Use OTP Instead',
            disableDeviceFallback: true,
          });

          if (result.success) {
            // Biometric verified! Route directly to main dashboard
            navigation.replace('MainTabs');
          }
        }
      } catch (error) {
        console.warn('Biometric Error on Login:', error);
      } finally {
        setIsAuthenticatingBiometric(false);
      }
    };

    checkBiometric();
  }, [biometricEnabled]);

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      Alert.alert(t('invalidNumber'), t('enter10Digit'));
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
      triggerFakeSMS(formattedNumber);

      // Navigate to OTP Screen (will wait for autofill or just proceed)
      navigation.navigate('OtpVerification', { mobile: formattedNumber });

    } catch (error: any) {
      Alert.alert(t('loginError'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    navigation.replace('MainTabs');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      <LinearGradient
        colors={[colors.primary, '#004D40']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={60} color={colors.primary} />
          </View>
          <Text style={styles.appName}>AgroSeva</Text>
          <Text style={styles.tagline}>Smart Farming, Better Yield</Text>
        </View>
      </LinearGradient>

      <View style={styles.formArea}>
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>{t('welcomeFarmer')}</Text>
          <Text style={styles.instructionText}>{t('instructionOtp')}</Text>

          {isAuthenticatingBiometric ? (
            <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 20 }}>
              <Ionicons name="finger-print" size={60} color={colors.primary} />
              <Text style={{ marginTop: 15, color: '#546E7A', fontSize: 16 }}>Verifying Identity...</Text>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.input}
                  placeholder={t('mobileNumberLabel')}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>

              <TouchableOpacity onPress={handleSendOtp} activeOpacity={0.8} disabled={loading}>
                <LinearGradient colors={[colors.primary, '#2E7D32']} style={styles.loginBtn}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.loginText}>{t('getOtp')}</Text>
                      <Ionicons name="arrow-forward-circle" size={24} color="#FFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
            <Text style={styles.guestText}>{t('skipAsGuest')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.footerText}>{t('poweredBy')} KisaanTech © 2026</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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