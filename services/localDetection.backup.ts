import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';

// ==================== Types ====================

export interface ContentCategory {
  category: string;
  confidence: number;
  isInappropriate: boolean;
}

export interface MultiModalDetectionResult {
  categories: ContentCategory[];
  overallSafe: boolean;
  warnings: string[];
  details: {
    nsfw: ContentCategory[];
    violence: ContentCategory[];
    drugs: ContentCategory[];
    weapons: ContentCategory[];
  };
}

// ==================== Clasificador Multi-Modal Local ====================

/**
 * Detector de contenido inapropiado que funciona 100% offline
 * Usa modelos de TensorFlow.js y análisis de patrones
 */
export class LocalContentDetector {
  private violenceModel: tf.LayersModel | null = null;
  private initialized: boolean = false;

  /**
   * Inicializa los modelos locales
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing local content detector...');

      // Por ahora, usaremos análisis basado en NSFWJS
      // En el futuro, aquí se pueden cargar modelos adicionales de HuggingFace
      // Ejemplo: await this.loadViolenceModel();

      this.initialized = true;
      console.log('Local content detector ready');
    } catch (error) {
      console.error('Error initializing local detector:', error);
      throw error;
    }
  }

  /**
   * Carga un modelo de detección de violencia desde HuggingFace
   * (Para implementación futura con modelos convertidos a TF.js)
   */
  private async loadViolenceModel(): Promise<void> {
    // TODO: Implementar carga de modelo desde assets o URL
    // const modelUrl = 'https://huggingface.co/.../model.json';
    // this.violenceModel = await tf.loadLayersModel(modelUrl);
  }

  /**
   * Analiza una imagen en busca de múltiples categorías de contenido inapropiado
   */
  async analyzeImage(
    imageTensor: tf.Tensor3D,
    nsfwPredictions: Array<{ className: string; probability: number }>
  ): Promise<MultiModalDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: MultiModalDetectionResult = {
      categories: [],
      overallSafe: true,
      warnings: [],
      details: {
        nsfw: [],
        violence: [],
        drugs: [],
        weapons: [],
      },
    };

    // Análisis 1: Contenido NSFW (basado en NSFWJS)
    const nsfwResults = this.analyzeNSFW(nsfwPredictions);
    result.details.nsfw = nsfwResults.categories;
    if (!nsfwResults.safe) {
      result.overallSafe = false;
      result.warnings.push(...nsfwResults.warnings);
    }

    // Análisis 2: Violencia (basado en características de imagen)
    const violenceResults = await this.analyzeViolence(imageTensor);
    result.details.violence = violenceResults.categories;
    if (!violenceResults.safe) {
      result.overallSafe = false;
      result.warnings.push(...violenceResults.warnings);
    }

    // Análisis 3: Drogas (basado en patrones visuales)
    const drugsResults = await this.analyzeDrugs(imageTensor);
    result.details.drugs = drugsResults.categories;
    if (!drugsResults.safe) {
      result.overallSafe = false;
      result.warnings.push(...drugsResults.warnings);
    }

    // Análisis 4: Armas (basado en formas y contornos)
    const weaponsResults = await this.analyzeWeapons(imageTensor);
    result.details.weapons = weaponsResults.categories;
    if (!weaponsResults.safe) {
      result.overallSafe = false;
      result.warnings.push(...weaponsResults.warnings);
    }

    // Combinar todas las categorías
    result.categories = [
      ...result.details.nsfw,
      ...result.details.violence,
      ...result.details.drugs,
      ...result.details.weapons,
    ].sort((a, b) => b.confidence - a.confidence);

