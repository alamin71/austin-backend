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

               // Start Agora Cloud Recording if enabled
               if (stream.isRecordingEnabled) {
                    try {
                         const resourceId = await acquireRecordingResource(
                              stream.agora?.channelName || channelName,
                              stream.agora?.uid || uid,
                         );
                         const sid = await startRecording({
                              channelName: stream.agora?.channelName || channelName,
                              uid: stream.agora?.uid || uid,
                              resourceId,
                         });

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

               // TODO: Get recording from Agora and upload to S3
               // When stream ends, fetch recording from Agora's cloud recording service
               // For now, we're marking it ready for recording data
               if (stream.isRecordingEnabled) {
                    // Stop Agora cloud recording if started
                    if (stream.recordingResourceId && stream.recordingSid) {
                         try {
                              await stopRecording({
                                   channelName: stream.agora?.channelName as string,
                                   uid: stream.agora?.uid as number,
                                   resourceId: stream.recordingResourceId,
                                   sid: stream.recordingSid,
                              });
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
                    payload?.payload?.details?.files;

               if (!cname) {
                    return { updated: false, reason: 'Channel name not provided' };
               }

               const stream = await Stream.findOne({ 'agora.channelName': cname });
               if (!stream) {
                    return { updated: false, reason: 'Stream not found', cname };
               }

               let recordingUrl: string | undefined;
               if (Array.isArray(fileList) && fileList.length > 0) {
                    const firstFile: any = fileList[0];
                    recordingUrl = firstFile?.fileUrl || firstFile?.url || firstFile?.fileName;
               }

               if (recordingUrl) {
                    stream.recordingUrl = recordingUrl;
               }

               await stream.save();

               logger.info(`Recording webhook processed for stream ${stream._id}`);
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
}

/**
 * Agora Cloud Recording Helper Functions
 */

async function acquireRecordingResource(
     channelName: string,
     uid: number,
): Promise<string> {
     try {
          const appId = config.agora?.app_id;
          const appCertificate = config.agora?.app_certificate;

          if (!appId || !appCertificate) {
               throw new Error('Agora credentials not configured');
          }

          const url = `https://api.agora.io/v1/apps/${appId}/cloud_recording/acquire`;
          
          const auth = Buffer.from(`${appId}:${appCertificate}`).toString('base64');

          const response = await fetch(url, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
               },
               body: JSON.stringify({
                    cname: channelName,
                    uid: uid.toString(),
                    clientRequest: {},
               }),
          });

          if (!response.ok) {
               const error = await response.json();
               throw new Error(`Agora acquire failed: ${JSON.stringify(error)}`);
          }

          const data = await response.json();
          return data.resourceId;
     } catch (error) {
          errorLogger.error('Acquire recording resource error', error);
          throw error;
     }
}

async function startRecording({
     resourceId,
     channelName,
     uid,
}: {
     resourceId: string;
     channelName: string;
     uid: number;
}): Promise<string> {
     try {
          const appId = config.agora?.app_id;
          const appCertificate = config.agora?.app_certificate;

          if (!appId || !appCertificate) {
               throw new Error('Agora credentials not configured');
          }

          const url = `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/start`;
          
          const auth = Buffer.from(`${appId}:${appCertificate}`).toString('base64');

          const response = await fetch(url, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
               },
               body: JSON.stringify({
                    cname: channelName,
                    uid: uid.toString(),
                    clientRequest: {
                         recordingConfig: {
                              maxIdleTime: 30,
                              streamTypes: 2,
                              audioProfile: 1,
                              channelType: 0,
                              videoStreamType: 0,
                              recordingFileConfig: [
                                   {
                                        avFileType: ['m3u8', 'mp4'],
                                   },
                              ],
                         },
                         storageConfig: {
                              vendor: 1, // AWS S3
                              region: 6, // ap-southeast-1 (Singapore)
                              bucket: config.aws_s3_bucket_name || 'austin-buckets',
                              accessKey: config.aws_access_key_id,
                              secretKey: config.aws_secret_access_key,
                              fileNamePrefix: ['stream_recordings'],
                         },
                         extensionServiceUrl: 'https://65.1.20.111:5000/api/v1/stream/recording/webhook',
                    },
               }),
          });

          if (!response.ok) {
               const error = await response.json();
               throw new Error(`Agora start recording failed: ${JSON.stringify(error)}`);
          }

          const data = await response.json();
          return data.sid;
     } catch (error) {
          errorLogger.error('Start recording error', error);
          throw error;
     }
}

async function stopRecording({
     resourceId,
     sid,
     channelName,
     uid,
}: {
     resourceId: string;
     sid: string;
     channelName: string;
     uid: number;
}): Promise<void> {
     try {
          const appId = config.agora?.app_id;
          const appCertificate = config.agora?.app_certificate;

          if (!appId || !appCertificate) {
               throw new Error('Agora credentials not configured');
          }

          const url = `https://api.agora.io/v1/apps/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/stop`;
          
          const auth = Buffer.from(`${appId}:${appCertificate}`).toString('base64');

          const response = await fetch(url, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
               },
               body: JSON.stringify({
                    cname: channelName,
                    uid: uid.toString(),
                    clientRequest: {},
               }),
          });

          if (!response.ok) {
               const error = await response.json();
               throw new Error(`Agora stop recording failed: ${JSON.stringify(error)}`);
          }

          logger.info(`Recording stopped: ${sid}`);
     } catch (error) {
          errorLogger.error('Stop recording error', error);
          throw error;
     }
}

export default StreamService;
