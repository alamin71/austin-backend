import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { StatusCodes } from 'http-status-codes';
import config from '../../../config/index.js';
import AppError from '../../../errors/AppError.js';
import { Stream } from './stream.model.js';
import { StreamAnalytics } from './streamAnalytics.model.js';
import { Message } from './message.model.js';
import { User } from '../user/user.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';

class StreamService {
     /**
      * Generate Agora RTC token for live streaming
      */
     static generateAgoraToken(
          channelName: string,
          uid: number,
          role: 'publisher' | 'subscriber' = 'publisher',
     ) {
          try {
               const appId = config.agora?.app_id;
               const appCertificate = config.agora?.app_certificate;

               if (!appId || !appCertificate) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Agora credentials not configured',
                    );
               }

               const expirationTimeInSeconds = 3600; // 1 hour
               const currentTimestamp = Math.floor(Date.now() / 1000);
               const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

               const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

               const token = RtcTokenBuilder.buildTokenWithUid(
                    appId,
                    appCertificate,
                    channelName,
                    uid,
                    agoraRole,
                    privilegeExpiredTs,
                    privilegeExpiredTs,
               );

               return {
                    token,
                    uid,
                    channelName,
                    expiryTime: new Date(privilegeExpiredTs * 1000),
               };
          } catch (error) {
               errorLogger.error('Agora token generation error', error);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to generate Agora token',
               );
          }
     }

     /**
      * Start a live stream
      */
     static async startStream(
          streamerId: string,
          streamData: Partial<any>,
     ) {
          try {
               // Generate Agora credentials
               const channelName = `stream_${streamerId}_${Date.now()}`;
               const uid = Math.floor(Math.random() * 100000);

               const agoraToken = this.generateAgoraToken(channelName, uid, 'publisher');

               // Create stream document
               const stream = new Stream({
                    streamer: streamerId,
                    title: streamData.title,
                    description: streamData.description,
                    category: streamData.category,
                    contentRating: streamData.contentRating || 'PG',
                    banner: streamData.banner,
                    status: 'live',
                    startedAt: new Date(),
                    agora: {
                         channelName: agoraToken.channelName,
                         token: agoraToken.token,
                         uid: agoraToken.uid,
                         expiryTime: agoraToken.expiryTime,
                    },
                    allowComments: streamData.allowComments !== false,
                    allowGifts: streamData.allowGifts !== false,
                    isAgeRestricted: streamData.isAgeRestricted || false,
                    isRecordingEnabled: streamData.isRecordingEnabled || false,
                    tags: streamData.tags || [],
               });

               await stream.save();

               // Create analytics document
               const analytics = new StreamAnalytics({
                    stream: stream._id,
               });
               await analytics.save();

               // Update stream with analytics reference
               stream.analytics = analytics._id;
               await stream.save();

               logger.info(`Stream started: ${stream._id}`);

               return stream.populate('streamer', 'name avatar');
          } catch (error) {
               errorLogger.error('Start stream error', error);
               throw error;
          }
     }

     /**
      * End a live stream
      */
     static async endStream(streamId: string) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (stream.status !== 'live') {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Stream is not currently live',
                    );
               }

               // Calculate duration
               const duration = stream.startedAt
                    ? Math.floor(
                         (new Date().getTime() - stream.startedAt.getTime()) /
                              1000,
                    )
                    : 0;

               stream.status = 'ended';
               stream.endedAt = new Date();
               stream.duration = duration;

               await stream.save();

               // Update analytics
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         duration,
                         totalViewers: stream.viewers.length,
                         peakViewers: stream.peakViewerCount,
                    });
               }

               logger.info(`Stream ended: ${streamId}`);

               return stream;
          } catch (error) {
               errorLogger.error('End stream error', error);
               throw error;
          }
     }

     /**
      * Get stream details
      */
     static async getStreamDetails(streamId: string) {
          try {
               const stream = await Stream.findById(streamId)
                    .populate('streamer', 'name avatar email')
                    .populate('category', 'title image')
                    .populate('analytics');

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               return stream;
          } catch (error) {
               errorLogger.error('Get stream details error', error);
               throw error;
          }
     }

     /**
      * Add viewer to stream
      */
     static async addViewer(streamId: string, userId: string) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               // Add viewer if not already added
               if (!stream.viewers.includes(userId as any)) {
                    stream.viewers.push(userId as any);
                    stream.currentViewerCount = stream.viewers.length;

                    // Update peak viewer count
                    if (stream.currentViewerCount > stream.peakViewerCount) {
                         stream.peakViewerCount = stream.currentViewerCount;
                    }

                    await stream.save();
               }

               return stream;
          } catch (error) {
               errorLogger.error('Add viewer error', error);
               throw error;
          }
     }

     /**
      * Remove viewer from stream
      */
     static async removeViewer(streamId: string, userId: string) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               stream.viewers = stream.viewers.filter((v: any) => v.toString() !== userId);
               stream.currentViewerCount = stream.viewers.length;

               await stream.save();

               return stream;
          } catch (error) {
               errorLogger.error('Remove viewer error', error);
               throw error;
          }
     }

     /**
      * Send chat message during stream
      */
     static async sendChatMessage(
          streamId: string,
          userId: string,
          content: string,
          type: 'text' | 'emoji' | 'gift' = 'text',
     ) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (!stream.allowComments) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Comments are disabled for this stream',
                    );
               }

               const message = new Message({
                    stream: streamId,
                    sender: userId,
                    content,
                    type,
               });

               await message.save();
               stream.chat.push(message._id);
               await stream.save();

               // Update analytics chat count
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(
                         stream.analytics,
                         { $inc: { chatCount: 1 } },
                    );
               }

               return await message.populate('sender', 'name avatar');
          } catch (error) {
               errorLogger.error('Send chat message error', error);
               throw error;
          }
     }

     /**
      * Get live streams
      */
     static async getLiveStreams(
          page: number = 1,
          limit: number = 20,
          category?: string,
     ) {
          try {
               const skip = (page - 1) * limit;
               const query: any = { status: 'live' };

               if (category) {
                    query.category = category;
               }

               const [streams, total] = await Promise.all([
                    Stream.find(query)
                         .populate('streamer', 'name avatar')
                         .populate('category', 'title image')
                         .sort({ currentViewerCount: -1, startedAt: -1 })
                         .skip(skip)
                         .limit(limit),
                    Stream.countDocuments(query),
               ]);

               return {
                    data: streams,
                    pagination: {
                         page,
                         limit,
                         total,
                         pages: Math.ceil(total / limit),
                    },
               };
          } catch (error) {
               errorLogger.error('Get live streams error', error);
               throw error;
          }
     }

     /**
      * Get streamer's past streams
      */
     static async getStreamerHistory(streamerId: string, page: number = 1, limit: number = 10) {
          try {
               const skip = (page - 1) * limit;

               const [streams, total] = await Promise.all([
                    Stream.find({ streamer: streamerId, status: { $in: ['ended', 'live'] } })
                         .populate('category', 'title image')
                         .sort({ createdAt: -1 })
                         .skip(skip)
                         .limit(limit),
                    Stream.countDocuments({
                         streamer: streamerId,
                         status: { $in: ['ended', 'live'] },
                    }),
               ]);

               return {
                    data: streams,
                    pagination: {
                         page,
                         limit,
                         total,
                         pages: Math.ceil(total / limit),
                    },
               };
          } catch (error) {
               errorLogger.error('Get streamer history error', error);
               throw error;
          }
     }

     /**
      * Search streams
      */
     static async searchStreams(query: string, page: number = 1, limit: number = 20) {
          try {
               const skip = (page - 1) * limit;

               const [streams, total] = await Promise.all([
                    Stream.find(
                         { $text: { $search: query }, status: 'live' },
                         { score: { $meta: 'textScore' } },
                    )
                         .populate('streamer', 'name avatar')
                         .populate('category', 'title image')
                         .sort({ score: { $meta: 'textScore' }, currentViewerCount: -1 })
                         .skip(skip)
                         .limit(limit),
                    Stream.countDocuments({
                         $text: { $search: query },
                         status: 'live',
                    }),
               ]);

               return {
                    data: streams,
                    pagination: {
                         page,
                         limit,
                         total,
                         pages: Math.ceil(total / limit),
                    },
               };
          } catch (error) {
               errorLogger.error('Search streams error', error);
               throw error;
          }
     }
}

export default StreamService;
