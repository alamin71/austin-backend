import { Server, Socket } from 'socket.io';
import { logger } from '../../../shared/logger.js';

class MessageSocketHandler {
     private users: Map<string, string> = new Map(); // userId -> socketId

     setupMessageHandlers(io: Server) {
          io.on('connection', (socket: Socket) => {
               logger.info(`User connected: ${socket.id}`);

               // User joins their personal room
               socket.on('user_join', (userId: string) => {
                    this.users.set(userId, socket.id);
                    socket.join(userId); // Join room with userId
                    logger.info(`User ${userId} joined with socket ${socket.id}`);
                    
                    // Notify that user is online
                    io.emit('user_online', { userId, socketId: socket.id });
               });

               // New message event
               socket.on('send_message', (data) => {
                    const { senderId, receiverId, content, type, mediaUrl } = data;
                    
                    logger.info(`Message from ${senderId} to ${receiverId}`);
                    
                    // Send to specific receiver
                    io.to(receiverId).emit('new_message', {
                         senderId,
                         receiverId,
                         content,
                         type,
                         mediaUrl,
                         timestamp: new Date(),
                    });

                    // Acknowledge to sender
                    socket.emit('message_sent', {
                         success: true,
                         timestamp: new Date(),
                    });
               });

               // Mark message as read
               socket.on('message_read', (data) => {
                    const { receiverId, senderId } = data;
                    
                    // Notify sender that message is read
                    io.to(senderId).emit('messages_read', {
                         receiverId,
                         readAt: new Date(),
                    });

                    logger.info(`Messages marked as read by ${receiverId} for ${senderId}`);
               });

               // Typing indicator
               socket.on('typing', (data) => {
                    const { senderId, receiverId } = data;
                    
                    io.to(receiverId).emit('user_typing', {
                         senderId,
                    });
               });

               socket.on('stop_typing', (data) => {
                    const { senderId, receiverId } = data;
                    
                    io.to(receiverId).emit('user_stop_typing', {
                         senderId,
                    });
               });

               // Disconnect
               socket.on('disconnect', () => {
                    let disconnectedUserId: string | undefined;
                    
                    this.users.forEach((socketId, userId) => {
                         if (socketId === socket.id) {
                              disconnectedUserId = userId;
                              this.users.delete(userId);
                         }
                    });

                    if (disconnectedUserId) {
                         logger.info(`User ${disconnectedUserId} disconnected`);
                         io.emit('user_offline', { userId: disconnectedUserId });
                    }
               });
          });
     }

     // Method to emit message to specific user
     static emitToUser(io: Server, userId: string, event: string, data: any) {
          io.to(userId).emit(event, data);
     }

     // Method to emit to all connected users
     static emitToAll(io: Server, event: string, data: any) {
          io.emit(event, data);
     }
}

export default new MessageSocketHandler();
