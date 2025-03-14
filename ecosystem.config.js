module.exports = {
  apps: [
    {
      name: "stephan-backend",
      script: "app.js",
      env: {
        NODE_ENV: "production",
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
      env_file: "/var/www/stephan-backend/.env",
    },
  ],
};
