import { Server, Socket } from 'socket.io';
import { logger, errorLogger } from '../../../shared/logger';
import StreamService from './stream.service';

class StreamSocketHandler {
     static setupStreamHandlers(io: Server) {
          io.on('connection', (socket: Socket) => {
               logger.info(`Socket connected: ${socket.id}`);

               // Join stream room
               socket.on('stream:join', async (data: { streamId: string; userId: string }) => {
                    try {
                         const { streamId, userId } = data;

                         // Add socket to stream room
                         socket.join(`stream_${streamId}`);

                         // Add viewer to stream
                         await StreamService.addViewer(streamId, userId);

                         // Notify other viewers
                         io.to(`stream_${streamId}`).emit('stream:viewer-joined', {
                              userId,
                              streamId,
                         });

                         logger.info(`User ${userId} joined stream ${streamId}`);
                    } catch (error) {
                         errorLogger.error('Stream join error', error);
                         socket.emit('error', {
                              message: 'Failed to join stream',
                         });
                    }
               });

               // Leave stream room
               socket.on('stream:leave', async (data: { streamId: string; userId: string }) => {
                    try {
                         const { streamId, userId } = data;

                         // Remove viewer from stream
                         await StreamService.removeViewer(streamId, userId);

                         // Leave room
                         socket.leave(`stream_${streamId}`);

                         // Notify other viewers
                         io.to(`stream_${streamId}`).emit('stream:viewer-left', {
                              userId,
                              streamId,
                         });

                         logger.info(`User ${userId} left stream ${streamId}`);
                    } catch (error) {
                         errorLogger.error('Stream leave error', error);
                    }
               });

               // Send chat message
               socket.on(
                    'stream:chat',
                    async (data: { streamId: string; userId: string; content: string }) => {
                         try {
                              const { streamId, userId, content } = data;

                              const message = await StreamService.sendChatMessage(
                                   streamId,
                                   userId,
                                   content,
                                   'text',
                              );

                              // Broadcast message to all viewers
                              io.to(`stream_${streamId}`).emit('stream:message', {
                                   _id: message._id,
                                   sender: message.sender,
                                   content: message.content,
                                   type: 'text',
                                   createdAt: message.createdAt,
                              });

                              logger.info(
                                   `Chat message sent in stream ${streamId} by user ${userId}`,
                              );
                         } catch (error) {
                              errorLogger.error('Send chat message error', error);
                              socket.emit('error', {
                                   message: 'Failed to send message',
                              });
                         }
                    },
               );

               // Send gift
               socket.on(
                    'stream:gift',
                    async (data: { streamId: string; userId: string; giftId: string; amount: number }) => {
                         try {
                              const { streamId, userId, giftId, amount } = data;

                              // Broadcast gift to all viewers
                              io.to(`stream_${streamId}`).emit('stream:gift-sent', {
                                   userId,
                                   giftId,
                                   amount,
                                   timestamp: new Date(),
                              });

                              logger.info(
                                   `Gift sent in stream ${streamId}: ${giftId} worth ${amount}`,
                              );
                         } catch (error) {
                              errorLogger.error('Send gift error', error);
                              socket.emit('error', {
                                   message: 'Failed to send gift',
                              });
                         }
                    },
               );

               // Like stream
               socket.on('stream:like', (data: { streamId: string; userId: string }) => {
                    try {
                         const { streamId, userId } = data;

                         // Broadcast like to all viewers
                         io.to(`stream_${streamId}`).emit('stream:liked', {
                              userId,
                              timestamp: new Date(),
                         });

                         logger.info(`Stream ${streamId} liked by user ${userId}`);
                    } catch (error) {
                         errorLogger.error('Like stream error', error);
                    }
               });

               // Send emoji reaction
               socket.on(
                    'stream:emoji',
                    (data: { streamId: string; userId: string; emoji: string }) => {
                         try {
                              const { streamId, userId, emoji } = data;

                              // Broadcast emoji to all viewers
                              io.to(`stream_${streamId}`).emit('stream:emoji-reaction', {
                                   userId,
                                   emoji,
                                   timestamp: new Date(),
                              });

                              logger.info(`Emoji reaction in stream ${streamId}: ${emoji}`);
                         } catch (error) {
                              errorLogger.error('Emoji reaction error', error);
                         }
                    },
               );

               // Host info update (viewer count, etc.)
               socket.on(
                    'stream:update-viewer-count',
                    (data: { streamId: string; viewerCount: number }) => {
                         try {
                              const { streamId, viewerCount } = data;

                              // Broadcast viewer count to all viewers
                              io.to(`stream_${streamId}`).emit('stream:viewer-count', {
                                   count: viewerCount,
                                   timestamp: new Date(),
                              });
                         } catch (error) {
                              errorLogger.error('Update viewer count error', error);
                         }
                    },
               );

               // Disconnect
               socket.on('disconnect', () => {
                    logger.info(`Socket disconnected: ${socket.id}`);
               });
          });
     }
}

export default StreamSocketHandler;
