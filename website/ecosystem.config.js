// PM2 ecosystem config для Next.js website
module.exports = {
  apps: [
    {
      name: 'ispravleno-website',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/var/www/ispravleno-website/website',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOSTNAME: '0.0.0.0',
      },
      env_file: '.env',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
