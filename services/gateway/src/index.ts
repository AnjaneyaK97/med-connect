import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { SocketGateway } from './websocket/socketGateway';

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket Gateway mounted at /ws
SocketGateway.initialize(server);

server.listen(config.port, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: `MediConnect Gateway listening on port ${config.port} (HTTP & WebSocket /ws)`,
      environment: config.env,
      timestamp: new Date().toISOString(),
    })
  );
});

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}, initiating graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