    return result;
  }

  /**
   * Analiza contenido NSFW basado en predicciones de NSFWJS
   */
  private analyzeNSFW(predictions: Array<{ className: string; probability: number }>): {
    categories: ContentCategory[];
    safe: boolean;
    warnings: string[];
  } {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];
    let safe = true;

    const pornProb = predictions.find((p) => p.className === 'Porn')?.probability || 0;
    const hentaiProb = predictions.find((p) => p.className === 'Hentai')?.probability || 0;
    const sexyProb = predictions.find((p) => p.className === 'Sexy')?.probability || 0;

    // Pornografía
    if (pornProb > 0.6) {
      categories.push({
        category: 'Pornografía',
        confidence: pornProb,
        isInappropriate: true,
      });
      warnings.push('Contenido sexual explícito');
      safe = false;
    }

    // Hentai
    if (hentaiProb > 0.6) {
      categories.push({
        category: 'Contenido Hentai',
        confidence: hentaiProb,
        isInappropriate: true,
      });
      warnings.push('Contenido sexual animado');
      safe = false;
    }

    // Contenido sugestivo
    if (sexyProb > 0.7) {
      categories.push({
        category: 'Contenido Sugestivo',
        confidence: sexyProb,
        isInappropriate: true,
      });
      warnings.push('Contenido sexualmente sugestivo');
      safe = false;
    }

    return { categories, safe, warnings };
  }

  /**
   * Analiza indicadores de violencia en la imagen
   */
  private async analyzeViolence(imageTensor: tf.Tensor3D): Promise<{
    categories: ContentCategory[];
    safe: boolean;
    warnings: string[];
  }> {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    // Análisis de características visuales que pueden indicar violencia
    const stats = await this.analyzeImageStatistics(imageTensor);

    // Detectar alto contraste rojo (puede indicar sangre)
    if (stats.redDominance > 0.6 && stats.contrast > 0.7) {
      const confidence = Math.min(stats.redDominance * stats.contrast, 0.85);
      categories.push({
        category: 'Posible contenido violento',
        confidence,
        isInappropriate: confidence > 0.65,
      });

      if (confidence > 0.65) {
        warnings.push('Posible contenido violento o sangre');
      }
    }

    const safe = categories.every((c) => !c.isInappropriate);
    return { categories, safe, warnings };
  }

  /**
   * Analiza indicadores de drogas en la imagen
   */
  private async analyzeDrugs(imageTensor: tf.Tensor3D): Promise<{
    categories: ContentCategory[];
    safe: boolean;
    warnings: string[];
  }> {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    // Análisis de características que pueden indicar drogas
    const stats = await this.analyzeImageStatistics(imageTensor);

    // Log de estadísticas para debugging
    console.log('📊 Drug Detection Stats:', {
      sharpness: stats.sharpness.toFixed(2),
      smallObjectDensity: stats.smallObjectDensity.toFixed(2),
      whiteDominance: stats.whiteDominance.toFixed(2),
      texture: stats.texture.toFixed(2),
      colorVariety: stats.colorVariety.toFixed(2),
      saturation: stats.saturation.toFixed(2),
      greenDominance: stats.greenDominance.toFixed(2),
      linearShapes: stats.linearShapes.toFixed(2),
    });

    // Múltiples patrones que pueden indicar drogas
    let drugConfidence = 0;
    let detectionReasons: string[] = [];

    // Patrón 1: Objetos pequeños con alto contraste (pastillas, polvos)
    if (stats.sharpness > 0.4 && stats.smallObjectDensity > 0.3) {
      const patternConfidence = (stats.sharpness + stats.smallObjectDensity) / 2;
      drugConfidence = Math.max(drugConfidence, patternConfidence);
      detectionReasons.push('objetos pequeños');
    }

    // Patrón 2: Superficies blancas con textura (polvo blanco)
    if (stats.whiteDominance > 0.5 && stats.texture > 0.4) {
      const patternConfidence = (stats.whiteDominance + stats.texture) / 2;
      drugConfidence = Math.max(drugConfidence, patternConfidence);
      detectionReasons.push('sustancia en polvo');
    }

    // Patrón 3: Colores atípicos (pastillas de colores)
    if (stats.colorVariety > 0.6 && stats.saturation > 0.5) {
      const patternConfidence = (stats.colorVariety + stats.saturation) / 2;
      drugConfidence = Math.max(drugConfidence, patternConfidence * 0.8);
      detectionReasons.push('objetos de colores variados');
    }

    // Patrón 4: Plantas verdes con textura específica (marihuana)
    if (stats.greenDominance > 0.5 && stats.texture > 0.5) {
      const patternConfidence = (stats.greenDominance + stats.texture) / 2;
      drugConfidence = Math.max(drugConfidence, patternConfidence);
      detectionReasons.push('material vegetal');
    }

    // Patrón 5: Objetos cilíndricos/lineales pequeños (cigarrillos, porros)
    if (stats.linearShapes > 0.4 && stats.smallObjectDensity > 0.3) {
      const patternConfidence = (stats.linearShapes + stats.smallObjectDensity) / 2;
      drugConfidence = Math.max(drugConfidence, patternConfidence * 0.9);
      detectionReasons.push('objetos cilíndricos');
    }

    // Log de resultados
    console.log('💊 Drug Confidence:', {
      rawConfidence: drugConfidence.toFixed(2),
      reasons: detectionReasons,
      threshold: 0.35,
    });

    // Si hay confianza suficiente, agregar categoría
    if (drugConfidence > 0.35) {
      const finalConfidence = Math.min(drugConfidence * 1.3, 0.95);
      const isInappropriate = finalConfidence > 0.45;

      categories.push({
        category: `Posible contenido de drogas (${detectionReasons.join(', ')})`,
        confidence: finalConfidence,
        isInappropriate,
      });

      if (isInappropriate) {
        warnings.push('Posible contenido relacionado con drogas');
      }

      console.log('💊 Drug Detection Result:', {
        finalConfidence: finalConfidence.toFixed(2),
        isBlocked: isInappropriate,
      });
    } else {
      console.log('💊 No drug content detected (below threshold)');
    }

    const safe = categories.every((c) => !c.isInappropriate);
    return { categories, safe, warnings };
  }

  /**
   * Analiza indicadores de armas en la imagen
   */
  private async analyzeWeapons(imageTensor: tf.Tensor3D): Promise<{
    categories: ContentCategory[];
    safe: boolean;
    warnings: string[];
  }> {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    // Análisis de formas que pueden indicar armas
    const stats = await this.analyzeImageStatistics(imageTensor);

    // Detectar formas lineales largas con alto contraste (puede indicar armas)
    if (stats.linearShapes > 0.6 && stats.metallic > 0.5) {
      const confidence = Math.min(stats.linearShapes * stats.metallic * 0.85, 0.7);
      categories.push({
        category: 'Posible presencia de armas',
        confidence,
        isInappropriate: confidence > 0.55,
      });

      if (confidence > 0.55) {
        warnings.push('Posible presencia de armas');
      }
    }

    const safe = categories.every((c) => !c.isInappropriate);
    return { categories, safe, warnings };
  }

  /**
   * Analiza estadísticas visuales de la imagen
   */
  private async analyzeImageStatistics(imageTensor: tf.Tensor3D): Promise<{
    redDominance: number;
    greenDominance: number;
    whiteDominance: number;
    contrast: number;
    sharpness: number;
    smallObjectDensity: number;
    linearShapes: number;
    metallic: number;
    texture: number;
    colorVariety: number;
    saturation: number;
  }> {
    return tf.tidy(() => {
      // Normalizar tensor a [0, 1]
      const normalized = imageTensor.div(255);

      // Separar canales de color
      const channels = tf.split(normalized, 3, 2);
      const redChannel = channels[0];
      const greenChannel = channels[1];
      const blueChannel = channels[2];

      const redMean = redChannel.mean().arraySync() as number;
      const greenMean = greenChannel.mean().arraySync() as number;
      const blueMean = blueChannel.mean().arraySync() as number;

      const totalMean = (redMean + greenMean + blueMean) / 3;

      // Dominancia de colores
      const redDominance = totalMean > 0 ? redMean / totalMean : 0;
      const greenDominance = totalMean > 0 ? greenMean / totalMean : 0;

      // Dominancia de blanco (todos los canales altos)
      const whiteDominance = Math.min(redMean, greenMean, blueMean);

      // Variedad de colores (desviación estándar entre canales)
      const colorMean = (redMean + greenMean + blueMean) / 3;
      const colorVariance = (
        Math.pow(redMean - colorMean, 2) +
        Math.pow(greenMean - colorMean, 2) +
        Math.pow(blueMean - colorMean, 2)
      ) / 3;
      const colorVariety = Math.sqrt(colorVariance);

      // Saturación promedio
      const saturation = (
        Math.abs(redMean - greenMean) +
        Math.abs(greenMean - blueMean) +
        Math.abs(blueMean - redMean)
      ) / 3;

      // Calcular contraste (desviación estándar)
      const mean = normalized.mean();
      const variance = normalized.sub(mean).square().mean();
      const contrast = Math.sqrt(variance.arraySync() as number);

      // Calcular nitidez y textura usando gradiente
      const gray = normalized.mean(2, true);
      const sobelX = tf.tensor2d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]).expandDims(2).expandDims(3);
      const sobelY = tf.tensor2d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]).expandDims(2).expandDims(3);

      const grayExpanded = gray.expandDims(0);
      const gradX = tf.conv2d(grayExpanded as tf.Tensor4D, sobelX as tf.Tensor4D, 1, 'same');
      const gradY = tf.conv2d(grayExpanded as tf.Tensor4D, sobelY as tf.Tensor4D, 1, 'same');

      const gradientMagnitude = gradX.square().add(gradY.square()).sqrt();
      const sharpness = gradientMagnitude.mean().arraySync() as number;

      // Textura (varianza del gradiente)
      const gradMean = gradientMagnitude.mean();
      const gradVariance = gradientMagnitude.sub(gradMean).square().mean();
      const texture = Math.sqrt(gradVariance.arraySync() as number);

      // Estimaciones heurísticas
      const smallObjectDensity = Math.min(sharpness * 2.5, 1);
      const linearShapes = Math.min(contrast * 1.5, 1);
      const metallic = Math.min((blueMean + redMean) / 2 * 1.5, 1);

      return {
        redDominance: Math.min(Math.max(redDominance - 0.15, 0) * 2, 1),
        greenDominance: Math.min(Math.max(greenDominance - 0.15, 0) * 2, 1),
        whiteDominance: Math.min(whiteDominance * 1.5, 1),
        contrast: Math.min(contrast * 3, 1),
        sharpness: Math.min(sharpness * 20, 1),
        smallObjectDensity: Math.min(smallObjectDensity, 1),
        linearShapes: Math.min(linearShapes, 1),
        metallic: Math.min(metallic, 1),
        texture: Math.min(texture * 25, 1),
        colorVariety: Math.min(colorVariety * 4, 1),
        saturation: Math.min(saturation * 3, 1),
      };
    });
  }
}

// Singleton instance
export const localDetector = new LocalContentDetector();
