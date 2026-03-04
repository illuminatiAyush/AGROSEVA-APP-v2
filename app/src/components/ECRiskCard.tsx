// EC Risk Assessment Card Component
// Displays real-time EC (Electrical Conductivity) risk score with explainable breakdown
// This is a SEPARATE feature from Advanced Soil Risk Card

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ECRiskResult } from '@/services/ECRiskService';
import { analyzeECTemperature, ECTemperatureAnalysisResult } from '@/services/ECTemperatureAnalysisService';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

interface ECRiskCardProps {
  ecRiskResult: ECRiskResult;
  sensorValues: {
    waterPH: number;
    avgSoilMoisture: number;
    temperature: number;
    humidity: number;
  };
  cropInfo?: {
    cropName: string;
    cropStage: string;
  };
}

export const ECRiskCard: React.FC<ECRiskCardProps> = ({
  ecRiskResult,
  sensorValues,
  cropInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false);
  const t = useTranslation();

  // Calculate temperature stress analysis if crop info is available
  const temperatureAnalysis: ECTemperatureAnalysisResult | null = useMemo(() => {
    if (cropInfo?.cropName && cropInfo?.cropStage && sensorValues.temperature != null) {
      return analyzeECTemperature({
        cropName: cropInfo.cropName,
        cropStage: cropInfo.cropStage,
        realTimeTemperature: sensorValues.temperature,
      });
    }
    return null;
  }, [cropInfo, sensorValues.temperature]);

  // Get color based on EC risk level
  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'Low':
        return '#4CAF50';
      case 'Moderate':
        return '#8BC34A';
      case 'High':
        return '#FF9800';
      case 'Severe':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  // Get gradient colors based on risk level
  const getGradientColors = (level: string): string[] => {
    switch (level) {
      case 'Low':
        return ['#4CAF50', '#388E3C'];
      case 'Moderate':
        return ['#8BC34A', '#689F38'];
      case 'High':
        return ['#FF9800', '#F57C00'];
      case 'Severe':
        return ['#F44336', '#D32F2F'];
      default:
        return ['#757575', '#616161'];
    }
  };

  // Get icon based on risk level
  const getRiskIcon = (level: string): string => {
    switch (level) {
      case 'Low':
        return 'checkmark-circle';
      case 'Moderate':
        return 'warning-outline';
      case 'High':
        return 'alert-circle';
      case 'Severe':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const riskColor = getRiskColor(ecRiskResult.level);
  const gradientColors = getGradientColors(ecRiskResult.level);
  const riskIcon = getRiskIcon(ecRiskResult.level);

  // Get color for temperature risk level
  const getTemperatureRiskColor = (level: string): string => {
    switch (level) {
      case 'Safe':
        return '#4CAF50';
      case 'Mild Stress':
        return '#8BC34A';
      case 'Moderate Stress':
        return '#FF9800';
      case 'High Stress':
        return '#FF6F00';
      case 'Severe Stress':
        return '#F44336';
      case 'Extreme Stress':
        return '#D32F2F';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${riskColor}15` }]}>
            <Ionicons name={riskIcon} size={24} color={riskColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('ecRiskAssessment')}</Text>
            <Text style={styles.subtitle}>{t('calculatedFromLiveSensors')}</Text>
          </View>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: riskColor }]}>
          <Text style={styles.scoreText}>{ecRiskResult.score}</Text>
        </View>
      </View>

      {/* Risk Level Badge */}
      <View style={styles.riskLevelContainer}>
        <LinearGradient
          colors={gradientColors}
          style={styles.riskLevelBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name={riskIcon} size={16} color="#FFF" />
          <Text style={styles.riskLevelText}>{ecRiskResult.level}</Text>
        </LinearGradient>
      </View>

      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {isExpanded ? t('hideDetails') : t('whyECRisk')}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Expanded Details */}
      {isExpanded && (
        <View style={styles.detailsContainer}>
          {/* EC Risk Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>{t('ecRiskBreakdown')}</Text>
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="flask" size={16} color="#8E24AA" />
                <Text style={styles.breakdownText}>{t('waterPHRisk')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {ecRiskResult.breakdown.phScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.waterPH.toFixed(1)} pH
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="water" size={16} color="#00897B" />
                <Text style={styles.breakdownText}>{t('moistureRisk')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {ecRiskResult.breakdown.moistureScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.avgSoilMoisture.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="thermometer" size={16} color="#EF5350" />
                <Text style={styles.breakdownText}>{t('temperatureRisk')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {ecRiskResult.breakdown.temperatureScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.temperature.toFixed(1)}°C
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="water-outline" size={16} color="#039BE5" />
                <Text style={styles.breakdownText}>{t('humidityRisk')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {ecRiskResult.breakdown.humidityScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.humidity.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Reasons */}
          {ecRiskResult.reasons.length > 0 && (
            <View style={styles.reasonsSection}>
              <Text style={styles.sectionTitle}>{t('ecKeyFactors')}</Text>
              {ecRiskResult.reasons.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <Ionicons name="information-circle" size={16} color={riskColor} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Farmer Advice */}
          {ecRiskResult.farmerAdvice.length > 0 && (
            <View style={styles.adviceSection}>
              <Text style={styles.sectionTitle}>{t('ecRecommendedActions')}</Text>
              {ecRiskResult.farmerAdvice.map((advice, index) => (
                <View key={index} style={styles.adviceItem}>
                  <Ionicons name="bulb" size={16} color="#FFC107" />
                  <Text style={styles.adviceText}>{advice}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Temperature Stress Analysis Section (ADDITIVE feature) */}
      {temperatureAnalysis && (
        <View style={styles.temperatureSection}>
          <View style={styles.temperatureHeader}>
            <View style={styles.temperatureHeaderLeft}>
              <View style={[styles.temperatureIconContainer, { backgroundColor: `${getTemperatureRiskColor(temperatureAnalysis.temperatureRiskLevel)}15` }]}>
                <Ionicons name="thermometer" size={20} color={getTemperatureRiskColor(temperatureAnalysis.temperatureRiskLevel)} />
              </View>
              <View style={styles.temperatureHeaderText}>
                <Text style={styles.temperatureSectionTitle}>
                  Temperature Stress Analysis
                </Text>
                <Text style={styles.temperatureSubtitle}>
                  Calculated using live temperature and crop growth stage
                </Text>
              </View>
            </View>
            <View style={[styles.temperatureBadge, { backgroundColor: getTemperatureRiskColor(temperatureAnalysis.temperatureRiskLevel) }]}>
              <Text style={styles.temperatureBadgeText}>
                {temperatureAnalysis.temperatureRiskLevel}
              </Text>
            </View>
          </View>

          {/* Temperature Explanation */}
          <Text style={styles.temperatureExplanation}>
            {temperatureAnalysis.explanation}
          </Text>

          {/* Toggle for Temperature Details */}
          <TouchableOpacity
            style={styles.temperatureToggleButton}
            onPress={() => setIsTemperatureExpanded(!isTemperatureExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.temperatureToggleText}>
              {isTemperatureExpanded 
                ? t('hideDetails')
                : 'Why temperature matters?'}
            </Text>
            <Ionicons
              name={isTemperatureExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* Expanded Temperature Details */}
          {isTemperatureExpanded && (
            <View style={styles.temperatureDetailsContainer}>
              {/* Irrigation Advice */}
              <View style={styles.temperatureAdviceItem}>
                <View style={styles.temperatureAdviceHeader}>
                  <Ionicons name="water" size={18} color="#039BE5" />
                  <Text style={styles.temperatureAdviceTitle}>
                    Irrigation Advice
                  </Text>
                </View>
                <Text style={styles.temperatureAdviceText}>
                  {temperatureAnalysis.irrigationAdvice}
                </Text>
              </View>

              {/* Fertilizer Advice */}
              <View style={styles.temperatureAdviceItem}>
                <View style={styles.temperatureAdviceHeader}>
                  <Ionicons name="leaf" size={18} color="#43A047" />
                  <Text style={styles.temperatureAdviceTitle}>
                    Fertilizer Advice
                  </Text>
                </View>
                <Text style={styles.temperatureAdviceText}>
                  {temperatureAnalysis.fertilizerAdvice}
                </Text>
              </View>

              {/* Temperature Risk Score */}
              <View style={styles.temperatureScoreContainer}>
                <Text style={styles.temperatureScoreLabel}>
                  Temperature Risk Score
                </Text>
                <Text style={[styles.temperatureScoreValue, { color: getTemperatureRiskColor(temperatureAnalysis.temperatureRiskLevel) }]}>
                  {temperatureAnalysis.temperatureRiskScore}/100
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#78909C',
  },
  scoreBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  scoreText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskLevelContainer: {
    marginBottom: 12,
  },
  riskLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  riskLevelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  breakdownSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  breakdownText: {
    fontSize: 14,
    color: '#37474F',
  },
  breakdownValue: {
    alignItems: 'flex-end',
  },
  breakdownScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  breakdownSensor: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  reasonsSection: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#546E7A',
    flex: 1,
    lineHeight: 20,
  },
  adviceSection: {
    marginBottom: 8,
  },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
  },
  adviceText: {
    fontSize: 14,
    color: '#37474F',
    flex: 1,
    lineHeight: 20,
  },
  // Temperature Stress Analysis Styles
  temperatureSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  temperatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  temperatureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  temperatureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  temperatureHeaderText: {
    flex: 1,
  },
  temperatureSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 2,
  },
  temperatureSubtitle: {
    fontSize: 11,
    color: '#78909C',
  },
  temperatureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  temperatureBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  temperatureExplanation: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 12,
  },
  temperatureToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
  },
  temperatureToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  temperatureDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  temperatureAdviceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  temperatureAdviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  temperatureAdviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  temperatureAdviceText: {
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 18,
  },
  temperatureScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  temperatureScoreLabel: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '500',
  },
  temperatureScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});


