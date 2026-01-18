import { Server } from 'socket.io';
import { logger } from '../shared/logger';

const socket = (io: Server) => {
     io.on('connection', (socket) => {
          logger.info('A user connected');

          //disconnect
          socket.on('disconnect', () => {
               logger.info('A user disconnect');
          });
     });
};

export const socketHelper = { socket };
