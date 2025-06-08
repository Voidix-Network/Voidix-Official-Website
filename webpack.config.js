// Webpack配置：开发环境直接使用源文件，生产环境进行关键/非关键CSS分离
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    
    entry: isProduction ? {
      // 生产模式：关键/非关键CSS分离
      'index-critical': './build-entries/index-critical.js',
      'index-deferred': './build-entries/index-deferred.js',
      'status-critical': './build-entries/status-critical.js',
      'status-deferred': './build-entries/status-deferred.js',
      'faq-critical': './build-entries/faq-critical.js',
      'faq-deferred': './build-entries/faq-deferred.js',
      'error-critical': './build-entries/error-critical.js',
      'error-deferred': './build-entries/error-deferred.js',
      'bug-report-critical': './build-entries/bug-report-critical.js',
      'bug-report-deferred': './build-entries/bug-report-deferred.js'
    } : {
      // 开发模式：单个CSS文件
      'main': './build-entries/index.js'
    },
    
    output: {
      path: path.resolve(__dirname, isProduction ? 'dist' : 'dev-build'),
      filename: isProduction ? 'js/[name].bundle.js' : 'js/main.js',
      clean: isProduction,
    },
    
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    ['postcss-import', {}],
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    
    plugins: [
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'css/[name].min.css',
          chunkFilename: 'css/[id].css',
        })
      ] : [])
    ],
    
    optimization: isProduction ? {
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                mergeRules: true,
                minifyFontValues: true,
                minifyGradients: true,
                minifySelectors: true,
              },
            ],
          },
        }),
      ],
      minimize: true,
    } : {},
    
    devServer: {
      static: {
        directory: path.join(__dirname, './'),
      },
      compress: true,
      port: 3000,
      open: true,
      hot: true,
    },
    
    stats: {
      colors: true,
      modules: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
