// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Dimensions, StatusBar, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useUserStore } from '@/store/useUserStore';
import { useTranslation } from '@/utils/i18n';
import { colors } from '@/theme/colors';

import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePumpStore } from '@/store/usePumpStore';

const { width } = Dimensions.get('window');
const GRADIENT_COLORS = [colors.primary, '#004D40'] as const;

// Reusable Setting Row Component
const SettingItem = ({ icon, title, value, type, onPress, color = colors.primary, subValue, isLoading = false }: any) => (
  <TouchableOpacity
    style={styles.item}
    onPress={onPress}
    disabled={type === 'switch' || isLoading}
    activeOpacity={0.7}
  >
    <View style={styles.itemLeft}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.itemText}>{title}</Text>
        {subValue && <Text style={styles.subValueText}>{subValue}</Text>}
      </View>
    </View>

    {type === 'switch' ? (
      <Switch
        value={value}
        onValueChange={onPress} // Updated to handle switch toggle via onPress prop
        trackColor={{ false: '#E0E0E0', true: color + '50' }}
        thumbColor={value ? color : '#f4f3f4'}
        style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
      />
    ) : isLoading ? (
      <ActivityIndicator size="small" color={color} />
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {value && <Text style={styles.valueText}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#CCC" style={{ marginLeft: 5 }} />
      </View>
    )}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }: any) {
  const t = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { name: userName, setName, mobile: userMobile, setMobile, location: userLocation, setLocation, biometricEnabled, setBiometric } = useUserStore();
  const { isConnected, checkConnectivity } = usePumpStore();
  const { markAsRead, hasUnread } = useNotificationStore();

  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editMobile, setEditMobile] = useState(userMobile);
  const [isLocating, setIsLocating] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const [notifications, setNotifications] = useState(true);
  const [stormAlerts, setStormAlerts] = useState(true);

  // Mark notifications as read when entering settings
  React.useEffect(() => {
    if (hasUnread) {
      markAsRead();
    }
    // Refresh connectivity on entry
    checkConnectivity();
  }, []);

  const handleLanguageChange = () => {
    Alert.alert(
      t('selectLanguage'),
      t('chooseLanguage'),
      [
        { text: "English", onPress: () => setLanguage('en') },
        { text: "हिंदी", onPress: () => setLanguage('hi') },
        { text: "मराठी", onPress: () => setLanguage('mr') },
        { text: t('cancel'), style: "cancel" }
      ]
    );
  };

  const handleBiometricToggle = async (newValue: boolean) => {
    if (!newValue) {
      setBiometric(false);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('⚠️ Not Supported', 'Your device does not support biometrics or has no fingerprints/face enrolled.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable Biometric Login',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setBiometric(true);
      } else {
        Alert.alert('❌ Verification Failed', 'Authentication was unsuccessful.');
      }
    } catch (e) {
      console.warn('Biometric error:', e);
      Alert.alert('⚠️ Error', 'Could not access biometric hardware.');
    }
  };

  const handleFetchLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to fetch your farm location.');
        return;
      }

      const locationResponse = await Location.getCurrentPositionAsync({});
      // Reverse Geocode
      const [address] = await Location.reverseGeocodeAsync({
        latitude: locationResponse.coords.latitude,
        longitude: locationResponse.coords.longitude
      });

      if (address) {
        const fullLocation = `${address.city || address.subregion || address.district}, ${address.region || address.name}`;
        setLocation(fullLocation);
        Alert.alert('Location Updated', `Successfully fetched: ${fullLocation}`);
      }
    } catch (e: any) {
      Alert.alert('Location Error', 'Could not fetch your location precisely. Please check your connection or GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logoutConfirm'),
      t('logoutQuestion'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('logoutConfirm'),
          style: "destructive",
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          }
        }
      ]
    );
  };

  const handleSaveProfile = () => {
    if (editName.trim().length === 0 || editMobile.trim().length === 0) {
      Alert.alert(t('errorTitle') || 'Error', 'Fields cannot be empty.');
      return;
    }
    setName(editName.trim());
    setMobile(editMobile.trim());
    setIsEditProfileVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <LinearGradient colors={GRADIENT_COLORS} style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
        </LinearGradient>

        <View style={styles.innerContent}>
          {/* === PROFILE CARD (Translated & Dynamic) === */}
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.8}
            onPress={() => {
              setEditName(userName);
              setEditMobile(userMobile);
              setIsEditProfileVisible(true);
            }}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#FFF" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userName}</Text>
              <Text style={styles.role}>{userMobile} | {t('premiumAccount')}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: VU1F2425052</Text>
              </View>
            </View>
          </TouchableOpacity>
          {/* === PREFERENCES === */}
          <Text style={styles.sectionTitle}>{t('appPreferences')}</Text>
          <View style={styles.section}>
            <SettingItem
              icon="language-outline"
              title={`${t('language')} (${language.toUpperCase()})`}
              onPress={handleLanguageChange}
            />
            <View style={styles.divider} />

            <SettingItem
              icon="notifications-outline"
              title={t('irrigationAlerts')}
              value={notifications}
              type="switch"
              onPress={() => setNotifications(!notifications)}
            />
            <View style={styles.divider} />

            <SettingItem
              icon="thunderstorm-outline"
              title={t('stormWarnings')}
              value={stormAlerts}
              type="switch"
              onPress={() => setStormAlerts(!stormAlerts)}
              color="#E64A19"
            />
            <View style={styles.divider} />

            <SettingItem
              icon="finger-print-outline"
              title={t('biometricLogin')}
              value={biometricEnabled}
              type="switch"
              onPress={handleBiometricToggle}
            />
          </View>

          {/* === FARM CONFIGURATION === */}
          <Text style={styles.sectionTitle}>{t('farmSystem')}</Text>
          <View style={styles.section}>
            <SettingItem
              icon="options-outline"
              title={t('configureFarmZones')}
              onPress={() => navigation.navigate('FarmSetup')}
              color={colors.secondary}
            />
            <View style={styles.divider} />

            <SettingItem
              icon="grid-outline"
              title={t('planSensors')}
              onPress={() => navigation.navigate('SensorPlanner')}
              color={colors.primary}
            />
            <View style={styles.divider} />

            <SettingItem
              icon="hardware-chip-outline"
              title={t('iotController')}
              value={isConnected ? t('connectedStatus') : 'Offline'}
              color={isConnected ? "#2E7D32" : "#D32F2F"}
              onPress={() => {
                checkConnectivity();
                Alert.alert(t('status'), isConnected ? t('esp32Online') : 'Controller is currently offline.');
              }}
            />
            <View style={styles.divider} />

            <SettingItem
              icon="location-outline"
              title={t('farmLocation')}
              value={userLocation || t('farmCity')}
              onPress={handleFetchLocation}
              isLoading={isLocating}
            />
          </View>

          {/* === SUPPORT === */}
          <Text style={styles.sectionTitle}>{t('support')}</Text>
          <View style={styles.section}>
            <SettingItem
              icon="logo-whatsapp"
              title={t('helpSupport')}
              onPress={() => Linking.openURL('whatsapp://send?phone=+918652706901&text=Hi%20AgroSeva%20Support!')}
              color="#25D366"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="information-circle-outline"
              title={t('aboutAgroseva')}
              value={t('appVersion')} // Dynamic Version
              onPress={() => Alert.alert("AgroSeva", `${t('builtBy')}\n${t('forSIH')}`)}
              color="#1976D2"
            />
          </View>

          {/* === LOGOUT === */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
            <Text style={styles.logoutText}>{t('logOut')}</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>Agroseva © 2026 MAVERICKS</Text>
          <View style={{ height: 100 }} />
        </View>

      </ScrollView >

      {/* === EDIT PROFILE MODAL === */}
      <Modal
        visible={isEditProfileVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.modalSubtitle}>Update your details easily</Text>

            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.modalInput}
              value={editMobile}
              onChangeText={setEditMobile}
              placeholder="Enter your phone (+91 ...)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setIsEditProfileVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View >
  );
}

