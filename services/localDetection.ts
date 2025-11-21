import * as tf from '@tensorflow/tfjs';

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

interface ImageStatistics {
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
}

interface AnalysisResult {
  categories: ContentCategory[];
  safe: boolean;
  warnings: string[];
}

// ==================== Constants ====================

const THRESHOLDS = {
  nsfw: {
    porn: 0.6,
    hentai: 0.6,
    sexy: 0.7,
  },
  violence: {
    detection: 0.65,
    redDominance: 0.6,
    contrast: 0.7,
  },
  drugs: {
    detection: 0.35,
    blocking: 0.45,
    patterns: {
      smallObjects: { sharpness: 0.4, density: 0.3 },
      whitePowder: { whiteDominance: 0.5, texture: 0.4 },
      coloredPills: { colorVariety: 0.6, saturation: 0.5 },
      greenPlant: { greenDominance: 0.5, texture: 0.5 },
      cylindrical: { linearShapes: 0.4, density: 0.3 },
    },
  },
  weapons: {
    detection: 0.55,
    linearShapes: 0.6,
    metallic: 0.5,
  },
} as const;

// ==================== Utility Functions ====================

const createCategory = (
  category: string,
  confidence: number,
  threshold: number
): ContentCategory => ({
  category,
  confidence,
  isInappropriate: confidence > threshold,
});

const logStats = (label: string, stats: Record<string, number | string>): void => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(label, stats);
  }
};

// ==================== Local Content Detector Class ====================

