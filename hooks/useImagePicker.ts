import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ==================== Hook ====================

interface UseImagePickerReturn {
  image: string | null;
  pickImage: () => Promise<void>;
  clearImage: () => void;
}

export function useImagePicker(onImageSelected?: (uri: string) => void): UseImagePickerReturn {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = useCallback(async (): Promise<void> => {
    try {
      console.log('🔐 [IMAGE_PICKER] Solicitando permisos de galería...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        console.log('⚠️ [IMAGE_PICKER] Permisos denegados por el usuario');
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      console.log('✅ [IMAGE_PICKER] Permisos concedidos, abriendo galería...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        console.log('✅ [IMAGE_PICKER] Imagen seleccionada exitosamente');
        console.log(`📁 [IMAGE_PICKER] URI: ${selectedImageUri}`);
        console.log(`📐 [IMAGE_PICKER] Dimensiones: ${result.assets[0].width}x${result.assets[0].height}`);
        setImage(selectedImageUri);
        onImageSelected?.(selectedImageUri);
      } else {
        console.log('❌ [IMAGE_PICKER] Selección cancelada por el usuario');
      }
    } catch (error) {
      console.error('❌ [IMAGE_PICKER] Error al seleccionar imagen:', error);
      console.error('📋 [IMAGE_PICKER] Detalles del error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      Alert.alert('Error', 'Error al seleccionar la imagen');
    }
  }, [onImageSelected]);

  const clearImage = useCallback(() => {
    console.log('🗑️ [IMAGE_PICKER] Limpiando imagen seleccionada');
    setImage(null);
  }, []);

  return {
    image,
    pickImage,
    clearImage,
  };
}
