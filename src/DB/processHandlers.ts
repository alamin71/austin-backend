import { logger } from '../shared/logger.js';
import { gracefulShutdown } from './shutdown.js';

export function setupProcessHandlers() {
     process.on('uncaughtException', (error) => {
          const errorMessage = error && typeof error.message === 'string' ? error.message : String(error);
          if (errorMessage.includes('critical')) {
               logger.error('Uncaught Exception critical', errorMessage);
               gracefulShutdown('uncaughtException');
          }
     });

     process.on('unhandledRejection', (reason, promise) => {
          const reasonMessage = reason instanceof Error ? reason.message : String(reason);

          if (reasonMessage.includes('critical')) {
               logger.error('Unhandled Rejection at critical', promise, 'reason:', reasonMessage);
               gracefulShutdown('unhandledRejection');
          }
     });

     // Signal handlers are fine as they are
     process.on('SIGINT', () => {
          gracefulShutdown('SIGINT');
     });

     process.on('SIGTERM', () => {
          gracefulShutdown('SIGTERM');
     });

     process.on('SIGUSR2', () => {
          gracefulShutdown('SIGUSR2');
     });
}
