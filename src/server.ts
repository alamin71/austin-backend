import { createServer, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { validateConfig } from './DB/configValidation.js';
import { connectToDatabase } from './DB/db.js';
import app from './app.js';
import config from './config/index.js';
import { logger } from './shared/logger.js';
import { socketHelper } from './helpers/socketHelper.js';
import { setSocketInstance } from './helpers/socketInstance.js';
import { setupProcessHandlers } from './DB/processHandlers.js';
import { setupSecurity } from './DB/security.js';
import { setupCluster } from './DB/cluster.js';
import { emailHelper } from './helpers/emailHelper.js';

// Define the types for the servers
let httpServer: HttpServer;
let socketServer: SocketServer;

// Function to start the server
export async function startServer() {
     try {
          // Validate config
          validateConfig();
          // Connect to the database
          await connectToDatabase();
          
          // Verify email configuration
          logger.info('🔍 Verifying email configuration...');
          await emailHelper.verifyEmailConnection();
          
          // Create HTTP server
          httpServer = createServer(app);
          const httpPort = Number(config.port);
          const socketPort = Number(config.socket_port);
          const ipAddress = config.ip_address as string;

          // Set timeouts
          httpServer.timeout = 120000;
          httpServer.keepAliveTimeout = 5000;
          httpServer.headersTimeout = 60000;

          // Start HTTP server
          httpServer.listen(httpPort, ipAddress, () => {
               logger.info(`♻️  Application listening on http://${ipAddress}:${httpPort}`);
          });

          // Set up Socket.io server
          socketServer = new SocketServer({
               cors: {
                    origin: config.allowed_origins || '*',
                    methods: ['GET', 'POST'],
                    credentials: true,
               },
          });

          socketServer.listen(socketPort);
          setSocketInstance(socketServer); // Initialize global socket instance
          socketHelper.socket(socketServer);
          logger.info(`♻️  Socket is listening on ${ipAddress}:${socketPort}`);
     } catch (error) {
          logger.error('Failed to start server', error);
          process.exit(1);
     }
}
// Set up error handlers
setupProcessHandlers();
// Set up security middleware
setupSecurity();
if (config.node_env === 'production') {
     setupCluster();
} else {
     startServer();
}
// Export server instances
export { httpServer, socketServer };
