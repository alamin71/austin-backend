import { Server } from 'socket.io';
import { logger } from '../shared/logger.js';
import StreamSocketHandler from '../app/modules/stream/stream.socket.js';
import MessageSocketHandler from '../app/modules/message/message.socket.js';
import NotificationSocketHandler from '../app/modules/notification/notification.socket.js';

const socket = (io: Server) => {
     // Setup stream handlers
     StreamSocketHandler.setupStreamHandlers(io);

     // Setup message handlers (real-time messaging)
     MessageSocketHandler.setupMessageHandlers(io);

     // Setup notification handlers (real-time notifications)
     NotificationSocketHandler.setupNotificationHandlers(io);

     // General connection handler
     io.on('connection', (socket) => {
          logger.info(`User connected with socket ID: ${socket.id}`);

          // Disconnect
          socket.on('disconnect', () => {
               logger.info(`User disconnected: ${socket.id}`);
          });
     });
};

export const socketHelper = { socket };
