import { Server, Socket } from 'socket.io';
import { logger, errorLogger } from '../../../shared/logger.js';
import StreamService from './stream.service.js';
import GiftService from '../gift/gift.service.js';
import PollService from '../poll/poll.service.js';

class StreamSocketHandler {
     static setupStreamHandlers(io: Server) {
          io.on('connection', (socket: Socket) => {
               logger.info(`Socket connected: ${socket.id}`);

               // Join stream room
               socket.on(
                    'stream:join',
                    async (data: { streamId: string; userId: string }) => {
                         try {
                              const { streamId, userId } = data;

                              // Add socket to stream room
                              socket.join(`stream_${streamId}`);

                              // Add viewer to stream
                              await StreamService.addViewer(streamId, userId);

                              // Get current viewer count
                              const stream = await StreamService.getStreamDetails(
                                   streamId,
                              );

                              // Notify other viewers
                              io.to(`stream_${streamId}`).emit(
                                   'stream:viewer-joined',
                                   {
                                        userId,
                                        streamId,
                                        viewerCount: stream.currentViewerCount,
                                   },
                              );

                              logger.info(`User ${userId} joined stream ${streamId}`);
                         } catch (error) {
                              errorLogger.error('Stream join error', error);
                              socket.emit('error', {
                                   message: 'Failed to join stream',
                              });
                         }
                    },
               );

               // Leave stream room
               socket.on(
                    'stream:leave',
                    async (data: { streamId: string; userId: string }) => {
                         try {
                              const { streamId, userId } = data;

                              // Remove viewer from stream
                              await StreamService.removeViewer(streamId, userId);

                              // Leave room
                              socket.leave(`stream_${streamId}`);

                              // Get current viewer count
                              const stream = await StreamService.getStreamDetails(
                                   streamId,
                              );

                              // Notify other viewers
                              io.to(`stream_${streamId}`).emit('stream:viewer-left', {
                                   userId,
                                   streamId,
                                   viewerCount: stream.currentViewerCount,
                              });

                              logger.info(`User ${userId} left stream ${streamId}`);
                         } catch (error) {
                              errorLogger.error('Stream leave error', error);
                         }
                    },
               );

               // Send chat message
               socket.on(
                    'stream:chat',
                    async (data: {
                         streamId: string;
                         userId: string;
                         content: string;
                    }) => {
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
                    async (data: {
                         streamId: string;
                         userId: string;
                         giftId: string;
                         quantity: number;
                         message?: string;
                         isAnonymous: boolean;
                    }) => {
                         try {
                              const {
                                   streamId,
                                   userId,
                                   giftId,
                                   quantity,
                                   message,
                                   isAnonymous,
                              } = data;

                              // Process gift transaction
                              const transaction = await GiftService.sendGift(
                                   streamId,
                                   userId,
                                   {
                                        giftId,
                                        quantity,
                                        message,
                                        isAnonymous,
                                   },
                              );

                              // Broadcast gift to all viewers
                              io.to(`stream_${streamId}`).emit('stream:gift-sent', {
                                   transaction: {
                                        _id: transaction._id,
                                        sender: isAnonymous
                                             ? null
                                             : transaction.sender,
                                        gift: transaction.gift,
                                        quantity,
                                        message,
                                        totalAmount: transaction.totalAmount,
                                   },
                                   timestamp: new Date(),
                              });

                              logger.info(
                                   `Gift sent in stream ${streamId}: ${giftId} x${quantity}`,
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
               socket.on(
                    'stream:like',
                    async (data: { streamId: string; userId: string }) => {
                         try {
                              const { streamId, userId } = data;

                              // Like stream
                              await StreamService.likeStream(streamId, userId);

                              // Broadcast like to all viewers
                              io.to(`stream_${streamId}`).emit('stream:liked', {
                                   userId,
                                   timestamp: new Date(),
                              });

                              logger.info(`Stream ${streamId} liked by user ${userId}`);
                         } catch (error) {
                              errorLogger.error('Like stream error', error);
                         }
                    },
               );

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

               // Create poll
               socket.on(
                    'stream:create-poll',
                    async (data: {
                         streamId: string;
                         streamerId: string;
                         question: string;
                         options: string[];
                         duration: number;
                    }) => {
                         try {
                              const { streamId, streamerId, question, options, duration } =
                                   data;

                              // Create poll
                              const poll = await PollService.createPoll(
                                   streamId,
                                   streamerId,
                                   {
                                        question,
                                        options,
                                        duration,
                                        allowMultipleVotes: false,
                                   },
                              );

                              // Broadcast new poll to all viewers
                              io.to(`stream_${streamId}`).emit('stream:poll-created', {
                                   poll: {
                                        _id: poll._id,
                                        question: poll.question,
                                        options: poll.options,
                                        duration: poll.duration,
                                        endTime: poll.endTime,
                                   },
                                   timestamp: new Date(),
                              });

                              logger.info(`Poll created for stream ${streamId}`);
                         } catch (error) {
                              errorLogger.error('Create poll error', error);
                              socket.emit('error', {
                                   message: 'Failed to create poll',
                              });
                         }
                    },
               );

               // Vote on poll
               socket.on(
                    'stream:vote-poll',
                    async (data: {
                         pollId: string;
                         streamId: string;
                         userId: string;
                         optionIndex: number;
                    }) => {
                         try {
                              const { pollId, streamId, userId, optionIndex } = data;

                              // Cast vote
                              const poll = await PollService.votePoll(
                                   pollId,
                                   userId,
                                   optionIndex,
                              );

                              // Broadcast updated poll results to all viewers
                              io.to(`stream_${streamId}`).emit('stream:poll-updated', {
                                   pollId,
                                   options: poll.options,
                                   totalVotes: poll.totalVotes,
                              });

                              logger.info(
                                   `Vote cast on poll ${pollId} by user ${userId}`,
                              );
                         } catch (error) {
                              errorLogger.error('Vote poll error', error);
                              socket.emit('error', {
                                   message: 'Failed to vote on poll',
                              });
                         }
                    },
               );

               // End poll
               socket.on(
                    'stream:end-poll',
                    async (data: { pollId: string; streamId: string }) => {
                         try {
                              const { pollId, streamId } = data;

                              // End poll
                              const poll = await PollService.endPoll(pollId);

                              // Broadcast poll ended to all viewers
                              io.to(`stream_${streamId}`).emit('stream:poll-ended', {
                                   pollId,
                                   results: poll?.options,
                                   totalVotes: poll?.totalVotes,
                              });

                              logger.info(`Poll ${pollId} ended`);
                         } catch (error) {
                              errorLogger.error('End poll error', error);
                         }
                    },
               );

               // Update stream settings
               socket.on(
                    'stream:settings-changed',
                    (data: {
                         streamId: string;
                         settings: {
                              allowComments?: boolean;
                              allowGifts?: boolean;
                              enablePolls?: boolean;
                         };
                    }) => {
                         try {
                              const { streamId, settings } = data;

                              // Broadcast settings change to all viewers
                              io.to(`stream_${streamId}`).emit(
                                   'stream:settings-updated',
                                   {
                                        settings,
                                        timestamp: new Date(),
                                   },
                              );

                              logger.info(`Stream ${streamId} settings updated`);
                         } catch (error) {
                              errorLogger.error('Update stream settings error', error);
                         }
                    },
               );

               // Update stream controls (camera/mic)
               socket.on(
                    'stream:controls-changed',
                    (data: {
                         streamId: string;
                         controls: {
                              cameraOn?: boolean;
                              micOn?: boolean;
                         };
                    }) => {
                         try {
                              const { streamId, controls } = data;

                              // Broadcast controls change to all viewers
                              io.to(`stream_${streamId}`).emit(
                                   'stream:controls-updated',
                                   {
                                        controls,
                                        timestamp: new Date(),
                                   },
                              );

                              logger.info(
                                   `Stream ${streamId} controls updated: ${JSON.stringify(controls)}`,
                              );
                         } catch (error) {
                              errorLogger.error('Update stream controls error', error);
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
