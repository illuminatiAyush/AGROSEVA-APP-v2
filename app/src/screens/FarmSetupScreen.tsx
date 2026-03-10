// Farm Setup Screen
// User enters zone configuration and crop details

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFarmSetupStore } from '@/store/useFarmSetupStore';
import { useTranslation } from '@/utils/i18n';
import { colors } from '@/theme/colors';
import { ZONES } from '@/utils/constants';
import { SoilType } from '@/models/FarmSetup';

export default function FarmSetupScreen({ navigation }: any) {
  const t = useTranslation();
  const { zones, loading, error, addZone, fetchCropStandards, loadFromStorage } = useFarmSetupStore();

  const [zoneId, setZoneId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [cropName, setCropName] = useState('');
  const [farmArea, setFarmArea] = useState('');
  const [soilType, setSoilType] = useState<SoilType>('loamy');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (!zoneId.trim() || !zoneName.trim()) {
      Alert.alert(t('errorTitle'), t('enterZoneId'));
      return;
    }

    if (!cropName.trim()) {
      Alert.alert(t('errorTitle'), t('enterCropName'));
      return;
    }

    const area = parseFloat(farmArea);
    if (!farmArea.trim() || isNaN(area) || area <= 0) {
      Alert.alert(t('errorTitle'), t('enterFarmArea'));
      return;
    }

    // Check if zone already exists
    const existingZone = zones.find(z => z.zoneId === zoneId);
    if (existingZone) {
      Alert.alert(t('errorTitle'), t('zoneExists').replace('{id}', zoneId));
      return;
    }

    setSubmitting(true);

    try {
      // Add zone (without crop standards first)
      await addZone({
        zoneId: zoneId.trim(),
        zoneName: zoneName.trim(),
        cropName: cropName.trim(),
        farmArea: area,
        soilType,
      });

      // Fetch crop standards from Gemini (will be called automatically by addZone)
      // But we can also call it explicitly to show loading
      await fetchCropStandards(zoneId.trim(), cropName.trim());

      Alert.alert(t('successTitle'), t('farmSetupComplete'), [
        {
          text: t('ok'),
          onPress: () => {
            // Reset form
            setZoneId('');
            setZoneName('');
            setCropName('');
            setFarmArea('');
            setSoilType('loamy');
            // Navigate back or to dashboard
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(t('errorTitle'), error.message || t('failedSetupFarm'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectZoneFromList = (zone: typeof ZONES[0]) => {
    setZoneId(zone.id);
    setZoneName(zone.name);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('farmSetup')}</Text>
        <Text style={styles.subtitle}>{t('configureZoneCrop')}</Text>
      </View>

      {/* Quick Zone Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('quickSelectZone')}</Text>
        <View style={styles.zoneGrid}>
          {ZONES.map(zone => (
            <TouchableOpacity
              key={zone.id}
              style={[
                styles.zoneButton,
                zoneId === zone.id && styles.zoneButtonActive,
              ]}
              onPress={() => selectZoneFromList(zone as typeof ZONES[0])}
            >
              <Text
                style={[
                  styles.zoneButtonText,
                  zoneId === zone.id && styles.zoneButtonTextActive,
                ]}
              >
                {zone.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('zoneDetails')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('zoneIdLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., zone_1"
            value={zoneId}
            onChangeText={setZoneId}
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('zoneNameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., North Field"
            value={zoneName}
            onChangeText={setZoneName}
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('cropNameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Wheat, Rice, Cotton"
            value={cropName}
            onChangeText={setCropName}
            editable={!submitting}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            {t('aiFetchHint').replace('* ', '')}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('farmArea')} ({t('acres')}) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5.5"
            value={farmArea}
            onChangeText={setFarmArea}
            keyboardType="decimal-pad"
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('soilTypeLabel')}</Text>
          <View style={styles.soilTypeContainer}>
            {(['sandy', 'loamy', 'clay'] as SoilType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.soilTypeButton,
                  soilType === type && styles.soilTypeButtonActive,
                ]}
                onPress={() => setSoilType(type)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.soilTypeText,
                    soilType === type && styles.soilTypeTextActive,
                  ]}
                >
                  {t(type as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Existing Zones */}
      {zones.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('configuredZones')} ({zones.length})</Text>
          {zones.map(zone => (
            <View key={zone.zoneId} style={styles.zoneCard}>
              <Text style={styles.zoneCardTitle}>{zone.zoneName}</Text>
              <Text style={styles.zoneCardText}>{t('cropType')}: {zone.cropName}</Text>
              <Text style={styles.zoneCardText}>
                {t('farmArea')}: {zone.farmArea} {t('acres')} | {t('soilTypeLabel')}: {t(zone.soilType as any)}
              </Text>
              {zone.cropStandards ? (
                <View style={styles.standardsBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.standardsText}>{t('standardsLoaded')}</Text>
                </View>
              ) : (
                <View style={styles.standardsBadge}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.standardsText}>{t('loadingStandards')}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || loading}
      >
        {submitting || loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>{t('saveFetchStandards')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('aiFetchHint')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: -10,
    left: -10,
    padding: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  zoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  zoneButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  zoneButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  zoneButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },
  soilTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  soilTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.textLight,
    alignItems: 'center',
  },
  soilTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  soilTypeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  soilTypeTextActive: {
    color: '#FFF',
  },
  zoneCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  zoneCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  zoneCardText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 3,
  },
  standardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  standardsText: {
    fontSize: 12,
    color: colors.textLight,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
});

