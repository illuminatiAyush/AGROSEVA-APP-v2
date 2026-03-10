// Crop Recommendation Card Component
// Displays season-based crop recommendation with XAI

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CropRecommendation } from '@/ai/CropRecommendationEngine';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

interface CropRecommendationCardProps {
  recommendation: CropRecommendation;
}

export function CropRecommendationCard({ recommendation }: CropRecommendationCardProps) {
  const t = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getMatchIcon = (match: string) => {
    switch (match) {
      case 'excellent':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'good':
        return { name: 'checkmark-circle-outline', color: '#8BC34A' };
      case 'fair':
        return { name: 'warning-outline', color: '#FF9800' };
      default:
        return { name: 'close-circle-outline', color: '#F44336' };
    }
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[colors.primary + '15', colors.primary + '05']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="leaf" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('recommendedCrop')}</Text>
              <Text style={styles.subtitle}>{recommendation.season} {t('season')}</Text>
            </View>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(recommendation.suitabilityScore) }]}>
            <Text style={styles.scoreText}>{recommendation.suitabilityScore}%</Text>
          </View>
        </View>

        {/* Crop Name */}
        <View style={styles.cropSection}>
          <Text style={styles.cropName}>{recommendation.crop}</Text>
          <View style={styles.waterBadge}>
            <Ionicons name="water" size={14} color="#2196F3" />
            <Text style={styles.waterText}>{recommendation.waterRequirement}</Text>
          </View>
        </View>

        {/* Explanation */}
        <Text style={styles.explanation}>{recommendation.explanation}</Text>

        {/* Toggle Details Button */}
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={styles.detailsButtonText}>
            {showDetails ? t('hideDetails') : t('whyThisCrop')}
          </Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>

        {/* Detailed XAI Section */}
        {showDetails && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>{t('parameterComparison')}</Text>
            
            {recommendation.parameterMatches.map((match, index) => {
              const icon = getMatchIcon(match.match);
              return (
                <View key={index} style={styles.parameterRow}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                  <View style={styles.parameterInfo}>
                    <Text style={styles.parameterName}>{match.parameter}</Text>
                    <Text style={styles.parameterValues}>
                      {t('current')}: {match.current} | {t('ideal')}: {match.ideal}
                    </Text>
                  </View>
                  <Text style={[styles.parameterScore, { color: getScoreColor(match.score) }]}>
                    {match.score}%
                  </Text>
                </View>
              );
            })}

            <View style={styles.confidenceSection}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={styles.confidenceText}>
                {t('confidence')}: {recommendation.confidence}%
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    padding: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#90A4AE',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cropSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cropName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  waterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waterText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  explanation: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 12,
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
  confidenceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
});



