import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import * as tf from '@tensorflow/tfjs';
import { useImagePicker } from './hooks/useImagePicker';
import { useImageAnalyzer } from './hooks/useImageAnalyzer';
import { DetectionResults } from './components/DetectionResults';
import { NSFWResults } from './components/NSFWResults';

// Configure Buffer globally for nsfwjs
global.Buffer = Buffer;

// ==================== Main Component ====================

function AppContent(): JSX.Element {
  const { image, pickImage } = useImagePicker();
  const { predictions, detectionResult, loading, analyzeImage, clearResults } = useImageAnalyzer();

  // Initialize TensorFlow
  useEffect(() => {
    const initTensorFlow = async (): Promise<void> => {
      try {
        await tf.ready();
        console.log('TensorFlow is ready');
      } catch (error) {
        console.error('Error initializing TensorFlow:', error);
      }
    };

    initTensorFlow();
  }, []);

  // Handle image selection
  const handlePickImage = async (): Promise<void> => {
    clearResults();
    await pickImage();
  };

  // Auto-analyze when image is selected
  useEffect(() => {
    if (image) {
      analyzeImage(image);
    }
  }, [image, analyzeImage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.title}>Analizador de Contenido</Text>
          <Text style={styles.subtitle}>
            Detecta contenido inapropiado, drogas, violencia y más
          </Text>

          {/* Pick Image Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePickImage}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Seleccionar Imagen</Text>
          </TouchableOpacity>

          {/* Image Preview */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
            </View>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analizando imagen...</Text>
            </View>
          )}

          {/* Detection Results */}
          {detectionResult && !loading && <DetectionResults result={detectionResult} />}

          {/* NSFW Results */}
          {predictions && !loading && <NSFWResults predictions={predictions} />}

          {/* Empty State */}
          {!image && !loading && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Selecciona una imagen para analizar su contenido
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== App Wrapper ====================

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    marginTop: 40,
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
