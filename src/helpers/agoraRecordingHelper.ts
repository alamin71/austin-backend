import axios from 'axios';
import config from '../config/index.js';
import { logger, errorLogger } from '../shared/logger.js';
import AppError from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

interface AcquireResponse {
     resourceId: string;
}

interface StartResponse {
     resourceId: string;
     sid: string;
}

interface StopResponse {
     resourceId: string;
     sid: string;
     serverResponse: {
          fileListMode: string;
          fileList: Array<{
               filename: string;
               trackType: string;
               uid: string;
               mixedAllUser: boolean;
               isPlayable: boolean;
               sliceStartTime: number;
          }>;
          uploadingStatus: string;
     };
}

/**
 * Agora Cloud Recording Helper
 * Handles cloud recording lifecycle: acquire -> start -> stop
 */
class AgoraRecordingHelper {
     private static readonly BASE_URL = 'https://api.agora.io/v1/apps';
     private static readonly REGION = 1; // 0: CN, 1: US, 2: EU, 3: AP

     /**
      * Get Basic Auth credentials for Agora Cloud Recording API
      */
     private static getAuthCredentials(): string {
          const customerId = config.agora?.customer_id;
          const customerSecret = config.agora?.customer_secret;

          if (!customerId || !customerSecret) {
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Agora Customer ID or Secret not configured',
               );
          }

