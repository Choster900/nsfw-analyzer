// ==================== App Configuration ====================

export const APP_CONFIG = {
  name: 'Analizador de Contenido',
  version: '2.0.0',
  description: 'Detecta contenido inapropiado, drogas, violencia y más',
} as const;

// ==================== Image Processing ====================

export const IMAGE_CONFIG = {
  maxWidth: 224,
  maxHeight: 224,
  quality: 1,
  format: 'jpeg',
  aspectRatio: [4, 3],
} as const;

// ==================== Cache Configuration ====================

export const CACHE_CONFIG = {
  maxSize: 10,
  ttl: 5 * 60 * 1000, // 5 minutes
} as const;

// ==================== Analysis Timeouts ====================

export const TIMEOUT_CONFIG = {
  modelLoad: 30000, // 30 seconds
  imageAnalysis: 10000, // 10 seconds
  imageProcessing: 5000, // 5 seconds
} as const;

// ==================== UI Configuration ====================

export const UI_CONFIG = {
  colors: {
    primary: '#007AFF',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FF9800',
    background: '#f5f5f5',
    text: '#333',
    textSecondary: '#666',
  },
  animation: {
    duration: 300,
    easing: 'ease-in-out',
  },
} as const;

// ==================== Feature Flags ====================

export const FEATURES = {
  enableCache: true,
  enableDebugLogs: __DEV__,
  enableErrorReporting: !__DEV__,
  enableAnalytics: false,
} as const;

// ==================== Detection Thresholds ====================

export const DETECTION_THRESHOLDS = {
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
  },
  weapons: {
    detection: 0.55,
    linearShapes: 0.6,
    metallic: 0.5,
  },
} as const;
