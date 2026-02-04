import axios from 'axios';
import config from '../config/index.js';

const buildAuthHeader = () => {
     const customerId = config.agora?.customer_id;
     const customerSecret = config.agora?.customer_secret;

     if (!customerId || !customerSecret) {
          return null;
     }

     const token = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');
     return `Basic ${token}`;
};

const getRecordingBaseUrl = () => {
     const appId = config.agora?.app_id;
     if (!appId) {
          throw new Error('Agora app ID not configured');
     }
     return `https://api.agora.io/v1/apps/${appId}/cloud_recording`;
};

export const acquireRecordingResource = async (channelName: string, uid: number) => {
     const auth = buildAuthHeader();
     if (!auth) {
          throw new Error('Agora customer credentials not configured');
     }

     const url = `${getRecordingBaseUrl()}/acquire`;
     const body = {
          cname: channelName,
          uid: String(uid),
          clientRequest: {
               resourceExpiredHour: 24,
          },
     };

     const response = await axios.post(url, body, {
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
     });

     return response.data?.resourceId as string;
};

export const startRecording = async (params: {
     channelName: string;
     uid: number;
     token?: string;
     resourceId: string;
     fileNamePrefix?: string[];
}) => {
     const auth = buildAuthHeader();
     if (!auth) {
          throw new Error('Agora customer credentials not configured');
     }

     const url = `${getRecordingBaseUrl()}/resourceid/${params.resourceId}/mode/mix/start`;

     const storageVendor = Number(config.agora?.storage_vendor || 1);
     const storageRegion = Number(config.agora?.storage_region || 0);

     const body = {
          cname: params.channelName,
          uid: String(params.uid),
          clientRequest: {
               token: params.token || '',
               recordingConfig: {
                    maxIdleTime: 30,
                    streamTypes: 2,
                    channelType: 0,
               },
               storageConfig: {
                    vendor: storageVendor,
                    region: storageRegion,
                    bucket: config.agora?.storage_bucket,
                    accessKey: config.agora?.storage_access_key,
                    secretKey: config.agora?.storage_secret_key,
                    fileNamePrefix: params.fileNamePrefix || ['recordings'],
               },
               callbackUrl:
                    config.agora?.recording_callback_url ||
                    (config.backend_url
                         ? `${config.backend_url}/api/v1/stream/recording/webhook`
                         : undefined),
          },
     };

     const response = await axios.post(url, body, {
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
     });

     return response.data?.sid as string;
};

export const stopRecording = async (params: {
     channelName: string;
     uid: number;
     resourceId: string;
     sid: string;
}) => {
     const auth = buildAuthHeader();
     if (!auth) {
          throw new Error('Agora customer credentials not configured');
     }

     const url = `${getRecordingBaseUrl()}/resourceid/${params.resourceId}/sid/${params.sid}/mode/mix/stop`;
     const body = {
          cname: params.channelName,
          uid: String(params.uid),
          clientRequest: {},
     };

     const response = await axios.post(url, body, {
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
     });

     return response.data;
};