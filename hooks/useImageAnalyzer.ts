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
        console.log('🔬 [ANALYZER] Iniciando análisis de imagen...');
        console.log(`📍 [ANALYZER] URI de imagen: ${imageUri}`);
        setLoading(true);
        setError(null);
        setLastImageUri(imageUri);

        // Check cache first
        if (FEATURES.enableCache) {
          console.log('💾 [ANALYZER] Verificando caché...');
          const cached = imageCache.get(imageUri);
          if (cached) {
            console.log('✅ [ANALYZER] Resultados encontrados en caché, usando datos almacenados');
            console.log(`📊 [ANALYZER] Predicciones en caché: ${cached.predictions.length} clases`);
            setPredictions(cached.predictions);
            setDetectionResult(cached.detectionResult);
            setLoading(false);

            // Show alert if inappropriate (cached)
            if (!cached.detectionResult.overallSafe) {
              console.log('⚠️ [ANALYZER] Contenido inapropiado detectado en caché');
              Alert.alert(
                '⚠️ Contenido Inapropiado Detectado (Caché)',
                `Esta imagen contiene:\n\n${cached.detectionResult.warnings.join('\n')}`,
                [{ text: 'Entendido', style: 'cancel' }]
              );
            }
            return;
          }
          console.log('❌ [ANALYZER] No se encontraron resultados en caché, continuando con análisis nuevo');
        }

        // Process image
        console.log(`🖼️ [ANALYZER] Procesando imagen con configuración: ${IMAGE_CONFIG.maxWidth}px, calidad: ${IMAGE_CONFIG.quality}`);
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: IMAGE_CONFIG.maxWidth } }],
          { compress: IMAGE_CONFIG.quality, format: ImageManipulator.SaveFormat.JPEG }
        ).catch((err) => {
          console.error('❌ [ANALYZER] Error al procesar imagen:', err);
          throw ErrorHandler.createError(
            ErrorType.IMAGE_PROCESSING_ERROR,
            'Failed to process image',
            err
          );
        });
        console.log(`✅ [ANALYZER] Imagen procesada exitosamente: ${manipulatedImage.width}x${manipulatedImage.height}`);

        // Get model from context
        console.log('🤖 [ANALYZER] Cargando modelo NSFW.js...');
        const model = await getModel().catch((err) => {
          console.error('❌ [ANALYZER] Error al cargar modelo:', err);
          throw ErrorHandler.createError(
            ErrorType.MODEL_LOAD_ERROR,
            'Failed to load model',
            err
          );
        });
        console.log('✅ [ANALYZER] Modelo NSFW.js cargado correctamente');

        // Convert to tensor
        console.log('🔄 [ANALYZER] Convirtiendo imagen a tensor...');
        const response = await fetch(manipulatedImage.uri);
        const imageDataArrayBuffer = await response.arrayBuffer();
        const imageData = new Uint8Array(imageDataArrayBuffer);
        console.log(`📦 [ANALYZER] Tamaño de datos de imagen: ${imageData.length} bytes`);
        const imageTensor = decodeJpeg(imageData);
        console.log(`📊 [ANALYZER] Tensor creado con dimensiones: ${imageTensor.shape}`);

        // NSFWJS analysis
        console.log('🔍 [ANALYZER] Iniciando clasificación NSFW...');
        const nsfwResults = await model.classify(imageTensor).catch((err) => {
          console.error('❌ [ANALYZER] Error en clasificación NSFW:', err);
          imageTensor.dispose();
          throw ErrorHandler.createError(
            ErrorType.ANALYSIS_ERROR,
            'Failed to classify image',
            err
          );
        });
        console.log(`✅ [ANALYZER] Clasificación NSFW completada: ${nsfwResults.length} clases detectadas`);
        nsfwResults.forEach((pred, idx) => {
          console.log(`  ${idx + 1}. ${pred.className}: ${(pred.probability * 100).toFixed(2)}%`);
        });

        // Multi-modal detection
        console.log('🔍 [ANALYZER] Iniciando detección multi-modal...');
        const multiModalResult = await localDetector
          .analyzeImage(imageTensor, nsfwResults)
          .catch((err) => {
            console.error('❌ [ANALYZER] Detección multi-modal falló:', err);
            console.error('📋 [ANALYZER] Detalles del error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
            imageTensor.dispose();
            throw ErrorHandler.createError(
              ErrorType.ANALYSIS_ERROR,
              'Failed to analyze image',
              err
            );
          });
        console.log('✅ [ANALYZER] Detección multi-modal completada');
        console.log(`🛡️ [ANALYZER] Resultado general: ${multiModalResult.overallSafe ? 'SEGURO' : 'INSEGURO'}`);
        console.log(`⚠️ [ANALYZER] Advertencias: ${multiModalResult.warnings.length}`);
        multiModalResult.warnings.forEach((warning, idx) => {
          console.log(`  ${idx + 1}. ${warning}`);
        });

        // Clean up
        console.log('🧹 [ANALYZER] Liberando tensor de memoria...');
        imageTensor.dispose();
        console.log('✅ [ANALYZER] Recursos liberados correctamente');

        // Update state
        console.log('💾 [ANALYZER] Actualizando estado con resultados...');
        setPredictions(nsfwResults);
        setDetectionResult(multiModalResult);

        // Cache results
        if (FEATURES.enableCache) {
          console.log('💾 [ANALYZER] Guardando resultados en caché...');
          imageCache.set(imageUri, nsfwResults, multiModalResult);
          console.log('✅ [ANALYZER] Resultados guardados en caché');
        }

        // Show alert if inappropriate
        if (!multiModalResult.overallSafe) {
          console.log('⚠️ [ANALYZER] Mostrando alerta de contenido inapropiado al usuario');
          Alert.alert(
            '⚠️ Contenido Inapropiado Detectado',
            `Esta imagen contiene:\n\n${multiModalResult.warnings.join('\n')}\n\nNo se permite este tipo de contenido.`,
            [{ text: 'Entendido', style: 'cancel' }]
          );
        }
        console.log('✅ [ANALYZER] Análisis completado exitosamente');
      } catch (err) {
        console.error('❌ [ANALYZER] Error crítico durante el análisis:', err);
        console.error('📋 [ANALYZER] Detalles completos del error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        const appError =
          err instanceof Error
            ? err
            : new Error('Unknown error during image analysis');

        setError(appError);
        console.log('🔄 [ANALYZER] Manejando error con posibilidad de reintento...');
        ErrorHandler.handleErrorWithCallback(err, 'ImageAnalysis', () => {
          if (lastImageUri) {
            console.log('🔄 [ANALYZER] Reintentando análisis...');
            analyzeImage(lastImageUri);
          }
        });
      } finally {
        console.log('🏁 [ANALYZER] Finalizando proceso de análisis');
        setLoading(false);
      }
    },
    [getModel, lastImageUri]
  );

  const clearResults = useCallback(() => {
    console.log('🗑️ [ANALYZER] Limpiando todos los resultados del análisis');
    setPredictions(null);
    setDetectionResult(null);
    setError(null);
    setLastImageUri(null);
  }, []);

  const retryLastAnalysis = useCallback(async (): Promise<void> => {
    if (lastImageUri) {
      console.log('🔄 [ANALYZER] Reintentando último análisis...');
      console.log(`📍 [ANALYZER] URI de última imagen: ${lastImageUri}`);
      await analyzeImage(lastImageUri);
    } else {
      console.log('⚠️ [ANALYZER] No hay imagen previa para reintentar');
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
