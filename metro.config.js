const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Agregar extensiones para archivos binarios de TensorFlow
config.resolver.assetExts.push('bin');

// Configurar polyfills para módulos de Node.js
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
};

module.exports = config;
