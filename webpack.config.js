const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: './server.js',  // Entry point of your app
  target: 'node',  // Target Node.js environment
  externals: [nodeExternals()],  // Exclude node_modules from the bundle
  output: {
    libraryTarget: 'commonjs2',  // Output format for Lambda
    path: path.resolve(__dirname, '.webpack'),  // Output directory
    filename: 'handler.js'  // Output file name
  },
  mode: 'production',  // Optimize for production
  optimization: {
    minimize: true  // Minimize the bundle
  },
  module: {
    rules: [
      {
        test: /\.js$/,  // Process .js files
        exclude: /node_modules/,  // Exclude node_modules
        use: {
          loader: 'babel-loader',  // Use Babel for transpilation
          options: {
            presets: ['@babel/preset-env']  // Use Babel preset for Node.js
          }
        }
      }
    ]
  }
};
