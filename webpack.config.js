const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false, // Disable source maps to avoid encoding issues
  entry: {
    background: './src/background/service-worker.ts',
    content: './src/content/recorder.ts',
    popup: './src/popup/popup.ts',
    player: './src/content/player.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    charset: true,
    clean: true
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        type: 'javascript/auto'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      // Prevent polyfills that might cause encoding issues
      "fs": false,
      "path": false
    }
  },
  optimization: {
    minimize: true,
    usedExports: true,
    minimizer: [
      (compiler) => {
        const TerserPlugin = require('terser-webpack-plugin');
        new TerserPlugin({
          terserOptions: {
            format: {
              ascii_only: true, // Ensure ASCII output
              comments: false
            },
            compress: {
              drop_console: false,
              drop_debugger: true
            }
          }
        }).apply(compiler);
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' }
      ]
    })
  ],
  performance: {
    hints: false, // Disable performance hints
    maxAssetSize: 512000,
    maxEntrypointSize: 512000
  }
};