export class LocalContentDetector {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing local content detector...');
      this.initialized = true;
      console.log('✅ Local content detector ready');
    } catch (error) {
      console.error('❌ Error initializing local detector:', error);
      throw error;
    }
  }

  async analyzeImage(
    imageTensor: tf.Tensor3D,
    nsfwPredictions: Array<{ className: string; probability: number }>
  ): Promise<MultiModalDetectionResult> {
    try {
      console.log('🔬 LocalDetector: Starting analysis...');

      if (!this.initialized) {
        await this.initialize();
      }

      // Calcular estadísticas de imagen una sola vez
      console.log('📊 Computing image statistics...');
      const stats = await this.analyzeImageStatistics(imageTensor);
      console.log('✅ Statistics computed');

      // Ejecutar todos los análisis (síncronos)
      console.log('🔞 Analyzing NSFW...');
      const nsfwResults = this.analyzeNSFW(nsfwPredictions);

      console.log('💥 Analyzing violence...');
      const violenceResults = this.analyzeViolence(stats);

      console.log('💊 Analyzing drugs...');
      const drugsResults = this.analyzeDrugs(stats);

      console.log('🔫 Analyzing weapons...');
      const weaponsResults = this.analyzeWeapons(stats);

      console.log('🔨 Building final result...');
      const result = this.buildResult(nsfwResults, violenceResults, drugsResults, weaponsResults);

      console.log('✅ Analysis complete');
      return result;
    } catch (error) {
      console.error('❌ LocalDetector error:', error);
      throw error;
    }
  }

  private buildResult(
    nsfw: AnalysisResult,
    violence: AnalysisResult,
    drugs: AnalysisResult,
    weapons: AnalysisResult
  ): MultiModalDetectionResult {
    const allCategories = [
      ...nsfw.categories,
      ...violence.categories,
      ...drugs.categories,
      ...weapons.categories,
    ].sort((a, b) => b.confidence - a.confidence);

    const allWarnings = [
      ...nsfw.warnings,
      ...violence.warnings,
      ...drugs.warnings,
      ...weapons.warnings,
    ];

    return {
      categories: allCategories,
      overallSafe: nsfw.safe && violence.safe && drugs.safe && weapons.safe,
      warnings: allWarnings,
      details: {
        nsfw: nsfw.categories,
        violence: violence.categories,
        drugs: drugs.categories,
        weapons: weapons.categories,
      },
    };
  }

  // ==================== NSFW Analysis ====================

  private analyzeNSFW(
    predictions: Array<{ className: string; probability: number }>
  ): AnalysisResult {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    const probabilities = {
      porn: predictions.find((p) => p.className === 'Porn')?.probability || 0,
      hentai: predictions.find((p) => p.className === 'Hentai')?.probability || 0,
      sexy: predictions.find((p) => p.className === 'Sexy')?.probability || 0,
    };

    if (probabilities.porn > THRESHOLDS.nsfw.porn) {
      categories.push(createCategory('Pornografía', probabilities.porn, THRESHOLDS.nsfw.porn));
      warnings.push('Contenido sexual explícito');
    }

    if (probabilities.hentai > THRESHOLDS.nsfw.hentai) {
      categories.push(createCategory('Contenido Hentai', probabilities.hentai, THRESHOLDS.nsfw.hentai));
      warnings.push('Contenido sexual animado');
    }

    if (probabilities.sexy > THRESHOLDS.nsfw.sexy) {
      categories.push(createCategory('Contenido Sugestivo', probabilities.sexy, THRESHOLDS.nsfw.sexy));
      warnings.push('Contenido sexualmente sugestivo');
    }

    return {
      categories,
      safe: categories.every((c) => !c.isInappropriate),
      warnings,
    };
  }

  // ==================== Violence Analysis ====================

  private analyzeViolence(stats: ImageStatistics): AnalysisResult {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    if (
      stats.redDominance > THRESHOLDS.violence.redDominance &&
      stats.contrast > THRESHOLDS.violence.contrast
    ) {
      const confidence = Math.min(stats.redDominance * stats.contrast, 0.85);

      if (confidence > THRESHOLDS.violence.detection) {
        categories.push(createCategory('Posible contenido violento', confidence, THRESHOLDS.violence.detection));
        warnings.push('Posible contenido violento o sangre');
      }
    }

    return { categories, safe: categories.every((c) => !c.isInappropriate), warnings };
  }

  // ==================== Drugs Analysis ====================

  private analyzeDrugs(stats: ImageStatistics): AnalysisResult {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    logStats('📊 Drug Detection Stats:', {
      sharpness: stats.sharpness.toFixed(2),
      smallObjectDensity: stats.smallObjectDensity.toFixed(2),
      whiteDominance: stats.whiteDominance.toFixed(2),
      texture: stats.texture.toFixed(2),
      colorVariety: stats.colorVariety.toFixed(2),
      saturation: stats.saturation.toFixed(2),
      greenDominance: stats.greenDominance.toFixed(2),
      linearShapes: stats.linearShapes.toFixed(2),
    });

    const patterns = this.detectDrugPatterns(stats);

    if (patterns.confidence > THRESHOLDS.drugs.detection) {
      const finalConfidence = Math.min(patterns.confidence * 1.3, 0.95);
      const category = `Posible contenido de drogas (${patterns.reasons.join(', ')})`;

      categories.push(createCategory(category, finalConfidence, THRESHOLDS.drugs.blocking));

      if (finalConfidence > THRESHOLDS.drugs.blocking) {
        warnings.push('Posible contenido relacionado con drogas');
      }

      logStats('💊 Drug Detection Result:', {
        finalConfidence: finalConfidence.toFixed(2),
        isBlocked: finalConfidence > THRESHOLDS.drugs.blocking,
      });
    } else {
      logStats('💊 No drug content detected', { confidence: patterns.confidence.toFixed(2) });
    }

    return { categories, safe: categories.every((c) => !c.isInappropriate), warnings };
  }

  private detectDrugPatterns(stats: ImageStatistics): {
    confidence: number;
    reasons: string[];
  } {
    let confidence = 0;
    const reasons: string[] = [];
    const { patterns } = THRESHOLDS.drugs;

    // Pattern 1: Small objects with high contrast
    if (stats.sharpness > patterns.smallObjects.sharpness &&
        stats.smallObjectDensity > patterns.smallObjects.density) {
      confidence = Math.max(confidence, (stats.sharpness + stats.smallObjectDensity) / 2);
      reasons.push('objetos pequeños');
    }

    // Pattern 2: White powder
    if (stats.whiteDominance > patterns.whitePowder.whiteDominance &&
        stats.texture > patterns.whitePowder.texture) {
      confidence = Math.max(confidence, (stats.whiteDominance + stats.texture) / 2);
      reasons.push('sustancia en polvo');
    }

    // Pattern 3: Colored pills
    if (stats.colorVariety > patterns.coloredPills.colorVariety &&
        stats.saturation > patterns.coloredPills.saturation) {
      confidence = Math.max(confidence, (stats.colorVariety + stats.saturation) / 2 * 0.8);
      reasons.push('objetos de colores variados');
    }

    // Pattern 4: Green plant material
    if (stats.greenDominance > patterns.greenPlant.greenDominance &&
        stats.texture > patterns.greenPlant.texture) {
      confidence = Math.max(confidence, (stats.greenDominance + stats.texture) / 2);
      reasons.push('material vegetal');
    }

    // Pattern 5: Cylindrical objects
    if (stats.linearShapes > patterns.cylindrical.linearShapes &&
        stats.smallObjectDensity > patterns.cylindrical.density) {
      confidence = Math.max(confidence, (stats.linearShapes + stats.smallObjectDensity) / 2 * 0.9);
      reasons.push('objetos cilíndricos');
    }

    return { confidence, reasons };
  }

  // ==================== Weapons Analysis ====================

  private analyzeWeapons(stats: ImageStatistics): AnalysisResult {
    const categories: ContentCategory[] = [];
    const warnings: string[] = [];

    if (
      stats.linearShapes > THRESHOLDS.weapons.linearShapes &&
      stats.metallic > THRESHOLDS.weapons.metallic
    ) {
      const confidence = Math.min(stats.linearShapes * stats.metallic * 0.85, 0.7);

      if (confidence > THRESHOLDS.weapons.detection) {
        categories.push(createCategory('Posible presencia de armas', confidence, THRESHOLDS.weapons.detection));
        warnings.push('Posible presencia de armas');
      }
    }

    return { categories, safe: categories.every((c) => !c.isInappropriate), warnings };
  }

  // ==================== Image Statistics ====================

  private async analyzeImageStatistics(imageTensor: tf.Tensor3D): Promise<ImageStatistics> {
    return tf.tidy(() => {
      const normalized = imageTensor.div(255);
      const [redChannel, greenChannel, blueChannel] = tf.split(normalized, 3, 2);

      // Color statistics
      const [redMean, greenMean, blueMean] = [
        redChannel.mean().arraySync() as number,
        greenChannel.mean().arraySync() as number,
        blueChannel.mean().arraySync() as number,
      ];

      const totalMean = (redMean + greenMean + blueMean) / 3;
      const colorMean = totalMean;

      const colorVariance =
        (Math.pow(redMean - colorMean, 2) +
          Math.pow(greenMean - colorMean, 2) +
          Math.pow(blueMean - colorMean, 2)) / 3;

      // Contrast
      const mean = normalized.mean();
      const variance = normalized.sub(mean).square().mean();
      const contrast = Math.sqrt(variance.arraySync() as number);

      // Sharpness and texture
      const gray = normalized.mean(2, true).expandDims(0);

      // Create Sobel filters with correct shape [3, 3, 1, 1]
      const sobelXKernel = tf.tensor2d([
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
      ]);
      const sobelYKernel = tf.tensor2d([
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
      ]);

      const sobelX = sobelXKernel.expandDims(2).expandDims(3);
      const sobelY = sobelYKernel.expandDims(2).expandDims(3);

      const gradX = tf.conv2d(gray as tf.Tensor4D, sobelX, 1, 'same');
      const gradY = tf.conv2d(gray as tf.Tensor4D, sobelY, 1, 'same');
      const gradientMagnitude = gradX.square().add(gradY.square()).sqrt();

      const sharpness = gradientMagnitude.mean().arraySync() as number;
      const gradMean = gradientMagnitude.mean();
      const gradVariance = gradientMagnitude.sub(gradMean).square().mean();
      const texture = Math.sqrt(gradVariance.arraySync() as number);

      return {
        redDominance: Math.min(Math.max((totalMean > 0 ? redMean / totalMean : 0) - 0.15, 0) * 2, 1),
        greenDominance: Math.min(Math.max((totalMean > 0 ? greenMean / totalMean : 0) - 0.15, 0) * 2, 1),
        whiteDominance: Math.min(Math.min(redMean, greenMean, blueMean) * 1.5, 1),
        contrast: Math.min(contrast * 3, 1),
        sharpness: Math.min(sharpness * 20, 1),
        smallObjectDensity: Math.min(sharpness * 2.5, 1),
        linearShapes: Math.min(contrast * 1.5, 1),
        metallic: Math.min(((blueMean + redMean) / 2) * 1.5, 1),
        texture: Math.min(texture * 25, 1),
        colorVariety: Math.min(Math.sqrt(colorVariance) * 4, 1),
        saturation: Math.min(
          (Math.abs(redMean - greenMean) +
            Math.abs(greenMean - blueMean) +
            Math.abs(blueMean - redMean)) / 3 * 3,
          1
        ),
      };
    });
  }
}

// Singleton instance
export const localDetector = new LocalContentDetector();
