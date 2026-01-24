import AgoraToken from 'agora-token';
const { RtcTokenBuilder, RtcRole } = AgoraToken;
import { StatusCodes } from 'http-status-codes';
import config from '../../../config/index.js';
import AppError from '../../../errors/AppError.js';
import { Stream } from './stream.model.js';
import { StreamAnalytics } from './streamAnalytics.model.js';
import { Message } from './message.model.js';
import { User } from '../user/user.model.js';
import CategoryService from '../category/category.service.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';

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
                    banner: streamData.banner, // Should contain S3 URL from controller
                    bannerPosition: streamData.bannerPosition || 'top',
                    visibility: streamData.visibility || 'public',
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
                    enablePolls: streamData.enablePolls !== false,
                    enableAdBanners: streamData.enableAdBanners || false,
                    isAgeRestricted: streamData.isAgeRestricted || false,
                    isRecordingEnabled: streamData.isRecordingEnabled || false,
                    streamControls: {
                         cameraOn: true,
                         micOn: true,
                         background: streamData.background || '',
                    },
                    tags: streamData.tags || [],
               });

               logger.info(`Stream created with banner: ${streamData.banner || 'none'}`);

               await stream.save();

               // Increment category stream count
               await CategoryService.incrementStreamCount(streamData.category);

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

               // TODO: Get recording from Agora and upload to S3
               // When stream ends, fetch recording from Agora's cloud recording service
               // For now, we're marking it ready for recording data
               if (stream.isRecordingEnabled) {
                    // Placeholder: In production, fetch actual recording file from Agora
                    // Example:
                    // const recordingBuffer = await fetchAgoraRecording(stream.agora.channelName);
                    // const recordingFile: Express.Multer.File = { buffer: recordingBuffer, originalname: `${streamId}.mp4`, ... };
                    // const recordingUrl = await uploadFileToS3(recordingFile, 'stream/recordings');
                    // stream.recordingUrl = recordingUrl;
                    logger.info(`Recording enabled for stream ${streamId} - awaiting Agora webhook callback`);
               }

               stream.status = 'ended';
               stream.endedAt = new Date();
               stream.duration = duration;

               await stream.save();

               // Decrement category stream count
               if (stream.category) {
                    await CategoryService.decrementStreamCount(
                         stream.category.toString(),
                    );
               }

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

     /**
      * Like a stream
      */
     static async likeStream(streamId: string, userId: string) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               stream.likes = (stream.likes || 0) + 1;
               await stream.save();

               // Update analytics
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         $inc: { likes: 1 },
                    });
               }

               logger.info(`Stream liked: ${streamId} by ${userId}`);
               return stream;
          } catch (error) {
               errorLogger.error('Like stream error', error);
               throw error;
          }
     }

     /**
      * Update stream settings
      */
     static async updateStreamSettings(streamId: string, settings: any) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (stream.status !== 'live') {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Can only update settings for live streams',
                    );
               }

               const updateFields: any = {};

               if (typeof settings.allowComments !== 'undefined') {
                    updateFields.allowComments = settings.allowComments;
               }
               if (typeof settings.allowGifts !== 'undefined') {
                    updateFields.allowGifts = settings.allowGifts;
               }
               if (typeof settings.enablePolls !== 'undefined') {
                    updateFields.enablePolls = settings.enablePolls;
               }
               if (typeof settings.enableAdBanners !== 'undefined') {
                    updateFields.enableAdBanners = settings.enableAdBanners;
               }
               if (settings.title) {
                    updateFields.title = settings.title;
               }
               if (settings.description) {
                    updateFields.description = settings.description;
               }

               const updatedStream = await Stream.findByIdAndUpdate(streamId, updateFields, {
                    new: true,
               });

               logger.info(`Stream settings updated: ${streamId}`);
               return updatedStream;
          } catch (error) {
               errorLogger.error('Update stream settings error', error);
               throw error;
          }
     }

     /**
      * Toggle stream controls (camera, mic, background)
      */
     static async toggleStreamControls(
          streamId: string,
          controls: { cameraOn?: boolean; micOn?: boolean; background?: string },
     ) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               const updateFields: any = { streamControls: stream.streamControls || {} };

               if (typeof controls.cameraOn !== 'undefined') {
                    updateFields.streamControls.cameraOn = controls.cameraOn;
               }
               if (typeof controls.micOn !== 'undefined') {
                    updateFields.streamControls.micOn = controls.micOn;
               }
               if (controls.background) {
                    updateFields.streamControls.background = controls.background;
               }

               const updatedStream = await Stream.findByIdAndUpdate(
                    streamId,
                    { $set: updateFields },
                    { new: true },
               );

               logger.info(`Stream controls updated: ${streamId}`);
               return updatedStream;
          } catch (error) {
               errorLogger.error('Toggle stream controls error', error);
               throw error;
          }
     }

     /**
      * Get stream analytics
      */
     static async getStreamAnalytics(streamId: string) {
          try {
               const stream = await Stream.findById(streamId).populate('analytics');

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               return stream.analytics;
          } catch (error) {
               errorLogger.error('Get stream analytics error', error);
               throw error;
          }
     }

     /**
      * Join stream as viewer
      */
     static async joinStream(streamId: string, userId: string) {
          try {
               const stream = await this.addViewer(streamId, userId);

               // Generate viewer token
               const uid = Math.floor(Math.random() * 100000);
               const agoraToken = this.generateAgoraToken(
                    stream.agora?.channelName || '',
                    uid,
                    'subscriber',
               );

               return {
                    stream,
                    viewerToken: agoraToken,
               };
          } catch (error) {
               errorLogger.error('Join stream error', error);
               throw error;
          }
     }

     /**
      * Leave stream
      */
     static async leaveStream(streamId: string, userId: string) {
          try {
               return await this.removeViewer(streamId, userId);
          } catch (error) {
               errorLogger.error('Leave stream error', error);
               throw error;
          }
     }
}

export default StreamService;
