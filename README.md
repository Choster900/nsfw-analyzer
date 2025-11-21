# NSFW Image Analyzer

Aplicación móvil para detectar contenido inapropiado en imágenes usando inteligencia artificial.

## Tecnologías de Análisis

- **NSFWJS** - Modelo de deep learning pre-entrenado para clasificación de contenido NSFW
- **TensorFlow.js** - Framework de ML que ejecuta el modelo directamente en el dispositivo
- **Detección Multi-Modal** - Sistema local que combina análisis de píxeles, patrones de color y características faciales
- **React Native + Expo** - Framework móvil multiplataforma

## Cómo Funciona

1. El usuario selecciona una imagen de su galería
2. La imagen se procesa y convierte en tensor usando TensorFlow.js
3. NSFWJS clasifica la imagen en 5 categorías (Neutral, Drawing, Sexy, Porn, Hentai)
4. El detector multi-modal analiza patrones adicionales (piel, colores, formas)
5. Se combina toda la información para determinar si el contenido es seguro
6. Los resultados se muestran con alertas visuales si se detecta contenido inapropiado

## Instalación

```bash
npm install --legacy-peer-deps
npm start
```

Escanea el código QR con Expo Go desde tu dispositivo móvil.
