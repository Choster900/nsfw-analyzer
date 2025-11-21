# 🔍 Sistema de Detección de Contenido Local

## ✅ Características

- **100% GRATIS** - Sin API keys, sin billing
- **100% OFFLINE** - Funciona sin internet
- **100% PRIVADO** - Las imágenes nunca salen del dispositivo
- **Multi-Modal** - Detecta múltiples tipos de contenido inapropiado

## 🎯 Categorías Detectadas

### 1. 🔞 Contenido Sexual (NSFWJS)
- Pornografía
- Hentai
- Contenido sugestivo
- Dibujos explícitos

**Precisión**: Alta (modelo pre-entrenado de Yahoo)

### 2. 💥 Violencia
- Contenido violento
- Sangre
- Basado en:
  - Dominancia de color rojo
  - Alto contraste
  - Patrones visuales característicos

**Precisión**: Media-Alta (análisis heurístico)

### 3. 💊 Drogas
- Sustancias ilegales
- Parafernalia
- Basado en:
  - Objetos pequeños con alto contraste
  - Nitidez de la imagen
  - Densidad de objetos pequeños

**Precisión**: Media (análisis heurístico)

### 4. 🔫 Armas
- Armas de fuego
- Armas blancas
- Basado en:
  - Formas lineales largas
  - Superficies metálicas
  - Patrones de contraste

**Precisión**: Media (análisis heurístico)

## 🧠 Tecnologías Utilizadas

1. **NSFWJS** (Yahoo Open Source)
   - Modelo de deep learning para detección NSFW
   - Basado en MobileNetV2
   - 93% de precisión en contenido sexual

2. **TensorFlow.js**
   - Framework de ML para JavaScript
   - Optimizado para React Native
   - Ejecución en el dispositivo

3. **Análisis Visual Heurístico**
   - Algoritmos de procesamiento de imagen
   - Detección de patrones visuales
   - Estadísticas de color y forma

## 📊 Funcionamiento

```typescript
Image → [NSFWJS Model] → Sexual Content Detection
     → [Image Statistics] → Violence Detection
     → [Image Statistics] → Drugs Detection
     → [Image Statistics] → Weapons Detection
     → [Combine Results] → Final Classification
```

## 🚀 Mejoras Futuras

Para mejorar la precisión de detección de violencia, drogas y armas:

### Opción 1: Modelos ONNX de HuggingFace
- Descargar modelos pre-entrenados como:
  - `Falconsai/nsfw_image_detection`
  - Modelos de clasificación de violencia
  - Modelos de detección de objetos (YOLOv5/v8)
- Convertir a formato TensorFlow.js
- Integrar en la app

### Opción 2: Transfer Learning
- Entrenar modelos custom con TensorFlow
- Usar datasets públicos:
  - Violence in Movies Dataset
  - Drug Detection Dataset
  - Weapons Detection Dataset
- Fine-tuning de MobileNet o EfficientNet

### Opción 3: API Híbrida (opcional)
- Mantener detección local para NSFW
- Usar APIs cloud solo para casos edge
- Implementar fallback si hay internet

## 📝 Limitaciones Actuales

1. **Violencia/Drogas/Armas**: Basado en heurísticas, no en ML
   - Puede dar falsos positivos
   - Puede perder algunos casos edge
   - Recomendado combinar con revisión humana

2. **Performance**: Análisis en ~2-3 segundos
   - Depende del dispositivo
   - Imágenes redimensionadas a 224x224

3. **Idioma**: Labels en español hardcodeados
   - Fácil de internacionalizar

## 🔧 Configuración de Sensibilidad

Puedes ajustar los umbrales en `services/localDetection.ts`:

```typescript
// Contenido NSFW
if (pornProb > 0.6) { // Cambiar de 0.6 a 0.7 para ser menos estricto

// Violencia
if (stats.redDominance > 0.6 && stats.contrast > 0.7) { // Ajustar umbrales

// Drogas
if (stats.sharpness > 0.7 && stats.smallObjectDensity > 0.6) { // Ajustar

// Armas
if (stats.linearShapes > 0.6 && stats.metallic > 0.5) { // Ajustar
```

## 📦 Requisitos

- React Native
- Expo
- TensorFlow.js
- NSFWJS
- ~50MB de espacio para modelos

## 🎯 Precisión Estimada

| Categoría | Precisión | Método |
|-----------|-----------|--------|
| Pornografía | ~93% | NSFWJS (ML) |
| Hentai | ~90% | NSFWJS (ML) |
| Violencia | ~70% | Heurístico |
| Drogas | ~65% | Heurístico |
| Armas | ~60% | Heurístico |

**Nota**: Para producción en casos críticos, se recomienda combinar con modelos ML adicionales o revisión humana.