          // Basic Auth: Base64(Customer ID:Customer Secret)
          const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');
          return `Basic ${credentials}`;
     }

     /**
      * Step 1: Acquire - Get a resource ID for cloud recording
      */
     static async acquire(channelName: string, uid: string): Promise<string> {
          try {
               const appId = config.agora?.app_id;
               const customerId = config.agora?.customer_id;
               const customerSecret = config.agora?.customer_secret;
               
               if (!appId) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Agora App ID not configured',
                    );
               }

               // Debug logging
               logger.info(`Agora Recording Acquire - App ID: ${appId}, Customer ID: ${customerId?.substring(0, 8)}..., Channel: ${channelName}, UID: ${uid}`);

               const url = `${this.BASE_URL}/${appId}/cloud_recording/acquire`;
               const requestBody = {
                    cname: channelName,
                    uid: uid,
                    clientRequest: {
                         resourceExpiredHour: 24,
                    },
               };

               logger.info(`Agora acquire request URL: ${url}`);
               logger.info(`Agora acquire request body: ${JSON.stringify(requestBody)}`);

               const response = await axios.post<AcquireResponse>(
                    url,
                    requestBody,
                    {
                         headers: {
                              'Content-Type': 'application/json',
                              Authorization: this.getAuthCredentials(),
                         },
                    },
               );

               logger.info(`Agora acquire successful: ${response.data.resourceId}`);
               return response.data.resourceId;
          } catch (error: any) {
               errorLogger.error('Agora acquire error - Full response:', JSON.stringify(error?.response?.data));
               errorLogger.error('Agora acquire error - Status:', error?.response?.status);
               errorLogger.error('Agora acquire error - Headers:', JSON.stringify(error?.response?.headers));
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to acquire cloud recording resource: ${error?.response?.data?.message || error.message}`,
               );
          }
     }

     /**
      * Step 2: Start - Begin cloud recording
      */
     static async start(
          resourceId: string,
          channelName: string,
          uid: string,
          token?: string, // Optional RTC token for recording bot
     ): Promise<{ resourceId: string; sid: string }> {
          try {
               const appId = config.agora?.app_id;
               const callbackUrl = config.agora?.recording_callback_url;
               const storageVendor = parseInt(config.agora?.storage_vendor || '1'); // 1: AWS S3
               const storageRegion = parseInt(config.agora?.storage_region || '0'); // 0: us-east-1
               const storageBucket = config.agora?.storage_bucket || config.aws_s3_bucket_name;
               const storageAccessKey = config.agora?.storage_access_key || config.aws_access_key_id;
               const storageSecretKey = config.agora?.storage_secret_key || config.aws_secret_access_key;

               if (!appId) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Agora App ID not configured',
                    );
               }

               if (!storageBucket || !storageAccessKey || !storageSecretKey) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Cloud recording storage credentials not configured',
                    );
               }

               // Debug log storage config
               logger.info(`Storage Config - Vendor: ${storageVendor}, Region: ${storageRegion}, Bucket: ${storageBucket}, AccessKey: ${storageAccessKey?.substring(0, 8)}...`);

               const url = `${this.BASE_URL}/${appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`;

               const requestBody = {
                    cname: channelName,
                    uid: uid,
                    clientRequest: {
                         token: token || '',
                         recordingConfig: {
                              maxIdleTime: 1800, // 30 minutes idle time before auto-stop
                              streamTypes: 2, // 0: audio only, 1: video only, 2: audio+video
                              channelType: 0, // 0: communication, 1: live broadcast
                              videoStreamType: 0, // 0: high-stream, 1: low-stream
                              transcodingConfig: {
                                   height: 640,
                                   width: 360,
                                   bitrate: 500,
                                   fps: 15,
                                   mixedVideoLayout: 0, // 0: floating layout
                                   backgroundColor: '#000000',
                              },
                              subscribeUidGroup: 0,
                         },
                         recordingFileConfig: {
                              avFileType: ['hls', 'mp4'], // HLS + MP4
                         },
                         storageConfig: {
                              vendor: storageVendor, // 1 = AWS S3
                              region: storageRegion, // 0 = us-east-1
                              bucket: storageBucket,
                              accessKey: storageAccessKey,
                              secretKey: storageSecretKey,
                              fileNamePrefix: ['recordings', 'streams'],
                         },
                    },
               };

               logger.info(`Recording file config - avFileType: hls, mp4`);
               logger.info(`Storage - Bucket: ${storageBucket}, Region: ${storageRegion}, Vendor: ${storageVendor}`);

               // Add callback URL if configured
               if (callbackUrl) {
                    requestBody.clientRequest.recordingConfig = {
                         ...requestBody.clientRequest.recordingConfig,
                         // @ts-ignore
                         subscribeAudioUids: ['#allstream#'],
                         subscribeVideoUids: ['#allstream#'],
                    };
                    // @ts-ignore
                    requestBody.clientRequest.extensionServiceConfig = {
                         extensionServices: [
                              {
                                   serviceName: 'web_recorder_service',
                                   errorHandlePolicy: 'error_abort',
                                   serviceParam: {
                                        url: callbackUrl,
                                        audioProfile: 0,
                                        videoWidth: 1280,
                                        videoHeight: 720,
                                        maxRecordingHour: 3,
                                   },
                              },
                         ],
                    };
               }

               logger.info(`Agora Recording Start - URL: ${url}`);
               logger.info(`Agora Recording Start - Channel: ${channelName}, UID: ${uid}`);

               const response = await axios.post<StartResponse>(url, requestBody, {
                    headers: {
                         'Content-Type': 'application/json',
                         Authorization: this.getAuthCredentials(),
                    },
               });

               logger.info(`Agora recording started successfully: ${response.data.sid}`);
               logger.info(`Agora start response resourceId: ${response.data.resourceId}`);
               return {
                    resourceId: response.data.resourceId,
                    sid: response.data.sid,
               };
          } catch (error: any) {
               errorLogger.error('Agora start recording error:', error?.response?.data || error.message);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to start cloud recording: ${error?.response?.data?.message || error.message}`,
               );
          }
     }

     /**
      * Step 3: Stop - End cloud recording
      */
     static async stop(
          resourceId: string,
          sid: string,
          channelName: string,
          uid: string,
     ): Promise<StopResponse> {
          try {
               const appId = config.agora?.app_id;
               if (!appId) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Agora App ID not configured',
                    );
               }

               logger.info(`Agora Recording Stop - Resource ID: ${resourceId}, SID: ${sid}, Channel: ${channelName}, UID: ${uid}`);

               const url = `${this.BASE_URL}/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;
               
               const requestBody = {
                    cname: channelName,
                    uid: uid,
                    clientRequest: {},
               };

               logger.info(`Agora stop request URL: ${url}`);
               logger.info(`Agora stop request body: ${JSON.stringify(requestBody)}`);

               const response = await axios.post<StopResponse>(
                    url,
                    requestBody,
                    {
                         headers: {
                              'Content-Type': 'application/json',
                              Authorization: this.getAuthCredentials(),
                         },
                    },
               );

               logger.info(`Agora recording stopped successfully: ${response.data.sid}`);
               logger.info(`Agora stop response FULL: ${JSON.stringify(response.data, null, 2)}`);
               
               // Log fileList details for debugging
               if (response.data?.serverResponse?.fileList) {
                    logger.info(`FileList length: ${response.data.serverResponse.fileList.length}`);
                    response.data.serverResponse.fileList.forEach((file: any, index: number) => {
                         logger.info(`File[${index}]: ${JSON.stringify(file)}`);
                    });
               }
               
               return response.data;
          } catch (error: any) {
               errorLogger.error('Agora stop recording error - Status:', error?.response?.status);
               errorLogger.error('Agora stop recording error - Full response:', JSON.stringify(error?.response?.data));
               errorLogger.error('Agora stop recording error - Message:', error.message);
               
               // If 404, the recording might have already stopped automatically
               if (error?.response?.status === 404) {
                    logger.warn(`Recording not found (404) - might have already stopped automatically due to maxIdleTime. Resource ID: ${resourceId}, SID: ${sid}`);
                    // Return a mock response to avoid breaking the flow
                    return {
                         resourceId,
                         sid,
                         serverResponse: {
                              fileListMode: 'string',
                              fileList: [],
                              uploadingStatus: 'uploaded',
                         },
                    };
               }
               
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to stop cloud recording: ${error?.response?.data?.message || error.message}`,
               );
          }
     }

     /**
      * Query recording status
      */
     static async query(resourceId: string, sid: string): Promise<any> {
          try {
               const appId = config.agora?.app_id;
               if (!appId) {
                    throw new AppError(
                         StatusCodes.INTERNAL_SERVER_ERROR,
                         'Agora App ID not configured',
                    );
               }

               const url = `${this.BASE_URL}/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;

               const response = await axios.get(url, {
                    headers: {
                         'Content-Type': 'application/json',
                         Authorization: this.getAuthCredentials(),
                    },
               });

               return response.data;
          } catch (error: any) {
               errorLogger.error('Agora query recording error:', error?.response?.data || error.message);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to query recording status: ${error?.response?.data?.message || error.message}`,
               );
          }
     }
}

export default AgoraRecordingHelper;
