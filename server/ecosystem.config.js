module.exports = {
    apps: [
      {
        name: "campusseating-api",
        script: "server.js",
        exec_mode: "cluster",
        instances: 2,               // Contabo 6€ VPS is usually 1–2 vCPUs — don't overcommit
        max_memory_restart: "300M", // restart a worker if it leaks past this, protects small RAM
        env: { NODE_ENV: "production" },
        autorestart: true,
        watch: false,
        out_file: "./logs/out.log",
        error_file: "./logs/error.log",
        merge_logs: true,
        time: true,
      },
    ],
  };