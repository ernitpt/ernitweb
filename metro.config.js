const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ✅ Add SVG transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// ✅ Keep Reanimated + NativeWind happy
config.transformer.minifierPath = 'metro-minify-terser';

// ✅ Ensure .svg handled correctly (as components)
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg'
);
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'svg',
  'cjs', // needed for some libraries
];

module.exports = config;
