/**
 * Babel Configuration
 * 
 * IMPORTANT: The module-resolver plugin MUST match tsconfig.json paths.
 * If you change one, you must change the other to stay in sync.
 * 
 * @/ maps to ./src/ - this allows clean absolute imports throughout the app.
 */

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // 'react-native-reanimated/plugin',
    ],
  };
};

