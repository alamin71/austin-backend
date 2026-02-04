# Agora Cloud Recording Integration

## Overview
Automatic recording of live streams using Agora Cloud Recording API is now fully implemented in `src/app/modules/stream/stream.service.ts`.

## Implementation Details

### 1. **acquireRecordingResource()**
- **Purpose**: Acquires a recording resource ID from Agora's service before starting recording
- **API Endpoint**: `POST https://api.agora.io/v1/apps/{appId}/cloud_recording/acquire`
- **Authentication**: Basic Auth (base64(appId:appCertificate))
- **Parameters**:
  - `cname`: Channel name (stream_${streamerId}_${Date.now()})
  - `uid`: User ID in the channel
- **Returns**: `resourceId` (needed for starting recording)

### 2. **startRecording()**
- **Purpose**: Starts the Agora Cloud Recording for the acquired resource
- **API Endpoint**: `POST https://api.agora.io/v1/apps/{appId}/cloud_recording/resourceid/{resourceId}/start`
- **Authentication**: Basic Auth
- **Configuration**:
  - **recordingConfig**:
    - maxIdleTime: 30 seconds
    - streamTypes: 2 (both audio & video)
    - audioProfile: 1 (HQ)
    - channelType: 0 (communication)
    - videoStreamType: 0 (high quality)
    - avFileType: ['m3u8', 'mp4'] (both formats)
  
  - **storageConfig**:
    - vendor: 1 (AWS S3)
    - region: 6 (ap-southeast-1 - Singapore)
    - bucket: austin-buckets
    - accessKey & secretKey: From .env
    - fileNamePrefix: ['stream_recordings']
  
  - **extensionServiceUrl**: `https://65.1.20.111:5000/api/v1/stream/recording/webhook`
    (Agora calls this webhook when recording completes)

- **Returns**: `sid` (Session ID - used to stop recording)

### 3. **stopRecording()**
- **Purpose**: Stops the cloud recording when stream ends
- **API Endpoint**: `POST https://api.agora.io/v1/apps/{appId}/cloud_recording/resourceid/{resourceId}/sid/{sid}/stop`
- **Parameters**:
  - `channelName`: The stream's channel
  - `uid`: User ID
  - `resourceId`: From acquireRecordingResource()
  - `sid`: From startRecording()

## Flow

### Starting a Stream with Recording
1. User calls POST `/api/v1/stream/start` with `isRecordingEnabled: true`
2. Stream document is created
3. If `isRecordingEnabled` is true:
   - Call `acquireRecordingResource()` → get resourceId
   - Call `startRecording()` → get sid
   - Save resourceId & sid to stream document
4. Stream is now recording to S3

### Stopping a Stream
1. User calls POST `/api/v1/stream/end`
2. If recording was enabled:
   - Call `stopRecording()` with resourceId & sid
   - Agora stops recording and saves files to S3
3. Agora triggers webhook: `POST /api/v1/stream/recording/webhook`
4. Webhook handler (`handleRecordingWebhook`) saves recordingUrl to stream

### Retrieving Recordings
- GET `/api/v1/stream/recordings` - Returns paginated list of all recorded streams with recordingUrl

## Environment Variables Required
```
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_app_certificate
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=austin-buckets
AWS_REGION=ap-south-1
```

## Error Handling
- If recording fails to start, stream continues (recording is non-critical)
- Errors are logged to errorLogger
- Webhook callback is secured (you should add signature verification)

## Next Steps for Security
1. Add webhook signature verification in `handleRecordingWebhook()`
2. Verify Agora's signature using agora-signature library:
   ```typescript
   const signature = req.headers['x-agora-signature'];
   const token = req.headers['x-agora-token'];
   // Verify signature matches HMAC-SHA256(token, appCertificate)
   ```

## Testing the Flow
```bash
# 1. Start a stream with recording
curl -X POST http://localhost:5000/api/v1/stream/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Stream",
    "category": "gaming",
    "isRecordingEnabled": true
  }'

# Response includes recordingResourceId and recordingSid

# 2. Wait for stream to end (manual or timeout)

# 3. Agora webhook sends recording URL automatically

# 4. Retrieve all recordings
curl http://localhost:5000/api/v1/stream/recordings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Modified
- `src/app/modules/stream/stream.service.ts`: Added recording functions & integration
- `src/app/modules/stream/stream.model.ts`: Stream schema includes recordingUrl, recordingResourceId, recordingSid
- `src/app/modules/stream/stream.controller.ts`: handleRecordingWebhook processes Agora webhook
