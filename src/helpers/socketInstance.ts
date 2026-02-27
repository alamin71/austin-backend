import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setSocketInstance = (io: Server) => {
     ioInstance = io;
};

export const getSocketInstance = (): Server => {
     if (!ioInstance) {
          throw new Error('Socket.io instance not initialized');
     }
     return ioInstance;
};

export const isSocketInitialized = (): boolean => {
     return ioInstance !== null;
};

export default {
     setSocketInstance,
     getSocketInstance,
     isSocketInitialized,
};
