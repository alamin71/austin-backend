import mongoose from 'mongoose';
import { errorLogger, logger } from '../shared/logger';
import { httpServer, socketServer } from '../server';

const SHUTDOWN_TIMEOUT_MS = 30000;
declare global {
     let isShuttingDown: boolean;
}

let isShuttingDown = false;

export function gracefulShutdown(signal: string) {
     if (isShuttingDown) return;
     isShuttingDown = true;

     logger.info(`${signal} received. Shutting down gracefully...`);

     // Stop accepting new connections first
     if (httpServer) {
          httpServer.close(() => {
               logger.info('HTTP server closed successfully');
          });
     }

     // Close socket server if exists
     if (socketServer) {
          socketServer.close(() => {
               logger.info('Socket.io server closed successfully');
          });
     }

     // Close database connection
     if (mongoose.connection.readyState !== 0) {
          mongoose.connection
               .close(true)
               .then(() => {
                    logger.info('Database connection closed gracefully');
                    process.exit(0);
               })
               .catch((err) => {
                    errorLogger.error('Error closing database connection', err);
                    process.exit(1);
               });
     } else {
          process.exit(0);
     }

     // Force shutdown after timeout if graceful shutdown fails
     setTimeout(() => {
          errorLogger.error(`Forcing shutdown after ${SHUTDOWN_TIMEOUT_MS}ms timeout`);
          process.exit(1);
     }, SHUTDOWN_TIMEOUT_MS);
}
