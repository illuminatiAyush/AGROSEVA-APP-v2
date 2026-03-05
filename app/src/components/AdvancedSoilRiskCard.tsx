// Advanced Soil Risk Assessment Card Component
// Displays real-time soil risk score with explainable breakdown

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AdvancedSoilRiskResult } from '@/services/AdvancedSoilRiskService';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

interface AdvancedSoilRiskCardProps {
  riskResult: AdvancedSoilRiskResult;
  sensorValues: {
    moisture: number;
    temperature: number;
    humidity: number;
    pH: number;
  };
}

export const AdvancedSoilRiskCard: React.FC<AdvancedSoilRiskCardProps> = ({
  riskResult,
  sensorValues,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslation();

  // Get color based on risk level
  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'Healthy':
        return '#4CAF50';
      case 'Mild Stress':
        return '#8BC34A';
      case 'High Stress':
        return '#FF9800';
      case 'Severe Stress':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  // Get gradient colors based on risk level
  const getGradientColors = (level: string): readonly [string, string] => {
    switch (level) {
      case 'Healthy':
        return ['#4CAF50', '#388E3C'];
      case 'Mild Stress':
        return ['#8BC34A', '#689F38'];
      case 'High Stress':
        return ['#FF9800', '#F57C00'];
      case 'Severe Stress':
        return ['#F44336', '#D32F2F'];
      default:
        return ['#757575', '#616161'];
    }
  };

  // Get icon based on risk level
  const getRiskIcon = (level: string): any => {
    switch (level) {
      case 'Healthy':
        return 'checkmark-circle';
      case 'Mild Stress':
        return 'warning-outline';
      case 'High Stress':
        return 'alert-circle';
      case 'Severe Stress':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const riskColor = getRiskColor(riskResult.level);
  const gradientColors = getGradientColors(riskResult.level);
  const riskIcon = getRiskIcon(riskResult.level);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${riskColor}15` }]}>
            <Ionicons name={riskIcon} size={24} color={riskColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('advancedSoilRisk')}</Text>
            <Text style={styles.subtitle}>{t('calculatedFromLiveSensors')}</Text>
          </View>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: riskColor }]}>
          <Text style={styles.scoreText}>{riskResult.score}</Text>
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
          <Text style={styles.riskLevelText}>{riskResult.level}</Text>
        </LinearGradient>
      </View>

      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {isExpanded ? t('hideDetails') : t('whyThisRisk')}
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
          {/* Stress Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>{t('stressBreakdown')}</Text>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="water" size={16} color="#1E88E5" />
                <Text style={styles.breakdownText}>{t('moistureStress')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {riskResult.breakdown.moistureScore}/30
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.moisture}%
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="thermometer" size={16} color="#EF5350" />
                <Text style={styles.breakdownText}>{t('heatStress')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {riskResult.breakdown.heatScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.temperature}°C
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="water-outline" size={16} color="#039BE5" />
                <Text style={styles.breakdownText}>{t('humidityStress')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {riskResult.breakdown.humidityScore}/20
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.humidity}%
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <Ionicons name="flask" size={16} color="#8E24AA" />
                <Text style={styles.breakdownText}>{t('phRisk')}</Text>
              </View>
              <View style={styles.breakdownValue}>
                <Text style={[styles.breakdownScore, { color: riskColor }]}>
                  {riskResult.breakdown.pHScore}/25
                </Text>
                <Text style={styles.breakdownSensor}>
                  {sensorValues.pH.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Reasons */}
          {riskResult.reasons.length > 0 && (
            <View style={styles.reasonsSection}>
              <Text style={styles.sectionTitle}>{t('keyFactors')}</Text>
              {riskResult.reasons.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <Ionicons name="information-circle" size={16} color={riskColor} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Farmer Advice */}
          {riskResult.farmerAdvice.length > 0 && (
            <View style={styles.adviceSection}>
              <Text style={styles.sectionTitle}>{t('recommendedActions')}</Text>
              {riskResult.farmerAdvice.map((advice, index) => (
                <View key={index} style={styles.adviceItem}>
                  <Ionicons name="bulb" size={16} color="#FFC107" />
                  <Text style={styles.adviceText}>{advice}</Text>
                </View>
              ))}
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
});


