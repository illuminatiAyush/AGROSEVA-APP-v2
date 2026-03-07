// Crop Image Analysis Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/utils/i18n';

// Using your theme colors (adjust path if needed, e.g., '@/utils/colors' or '@/theme/colors')
import { colors } from '@/theme/colors';

const { width } = Dimensions.get('window');

export const CropImageScreen: React.FC = () => {
  const t = useTranslation();
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // --- 1. PICK IMAGE (Gallery) ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      analyzeImage();
    }
  };

  // --- 2. TAKE PHOTO (Camera) ---
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan crops.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      analyzeImage();
    }
  };

  // --- 3. MOCK AI ANALYSIS ---
  const analyzeImage = () => {
    setAnalyzing(true);
    // Fake 2.5s delay to simulate AI processing
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        disease: t('diseaseName'),
        type: t('diseaseType'),
        confidence: 94,
        cure: t('diseaseCure'),
        severity: t('severityModerate'),
        color: '#FFA726' // Orange for Moderate
      });
    }, 2500);
  };

  return (
    <View style={styles.container}>

      {/* === HEADER === */}
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cropDoctorAi')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>{t('aiDiseaseDetection')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.content}>

          {/* === SCANNING AREA === */}
          <View style={styles.scanCard}>
            <View style={styles.imageWrapper}>
              {image ? (
                <Image source={{ uri: image }} style={styles.image} />
              ) : (
                <View style={styles.placeholder}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="scan" size={40} color={colors.primary} />
                  </View>
                  <Text style={styles.placeholderText}>{t('uploadLeafPhoto')}</Text>
                  <Text style={styles.placeholderSub}>{t('ensureLeafVisible')}</Text>
                </View>
              )}

              {/* Loading Overlay */}
              {analyzing && (
                <View style={styles.overlay}>
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.analyzingText}>{t('analyzingTexture')}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* === BUTTONS === */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickImage} disabled={analyzing}>
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.galleryText}>{t('gallery')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto} disabled={analyzing}>
              <LinearGradient
                colors={['#29B6F6', '#0288D1']}
                style={styles.cameraGradient}
              >
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.cameraText}>{t('scanNow')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* === RESULT REPORT CARD === */}
          {result && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('diagnosisReport')}</Text>

              <View style={[styles.resultCard, { borderTopColor: result.color }]}>
                {/* Result Header */}
                <View style={styles.resultHeader}>
                  <View>
                    <Text style={styles.diseaseName}>{result.disease}</Text>
                    <Text style={styles.diseaseType}>{result.type}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: result.color + '20' }]}>
                    <Text style={[styles.severityText, { color: result.color }]}>{result.severity}</Text>
                  </View>
                </View>

                {/* Confidence Bar */}
                <View style={styles.confidenceContainer}>
                  <Text style={styles.metaLabel}>{t('confidence')}</Text>
                  <Text style={styles.metaValue}>{result.confidence}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${result.confidence}%`, backgroundColor: result.color }]} />
                </View>

                <View style={styles.divider} />

                {/* Cure Recommendation */}
                <View style={styles.cureSection}>
                  <View style={styles.cureHeader}>
                    <MaterialCommunityIcons name="doctor" size={20} color="#2E7D32" />
                    <Text style={styles.cureTitle}>{t('recommendedTreatment')}</Text>
                  </View>
                  <Text style={styles.cureText}>{result.cure}</Text>
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
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#E0F2F1', textAlign: 'center', marginTop: 5, fontSize: 14 },

  content: { padding: 20 },

  // Scan Area
  scanCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
  imageWrapper: { height: 280, borderRadius: 15, overflow: 'hidden', backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E0E0E0' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },

  placeholder: { alignItems: 'center', padding: 20 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  placeholderText: { color: '#455A64', fontWeight: 'bold', fontSize: 16 },
  placeholderSub: { color: '#90A4AE', fontSize: 12, marginTop: 5 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 5 },
  analyzingText: { marginTop: 15, color: colors.primary, fontWeight: 'bold' },

  // Buttons
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  galleryBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  galleryText: { color: colors.primary, fontWeight: 'bold', marginLeft: 8 },

  cameraBtn: { flex: 1.5, marginLeft: 10 },
  cameraGradient: { flexDirection: 'row', paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  cameraText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },

  // Results
  resultSection: { marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F', marginBottom: 15 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, borderTopWidth: 5 },

  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  diseaseName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  diseaseType: { fontSize: 14, color: '#78909C' },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  severityText: { fontSize: 12, fontWeight: 'bold' },

  confidenceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaLabel: { fontSize: 12, color: '#90A4AE' },
  metaValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  progressBarBg: { height: 6, backgroundColor: '#F1F8E9', borderRadius: 3, marginBottom: 15 },
  progressBarFill: { height: '100%', borderRadius: 3 },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 10 },

  cureSection: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12 },
  cureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cureTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32', marginLeft: 8 },
  cureText: { color: '#333', fontSize: 14, lineHeight: 20 },
});