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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        setImage(selectedImageUri);
        onImageSelected?.(selectedImageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Error al seleccionar la imagen');
    }
  }, [onImageSelected]);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  return {
    image,
    pickImage,
    clearImage,
  };
}
