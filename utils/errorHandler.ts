import { Alert } from 'react-native';

// ==================== Error Types ====================

export enum ErrorType {
  MODEL_LOAD_ERROR = 'MODEL_LOAD_ERROR',
  IMAGE_PROCESSING_ERROR = 'IMAGE_PROCESSING_ERROR',
  ANALYSIS_ERROR = 'ANALYSIS_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ==================== Error Messages ====================

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  [ErrorType.MODEL_LOAD_ERROR]: {
    title: 'Error al Cargar Modelo',
    message: 'No se pudo cargar el modelo de análisis. Por favor, reinicia la aplicación.',
  },
  [ErrorType.IMAGE_PROCESSING_ERROR]: {
    title: 'Error de Procesamiento',
    message: 'No se pudo procesar la imagen. Por favor, intenta con otra imagen.',
  },
  [ErrorType.ANALYSIS_ERROR]: {
    title: 'Error de Análisis',
    message: 'No se pudo analizar la imagen. Por favor, intenta nuevamente.',
  },
  [ErrorType.PERMISSION_ERROR]: {
    title: 'Permisos Necesarios',
    message: 'Se necesitan permisos para acceder a la galería de fotos.',
  },
  [ErrorType.NETWORK_ERROR]: {
    title: 'Error de Red',
    message: 'No se pudo conectar. Verifica tu conexión a internet.',
  },
  [ErrorType.UNKNOWN_ERROR]: {
    title: 'Error Desconocido',
    message: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
  },
};

// ==================== Error Handler ====================

export class ErrorHandler {
  /**
   * Log error to console with details
   */
  static logError(error: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';

    console.error(`❌ ${timestamp} ${contextStr}`, error);

    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }

  /**
   * Classify error type
   */
  static classifyError(error: unknown): ErrorType {
    if (error instanceof AppError) {
      return error.type;
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error);

    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return ErrorType.PERMISSION_ERROR;
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    if (errorMessage.includes('model') || errorMessage.includes('load')) {
      return ErrorType.MODEL_LOAD_ERROR;
    }

    if (errorMessage.includes('image') || errorMessage.includes('decode')) {
      return ErrorType.IMAGE_PROCESSING_ERROR;
    }

    if (errorMessage.includes('analyze') || errorMessage.includes('classify')) {
      return ErrorType.ANALYSIS_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Handle error with user-friendly alert
   */
  static handleError(error: unknown, context?: string): void {
    this.logError(error, context);

    const errorType = this.classifyError(error);
    const { title, message } = ERROR_MESSAGES[errorType];

    Alert.alert(title, message, [
      {
        text: 'Entendido',
        style: 'cancel',
      },
    ]);
  }

  /**
   * Handle error with custom callback
   */
  static handleErrorWithCallback(
    error: unknown,
    context: string,
    onRetry?: () => void
  ): void {
    this.logError(error, context);

    const errorType = this.classifyError(error);
    const { title, message } = ERROR_MESSAGES[errorType];

    const buttons = [
      {
        text: 'Cancelar',
        style: 'cancel' as const,
      },
    ];

    if (onRetry) {
      buttons.unshift({
        text: 'Reintentar',
        style: 'default' as const,
        onPress: onRetry,
      });
    }

    Alert.alert(title, message, buttons);
  }

  /**
   * Create typed error
   */
  static createError(type: ErrorType, message: string, originalError?: unknown): AppError {
    return new AppError(type, message, originalError);
  }
}
