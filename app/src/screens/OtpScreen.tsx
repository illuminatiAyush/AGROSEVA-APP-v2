// src/screens/OtpScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ToastAndroid
} from 'react-native';
import { useTranslation } from '@/utils/i18n';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase'; // Import Supabase

export default function OtpScreen({ route, navigation }: any) {
  const t = useTranslation();
  // Get mobile number passed from Login Screen
  const { mobile } = route.params;

  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  // Initialize with AutoFill if exists from deep link jump/Alert jump
  useEffect(() => {
    if (route.params?.autoFillCode) {
      setCode(route.params.autoFillCode);
    }
  }, [route.params?.autoFillCode]);

  // Timer Countdown
  useEffect(() => {
    let interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('invalidCode'), t('enter6Digit'));
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        phone: mobile,
        token: code,
        type: 'sms',
      });

      if (error) throw error;

      // 2. Check if we have a session
      if (data.session) {
        // 3. Success! Go to Main App
        navigation.replace('MainTabs');
      } else {
        Alert.alert(t('errorTitle'), t('verifFailedTryAgain'));
      }

    } catch (error: any) {
      Alert.alert(t('verifFailed'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: mobile });
      if (error) throw error;
      Alert.alert(t('codeSent'), t('newCodeSent'));
    } catch (error: any) {
      Alert.alert(t('errorTitle'), error.message);
    }
  };

  // Helper to render the 6 boxes
  const renderBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const digit = code[i] || '';
      const isFocused = i === code.length;

      boxes.push(
        <View key={i} style={[
          styles.otpBox,
          isFocused && styles.otpBoxActive,
          digit !== '' && styles.otpBoxFilled
        ]}>
          <Text style={styles.otpText}>{digit}</Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

        {/* Simple Top Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t('verificationCode')}</Text>
            <Text style={styles.subtitle}>
              {t('enterCodeSentTo')}{'\n'}
              <Text style={styles.bold}>{mobile}</Text>
            </Text>
          </View>

          {/* OTP Boxes Display */}
          <View style={styles.otpContainer}>
            {renderBoxes()}
          </View>

          {/* Hidden Input for typing */}
          <TextInput
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
            caretHidden={true}
          />

          {/* Verify Button */}
          <TouchableOpacity style={styles.buttonWrapper} onPress={handleVerify} disabled={loading}>
            <LinearGradient
              colors={code.length === 6 ? [colors.primary, '#2E7D32'] : ['#BDBDBD', '#9E9E9E']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading ? t('verifying') : t('verify')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend Timer */}
          <View style={styles.resendWrapper}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                {t('resendCodeIn')} <Text style={styles.bold}>00:{timer < 10 ? `0${timer}` : timer}</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>{t('resendCode')}</Text>
              </TouchableOpacity>
            )}
          </View>

        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 25 },
  header: { marginTop: 50, marginBottom: 30, alignItems: 'flex-start' },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#F5F5F5' },
  content: { flex: 1 },
  titleSection: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#757575', lineHeight: 24 },
  bold: { color: '#333', fontWeight: 'bold' },

  // OTP Box Styles
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpBox: {
    width: 45,
    height: 55,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center'
  },
  otpBoxActive: { borderColor: colors.primary, backgroundColor: '#FFF', elevation: 2 },
  otpBoxFilled: { backgroundColor: '#FFF', borderColor: '#333' },
  otpText: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  // Hidden Input overlaps the boxes invisibly so keyboard works
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: 100,
    top: 150, // positions it over the boxes area
    opacity: 0
  },

  buttonWrapper: { marginTop: 10 },
  button: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  resendWrapper: { marginTop: 30, alignItems: 'center' },
  timerText: { color: '#9E9E9E', fontSize: 14 },
  resendLink: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
});