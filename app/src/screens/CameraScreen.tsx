// src/screens/CameraScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
    // No permissions request is needed for launchImageLibraryAsync
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null); // Reset previous result
      analyzeImage();
    }
  };

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

  const analyzeImage = () => {
    setAnalyzing(true);
    
    // FAKE AI DELAY (2 seconds)
    setTimeout(() => {
      setAnalyzing(false);
      // MOCK RESULT: Always detects "Leaf Blight" for the demo
      setResult({
        disease: 'Early Blight (Fungal)',
        confidence: 94,
        cure: 'Spray Mancozeb 75% WP @ 2g/liter water.',
        severity: 'Moderate'
      });
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crop Doctor AI</Text>
      
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="scan-outline" size={80} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 10 }}>Upload leaf photo</Text>
          </View>
        )}
        
        {analyzing && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.analyzingText}>Analyzing Leaf Texture...</Text>
          </View>
        )}
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={pickImage}>
          <Ionicons name="images" size={24} color="#FFF" />
          <Text style={styles.btnText}>Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#000" />
          <Text style={[styles.btnText, { color: '#000' }]}>Scan Now</Text>
        </TouchableOpacity>
      </View>

      {/* AI RESULT CARD */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="warning" size={30} color={colors.error} />
            <Text style={styles.diseaseName}>{result.disease}</Text>
          </View>
          
          <Text style={styles.confidence}>Confidence: {result.confidence}%</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>Recommended Cure:</Text>
          <Text style={styles.cure}>{result.cure}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 20, textAlign: 'center' },
  imageContainer: { height: 300, backgroundColor: '#E0E0E0', borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  analyzingText: { color: '#FFF', marginTop: 10, fontWeight: 'bold' },
  
  btnRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  btn: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10 },
  
  resultCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 4 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  diseaseName: { fontSize: 20, fontWeight: 'bold', color: colors.error, marginLeft: 10 },
  confidence: { color: colors.textLight, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  label: { fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  cure: { color: colors.success, fontWeight: 'bold', fontSize: 16 },
});