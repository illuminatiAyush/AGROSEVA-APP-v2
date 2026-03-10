import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/utils/colors';

interface StatusIndicatorProps {
  status: 'healthy' | 'needs_attention' | 'critical' | 'none' | 'low' | 'medium' | 'high' | 'severe';
  label?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
      case 'none':
        return Colors.success;
      case 'needs_attention':
      case 'low':
        return Colors.warning;
      case 'critical':
      case 'high':
      case 'severe':
        return Colors.error;
      case 'medium':
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'needs_attention':
        return 'Needs Attention';
      case 'critical':
        return 'Critical';
      case 'none':
        return 'None';
      case 'low':
        return 'Low';
      case 'medium':
        return 'Medium';
      case 'high':
        return 'High';
      case 'severe':
        return 'Severe';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={styles.status}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  status: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
});

