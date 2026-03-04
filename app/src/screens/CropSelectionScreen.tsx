// Crop Selection & Suitability Screen
// Uses weather intelligence to recommend crops based on season and weather trends

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCropSuitabilityStore } from '@/store/useCropSuitabilityStore';
import { Season } from '@/data/cropStandards';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

const SEASONS: Season[] = ['Kharif', 'Rabi', 'Zaid'];

export default function CropSelectionScreen() {
  const t = useTranslation();
  const {
    cityInput,
    selectedSeason,
    weatherTrend,
    cropResults,
    isLoading,
    error,
    cityError,
    setCity,
    setSeason,
    loadLastCity,
    generateCropSuitability,
  } = useCropSuitabilityStore();

  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  useEffect(() => {
    loadLastCity();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'average':
        return '#FF9800';
      default:
        return '#F44336';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent':
        return t('excellent');
      case 'good':
        return t('good');
      case 'average':
        return t('average');
      default:
        return t('notRecommended');
    }
  };

  const getMatchIcon = (status: string) => {
    switch (status) {
      case 'match':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'warning':
        return { name: 'warning-outline', color: '#FF9800' };
      default:
        return { name: 'close-circle-outline', color: '#F44336' };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <Text style={styles.headerTitle}>{t('cropSelection')}</Text>
        <Text style={styles.headerSubtitle}>{t('selectSeasonForRecommendations')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Weather Summary Card */}
        {weatherTrend && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Ionicons name="cloud" size={24} color={colors.primary} />
              <Text style={styles.weatherCardTitle}>{t('weatherSummary')}</Text>
            </View>
            <Text style={styles.weatherCardLocation}>
              {t('weatherAnalyzedFor')}: {weatherTrend.detectedCity}
            </Text>
            {weatherTrend.isCached && (
              <Text style={styles.cachedWarning}>
                {t('usingCachedWeather')}
              </Text>
            )}
            <View style={styles.weatherCardDetails}>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="thermometer" size={18} color="#EF5350" />
                <Text style={styles.weatherDetailText}>
                  {t('avgTemperature')}: {weatherTrend.avgTemp}°C
                </Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="water" size={18} color="#039BE5" />
                <Text style={styles.weatherDetailText}>
                  {t('avgHumidity')}: {weatherTrend.avgHumidity}%
                </Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="rainy" size={18} color="#42A5F5" />
                <Text style={styles.weatherDetailText}>
                  {t('rainfallTrend')}: {weatherTrend.rainfallTrend}
                </Text>
              </View>
            </View>
            <Text style={styles.weatherCardNote}>
              {t('weatherTrendNote')}
            </Text>
          </View>
        )}

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('city')}</Text>
            <TextInput
              style={[styles.textInput, cityError && styles.textInputError]}
              placeholder={t('enterCityPlaceholder')}
              value={cityInput}
              onChangeText={setCity}
              placeholderTextColor="#90A4AE"
            />
            {cityError && (
              <Text style={styles.errorTextInline}>
                {cityError === 'Please enter your city name' ? t('cityRequired') : cityError}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('season')}</Text>
            <TouchableOpacity
              style={styles.pickerContainer}
              onPress={() => setShowSeasonPicker(true)}
            >
              <Text style={[styles.pickerText, !selectedSeason && styles.pickerPlaceholder]}>
                {selectedSeason || t('selectSeason')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#90A4AE" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!cityInput.trim() || !selectedSeason) && styles.submitButtonDisabled,
            ]}
            onPress={generateCropSuitability}
            disabled={!cityInput.trim() || !selectedSeason || isLoading}
          >
            <LinearGradient
              colors={
                (!cityInput.trim() || !selectedSeason)
                  ? ['#BDBDBD', '#9E9E9E']
                  : [colors.primary, '#004D40']
              }
              style={styles.submitButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="leaf" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {t('getCropSuggestions')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results Section */}
        {cropResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {t('cropSuggestions')} ({cropResults.length})
            </Text>

            {cropResults.map((result, index) => {
              const isExpanded = expandedCrop === result.crop;
              return (
                <View key={index} style={styles.cropCard}>
                  <View style={styles.cropCardHeader}>
                    <View style={styles.cropCardLeft}>
                      <View
                        style={[
                          styles.rankBadge,
                          { backgroundColor: colors.primary + '20' },
                        ]}
                      >
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.cropInfo}>
                        <Text style={styles.cropName}>{result.crop}</Text>
                        <Text style={styles.cropExplanation}>
                          {result.explanation}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cropCardRight}>
                      <View
                        style={[
                          styles.accuracyBadge,
                          { backgroundColor: getStatusColor(result.status) },
                        ]}
                      >
                        <Text style={styles.accuracyText}>
                          {result.accuracy}%
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(result.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(result.status) },
                          ]}
                        >
                          {getStatusLabel(result.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() =>
                      setExpandedCrop(isExpanded ? null : result.crop)
                    }
                  >
                    <Text style={styles.detailsButtonText}>
                      {isExpanded ? t('hideDetails') : t('whyThisCrop')}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsTitle}>
                        {t('parameterComparison')}
                      </Text>
                      {result.parameterMatches.map((match, matchIndex) => {
                        const icon = getMatchIcon(match.status);
                        return (
                          <View key={matchIndex} style={styles.parameterRow}>
                            <Ionicons
                              name={icon.name as any}
                              size={18}
                              color={icon.color}
                            />
                            <View style={styles.parameterInfo}>
                              <Text style={styles.parameterName}>
                                {match.parameter}
                              </Text>
                              <Text style={styles.parameterValues}>
                                {t('current')}: {match.current} | {t('ideal')}:{' '}
                                {match.ideal}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.parameterScore,
                                { color: getStatusColor(result.status) },
                              ]}
                            >
                              {match.score}%
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Season Picker Modal */}
        <Modal
          visible={showSeasonPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSeasonPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('selectSeason')}</Text>
                <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                  <Ionicons name="close" size={24} color="#37474F" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {SEASONS.map((season) => (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.modalItem,
                      selectedSeason === season && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSeason(season);
                      setShowSeasonPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedSeason === season && styles.modalItemTextSelected,
                      ]}
                    >
                      {season}
                    </Text>
                    {selectedSeason === season && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  inputSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#37474F',
    backgroundColor: '#FAFAFA',
  },
  textInputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  errorTextInline: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  pickerText: {
    fontSize: 16,
    color: '#37474F',
  },
  pickerPlaceholder: {
    color: '#90A4AE',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  modalItemText: {
    fontSize: 16,
    color: '#37474F',
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    flex: 1,
  },
  resultsSection: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 16,
  },
  cropCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cropCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cropCardLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 4,
  },
  cropExplanation: {
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 18,
  },
  cropCardRight: {
    alignItems: 'flex-end',
  },
  accuracyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  accuracyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 12,
  },
  parameterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  parameterInfo: {
    flex: 1,
    marginLeft: 8,
  },
  parameterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: 2,
  },
  parameterValues: {
    fontSize: 12,
    color: '#90A4AE',
  },
  parameterScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  weatherCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  weatherCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  weatherCardLocation: {
    fontSize: 14,
    color: '#90A4AE',
    marginBottom: 12,
  },
  weatherCardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherDetailText: {
    fontSize: 14,
    color: '#546E7A',
  },
  weatherCardNote: {
    fontSize: 12,
    color: '#90A4AE',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cachedWarning: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

