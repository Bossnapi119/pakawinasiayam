module.exports = {
  apps: [
    {
      name: "pana-backend",
      script: "./index.js",
      instances: "max", // Creates one instance per CPU core
      exec_mode: "cluster", // Enables Load Balancing
      env: {
        NODE_ENV: "production",
        PORT: 4000
      }
    }
  ]
};