# Analizador NSFW Simple

Aplicación simple de React Native con Expo para analizar contenido NSFW en imágenes.

## Instalación

```bash
npm install --legacy-peer-deps
```

## Uso

```bash
npm start
```

Luego abre Expo Go en tu teléfono y escanea el código QR.

## Funcionalidad

- Selecciona una imagen de tu galería
- La imagen se analiza automáticamente con NSFWJS
- Muestra los porcentajes de cada categoría
- Los resultados detallados se imprimen en la consola

## Ejemplo de salida en consola

```
========================================
ANÁLISIS COMPLETADO
========================================
Resultados del análisis NSFW:

1. Neutral: 85.30%
2. Drawing: 8.12%
3. Sexy: 4.50%
4. Porn: 1.20%
5. Hentai: 0.88%

Clasificación principal: Neutral (85.30%)
========================================
```

## Categorías

- **Neutral**: Contenido normal
- **Drawing**: Dibujos/ilustraciones
- **Sexy**: Contenido sugestivo
- **Porn**: Contenido pornográfico
- **Hentai**: Contenido hentai

## Requisitos

- Node.js
- Expo Go app (SDK 54) en tu dispositivo móvil
