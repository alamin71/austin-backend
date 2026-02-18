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
import AgoraRecordingHelper from '../../../helpers/agoraRecordingHelper.js';

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

               // Start Agora Cloud Recording if enabled
               if (stream.isRecordingEnabled) {
                    try {
                         const recordingUid = '999'; // Use a fixed UID for recording bot
                         
                         // Generate SUBSCRIBER token for recording bot (not publisher)
                         // Recording bot needs to receive audio/video, not send
                         const recordingToken = this.generateAgoraToken(
                              stream.agora?.channelName || channelName,
                              parseInt(recordingUid),
                              'subscriber',  // Recording bot is a SUBSCRIBER
                         );
                         
                         const resourceId = await AgoraRecordingHelper.acquire(
                              stream.agora?.channelName || channelName,
                              recordingUid,
                         );
                         const { sid } = await AgoraRecordingHelper.start(
                              resourceId,
                              stream.agora?.channelName || channelName,
                              recordingUid,
                              recordingToken.token, // Pass the generated token
                         );

                         stream.recordingResourceId = resourceId;
                         stream.recordingSid = sid;
                         await stream.save();
                         
                         logger.info(`Recording started for stream ${stream._id}: ${sid}`);
                    } catch (err) {
                         errorLogger.error('Start recording error', err);
                         // Don't throw - recording is optional
                    }
               }

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
     static async pauseStream(streamId: string) {
          const stream = await Stream.findById(streamId);
          if (!stream) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
          }
          if (stream.status !== 'live') {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Only live streams can be paused');
          }

          stream.status = 'paused';
          await stream.save();

          return stream;
     }

     static async resumeStream(streamId: string) {
          const stream = await Stream.findById(streamId);
          if (!stream) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
          }
          if (stream.status !== 'paused') {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Only paused streams can be resumed');
          }

          stream.status = 'live';
          await stream.save();

          return stream;
     }

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

               // Stop Agora Cloud Recording if enabled
               if (stream.isRecordingEnabled) {
                    // Stop Agora cloud recording if started
                    if (stream.recordingResourceId && stream.recordingSid) {
                         try {
                              const recordingUid = '999'; // Same UID used when starting
                              const stopResponse = await AgoraRecordingHelper.stop(
                                   stream.recordingResourceId,
                                   stream.recordingSid,
                                   stream.agora?.channelName as string,
                                   recordingUid,
                              );
                              
                              // Build recording URL from stop response
                              if (stopResponse?.serverResponse?.fileList?.length > 0) {
                                   const file: any = stopResponse.serverResponse.fileList[0];
                                   // Agora may use 'filename' or 'fileName'
                                   const fileName = file.filename || file.fileName;
                                   
                                   if (fileName) {
                                        const bucketName = config.aws_s3_bucket_name || 'austin-mahoney-buckets';
                                        const region = config.aws_region || 'us-east-1';
                                        // Agora fileName already includes full path like "recordings/streams/filename.mp4"
                                        // Don't prepend "recordings/streams/" again to avoid duplication
                                        const recordingUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
                                        stream.recordingUrl = recordingUrl;
                                        logger.info(`Recording URL saved from stop response: ${recordingUrl}`);
                                   } else {
                                        logger.warn('Filename not found in stop response fileList[0]:', JSON.stringify(file));
                                   }
                              } else {
                                   logger.warn('No fileList in stop response, will wait for webhook callback');
                              }
                         } catch (err) {
                              errorLogger.error('Stop recording error', err);
                         }
                    }
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
      * Handle Agora Cloud Recording webhook
      * Saves recording URL (if available) against the stream
      */
     static async handleRecordingWebhook(payload: any) {
          try {
               logger.info('Recording webhook received:', JSON.stringify(payload, null, 2));
               
               // Agora webhook may send data in different shapes depending on event
               const cname =
                    payload?.cname ||
                    payload?.payload?.cname ||
                    payload?.payload?.details?.cname ||
                    payload?.payload?.details?.channelName;

               const fileList =
                    payload?.fileList ||
                    payload?.payload?.fileList ||
                    payload?.payload?.details?.fileList ||
                    payload?.payload?.details?.files ||
                    payload?.serverResponse?.fileList;

               if (!cname) {
                    logger.warn('Channel name not provided in webhook payload');
                    return { updated: false, reason: 'Channel name not provided' };
               }

               const stream = await Stream.findOne({ 'agora.channelName': cname });
               if (!stream) {
                    logger.warn(`Stream not found for channel: ${cname}`);
                    return { updated: false, reason: 'Stream not found', cname };
               }

               let recordingUrl: string | undefined;
               if (Array.isArray(fileList) && fileList.length > 0) {
                    const firstFile: any = fileList.find((f: any) => f.filename?.endsWith('.mp4') || f.fileName?.endsWith('.mp4') || f.trackType === 'audio_and_video');
                    const file = firstFile || fileList[0];
                    
                    // Build S3 URL from filename (Agora may use 'filename' or 'fileName')
                    const fileName = file?.filename || file?.fileName;
                    
                    if (fileName) {
                         const bucketName = config.aws_s3_bucket_name || 'austin-mahoney-buckets';
                         const region = config.aws_region || 'us-east-1';
                         // Agora fileName already includes full path like "recordings/streams/filename.mp4"
                         // Don't prepend "recordings/streams/" again to avoid duplication
                         recordingUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
                         logger.info(`Recording URL constructed from webhook: ${recordingUrl}`);
                    } else {
                         logger.warn('Filename not found in webhook fileList:', JSON.stringify(file));
                         // Fallback to direct URL if provided
                         recordingUrl = file?.fileUrl || file?.url;
                    }
               }

               if (recordingUrl) {
                    stream.recordingUrl = recordingUrl;
                    logger.info(`Recording URL saved for stream ${stream._id}: ${recordingUrl}`);
               } else {
                    logger.warn(`No recording URL found in webhook payload for stream ${stream._id}`);
               }

               await stream.save();

               return { updated: true, streamId: stream._id, recordingUrl };
          } catch (error) {
               errorLogger.error('Recording webhook error', error);
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
      * Get all recordings (paginated)
      */
     static async getAllRecordings(page: number, limit: number) {
          const skip = (page - 1) * limit;

          const [data, total] = await Promise.all([
               Stream.find({ recordingUrl: { $exists: true, $ne: '' } })
                    .select('recordingUrl status title streamer createdAt endedAt')
                    .populate('streamer', 'name avatar')
                    .sort({ endedAt: -1 })
                    .skip(skip)
                    .limit(limit),
               Stream.countDocuments({ recordingUrl: { $exists: true, $ne: '' } }),
          ]);

          return {
               data,
               meta: {
                    page,
                    limit,
                    total,
                    totalPage: Math.ceil(total / limit),
               },
          };
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

     /**
      * Check recording status
      */
     static async checkRecordingStatus(resourceId: string, sid: string): Promise<any> {
          try {
               const status = await AgoraRecordingHelper.query(resourceId, sid);
               return status;
          } catch (error) {
               errorLogger.error('Check recording status error', error);
               throw error;
          }
     }
}

/**
 * Agora Cloud Recording Helper Functions
 */

// Helper functions removed - now using AgoraRecordingHelper class

export default StreamService;
