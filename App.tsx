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
import { AnalysisProvider } from './context/AnalysisContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useImagePicker } from './hooks/useImagePicker';
import { useImageAnalyzer } from './hooks/useImageAnalyzer';
import { DetectionResults } from './components/DetectionResults';
import { NSFWResults } from './components/NSFWResults';
import { APP_CONFIG, UI_CONFIG } from './config/constants';

// Configure Buffer globally for nsfwjs
global.Buffer = Buffer;

// ==================== Main Component ====================

function AppContent(): JSX.Element {
  const { image, pickImage } = useImagePicker();
  const { predictions, detectionResult, loading, analyzeImage, clearResults } =
    useImageAnalyzer();

  // Initialize TensorFlow on mount
  useEffect(() => {
    const initTensorFlow = async (): Promise<void> => {
      try {
        await tf.ready();
        console.log('✅ TensorFlow initialized');
      } catch (error) {
        console.error('❌ TensorFlow initialization failed:', error);
      }
    };

    initTensorFlow();
  }, []);

  // Handle image selection
  const handlePickImage = async (): Promise<void> => {
    clearResults();
    await pickImage();
  };

  // Auto-analyze when image changes
  useEffect(() => {
    if (image) {
      analyzeImage(image);
    }
  }, [image, analyzeImage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{APP_CONFIG.name}</Text>
            <Text style={styles.subtitle}>{APP_CONFIG.description}</Text>
            <Text style={styles.version}>v{APP_CONFIG.version}</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePickImage}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Analizando...' : 'Seleccionar Imagen'}
            </Text>
          </TouchableOpacity>

          {/* Image Preview */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
              {loading && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </View>
          )}

          {/* Loading State */}
          {loading && !image && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
              <Text style={styles.loadingText}>Analizando imagen...</Text>
            </View>
          )}

          {/* Detection Results */}
          {detectionResult && !loading && <DetectionResults result={detectionResult} />}

          {/* NSFW Results */}
          {predictions && !loading && <NSFWResults predictions={predictions} />}

          {/* Empty State */}
          {!image && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyTitle}>No hay imagen seleccionada</Text>
              <Text style={styles.emptyText}>
                Selecciona una imagen de tu galería para comenzar el análisis
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <AnalysisProvider>
          <AppContent />
        </AnalysisProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    opacity: 0.6,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 320,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
