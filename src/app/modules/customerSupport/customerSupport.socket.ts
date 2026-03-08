import { Server, Socket } from 'socket.io';
import { logger } from '../../../shared/logger.js';
import { CustomerSupport, SupportMessage } from './customerSupport.model.js';

class CustomerSupportSocketHandler {
     private users: Map<string, string> = new Map(); // userId -> socketId
     private admins: Map<string, string> = new Map(); // adminId -> socketId
     private supportRooms: Map<string, string> = new Map(); // conversationId -> conversationId (for broadcast)

     setupSupportHandlers(io: Server) {
          io.on('connection', (socket: Socket) => {
               logger.info(`Support user connected: ${socket.id}`);

               // User/Admin joins support channel
               socket.on('support_user_join', (data: { userId: string; role: 'user' | 'admin' }) => {
                    const { userId, role } = data;

                    if (role === 'user') {
                         this.users.set(userId, socket.id);
                    } else {
                         this.admins.set(userId, socket.id);
                    }

                    socket.join(userId); // Join personal room
                    logger.info(`${role} ${userId} joined support with socket ${socket.id}`);

                    io.emit('support_user_online', { userId, role, socketId: socket.id });
               });

               // Join specific conversation room
               socket.on('support_join_conversation', (conversationId: string) => {
                    socket.join(`conversation_${conversationId}`);
                    this.supportRooms.set(conversationId, conversationId);

                    logger.info(`Socket ${socket.id} joined conversation ${conversationId}`);

                    // Notify others in the conversation
                    io.to(`conversation_${conversationId}`).emit('support_user_joined', {
                         conversationId,
                         socketId: socket.id,
                         timestamp: new Date(),
                    });
               });

               // Send support message
               socket.on('support_send_message', async (data) => {
                    try {
                         const { conversationId, senderId, senderRole, message, type, mediaUrl } = data;

                         // Save to database
                         const newMessage = await SupportMessage.create({
                              conversation: conversationId,
                              sender: senderId,
                              senderRole,
                              message: message.trim(),
                              type: type || 'text',
                              mediaUrl: mediaUrl || null,
                              isRead: false,
                         });

                         // Update conversation
                         const updateData: any = {
                              lastMessage: message.trim(),
                              lastMessageAt: new Date(),
                         };

                         if (senderRole === 'user') {
                              updateData.$inc = { unreadCountAdmin: 1 };
                         } else {
                              updateData.$inc = { unreadCountUser: 1 };
                         }

                         await CustomerSupport.findByIdAndUpdate(conversationId, updateData);

                         // Populate sender info
                         const populatedMessage = await SupportMessage.findById(newMessage._id)
                              .populate('sender', 'name userName image')
                              .lean();

                         // Broadcast message to all in conversation
                         io.to(`conversation_${conversationId}`).emit('support_new_message', {
                              _id: populatedMessage?._id,
                              conversationId,
                              sender: populatedMessage?.sender,
                              senderRole,
                              message,
                              type: type || 'text',
                              mediaUrl: mediaUrl || null,
                              isRead: false,
                              createdAt: new Date(),
                         });

                         // Notify the other side (user or admin)
                         if (senderRole === 'user') {
                              // Notify all admins about new message
                              this.admins.forEach((socketId) => {
                                   io.to(socketId).emit('support_notification', {
                                        type: 'new_message',
                                        conversationId,
                                        message: `New message from user`,
                                        timestamp: new Date(),
                                   });
                              });
                         } else {
                              // Notify user about admin reply
                              const conversation = await CustomerSupport.findById(conversationId);
                              if (conversation?.user) {
                                   io.to(conversation.user.toString()).emit('support_notification', {
                                        type: 'admin_reply',
                                        conversationId,
                                        message: `Admin replied to your support ticket`,
                                        timestamp: new Date(),
                                   });
                              }
                         }

                         logger.info(`Support message sent in conversation ${conversationId}`);
                    } catch (error) {
                         logger.error('Error sending support message:', error);
                         socket.emit('support_error', {
                              message: 'Failed to send message',
                              error: (error as Error).message,
                         });
                    }
               });

               // Mark messages as read
               socket.on('support_mark_read', async (data) => {
                    try {
                         const { conversationId, userRole } = data;

                         await SupportMessage.updateMany(
                              {
                                   conversation: conversationId,
                                   senderRole: userRole === 'user' ? 'admin' : 'user',
                                   isRead: false,
                              },
                              {
                                   isRead: true,
                                   readAt: new Date(),
                              },
                         );

                         // Notify others in conversation that messages are read
                         io.to(`conversation_${conversationId}`).emit('support_messages_read', {
                              conversationId,
                              readBy: userRole,
                              timestamp: new Date(),
                         });

                         logger.info(`Messages marked as read in conversation ${conversationId}`);
                    } catch (error) {
                         logger.error('Error marking messages as read:', error);
                    }
               });

               // Update conversation status (admin only)
               socket.on('support_update_status', async (data) => {
                    try {
                         const { conversationId, status, adminId } = data;

                         const conversation = await CustomerSupport.findByIdAndUpdate(
                              conversationId,
                              { status },
                              { new: true },
                         );

                         // Notify all in conversation about status change
                         io.to(`conversation_${conversationId}`).emit('support_status_changed', {
                              conversationId,
                              status,
                              changedBy: adminId,
                              timestamp: new Date(),
                         });

                         logger.info(`Conversation ${conversationId} status changed to ${status}`);
                    } catch (error) {
                         logger.error('Error updating conversation status:', error);
                    }
               });

               // Typing indicator
               socket.on('support_typing', (data) => {
                    const { conversationId, senderId, senderRole } = data;

                    io.to(`conversation_${conversationId}`).emit('support_user_typing', {
                         conversationId,
                         senderId,
                         senderRole,
                    });
               });

               socket.on('support_stop_typing', (data) => {
                    const { conversationId, senderId } = data;

                    io.to(`conversation_${conversationId}`).emit('support_user_stop_typing', {
                         conversationId,
                         senderId,
                    });
               });

               // Disconnect
               socket.on('disconnect', () => {
                    let disconnectedUserId: string | undefined;
                    let role: 'user' | 'admin' | undefined;

                    this.users.forEach((socketId, userId) => {
                         if (socketId === socket.id) {
                              disconnectedUserId = userId;
                              role = 'user';
                              this.users.delete(userId);
                         }
                    });

                    this.admins.forEach((socketId, adminId) => {
                         if (socketId === socket.id) {
                              disconnectedUserId = adminId;
                              role = 'admin';
                              this.admins.delete(adminId);
                         }
                    });

                    if (disconnectedUserId) {
                         logger.info(`Support ${role} ${disconnectedUserId} disconnected`);
                         io.emit('support_user_offline', {
                              userId: disconnectedUserId,
                              role,
                              timestamp: new Date(),
                         });
                    } else {
                         logger.info(`Support user disconnected: ${socket.id}`);
                    }
               });
          });
     }
}

export default new CustomerSupportSocketHandler();
