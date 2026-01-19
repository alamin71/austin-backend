import mongoose from 'mongoose';
import { errorLogger, logger } from '../shared/logger.js';
import config from '../config/index.js';

// Set up MongoDB connection listeners
export function setupMongooseListeners(): void {
     mongoose.connection.on('error', (err) => {
          errorLogger.error('MongoDB connection error:', err);
          if (config.node_env === 'production') {
               logger.error('Critical database error - restarting worker');
               process.exit(1);
          }
     });

     mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected. Attempting to reconnect...');
     });

     mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected successfully');
     });

     mongoose.connection.on('reconnectFailed', () => {
          errorLogger.error('MongoDB reconnection failed after multiple attempts');
          if (config.node_env === 'production') {
               process.exit(1);
          }
     });
}

// Connect to MongoDB
export async function connectToDatabase(): Promise<void> {
     try {
          await mongoose.connect(config.database_url as string, {
               serverSelectionTimeoutMS: 5000,
               heartbeatFrequencyMS: 10000,
               maxPoolSize: config.node_env === 'production' ? 100 : 10,
               minPoolSize: config.node_env === 'production' ? 5 : 2,
               connectTimeoutMS: 10000,
               socketTimeoutMS: 45000,
               family: 4, // Force IPv4
               retryWrites: true,
               retryReads: true,
          });
          logger.info('🚀 Database connected successfully');
          setupMongooseListeners();
     } catch (error) {
          errorLogger.error('Database connection error', error);
          process.exit(1);
     }
}
