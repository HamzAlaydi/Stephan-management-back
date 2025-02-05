module.exports = {
  apps: [
    {
      name: "stephan-app",
      script: "app.js",
      node_args: "--experimental-modules",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
