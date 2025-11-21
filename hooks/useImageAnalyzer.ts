import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { useAnalysisContext } from '../context/AnalysisContext';
import { localDetector, MultiModalDetectionResult } from '../services/localDetection';
import { imageCache } from '../utils/imageCache';
import { ErrorHandler, ErrorType } from '../utils/errorHandler';
import { IMAGE_CONFIG, FEATURES } from '../config/constants';

// ==================== Types ====================

interface NSFWPrediction {
  className: string;
  probability: number;
}

interface UseImageAnalyzerReturn {
  predictions: NSFWPrediction[] | null;
  detectionResult: MultiModalDetectionResult | null;
  loading: boolean;
  error: Error | null;
  analyzeImage: (imageUri: string) => Promise<void>;
  clearResults: () => void;
  retryLastAnalysis: () => Promise<void>;
}

// ==================== Hook ====================

export function useImageAnalyzer(): UseImageAnalyzerReturn {
  const { getModel } = useAnalysisContext();

  const [predictions, setPredictions] = useState<NSFWPrediction[] | null>(null);
  const [detectionResult, setDetectionResult] = useState<MultiModalDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastImageUri, setLastImageUri] = useState<string | null>(null);

  const analyzeImage = useCallback(
    async (imageUri: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        setLastImageUri(imageUri);

        // Check cache first
        if (FEATURES.enableCache) {
          const cached = imageCache.get(imageUri);
          if (cached) {
            setPredictions(cached.predictions);
            setDetectionResult(cached.detectionResult);
            setLoading(false);

            // Show alert if inappropriate (cached)
            if (!cached.detectionResult.overallSafe) {
              Alert.alert(
                '⚠️ Contenido Inapropiado Detectado (Caché)',
                `Esta imagen contiene:\n\n${cached.detectionResult.warnings.join('\n')}`,
                [{ text: 'Entendido', style: 'cancel' }]
              );
            }
            return;
          }
        }

        // Process image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: IMAGE_CONFIG.maxWidth } }],
          { compress: IMAGE_CONFIG.quality, format: ImageManipulator.SaveFormat.JPEG }
        ).catch((err) => {
          throw ErrorHandler.createError(
            ErrorType.IMAGE_PROCESSING_ERROR,
            'Failed to process image',
            err
          );
        });

        // Get model from context
        const model = await getModel().catch((err) => {
          throw ErrorHandler.createError(
            ErrorType.MODEL_LOAD_ERROR,
            'Failed to load model',
            err
          );
        });

        // Convert to tensor
        const response = await fetch(manipulatedImage.uri);
        const imageDataArrayBuffer = await response.arrayBuffer();
        const imageData = new Uint8Array(imageDataArrayBuffer);
        const imageTensor = decodeJpeg(imageData);

        // NSFWJS analysis
        const nsfwResults = await model.classify(imageTensor).catch((err) => {
          imageTensor.dispose();
          throw ErrorHandler.createError(
            ErrorType.ANALYSIS_ERROR,
            'Failed to classify image',
            err
          );
        });

        // Multi-modal detection
        console.log('🔍 Starting multi-modal detection...');
        const multiModalResult = await localDetector
          .analyzeImage(imageTensor, nsfwResults)
          .catch((err) => {
            console.error('❌ Multi-modal detection failed:', err);
            console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
            imageTensor.dispose();
            throw ErrorHandler.createError(
              ErrorType.ANALYSIS_ERROR,
              'Failed to analyze image',
              err
            );
          });
        console.log('✅ Multi-modal detection completed');

        // Clean up
        imageTensor.dispose();

        // Update state
        setPredictions(nsfwResults);
        setDetectionResult(multiModalResult);

        // Cache results
        if (FEATURES.enableCache) {
          imageCache.set(imageUri, nsfwResults, multiModalResult);
        }

        // Show alert if inappropriate
        if (!multiModalResult.overallSafe) {
          Alert.alert(
            '⚠️ Contenido Inapropiado Detectado',
            `Esta imagen contiene:\n\n${multiModalResult.warnings.join('\n')}\n\nNo se permite este tipo de contenido.`,
            [{ text: 'Entendido', style: 'cancel' }]
          );
        }
      } catch (err) {
        const appError =
          err instanceof Error
            ? err
            : new Error('Unknown error during image analysis');

        setError(appError);
        ErrorHandler.handleErrorWithCallback(err, 'ImageAnalysis', () => {
          if (lastImageUri) {
            analyzeImage(lastImageUri);
          }
        });
      } finally {
        setLoading(false);
      }
    },
    [getModel, lastImageUri]
  );

  const clearResults = useCallback(() => {
    setPredictions(null);
    setDetectionResult(null);
    setError(null);
    setLastImageUri(null);
  }, []);

  const retryLastAnalysis = useCallback(async (): Promise<void> => {
    if (lastImageUri) {
      await analyzeImage(lastImageUri);
    }
  }, [lastImageUri, analyzeImage]);

  return {
    predictions,
    detectionResult,
    loading,
    error,
    analyzeImage,
    clearResults,
    retryLastAnalysis,
  };
}
