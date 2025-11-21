import { MultiModalDetectionResult } from '../services/localDetection';

// ==================== Types ====================

interface NSFWPrediction {
  className: string;
  probability: number;
}

interface CachedResult {
  predictions: NSFWPrediction[];
  detectionResult: MultiModalDetectionResult;
  timestamp: number;
}

// ==================== Cache Manager ====================

class ImageResultCache {
  private cache = new Map<string, CachedResult>();
  private maxSize = 10; // Maximum cached results
  private ttl = 5 * 60 * 1000; // 5 minutes TTL

  /**
   * Generate cache key from image URI
   */
  private generateKey(imageUri: string): string {
    return imageUri;
  }

  /**
   * Check if cached result is still valid
   */
  private isValid(cached: CachedResult): boolean {
    return Date.now() - cached.timestamp < this.ttl;
  }

  /**
   * Get cached result if available and valid
   */
  get(imageUri: string): CachedResult | null {
    const key = this.generateKey(imageUri);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (!this.isValid(cached)) {
      this.cache.delete(key);
      return null;
    }

    console.log('📦 Cache hit for image:', imageUri.slice(0, 50));
    return cached;
  }

  /**
   * Store result in cache
   */
  set(
    imageUri: string,
    predictions: NSFWPrediction[],
    detectionResult: MultiModalDetectionResult
  ): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const key = this.generateKey(imageUri);
    this.cache.set(key, {
      predictions,
      detectionResult,
      timestamp: Date.now(),
    });

    console.log('💾 Cached result for image:', imageUri.slice(0, 50));
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Image cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// ==================== Singleton Instance ====================

export const imageCache = new ImageResultCache();
