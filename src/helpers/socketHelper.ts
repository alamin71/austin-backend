import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import StreamSocketHandler from '../app/modules/stream/stream.socket';

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
