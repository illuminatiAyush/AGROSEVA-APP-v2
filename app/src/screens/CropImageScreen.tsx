import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import * as Location from 'expo-location'; 
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// Integrated Project Imports
import { colors } from '@/theme/colors'; 
import { ImageAnalysis } from '@/ai/ImageAnalysis'; 
import { CropAnalysisResult } from '@/models/CropImage';

const { width } = Dimensions.get('window');

export const CropImageScreen: React.FC = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CropAnalysisResult | null>(null);

  /**
   * --- 1. IMAGE CAPTURE LOGIC ---
   * Handles permissions and initial image selection
   */
  const handleImageCapture = async (source: 'camera' | 'library') => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (camStatus !== 'granted' || locStatus !== 'granted') {
        Alert.alert('Permission Denied', 'AgroSeva needs Camera and Location for full analysis.');
        return;
      }

      const pickerResult = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({ 
            allowsEditing: true, 
            aspect: [4, 3], 
            quality: 0.7 
          })
        : await ImagePicker.launchImageLibraryAsync({ 
            allowsEditing: true, 
            aspect: [4, 3], 
            quality: 0.7 
          });

      if (pickerResult.canceled) return;

      const uri = pickerResult.assets[0].uri;
      setImage(uri);
      setResult(null); // Reset results for new scan
      
      // Trigger the real AI Pipeline
      await runAnalysisPipeline(uri);

    } catch (error) {
      console.error("[UI] Capture Error:", error);
      Alert.alert('Error', 'Failed to process image capture.');
    }
  };

  /**
   * --- 2. PRODUCTION ANALYSIS PIPELINE ---
   * Orchestrates resizing, geolocation, and AI analysis
   */
  const runAnalysisPipeline = async (uri: string) => {
    setAnalyzing(true);
    try {
      // A. Resize & Compress (Crucial for mobile stability and API limits)
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Standard size for most Plant AI models
        { base64: true, compress: 0.7 }
      );

      // B. Get User Location (Required for Weather Context)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // C. Call our AI Coordinator (The Engine built in Task 2)
      const analysisData = await ImageAnalysis.analyzeCrop(
        manipulated.base64!,
        manipulated.uri,
        { lat: location.coords.latitude, lon: location.coords.longitude }
      );

      setResult(analysisData);
    } catch (error: any) {
      console.error("[UI] Pipeline Error:", error);
      Alert.alert(
        'Analysis Failed', 
        error.message || 'Unable to analyze crop. Please check your internet and try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AgroSeva Intelligence</Text>
          <View style={{ width: 40 }} /> 
        </View>
        <Text style={styles.headerSubtitle}>Climate-Aware Crop Scan</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.content}>

          {/* SCANNING AREA */}
          <View style={styles.scanCard}>
            <View style={styles.imageWrapper}>
              {image ? (
                <Image source={{ uri: image }} style={styles.image} />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="leaf-outline" size={50} color={colors.primary} />
                  <Text style={styles.placeholderText}>Scan Crop to Begin</Text>
                </View>
              )}
              {analyzing && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={styles.analyzingText}>Consulting AgroSeva AI...</Text>
                </View>
              )}
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={styles.galleryBtn} 
              onPress={() => handleImageCapture('library')} 
              disabled={analyzing}
            >
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.galleryText}>Upload</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cameraBtn} 
              onPress={() => handleImageCapture('camera')} 
              disabled={analyzing}
            >
              <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.cameraGradient}>
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.cameraText}>Scan Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ANALYSIS RESULTS */}
          {result && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Intelligence Report</Text>
              
              <View style={[
                styles.resultCard, 
                { borderTopColor: result.identification.health_status === 'Healthy' ? '#4CAF50' : '#F44336' }
              ]}>
                
                {/* Identification Header */}
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.diseaseName}>{result.identification.plant_name}</Text>
                    <Text style={styles.diseaseType}>
                      AI Confidence: {Math.round(result.identification.probability * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.severityText, { color: '#2E7D32' }]}>
                      {result.growthStage}
                    </Text>
                  </View>
                </View>

                {/* Contextual Metrics (IoT + Weather Fusion) */}
                <View style={styles.metricsRow}>
                   <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="thermometer" size={20} color="#FF7043" />
                      <Text style={styles.metricText}>{result.weather?.temp || '—'}°C</Text>
                   </View>
                   <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="water-percent" size={20} color="#29B6F6" />
                      <Text style={styles.metricText}>
                        {result.metadata?.watering_requirement || 'Optimal'}
                      </Text>
                   </View>
                </View>

                <View style={styles.divider} />

                {/* DYNAMIC FARMER TIP */}
                <View style={styles.cureSection}>
                  <View style={styles.cureHeader}>
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FBC02D" />
                    <Text style={styles.cureTitle}>Smart Irrigation Advice</Text>
                  </View>
                  <Text style={styles.cureText}>{result.farmerTip}</Text>
                </View>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: 40, paddingHorizontal: 16, paddingBottom: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center', flex: 1 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' },
  content: { padding: 16 },
  scanCard: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', marginBottom: 20, elevation: 3 },
  imageWrapper: { width: '100%', height: 280, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { justifyContent: 'center', alignItems: 'center', height: '100%' },
  placeholderText: { fontSize: 16, color: colors.primary, marginTop: 12, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  analyzingText: { color: '#FFF', marginTop: 12, fontSize: 14, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  galleryBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  galleryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  cameraBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  cameraGradient: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  cameraText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  resultSection: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  resultCard: { backgroundColor: '#FFF', borderTopWidth: 4, borderRadius: 12, padding: 16, elevation: 2 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  diseaseName: { fontSize: 18, fontWeight: '700', color: '#1B3A1B', marginBottom: 4 },
  diseaseType: { fontSize: 13, color: '#666', fontWeight: '500' },
  severityBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  severityText: { fontSize: 12, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, marginBottom: 15 },
  metricItem: { flexDirection: 'row', alignItems: 'center' },
  metricText: { marginLeft: 5, fontWeight: 'bold', color: '#455A64' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 12 },
  cureSection: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FBC02D' },
  cureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cureTitle: { fontSize: 14, fontWeight: '700', color: '#F57F17' },
  cureText: { fontSize: 13, color: '#424242', lineHeight: 18, fontWeight: '500' },
});