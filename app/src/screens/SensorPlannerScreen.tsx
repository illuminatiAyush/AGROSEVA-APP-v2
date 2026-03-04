/**
 * Sensor Planner Screen
 * Paper-style drag & drop interface for planning sensor installation per zone.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSensorPlannerStore, InstalledSensor } from '@/store/useSensorPlannerStore';
import { CropType, SensorType, SENSOR_COSTS } from '@/ai/SensorPlanningEngine';
import { colors } from '@/theme/colors';
import { ZONES } from '@/utils/constants';

const { width, height } = Dimensions.get('window');
const ZONE_CONTAINER_HEIGHT = height * 0.4;
const SENSOR_TRAY_HEIGHT = 120;

// Sensor type configurations
const SENSOR_CONFIGS: Record<SensorType, { icon: string; color: string; label: string }> = {
  Soil: { icon: 'leaf', color: '#4CAF50', label: 'Soil Sensor' },
  pH: { icon: 'flask', color: '#9C27B0', label: 'pH Sensor' },
  NPK: { icon: 'analytics', color: '#FF9800', label: 'NPK Sensor' },
};

export default function SensorPlannerScreen({ navigation }: any) {
  const {
    zones,
    activeZoneId,
    initializeZone,
    setCropType,
    setArea,
    setZoneName,
    addSensor,
    removeSensor,
    updateSensorPosition,
    clearZone,
    setActiveZone,
    getZoneState,
    recalculateVerdict,
    loadFromStorage,
  } = useSensorPlannerStore();

  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [areaInput, setAreaInput] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone_1');
  const [showDetails, setShowDetails] = useState(false);
  const [draggingSensor, setDraggingSensor] = useState<{ type: SensorType; pan: Animated.ValueXY } | null>(null);

  const zoneState = getZoneState(selectedZoneId);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      initializeZone(selectedZoneId, ZONES.find(z => z.id === selectedZoneId)?.name || selectedZoneId);
      setActiveZone(selectedZoneId);
      const state = getZoneState(selectedZoneId);
      if (state) {
        setSelectedCrop(state.cropType);
        setAreaInput(state.areaInAcres > 0 ? state.areaInAcres.toString() : '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId]);

  useEffect(() => {
    if (zoneState && selectedCrop && areaInput) {
      setCropType(selectedZoneId, selectedCrop);
      setArea(selectedZoneId, parseFloat(areaInput) || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, areaInput]);

  // PanResponder for dragging sensors from tray
  const createSensorPanResponder = (sensorType: SensorType) => {
    const pan = new Animated.ValueXY();
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDraggingSensor({ type: sensorType, pan });
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        // Check if dropped in zone container
        const dropY = gestureState.moveY;
        const zoneContainerTop = height * 0.25; // Approximate top of zone container
        const zoneContainerBottom = zoneContainerTop + ZONE_CONTAINER_HEIGHT;
        
        if (dropY >= zoneContainerTop && dropY <= zoneContainerBottom) {
          // Dropped in zone - add sensor
          const relativeX = gestureState.moveX - 20; // Account for padding
          const relativeY = dropY - zoneContainerTop;
          
          addSensor(selectedZoneId, sensorType, {
            x: Math.max(0, Math.min(relativeX, width - 40)),
            y: Math.max(0, Math.min(relativeY, ZONE_CONTAINER_HEIGHT - 40)),
          });
        }
        
        // Reset drag
        setDraggingSensor(null);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    });
  };

  const soilPanResponder = useRef(createSensorPanResponder('Soil')).current;
  const phPanResponder = useRef(createSensorPanResponder('pH')).current;
  const npkPanResponder = useRef(createSensorPanResponder('NPK')).current;

  // PanResponder for moving sensors within zone
  const createSensorMovePanResponder = (sensor: InstalledSensor) => {
    const pan = new Animated.ValueXY({ x: sensor.position.x, y: sensor.position.y });
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        const newX = Math.max(0, Math.min(gestureState.moveX - 20, width - 40));
        const newY = Math.max(0, Math.min(gestureState.moveY - height * 0.25, ZONE_CONTAINER_HEIGHT - 40));
        
        updateSensorPosition(selectedZoneId, sensor.id, { x: newX, y: newY });
      },
    });
  };

  const handleRemoveSensor = (sensorId: string) => {
    Alert.alert('Remove Sensor', 'Remove this sensor from the zone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeSensor(selectedZoneId, sensorId),
      },
    ]);
  };

  const renderSensorInTray = (type: SensorType, panResponder: any) => {
    const config = SENSOR_CONFIGS[type];
    const isDragging = draggingSensor?.type === type;
    
    return (
      <Animated.View
        key={type}
        style={[
          styles.sensorTrayItem,
          { backgroundColor: config.color + '20', borderColor: config.color },
          isDragging && { opacity: 0.5 },
          draggingSensor?.type === type && {
            transform: [
              { translateX: draggingSensor.pan.x },
              { translateY: draggingSensor.pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name={config.icon as any} size={28} color={config.color} />
        <Text style={[styles.sensorTrayLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={styles.sensorTrayCost}>₹{SENSOR_COSTS[type]}</Text>
      </Animated.View>
    );
  };

  const renderSensorInZone = (sensor: InstalledSensor) => {
    const config = SENSOR_CONFIGS[sensor.type];
    const panResponder = createSensorMovePanResponder(sensor);
    
    return (
      <Animated.View
        key={sensor.id}
        style={[
          styles.installedSensor,
          {
            left: sensor.position.x,
            top: sensor.position.y,
            backgroundColor: config.color,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.sensorRemoveBtn}
          onPress={() => handleRemoveSensor(sensor.id)}
        >
          <Ionicons name="close-circle" size={16} color="#FFF" />
        </TouchableOpacity>
        <Ionicons name={config.icon as any} size={20} color="#FFF" />
      </Animated.View>
    );
  };

  const verdict = zoneState?.verdict;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan Sensors</Text>
          <TouchableOpacity onPress={() => clearZone(selectedZoneId)}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* === INPUTS SECTION === */}
        <View style={styles.inputsSection}>
          <Text style={styles.sectionTitle}>Farm Details</Text>
          
          {/* Zone Selection */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.zoneSelector}>
              {ZONES.map(zone => (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.zoneOption,
                    selectedZoneId === zone.id && styles.zoneOptionActive,
                  ]}
                  onPress={() => setSelectedZoneId(zone.id)}
                >
                  <Text
                    style={[
                      styles.zoneOptionText,
                      selectedZoneId === zone.id && styles.zoneOptionTextActive,
                    ]}
                  >
                    {zone.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Crop Type Selection */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Crop Type</Text>
            <View style={styles.cropSelector}>
              {(['Rice', 'Wheat', 'Vegetables'] as CropType[]).map(crop => (
                <TouchableOpacity
                  key={crop}
                  style={[
                    styles.cropOption,
                    selectedCrop === crop && styles.cropOptionActive,
                  ]}
                  onPress={() => setSelectedCrop(crop)}
                >
                  <Text
                    style={[
                      styles.cropOptionText,
                      selectedCrop === crop && styles.cropOptionTextActive,
                    ]}
                  >
                    {crop}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Area Input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Farm Area (acres)</Text>
            <TextInput
              style={styles.areaInput}
              value={areaInput}
              onChangeText={setAreaInput}
              placeholder="Enter area"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* === ZONE CONTAINER === */}
        <View style={styles.zoneContainer}>
          <Text style={styles.zoneContainerTitle}>
            {ZONES.find(z => z.id === selectedZoneId)?.name || 'Zone'}
          </Text>
          <View style={styles.zoneDropArea}>
            {zoneState?.installedSensors.map(sensor => renderSensorInZone(sensor))}
            {(!zoneState || zoneState.installedSensors.length === 0) && (
              <Text style={styles.zoneEmptyText}>
                Drag sensors from below to plan installation
              </Text>
            )}
          </View>
        </View>

        {/* === VERDICT & FEEDBACK === */}
        {verdict && (
          <View style={styles.verdictSection}>
            <View style={[
              styles.verdictBadge,
              verdict.overall === 'OPTIMAL' && styles.verdictBadgeOptimal,
              verdict.overall === 'NEEDS MORE' && styles.verdictBadgeNeedsMore,
              verdict.overall === 'OVER-PLANNED' && styles.verdictBadgeOverPlanned,
            ]}>
              <Ionicons
                name={
                  verdict.overall === 'OPTIMAL' ? 'checkmark-circle' :
                  verdict.overall === 'NEEDS MORE' ? 'warning' : 'close-circle'
                }
                size={24}
                color="#FFF"
              />
              <Text style={styles.verdictText}>{verdict.overall}</Text>
            </View>

            <View style={styles.feedbackRow}>
              <View style={styles.feedbackItem}>
                <Text style={styles.feedbackLabel}>Estimated Accuracy</Text>
                <Text style={styles.feedbackValue}>
                  {verdict.accuracyLabel} ({verdict.accuracy}%)
                </Text>
              </View>
              <View style={styles.feedbackItem}>
                <Text style={styles.feedbackLabel}>Total Cost</Text>
                <Text style={styles.feedbackValue}>₹{verdict.totalCost.toLocaleString()}</Text>
              </View>
            </View>

            {/* Details Toggle */}
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Hide' : 'View'} Details
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Details Table */}
            {showDetails && (
              <View style={styles.detailsTable}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>Sensor Type</Text>
                  <Text style={styles.tableHeaderText}>Required</Text>
                  <Text style={styles.tableHeaderText}>Installed</Text>
                  <Text style={styles.tableHeaderText}>Status</Text>
                </View>
                {verdict.sensorStatuses.map(status => (
                  <View key={status.type} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{status.type}</Text>
                    <Text style={styles.tableCell}>{status.required}</Text>
                    <Text style={styles.tableCell}>{status.installed}</Text>
                    <View style={[
                      styles.statusBadge,
                      status.status === 'OPTIMAL' && styles.statusBadgeOptimal,
                      status.status === 'NEEDS MORE' && styles.statusBadgeNeedsMore,
                      status.status === 'EXTRA' && styles.statusBadgeExtra,
                    ]}>
                      <Text style={styles.statusBadgeText}>{status.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* === SENSOR TRAY === */}
        <View style={styles.sensorTray}>
          <Text style={styles.trayTitle}>Drag Sensors to Zone</Text>
          <View style={styles.trayContent}>
            {renderSensorInTray('Soil', soilPanResponder)}
            {renderSensorInTray('pH', phPanResponder)}
            {renderSensorInTray('NPK', npkPanResponder)}
          </View>
        </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  inputsSection: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 15,
  },
  inputRow: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  zoneSelector: {
    flexDirection: 'row',
  },
  zoneOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
  },
  zoneOptionActive: {
    backgroundColor: colors.primary,
  },
  zoneOptionText: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '500',
  },
  zoneOptionTextActive: {
    color: '#FFF',
  },
  cropSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  cropOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cropOptionActive: {
    backgroundColor: colors.primary,
  },
  cropOptionText: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '500',
  },
  cropOptionTextActive: {
    color: '#FFF',
  },
  areaInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  zoneContainer: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    minHeight: ZONE_CONTAINER_HEIGHT,
  },
  zoneContainerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 15,
  },
  zoneDropArea: {
    minHeight: ZONE_CONTAINER_HEIGHT - 60,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    position: 'relative',
  },
  zoneEmptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: ZONE_CONTAINER_HEIGHT / 2 - 30,
    fontSize: 14,
  },
  installedSensor: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sensorRemoveBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verdictSection: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  verdictBadgeOptimal: {
    backgroundColor: '#4CAF50',
  },
  verdictBadgeNeedsMore: {
    backgroundColor: '#FF9800',
  },
  verdictBadgeOverPlanned: {
    backgroundColor: '#D32F2F',
  },
  verdictText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  feedbackItem: {
    alignItems: 'center',
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  feedbackValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailsToggleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 5,
  },
  detailsTable: {
    marginTop: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#263238',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeOptimal: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeNeedsMore: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeExtra: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#263238',
  },
  sensorTray: {
    backgroundColor: '#FFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  trayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 15,
  },
  trayContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sensorTrayItem: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 100,
  },
  sensorTrayLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  sensorTrayCost: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});

