module.exports = {
  apps: [{
    name: 'autosquare-backend',
    script: 'npx',
    args: 'ts-node src/server.ts',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '1G'
  }]
}
