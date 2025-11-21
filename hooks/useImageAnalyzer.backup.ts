import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { localDetector, MultiModalDetectionResult } from '../services/localDetection';

// ==================== Types ====================

interface NSFWPrediction {
  className: string;
  probability: number;
}

type NSFWModel = Awaited<ReturnType<typeof nsfwjs.load>>;

interface UseImageAnalyzerReturn {
  predictions: NSFWPrediction[] | null;
  detectionResult: MultiModalDetectionResult | null;
  loading: boolean;
  analyzeImage: (imageUri: string) => Promise<void>;
  clearResults: () => void;
}

// ==================== Hook ====================

export function useImageAnalyzer(): UseImageAnalyzerReturn {
  const [predictions, setPredictions] = useState<NSFWPrediction[] | null>(null);
  const [detectionResult, setDetectionResult] = useState<MultiModalDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const modelRef = useRef<NSFWModel | null>(null);

  const loadModel = useCallback(async (): Promise<NSFWModel | null> => {
    try {
      await tf.ready();
      console.log('Loading NSFWJS model...');
      const loadedModel = await nsfwjs.load();
      console.log('Model loaded successfully');
      return loadedModel;
    } catch (error) {
      console.error('Error loading model:', error);
      Alert.alert('Error', 'No se pudo cargar el modelo');
      return null;
    }
  }, []);

  const analyzeImage = useCallback(async (imageUri: string): Promise<void> => {
    try {
      setLoading(true);
      setPredictions(null);
      setDetectionResult(null);

      // Process image to JPEG format
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 224 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Load model if needed
      if (!modelRef.current) {
        modelRef.current = await loadModel();
        if (!modelRef.current) {
          return;
        }
      }

      // Convert image to tensor
      const response = await fetch(manipulatedImage.uri);
      const imageDataArrayBuffer = await response.arrayBuffer();
      const imageData = new Uint8Array(imageDataArrayBuffer);
      const imageTensor = decodeJpeg(imageData);

      // NSFWJS analysis
      const nsfwResults = await modelRef.current.classify(imageTensor);
      setPredictions(nsfwResults);

      // Multi-modal local detection
      const multiModalResult = await localDetector.analyzeImage(imageTensor, nsfwResults);
      setDetectionResult(multiModalResult);

      // Clean up tensor
      imageTensor.dispose();

      // Show alert if inappropriate
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
  }, [loadModel]);

  const clearResults = useCallback(() => {
    setPredictions(null);
    setDetectionResult(null);
  }, []);

  return {
    predictions,
    detectionResult,
    loading,
    analyzeImage,
    clearResults,
  };
}