// ... styles unchanged ...

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // === HEADER STYLES ===
  header: {
    height: 180,
    paddingTop: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginTop: 10 },

  // === SCROLLVIEW STYLES ===
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  innerContent: {
    paddingHorizontal: 20,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginTop: -50,
    marginBottom: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center'
  },
  avatarContainer: { position: 'relative' },
  avatarText: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', lineHeight: 60 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#333', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

  profileInfo: { marginLeft: 15, flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  role: { fontSize: 12, color: '#757575', marginBottom: 6 },
  idBadge: { backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  idText: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },

  // Section
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#90A4AE', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 25, elevation: 2 },

  // Setting Item
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemText: { fontSize: 16, color: '#333', fontWeight: '500' },
  subValueText: { fontSize: 11, color: '#999', marginTop: 2 },
  valueText: { fontSize: 14, color: '#999', marginRight: 5 },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 66 },

  // Logout
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 15, borderRadius: 16, marginBottom: 20 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  footerText: { textAlign: 'center', color: '#B0BEC5', fontSize: 12 },

  // === MODAL STYLES ===
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 25, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#757575', marginBottom: 20 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 25 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalCancelBtn: { backgroundColor: '#F5F5F5' },
  modalCancelText: { color: '#757575', fontWeight: '600', fontSize: 15 },
  modalSaveBtn: { backgroundColor: colors.primary },
  modalSaveText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
