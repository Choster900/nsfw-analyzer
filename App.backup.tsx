import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { localDetector, MultiModalDetectionResult } from './services/localDetection';

// Configurar Buffer globalmente para nsfwjs
global.Buffer = Buffer;

// ==================== Types & Interfaces ====================

interface NSFWPrediction {
  className: string;
  probability: number;
}

interface ClassificationResult {
  class: string;
  percentage: string;
}

type NSFWModel = Awaited<ReturnType<typeof nsfwjs.load>>;

// ==================== Main Component ====================

function AppContent(): JSX.Element {
  const [image, setImage] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<NSFWPrediction[] | null>(null);
  const [detectionResult, setDetectionResult] = useState<MultiModalDetectionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [model, setModel] = useState<NSFWModel | null>(null);
  const [tfReady, setTfReady] = useState<boolean>(false);

  // ==================== Effects ====================

  useEffect(() => {
    initTensorFlow();
  }, []);

  // ==================== TensorFlow Initialization ====================

  const initTensorFlow = async (): Promise<void> => {
    try {
      await tf.ready();
      setTfReady(true);
      console.log('TensorFlow is ready');
    } catch (error) {
      console.error('Error initializing TensorFlow:', error);
      Alert.alert('Error', 'No se pudo inicializar TensorFlow');
    }
  };

  // ==================== Model Loading ====================

  const loadModel = async (): Promise<NSFWModel | null> => {
    try {
      // Esperar a que TensorFlow esté listo
      await tf.ready();

      console.log('Loading NSFW model...');
      const loadedModel = await nsfwjs.load();
      console.log('Model loaded successfully');
      return loadedModel;
    } catch (error) {
      console.error('Error loading model:', error);
      Alert.alert('Error', 'No se pudo cargar el modelo');
      return null;
    }
  };

  // ==================== Image Picker ====================

  const pickImage = useCallback(async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        setImage(selectedImageUri);
        setPredictions(null);
        setDetectionResult(null);
        await analyzeImage(selectedImageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Error al seleccionar la imagen');
    }
  }, []);

  // ==================== Image Analysis ====================

  const analyzeImage = async (imageUri: string): Promise<void> => {
    try {
      setLoading(true);
      setPredictions(null);
      setDetectionResult(null);

      // Process image to ensure JPEG format
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 224 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Load NSFWJS model if not already loaded
      let loadedModel = model;
      if (!loadedModel) {
        loadedModel = await loadModel();
        if (!loadedModel) {
          setLoading(false);
          return;
        }
        setModel(loadedModel);
      }

      // Convert image to tensor
      const response = await fetch(manipulatedImage.uri);
      const imageDataArrayBuffer = await response.arrayBuffer();
      const imageData = new Uint8Array(imageDataArrayBuffer);
      const imageTensor = decodeJpeg(imageData);

      // Análisis 1: NSFWJS (contenido sexual)
      console.log('Analyzing with NSFWJS...');
      const nsfwResults = await loadedModel.classify(imageTensor);
      setPredictions(nsfwResults);

      // Análisis 2: Detección local multi-modal (violencia, drogas, armas)
      console.log('Analyzing with local multi-modal detector...');
      const multiModalResult = await localDetector.analyzeImage(imageTensor, nsfwResults);
      setDetectionResult(multiModalResult);

      // Clean up tensor
      imageTensor.dispose();

      // Si se detecta contenido inapropiado, mostrar alerta
      if (!multiModalResult.overallSafe) {
        Alert.alert(
          '⚠️ Contenido Inapropiado Detectado',
          `Esta imagen contiene:\n\n${multiModalResult.warnings.join('\n')}\n\nNo se permite este tipo de contenido.`,
          [{ text: 'Entendido', style: 'cancel' }]
        );
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `Error al analizar la imagen: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Helper Functions ====================

  const getClassificationResult = (): ClassificationResult | null => {
    if (!predictions || predictions.length === 0) {
      return null;
    }

    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    const highest = sorted[0];

    return {
      class: highest.className,
      percentage: (highest.probability * 100).toFixed(2),
    };
  };

  // ==================== Render ====================

  const classificationResult = getClassificationResult();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>Analizador de Contenido</Text>
          <Text style={styles.subtitle}>
            Detecta contenido inapropiado, drogas, violencia y más
          </Text>

          {/* Pick Image Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={pickImage}
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

          {/* Multi-Modal Detection Results */}
          {detectionResult && !loading && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>🔍 Análisis de Seguridad (100% Local)</Text>

              {/* Warning if inappropriate */}
              {!detectionResult.overallSafe && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.warningTitle}>Contenido Bloqueado</Text>
                    <Text style={styles.warningText}>
                      {detectionResult.warnings.join('\n')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Safe status */}
              {detectionResult.overallSafe && (
                <View style={styles.safeBanner}>
                  <Text style={styles.safeIcon}>✅</Text>
                  <Text style={styles.safeText}>Contenido seguro</Text>
                </View>
              )}

              {/* All Categories */}
              {detectionResult.categories.length > 0 && (
                <>
                  <Text style={styles.detailsTitle}>Categorías Detectadas:</Text>
                  {detectionResult.categories.map((cat, index) => (
                    <View key={`cat-${index}`} style={styles.predictionRow}>
                      <Text style={[styles.className, cat.isInappropriate && styles.inappropriate]}>
                        {cat.category}
                      </Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            cat.isInappropriate && styles.dangerBar,
                            { width: `${cat.confidence * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.percentage}>
                        {(cat.confidence * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Detailed Breakdown */}
              <Text style={styles.sectionTitle}>📊 Análisis por Categoría:</Text>

              {/* NSFW */}
              {detectionResult.details.nsfw.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>🔞 Contenido Sexual</Text>
                  {detectionResult.details.nsfw.map((item, index) => (
                    <View key={`nsfw-${index}`} style={styles.miniRow}>
                      <Text style={styles.miniLabel}>{item.category}</Text>
                      <Text style={styles.miniValue}>{(item.confidence * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Violence */}
              {detectionResult.details.violence.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>💥 Violencia</Text>
                  {detectionResult.details.violence.map((item, index) => (
                    <View key={`violence-${index}`} style={styles.miniRow}>
                      <Text style={styles.miniLabel}>{item.category}</Text>
                      <Text style={styles.miniValue}>{(item.confidence * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Drugs */}
              {detectionResult.details.drugs.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>💊 Drogas</Text>
                  {detectionResult.details.drugs.map((item, index) => (
                    <View key={`drugs-${index}`} style={styles.miniRow}>
                      <Text style={styles.miniLabel}>{item.category}</Text>
                      <Text style={styles.miniValue}>{(item.confidence * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Weapons */}
              {detectionResult.details.weapons.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>🔫 Armas</Text>
                  {detectionResult.details.weapons.map((item, index) => (
                    <View key={`weapons-${index}`} style={styles.miniRow}>
                      <Text style={styles.miniLabel}>{item.category}</Text>
                      <Text style={styles.miniValue}>{(item.confidence * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* NSFWJS Results */}
          {predictions && !loading && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>🔞 Análisis NSFW</Text>

              {/* Main Classification */}
              {classificationResult && (
                <View style={styles.mainResult}>
                  <Text style={styles.mainClass}>
                    Clasificación: {classificationResult.class}
                  </Text>
                  <Text style={styles.mainPercentage}>
                    {classificationResult.percentage}%
                  </Text>
                </View>
              )}

              {/* Detailed Results */}
              <Text style={styles.detailsTitle}>Detalles:</Text>
              {predictions.map((prediction, index) => (
                <View key={`${prediction.className}-${index}`} style={styles.predictionRow}>
                  <Text style={styles.className}>{prediction.className}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[styles.bar, { width: `${prediction.probability * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.percentage}>
                    {(prediction.probability * 100).toFixed(2)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

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
  resultsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBanner: {
    backgroundColor: '#FEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C00',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#800',
  },
  safeBanner: {
    backgroundColor: '#EFE',
    borderLeftWidth: 4,
    borderLeftColor: '#4C4',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  safeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#080',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  mainResult: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  mainClass: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  mainPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  percentage: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inappropriate: {
    color: '#D00',
    fontWeight: 'bold',
  },
  dangerBar: {
    backgroundColor: '#F44',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  categorySection: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  miniLabel: {
    fontSize: 13,
    color: '#666',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
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
