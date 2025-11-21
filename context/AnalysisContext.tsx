import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';

// ==================== Types ====================

type NSFWModel = Awaited<ReturnType<typeof nsfwjs.load>>;

interface AnalysisContextValue {
  getModel: () => Promise<NSFWModel>;
  isModelLoaded: () => boolean;
  clearModel: () => void;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

// ==================== Context ====================

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

// ==================== Provider ====================

export function AnalysisProvider({ children }: AnalysisProviderProps): JSX.Element {
  const modelRef = useRef<NSFWModel | null>(null);
  const loadingRef = useRef<Promise<NSFWModel> | null>(null);

  const getModel = useCallback(async (): Promise<NSFWModel> => {
    // Return cached model if available
    if (modelRef.current) {
      return modelRef.current;
    }

    // Return in-progress loading promise to avoid duplicate loads
    if (loadingRef.current) {
      return loadingRef.current;
    }

    // Start loading
    loadingRef.current = (async () => {
      try {
        console.log('🔄 Loading NSFWJS model...');
        await tf.ready();
        const model = await nsfwjs.load();
        modelRef.current = model;
        console.log('✅ Model loaded and cached');
        return model;
      } catch (error) {
        console.error('❌ Error loading model:', error);
        throw error;
      } finally {
        loadingRef.current = null;
      }
    })();

    return loadingRef.current;
  }, []);

  const isModelLoaded = useCallback((): boolean => {
    return modelRef.current !== null;
  }, []);

  const clearModel = useCallback((): void => {
    modelRef.current = null;
    loadingRef.current = null;
    console.log('🗑️ Model cache cleared');
  }, []);

  const value: AnalysisContextValue = {
    getModel,
    isModelLoaded,
    clearModel,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

// ==================== Hook ====================

export function useAnalysisContext(): AnalysisContextValue {
  const context = useContext(AnalysisContext);

  if (!context) {
    throw new Error('useAnalysisContext must be used within AnalysisProvider');
  }

  return context;
}
