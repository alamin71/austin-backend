import { Server } from 'socket.io';
import { logger } from '../../../shared/logger.js';

class NotificationSocketHandler {
     private users: Map<string, string> = new Map(); // userId -> socketId

     setupNotificationHandlers(io: Server) {
          io.on('connection', (socket) => {
               // User joins their notification room
               socket.on('user_join', (userId: string) => {
                    this.users.set(userId, socket.id);
                    socket.join(userId); // Join room with userId
                    logger.info(`User ${userId} joined notification room with socket ${socket.id}`);
               });

               socket.on('disconnect', () => {
                    let disconnectedUserId: string | undefined;
                    
                    this.users.forEach((socketId, userId) => {
                         if (socketId === socket.id) {
                              disconnectedUserId = userId;
                              this.users.delete(userId);
                         }
                    });

                    if (disconnectedUserId) {
                         logger.info(`User ${disconnectedUserId} disconnected from notifications`);
                    }
               });
          });
     }

     // Method to send notification to specific user
     static emitNotification(io: Server, userId: string, notification: any) {
          logger.info(`Sending notification to user ${userId}`);
          io.to(userId).emit('new_notification', {
               ...notification,
               timestamp: new Date(),
          });
     }

     // Method to send to multiple users
     static emitToUsers(io: Server, userIds: string[], notification: any) {
          userIds.forEach((userId) => {
               this.emitNotification(io, userId, notification);
          });
     }

     // Method to update unread count for user
     static emitUnreadCount(io: Server, userId: string, count: number) {
          io.to(userId).emit('unread_count', { count });
     }
}

export default new NotificationSocketHandler();
