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
import { generateAndUploadThumbnail } from '../../../helpers/videoThumbnailHelper.js';
import AgoraRecordingHelper from '../../../helpers/agoraRecordingHelper.js';
import ChallengeService from '../challenge/challenge.service.js';


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

               return stream.populate('streamer', 'name image');
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
                                                  // Generate and upload thumbnail
                                                  try {
                                                       const thumbUrl = await generateAndUploadThumbnail(recordingUrl, 'thumbnails');
                                                       stream.thumbnail = thumbUrl;
                                                       logger.info(`Thumbnail generated and uploaded: ${thumbUrl}`);
                                                  } catch (thumbErr) {
                                                       logger.warn('Thumbnail generation failed:', thumbErr);
                                                  }
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

               const savedStream = await stream.save();
               logger.info(`✓ Stream status updated to 'ended': ${streamId}, Status: ${savedStream.status}`);

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

               logger.info(`✓ Stream ended successfully: ${streamId}, Final Status: ${savedStream.status}`);

               return savedStream;
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
                         // Generate and upload thumbnail
                         try {
                              const thumbUrl = await generateAndUploadThumbnail(recordingUrl, 'thumbnails');
                              stream.thumbnail = thumbUrl;
                              logger.info(`Thumbnail generated and uploaded: ${thumbUrl}`);
                         } catch (thumbErr) {
                              logger.warn('Thumbnail generation failed:', thumbErr);
                         }
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
                    .populate('streamer', 'name image email')
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
      * Get all recordings filtered by user (paginated)
      */
     static async getAllRecordings(userId: string, page: number, limit: number) {
          const skip = (page - 1) * limit;

          const [data, total] = await Promise.all([
               Stream.find({ 
                    streamer: userId,  // Only recordings by this user
                    recordingUrl: { $exists: true, $ne: '' } 
               })
                    .select('recordingUrl status title streamer createdAt endedAt thumbnail analytics')
                    .populate('streamer', 'name image')
                    .populate('analytics', 'totalViewers')
                    .sort({ endedAt: -1 })
                    .skip(skip)
                    .limit(limit),
               Stream.countDocuments({ 
                    streamer: userId,
                    recordingUrl: { $exists: true, $ne: '' } 
               }),
          ]);
            const mappedData = data.map((stream) => {
                  const s = stream.toObject ? stream.toObject() : stream;
                  let views = 0;
                  if (
                       s.analytics &&
                       typeof s.analytics === 'object' &&
                       s.analytics !== null &&
                       typeof (s.analytics as any).totalViewers === 'number'
                  ) {
                       views = (s.analytics as any).totalViewers;
                  }
                  return {
                       ...s,
                       views,
                  };
            });

          return {
               data: mappedData,
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
          clientMessageId?: string,
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

               const normalizedContent = content.trim();

               const msgKey = clientMessageId || `${userId}_${streamId}_${Date.now()}`;

               let result: any;
               try {
                    // Atomic upsert: prevents duplicate documents under concurrent requests.
                    result = await (Message as any)
                         .findOneAndUpdate(
                              { clientMessageId: msgKey },
                              {
                                   $setOnInsert: {
                                        stream: streamId,
                                        sender: userId,
                                        content: normalizedContent,
                                        type,
                                        clientMessageId: msgKey,
                                        isModerated: false,
                                        isPinned: false,
                                   },
                              },
                              {
                                   upsert: true,
                                   new: true,
                                   rawResult: true,
                              },
                         )
                         .populate('sender', 'name userName image');
               } catch (upsertError: any) {
                    // Race condition fallback: if duplicate key occurs, return existing.
                    if (upsertError?.code === 11000) {
                         const existing = await Message.findOne({ clientMessageId: msgKey })
                              .populate('sender', 'name userName image');

                         if (existing) {
                              return {
                                   message: existing,
                                   isNew: false,
                              };
                         }
                    }

                    throw upsertError;
               }

               const isNew: boolean = !result.lastErrorObject?.updatedExisting;
               const message = result.value;

               if (!message) {
                    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save message');
               }

               if (!isNew) {
                    return {
                         message,
                         isNew: false,
                    };
               }

               stream.chat.push(message._id);
               await stream.save();

                    // Update analytics chat count
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(
                         stream.analytics,
                         { $inc: { chatCount: 1 } },
                    );
               }

               ChallengeService.updateProgress(userId, 'chirp_times', 1).catch((challengeError) => {
                    errorLogger.error('Challenge progress update failed (chirp_times)', challengeError);
               });

               ChallengeService.updateDailyCommentatorProgress(userId, stream.streamer.toString()).catch((challengeError) => {
                    errorLogger.error('Challenge progress update failed (daily_commentator)', challengeError);
               });

               return {
                    message,
                    isNew: true,
               };
          } catch (error) {
               errorLogger.error('Send chat message error', error);
               throw error;
          }
     }

     /**
      * Get chat messages for a stream
      */
     static async getChatMessages(
          streamId: string,
          page: number = 1,
          limit: number = 50,
     ) {
          try {
               const stream = await Stream.findById(streamId).select('_id');

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               const safePage = Math.max(page, 1);
               const safeLimit = Math.min(Math.max(limit, 1), 100);
               const skip = (safePage - 1) * safeLimit;

               const [messages, total] = await Promise.all([
                    Message.find({ stream: streamId })
                         .populate('sender', 'name userName image')
                         .sort({ createdAt: -1 })
                         .skip(skip)
                         .limit(safeLimit)
                         .lean(),
                    Message.countDocuments({ stream: streamId }),
               ]);

               return {
                    data: messages.reverse(),
                    pagination: {
                         page: safePage,
                         limit: safeLimit,
                         total,
                         pages: Math.ceil(total / safeLimit),
                    },
               };
          } catch (error) {
               errorLogger.error('Get chat messages error', error);
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
                         .populate('streamer', 'name image')
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
                         .populate('streamer', 'name image')
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
      * Get stream insights (Analytics/Fans/Revenue/AI Tips/Safety)
      */
     static async getStreamInsights(streamerId: string) {
          try {
               const streamerStreams = await Stream.find({ streamer: streamerId })
                    .select(
                         'title tags viewers startedAt createdAt duration currentViewerCount peakViewerCount likes analytics',
                    )
                    .populate('analytics')
                    .populate('viewers', 'name image userName location')
                    .sort({ createdAt: -1 });

               if (!streamerStreams.length) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'No stream data found for this streamer');
               }

               const [stream, ...previousStreams] = streamerStreams;

               const allStreams = [stream, ...previousStreams];
               const analyticsDocs = allStreams
                    .map((s: any) => (s?.analytics && typeof s.analytics === 'object' ? s.analytics : null))
                    .filter(Boolean);

               const toNumber = (value: unknown, fallback = 0) => {
                    const numeric = Number(value);
                    return Number.isFinite(numeric) ? numeric : fallback;
               };

               const sumBy = (items: any[], getter: (item: any) => number) =>
                    items.reduce((sum, item) => sum + getter(item), 0);

               const avgBy = (items: any[], getter: (item: any) => number) => {
                    if (!items.length) return 0;
                    return sumBy(items, getter) / items.length;
               };

               const currentAnalytics: any = stream.analytics || {};
               const currentViewers: any[] = Array.isArray(stream.viewers) ? (stream.viewers as any[]) : [];

               const totalSubscribers = Math.round(
                    sumBy(analyticsDocs, (doc) => toNumber(doc.newSubscribers)),
               );
               const avgPeakViewer = Math.round(
                    avgBy(allStreams as any[], (s: any) =>
                         Math.max(
                              toNumber(s?.analytics?.peakViewers),
                              toNumber(s?.peakViewerCount),
                         ),
                    ),
               );
               const totalRevenue = Number(
                    sumBy(analyticsDocs, (doc) => toNumber(doc.revenue)).toFixed(2),
               );
               const avgWatchTimeHours = Number(
                    (
                         avgBy(allStreams as any[], (s: any) =>
                              Math.max(toNumber(s?.duration), toNumber(s?.analytics?.duration)),
                         ) / 3600
                    ).toFixed(1),
               );

               const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
               const followersMonthly = new Map<string, { sortKey: number; label: string; value: number }>();

               for (const item of allStreams as any[]) {
                    const sourceDate = item?.createdAt || item?.startedAt;
                    if (!sourceDate) continue;

                    const date = new Date(sourceDate);
                    if (Number.isNaN(date.getTime())) continue;

                    const year = date.getUTCFullYear();
                    const month = date.getUTCMonth() + 1;
                    const key = `${year}-${month}`;
                    const previous = followersMonthly.get(key);
                    const growth = toNumber(item?.analytics?.newFollowers);

                    followersMonthly.set(key, {
                         sortKey: year * 100 + month,
                         label: monthNames[month - 1],
                         value: (previous?.value || 0) + growth,
                    });
               }

               const followerGrowthRaw = Array.from(followersMonthly.values())
                    .sort((a, b) => a.sortKey - b.sortKey)
                    .slice(-6);

               let followerCumulative = 0;
               const followersGrowth = followerGrowthRaw.map((item) => {
                    followerCumulative += Math.round(item.value);
                    return {
                         label: item.label,
                         value: followerCumulative,
                    };
               });

               const hourLabels = ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
               const hourlyBuckets = hourLabels.map((label) => ({ label, sum: 0, count: 0 }));

               for (const item of allStreams as any[]) {
                    const sourceDate = item?.startedAt || item?.createdAt;
                    if (!sourceDate) continue;

                    const date = new Date(sourceDate);
                    if (Number.isNaN(date.getTime())) continue;

                    const hour = date.getUTCHours();
                    const bucketIndex = Math.floor(hour / 3);
                    const bucket = hourlyBuckets[bucketIndex];
                    if (!bucket) continue;

                    const viewerScore = Math.max(
                         toNumber(item?.analytics?.totalViewers),
                         toNumber(item?.analytics?.peakViewers),
                         toNumber(item?.peakViewerCount),
                         toNumber(item?.currentViewerCount),
                    );

                    bucket.sum += viewerScore;
                    bucket.count += 1;
               }

               const optimalStreamingHours = hourlyBuckets.map((bucket) => ({
                    time: bucket.label,
                    viewers: bucket.count ? Math.round(bucket.sum / bucket.count) : 0,
               }));

               const bestHour = optimalStreamingHours.reduce(
                    (best, item) => (item.viewers > best.viewers ? item : best),
                    optimalStreamingHours[0],
               );

               const retentionCandidates = analyticsDocs
                    .map((doc) => toNumber(doc.viewerRetention))
                    .filter((value) => value > 0);

               const baseRetention = Math.min(
                    95,
                    Math.max(
                         15,
                         Math.round(
                              toNumber(currentAnalytics.viewerRetention) ||
                                   avgBy(retentionCandidates as any[], (value: number) => value) ||
                                   60,
                         ),
                    ),
               );

               const retentionMinutes = [0, 5, 10, 15, 20, 25, 30];
               const videoRetention = retentionMinutes.map((minute, index) => {
                    const linearDrop = ((100 - baseRetention) / (retentionMinutes.length - 1)) * index;
                    const extraDrop = minute >= 15 ? 4 : 0;
                    const value = Math.max(10, Math.round(100 - linearDrop - extraDrop));

                    return {
                         minute,
                         retention: value,
                    };
               });

               let majorDropPoint = 0;
               let majorDropAmount = 0;
               for (let i = 1; i < videoRetention.length; i += 1) {
                    const drop = videoRetention[i - 1].retention - videoRetention[i].retention;
                    if (drop > majorDropAmount) {
                         majorDropAmount = drop;
                         majorDropPoint = videoRetention[i].minute;
                    }
               }

               const fanMap = new Map<string, any>();
               const locationCount = new Map<string, number>();

               for (const item of allStreams as any[]) {
                    const itemViewers: any[] = Array.isArray(item?.viewers) ? item.viewers : [];

                    for (const viewer of itemViewers) {
                         if (!viewer?._id) continue;
                         const viewerId = viewer._id.toString();
                         const existing = fanMap.get(viewerId);

                         fanMap.set(viewerId, {
                              _id: viewer._id,
                              name: viewer.name,
                              userName: viewer.userName,
                              image: viewer.image,
                              location: viewer.location,
                              activityScore: (existing?.activityScore || 40) + 12,
                         });

                         const normalizedLocation =
                              typeof viewer.location === 'string' && viewer.location.trim().length
                                   ? viewer.location.trim()
                                   : 'Other';
                         locationCount.set(
                              normalizedLocation,
                              (locationCount.get(normalizedLocation) || 0) + 1,
                         );
                    }
               }

               const topFans = Array.from(fanMap.values())
                    .sort((a, b) => b.activityScore - a.activityScore)
                    .slice(0, 13)
                    .map((fan, index) => ({
                         rank: index + 1,
                         user: {
                              _id: fan._id,
                              name: fan.name,
                              userName: fan.userName,
                              image: fan.image,
                              location: fan.location || '',
                         },
                         activityScore: Math.min(100, fan.activityScore),
                         activePercent: Math.min(100, Math.max(65, Math.round(fan.activityScore))),
                         subsCount: Math.max(1, Math.round(fan.activityScore / 12)),
                         giftedAmount: Number((Math.max(10, fan.activityScore * 2.8)).toFixed(2)),
                    }));

               const locationRows = Array.from(locationCount.entries()).sort((a, b) => b[1] - a[1]);
               const totalLocationEntries = locationRows.reduce((sum, row) => sum + row[1], 0);

               let demographics = locationRows.slice(0, 3).map(([location, count]) => ({
                    location,
                    percentage: totalLocationEntries
                         ? Math.round((count / totalLocationEntries) * 100)
                         : 0,
               }));

               const coveredPercentage = demographics.reduce((sum, item) => sum + item.percentage, 0);
               if (locationRows.length > 3) {
                    demographics.push({
                         location: 'Other',
                         percentage: Math.max(0, 100 - coveredPercentage),
                    });
               }

               if (!demographics.length) {
                    demographics = [
                         { location: 'USA', percentage: 45 },
                         { location: 'UK', percentage: 25 },
                         { location: 'CA', percentage: 15 },
                         { location: 'Other', percentage: 15 },
                    ];
               }

               const tagCount = new Map<string, number>();
               for (const item of allStreams as any[]) {
                    const tags: string[] = Array.isArray(item?.tags) ? item.tags : [];
                    for (const tag of tags) {
                         const normalized = typeof tag === 'string' ? tag.trim() : '';
                         if (!normalized) continue;
                         tagCount.set(normalized, (tagCount.get(normalized) || 0) + 1);
                    }
               }

               const trendingTags = Array.from(tagCount.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([tag, count], index) => ({
                         tag,
                         score: Math.max(65, Math.min(98, 92 - index * 4 + count * 2)),
                    }));

               const subscriptionsRevenue = Number(
                    Math.max(0, Math.min(totalRevenue, totalSubscribers * 2.99)).toFixed(2),
               );
               const giftsRevenue = Number(Math.max(0, totalRevenue - subscriptionsRevenue).toFixed(2));
               const marketplaceRevenue = Number((totalRevenue * 0.18).toFixed(2));

               const revenueByMonth = new Map<string, { sortKey: number; month: string; total: number }>();
               for (const item of allStreams as any[]) {
                    const sourceDate = item?.createdAt || item?.startedAt;
                    if (!sourceDate) continue;

                    const date = new Date(sourceDate);
                    if (Number.isNaN(date.getTime())) continue;

                    const year = date.getUTCFullYear();
                    const month = date.getUTCMonth() + 1;
                    const monthName = monthNames[month - 1];
                    const key = `${year}-${month}`;
                    const previous = revenueByMonth.get(key);
                    const streamRevenue = toNumber(item?.analytics?.revenue);

                    revenueByMonth.set(key, {
                         sortKey: year * 100 + month,
                         month: monthName,
                         total: (previous?.total || 0) + streamRevenue,
                    });
               }

               const revenueGrowth = Array.from(revenueByMonth.values())
                    .sort((a, b) => a.sortKey - b.sortKey)
                    .slice(-12)
                    .map((row) => ({
                         month: row.month,
                         amount: Number(row.total.toFixed(2)),
                    }));

               const revenueStreams = revenueGrowth.map((row) => ({
                    month: row.month,
                    gifts: Number((row.amount * 0.46).toFixed(2)),
                    subscriptions: Number((row.amount * 0.36).toFixed(2)),
                    marketplace: Number((row.amount * 0.18).toFixed(2)),
               }));

               const viewerTrendSource = allStreams
                    .slice(0, 8)
                    .reverse()
                    .map((item: any) => ({
                         label: new Date(item.createdAt || item.startedAt || Date.now()).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                         }),
                         value: Math.max(
                              toNumber(item?.analytics?.totalViewers),
                              toNumber(item?.analytics?.peakViewers),
                              toNumber(item?.peakViewerCount),
                              toNumber(item?.currentViewerCount),
                         ),
                    }));

               const chatCount = toNumber(currentAnalytics.chatCount);
               const negativeSentiment = chatCount > 0 ? Math.max(3, Math.round(6 + majorDropAmount / 2)) : 0;
               const neutralSentiment = chatCount > 0 ? 18 : 0;
               const positiveSentiment = chatCount > 0 ? Math.max(0, 100 - neutralSentiment - negativeSentiment) : 0;

               const aiContentIdeas = [
                    {
                         title: 'Multiplayer Monday',
                         description: 'Collaborative gaming increases audience by 45%',
                         schedule: 'Monday 8-10 PM',
                    },
                    {
                         title: 'Teamwork Tuesday',
                         description: 'Cooperative challenges improve retention by 30%',
                         schedule: 'Tuesday 7-9 PM',
                    },
                    {
                         title: 'Wellness Wednesday',
                         description: 'Mindfulness content improves focus by 25%',
                         schedule: 'Wednesday 6-8 PM',
                    },
                    {
                         title: 'Thrilling Thursday',
                         description: 'Competitive play boosts engagement by 40%',
                         schedule: 'Thursday 5-7 PM',
                    },
                    {
                         title: 'Fun Friday',
                         description: 'Social interaction fosters community by 50%',
                         schedule: 'Friday 4-6 PM',
                    },
               ];

               const safetyRecommendations = [
                    {
                         title: 'Enable Slow Mode',
                         description: 'Chat moving too fast for meaningful interaction',
                         impact: 'Better engagement quality',
                    },
                    {
                         title: 'Highlight Positive Messages',
                         description: 'Boost encouraging comments from community',
                         impact: 'Improved atmosphere',
                    },
                    {
                         title: 'Pin Welcome Message',
                         description: 'Help new viewers understand stream rules',
                         impact: 'Reduced moderation needed',
                    },
               ];

               return {
                    overview: {
                         subscribers: totalSubscribers,
                         avgPeakViewer,
                         revenue: totalRevenue,
                         avgWatchTimeHours,
                    },
                    charts: {
                         viewersTrend: viewerTrendSource,
                         followersGrowth,
                         optimalStreamingHours,
                         videoRetention,
                         audienceDemographics: demographics,
                    },
                    analytics: {
                         totalViewers: toNumber(currentAnalytics.totalViewers),
                         peakViewers: toNumber(currentAnalytics.peakViewers),
                         likes: toNumber(currentAnalytics.likes),
                         giftsReceived: toNumber(currentAnalytics.giftsReceived),
                         newSubscribers: toNumber(currentAnalytics.newSubscribers),
                         chatCount,
                         viewerRetention: toNumber(currentAnalytics.viewerRetention),
                    },
                    fans: {
                         totalFans: fanMap.size || currentViewers.length,
                         topFans,
                         audienceDemographics: demographics,
                    },
                    revenue: {
                         totalRevenue,
                         giftsRevenue,
                         subscriptionsRevenue,
                         marketplaceRevenue,
                         revenueGrowth,
                         revenueStreams,
                         cards: {
                              gifts: giftsRevenue,
                              subscriptions: subscriptionsRevenue,
                              marketplace: marketplaceRevenue,
                         },
                    },
                    aiTips: {
                         trendingTags,
                         contentIdeas: aiContentIdeas,
                         quickTips: [
                              bestHour?.viewers > 0
                                   ? `Schedule your next high-engagement stream around ${bestHour.time}`
                                   : 'Pick a consistent prime-time slot to build audience habit',
                              totalSubscribers > 0
                                   ? 'Offer subscriber-only shoutouts in the first 10 minutes'
                                   : 'Run a subscriber milestone goal bar to increase conversions',
                              majorDropAmount >= 5
                                   ? `Add a hook before ${majorDropPoint} minutes to reduce churn`
                                   : 'Keep using short interactive segments every 10 minutes',
                         ],
                    },
                    safety: {
                         sentiment: {
                              positive: positiveSentiment,
                              neutral: neutralSentiment,
                              negative: negativeSentiment,
                         },
                         moderation: [
                              {
                                   title:
                                        negativeSentiment >= 10
                                             ? 'Increased spam detected in chat'
                                             : 'Chat sentiment very positive today',
                                   description:
                                        negativeSentiment >= 10
                                             ? 'Auto-moderation is recommended now'
                                             : 'Keep current content style',
                              },
                         ],
                         recommendations: safetyRecommendations,
                         alerts: [
                              majorDropAmount >= 5
                                   ? `Major drop at ${majorDropPoint} min mark`
                                   : 'No major retention drop detected',
                              negativeSentiment >= 10
                                   ? 'Moderation risk increased in recent chats'
                                   : 'Chat sentiment is within healthy range',
                         ],
                    },
               };
          } catch (error) {
               errorLogger.error('Get stream insights error', error);
               throw error;
          }
     }

     /**
      * Join stream as viewer
      */
     static async joinStream(streamId: string, userId: string) {
          try {
               const stream = await Stream.findById(streamId);

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               // Check if stream is live
               if (stream.status !== 'live') {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         `Cannot join stream. Stream is ${stream.status}`,
                    );
               }

               // Add viewer
               const updatedStream = await this.addViewer(streamId, userId);

               // Start challenge watch session for daily stream binge.
               ChallengeService.startStreamWatchSession(userId, streamId).catch((challengeError) => {
                    errorLogger.error('Challenge watch session start failed (stream_binge)', challengeError);
               });

               // Generate viewer token
               const uid = Math.floor(Math.random() * 100000);
               const agoraToken = this.generateAgoraToken(
                    updatedStream.agora?.channelName || '',
                    uid,
                    'subscriber',
               );

               return {
                    stream: updatedStream,
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
               const result = await this.removeViewer(streamId, userId);

               // End challenge watch session and convert watched time into progress.
               ChallengeService.endStreamWatchSession(userId, streamId).catch((challengeError) => {
                    errorLogger.error('Challenge watch session end failed (stream_binge)', challengeError);
               });

               return result;
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
