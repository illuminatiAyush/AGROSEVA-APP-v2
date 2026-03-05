// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useUserStore } from '@/store/useUserStore';
import { useTranslation } from '@/utils/i18n';
import { colors } from '@/theme/colors';

const { width } = Dimensions.get('window');
const GRADIENT_COLORS = [colors.primary, '#004D40'] as const;

// Reusable Setting Row Component
const SettingItem = ({ icon, title, value, type, onPress, color = colors.primary }: any) => (
  <TouchableOpacity
    style={styles.item}
    onPress={onPress}
    disabled={type === 'switch'}
    activeOpacity={0.7}
  >
    <View style={styles.itemLeft}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.itemText}>{title}</Text>
    </View>

    {type === 'switch' ? (
      <Switch
        value={value}
        onValueChange={onPress} // Updated to handle switch toggle via onPress prop
        trackColor={{ false: '#E0E0E0', true: color + '50' }}
        thumbColor={value ? color : '#f4f3f4'}
        style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
      />
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
  const { name: userName } = useUserStore();

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
  const [biometric, setBiometric] = useState(false);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <LinearGradient colors={GRADIENT_COLORS} style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >

        {/* === PROFILE CARD (Translated & Dynamic) === */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(userName || 'Farmer')}</Text>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#FFF" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userName || 'Soham Baviskar'}</Text>
            <Text style={styles.role}>{t('collegeName')} | {t('premiumAccount')}</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>ID: VU1F2425052</Text>
            </View>
          </View>
        </View>
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
            value={biometric}
            type="switch"
            onPress={() => setBiometric(!biometric)}
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
            value={t('connectedStatus')} // Key fixed
            color="#2E7D32"
            onPress={() => Alert.alert(t('status'), t('esp32Online'))}
          />
          <View style={styles.divider} />

          <SettingItem
            icon="location-outline"
            title={t('farmLocation')}
            value={t('farmCity')} // Dynamic Farm Location
            onPress={() => navigation.navigate('FarmSetup')}
          />
        </View>

        {/* === SUPPORT === */}
        <Text style={styles.sectionTitle}>{t('support')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon="logo-whatsapp"
            title={t('helpSupport')}
            onPress={() => Linking.openURL('whatsapp://send?phone=+919876543210&text=Hi%20AgroSeva%20Support!')}
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

        <Text style={styles.footerText}>Agroseva © 2026 Tech Spartans</Text>
        <View style={{ height: 100 }} />

      </ScrollView >
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
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    zIndex: 0,
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginTop: 10 },

  // === SCROLLVIEW STYLES ===
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 180, // Push content down
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
  valueText: { fontSize: 14, color: '#999', marginRight: 5 },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 66 },

  // Logout
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 15, borderRadius: 16, marginBottom: 20 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  footerText: { textAlign: 'center', color: '#B0BEC5', fontSize: 12 },
});
