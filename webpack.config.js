const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: "./server.js",
  target: "node",
  externals: [nodeExternals()],
  output: {
    libraryTarget: "commonjs2",
    path: path.resolve(__dirname, ".webpack"),
    filename: "handler.js",
  },
  mode: "production",
  optimization: {
    minimize: true,
  },
};