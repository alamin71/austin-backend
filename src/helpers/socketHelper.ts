import { Server } from 'socket.io';
import { logger } from '../shared/logger.js';
import StreamSocketHandler from '../app/modules/stream/stream.socket.js';

const socket = (io: Server) => {
     // Setup stream handlers
     StreamSocketHandler.setupStreamHandlers(io);

     // General connection handler
     io.on('connection', (socket) => {
          logger.info('A user connected');

          // Disconnect
          socket.on('disconnect', () => {
               logger.info('A user disconnect');
          });
     });
};

export const socketHelper = { socket };
