// Zone Recommendation Card Component
// Farmer-friendly AI recommendation display with accordion

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FarmDecision, ZoneSetup, CropStandards } from '@/models/FarmSetup';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

interface ZoneRecommendationCardProps {
  zone: ZoneSetup;
  decision: FarmDecision;
  soilData: SoilData;
  weatherData: WeatherData;
}

export const ZoneRecommendationCard: React.FC<ZoneRecommendationCardProps> = ({
  zone,
  decision,
  soilData,
  weatherData,
}) => {
  const t = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const cropStandards = zone.cropStandards;

  // Get crop icon emoji
  const getCropIcon = (cropName: string): string => {
    const lower = cropName.toLowerCase();
    if (lower.includes('wheat')) return '🌾';
    if (lower.includes('rice')) return '🌾';
    if (lower.includes('cotton')) return '🌿';
    if (lower.includes('sugarcane')) return '🌱';
    if (lower.includes('maize') || lower.includes('corn')) return '🌽';
    if (lower.includes('tea')) return '🍃';
    return '🌱';
  };

  // Get action color
  const getActionColor = (action: FarmDecision['action']): string => {
    switch (action) {
      case 'IRRIGATE':
        return colors.water;
      case 'FERTILIZE':
        return colors.accent;
      case 'SOIL_CORRECTION':
        return colors.error;
      case 'WAIT':
        return colors.success;
      default:
        return colors.textLight;
    }
  };

  const getActionText = (action: FarmDecision['action']): string => {
    switch (action) {
      case 'IRRIGATE':
        return t('waterNeeded');
      case 'FERTILIZE':
        return t('fertilizerNeeded');
      case 'SOIL_CORRECTION':
        return t('soilTreatmentNeeded');
      case 'WAIT':
        return t('noActionNeeded');
      default:
        return action;
    }
  };

  const getConfidenceLevel = (confidence: number): { text: string; color: string } => {
    if (confidence >= 85) return { text: t('high'), color: colors.success };
    if (confidence >= 70) return { text: t('medium'), color: colors.accent };
    return { text: t('low'), color: colors.error };
  };

  // Format water quantity in farmer-friendly terms
  const formatWaterQuantity = (liters: number): string => {
    if (liters >= 100000) {
      const lakhs = (liters / 100000).toFixed(2);
      // Remove trailing zeros
      const cleanLakhs = parseFloat(lakhs).toString();
      return `${cleanLakhs} ${t('lakhLiters')}`;
    }
    if (liters >= 1000) {
      const thousands = (liters / 1000).toFixed(1);
      const cleanThousands = parseFloat(thousands).toString();
      return `${cleanThousands} thousand liters`;
    }
    return `${Math.round(liters)} liters`;
  };

  const getMoistureStatus = (value: number, min: number, max: number): string => {
    if (value < min * 0.7) return t('veryLow');
    if (value < min) return t('lowMoisture');
    if (value > max) return t('highMoisture');
    return t('normal');
  };

  const getPHStatus = (value: number, min: number, max: number): string => {
    if (value < min) return t('tooAcidic');
    if (value > max) return t('tooAlkaline');
    if (value < min + 0.3) return t('slightlyAcidic');
    if (value > max - 0.3) return t('slightlyHigh');
    return t('normal');
  };

  const getTempStatus = (value: number, min: number, max: number): string => {
    if (value < min) return t('tooCold');
    if (value > max) return t('tooHot');
    return t('normal');
  };

  // Extract main problem from explanation
  const getMainProblem = (): string => {
    const explanation = decision.explanation.join(' ');
    if (explanation.includes('critical') || explanation.includes('critically low')) {
      return 'Soil is too dry and may cause crop stress';
    }
    if (explanation.includes('deficiency') || explanation.includes('below')) {
      return 'Nutrients are low and may affect crop growth';
    }
    if (explanation.includes('pH') && explanation.includes('outside')) {
      return 'Soil pH is not suitable for this crop';
    }
    if (explanation.includes('optimal')) {
      return t('allConditionsGood');
    }
    return t('monitorFieldConditions');
  };

  const actionColor = getActionColor(decision.action);
  const confidence = getConfidenceLevel(decision.confidence);

  return (
    <View style={styles.card}>
      {/* Summary View - Always Visible */}
      <View style={styles.summary}>
        {/* Crop Name with Icon */}
        <View style={styles.cropHeader}>
          <Text style={styles.cropIcon}>{getCropIcon(zone.cropName)}</Text>
          <View style={styles.cropInfo}>
            <Text style={styles.cropName}>{zone.cropName}</Text>
            <Text style={styles.zoneName}>{zone.zoneName}</Text>
          </View>
        </View>

        {/* Action Badge */}
        <View style={[styles.actionBadge, { backgroundColor: actionColor + '20', borderColor: actionColor }]}>
          <MaterialCommunityIcons
            name={
              decision.action === 'IRRIGATE' ? 'water-pump' :
                decision.action === 'FERTILIZE' ? 'leaf' :
                  decision.action === 'SOIL_CORRECTION' ? 'flask-outline' :
                    'check-circle'
            }
            size={20}
            color={actionColor}
          />
          <Text style={[styles.actionText, { color: actionColor }]}>
            {getActionText(decision.action)}
          </Text>
        </View>

        {/* Water/Fertilizer Info */}
        {decision.irrigationQuantity && (
          <View style={styles.quantityRow}>
            <Ionicons name="water" size={18} color={colors.water} />
            <Text style={styles.quantityLabel}>{t('waterNeededLabel')}: </Text>
            <Text style={styles.quantityValue}>
              {decision.irrigationQuantity.mm.toFixed(0)} mm
            </Text>
          </View>
        )}
        {decision.irrigationQuantity && (
          <View style={styles.quantityRow}>
            <Ionicons name="water-outline" size={18} color={colors.water} />
            <Text style={styles.quantityLabel}>{t('totalWaterLabel')}: </Text>
            <Text style={styles.quantityValue}>
              {formatWaterQuantity(decision.irrigationQuantity.totalLiters)}
            </Text>
          </View>
        )}
        {decision.fertilizerQuantity && (
          <View style={styles.quantityRow}>
            <MaterialCommunityIcons name="leaf" size={18} color={colors.accent} />
            <Text style={styles.quantityLabel}>{t('fertilizerNeeded')}: </Text>
            <Text style={styles.quantityValue}>
              {decision.fertilizerQuantity.amount} kg/acre ({decision.fertilizerQuantity.type})
            </Text>
          </View>
        )}

        {/* Confidence Level */}
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>{t('confidence')}: </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidence.color + '20' }]}>
            <Text style={[styles.confidenceText, { color: confidence.color }]}>
              {confidence.text}
            </Text>
          </View>
        </View>
      </View>

      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>{t('whyThisAction')}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Expanded Details */}
      {isExpanded && cropStandards && (
        <View style={styles.expandedContent}>
          {/* A. Crop Requirement */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>{t('cropRequirement')}</Text>
            <Text style={styles.detailSectionSubtitle}>
              {t('yourCropGrows').replace('{crop}', zone.cropName)}
            </Text>
            <View style={styles.requirementList}>
              <Text style={styles.requirementItem}>
                • Soil moisture: {cropStandards.optimalMoistureMin}–{cropStandards.optimalMoistureMax}%
              </Text>
              <Text style={styles.requirementItem}>
                • pH: {cropStandards.idealPHMin}–{cropStandards.idealPHMax}
              </Text>
              <Text style={styles.requirementItem}>
                • Temperature: {cropStandards.optimalTempMin}–{cropStandards.optimalTempMax}°C
              </Text>
            </View>
          </View>

          {/* B. Current Field Condition */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>{t('currentFieldCondition')}</Text>
            <View style={styles.conditionList}>
              <Text style={styles.conditionItem}>
                • Soil moisture: {getMoistureStatus(soilData.moisture.value, cropStandards.optimalMoistureMin, cropStandards.optimalMoistureMax)} ({soilData.moisture.value.toFixed(1)}%)
              </Text>
              <Text style={styles.conditionItem}>
                • Soil pH: {getPHStatus(soilData.pH.value, cropStandards.idealPHMin, cropStandards.idealPHMax)} ({soilData.pH.value.toFixed(1)})
              </Text>
              <Text style={styles.conditionItem}>
                • Temperature: {getTempStatus(weatherData.temperature, cropStandards.optimalTempMin, cropStandards.optimalTempMax)} ({weatherData.temperature.toFixed(1)}°C)
              </Text>
            </View>
          </View>

          {/* C. Problem Detected */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>{t('problemDetected')}</Text>
            <View style={[styles.problemBox, { backgroundColor: actionColor === colors.error ? '#FFEBEE' : '#FFF3E0' }]}>
              <Text style={styles.problemText}>
                {getMainProblem()}
              </Text>
            </View>
          </View>

          {/* D. Decision Reason */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>{t('decisionReason')}</Text>
            <Text style={styles.reasonText}>
              {decision.explanation
                .find(e => e.toLowerCase().includes('reason:'))
                ?.replace(/reason:\s*/i, '') ||
                decision.explanation
                  .find(e => e.toLowerCase().includes('reason'))
                  ?.replace(/reason\s*/i, '') ||
                decision.explanation
                  .find(e => e.length > 50 && !e.includes(':')) ||
                t('basedOnConditions')}
            </Text>
          </View>

          {/* E. Water Calculation (if irrigation) */}
          {decision.action === 'IRRIGATE' && decision.irrigationQuantity && cropStandards && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{t('waterCalculation')}</Text>
              <View style={styles.calculationList}>
                <Text style={styles.calculationItem}>
                  • Crop has {cropStandards.rootDepth}cm deep roots (needs more water to reach all roots)
                </Text>
                <Text style={styles.calculationItem}>
                  • Soil type is {zone.soilType} (affects how much water stays in soil)
                </Text>
                <Text style={styles.calculationItem}>
                  • Temperature is {weatherData.temperature.toFixed(1)}°C (warm weather increases water loss)
                </Text>
                {decision.explanation.some(e => e.includes('rain')) && (
                  <Text style={styles.calculationItem}>
                    • Rain forecast reduced water amount by 50%
                  </Text>
                )}
              </View>
              <View style={styles.finalResultBox}>
                <Text style={styles.finalResultLabel}>{t('finalWaterRequired')}:</Text>
                <Text style={styles.finalResultValue}>
                  {decision.irrigationQuantity.mm.toFixed(0)} mm
                </Text>
                <Text style={styles.finalResultLabel}>{t('totalForZone')}:</Text>
                <Text style={styles.finalResultValue}>
                  {formatWaterQuantity(decision.irrigationQuantity.totalLiters)}
                </Text>
              </View>
            </View>
          )}

          {/* F. Trust & Control Message */}
          <View style={styles.trustBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textLight} />
            <Text style={styles.trustText}>
              {t('trustMessage')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  summary: {
    marginBottom: 12,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  zoneName: {
    fontSize: 14,
    color: colors.textLight,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  quantityLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 13,
    color: colors.textLight,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  detailSectionSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  requirementList: {
    marginLeft: 8,
  },
  requirementItem: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  conditionList: {
    marginLeft: 8,
  },
  conditionItem: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  problemBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  problemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  reasonText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  calculationList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  calculationItem: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  finalResultBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  finalResultLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
  },
  finalResultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  trustText: {
    flex: 1,
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

