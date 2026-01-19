# Live Streaming Implementation Guide

## Frontend Integration Steps

### 1. Install Agora RTC SDK

```bash
npm install agora-rtc-sdk-ng
# or for React
npm install agora-react-uikit agora-rtc-sdk-ng
```

### 2. Request Agora Token from Backend

```javascript
import axios from 'axios';

async function getStreamToken(streamId, userId, role = 'subscriber') {
  try {
    const response = await axios.get(`/api/v1/stream/${streamId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    return response.data.data.agora;
  } catch (error) {
    console.error('Failed to get stream token:', error);
  }
}
```

### 3. Join Agora Stream (for Viewers)

```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

async function joinStream(streamId, userId) {
  const agoraData = await getStreamToken(streamId, userId, 'subscriber');
  
  const client = AgoraRTC.createClient({ 
    mode: 'live', 
    codec: 'h264' 
  });

  try {
    // Join the channel
    await client.join(
      agoraData.agora.appId, // Get from config
      agoraData.channelName,
      agoraData.token,
      agoraData.uid
    );

    // Subscribe to remote stream
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        const videoTrack = user.videoTrack;
        videoTrack.play('video-container');
      }
      
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    });

    console.log('Successfully joined stream');
  } catch (error) {
    console.error('Failed to join stream:', error);
  }
}
```

### 4. Start Broadcasting (for Streamers)

```javascript
async function startBroadcast(streamData) {
  // Start stream on backend
  const response = await axios.post('/api/v1/stream/start', streamData, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const stream = response.data.data;
  const agoraData = stream.agora;

  const client = AgoraRTC.createClient({ 
    mode: 'live', 
    codec: 'h264' 
  });

  try {
    // Join as publisher
    await client.join(
      agoraData.appId,
      agoraData.channelName,
      agoraData.token,
      agoraData.uid
    );

    // Publish local video
    const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

    await client.publish([localVideoTrack, localAudioTrack]);

    console.log('Broadcasting started');

    return {
      client,
      localVideoTrack,
      localAudioTrack,
      streamId: stream._id
    };
  } catch (error) {
    console.error('Failed to start broadcast:', error);
  }
}
```

### 5. Setup Socket.io for Real-time Chat

```javascript
import { io } from 'socket.io-client';

const socket = io('http://your-server:6002');

// Join stream
socket.emit('stream:join', {
  streamId: streamId,
  userId: userId
});

// Listen for new messages
socket.on('stream:message', (message) => {
  console.log(`${message.sender.name}: ${message.content}`);
  // Update UI with new message
});

// Send message
function sendChatMessage(streamId, content) {
  socket.emit('stream:chat', {
    streamId: streamId,
    userId: userId,
    content: content
  });
}

// Send gift
function sendGift(streamId, giftId, amount) {
  socket.emit('stream:gift', {
    streamId: streamId,
    userId: userId,
    giftId: giftId,
    amount: amount
  });
}

// Send emoji reaction
function sendEmoji(streamId, emoji) {
  socket.emit('stream:emoji', {
    streamId: streamId,
    userId: userId,
    emoji: emoji
  });

  // Listen for emoji reactions
  socket.on('stream:emoji-reaction', (data) => {
    console.log(`${data.emoji} reaction received`);
  });
}

// Like stream
function likeStream(streamId) {
  socket.emit('stream:like', {
    streamId: streamId,
    userId: userId
  });
}

// Leave stream
function leaveStream(streamId) {
  socket.emit('stream:leave', {
    streamId: streamId,
    userId: userId
  });
}
```

### 6. Complete React Component Example

```jsx
import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';
import axios from 'axios';

const LiveStream = ({ streamId, userId, authToken, isStreamer = false }) => {
  const [client, setClient] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    const setupSocket = () => {
      const newSocket = io('http://localhost:6002');

      newSocket.emit('stream:join', {
        streamId: streamId,
        userId: userId
      });

      newSocket.on('stream:message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('stream:viewer-count', (data) => {
        setViewers(data.count);
      });

      setSocket(newSocket);
    };

    setupSocket();

    return () => {
      socket?.emit('stream:leave', {
        streamId: streamId,
        userId: userId
      });
      socket?.disconnect();
    };
  }, [streamId, userId]);

  useEffect(() => {
    const setupAgora = async () => {
      try {
        const response = await axios.get(`/api/v1/stream/${streamId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const stream = response.data.data;
        const agoraClient = AgoraRTC.createClient({ 
          mode: 'live', 
          codec: 'h264' 
        });

        if (isStreamer) {
          // Publisher setup
          await agoraClient.join(
            'YOUR_AGORA_APP_ID',
            stream.agora.channelName,
            stream.agora.token,
            stream.agora.uid
          );

          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

          await agoraClient.publish([videoTrack, audioTrack]);

          setLocalVideoTrack(videoTrack);
          setLocalAudioTrack(audioTrack);
          
          videoTrack.play('local-video');
        } else {
          // Subscriber setup
          await agoraClient.join(
            'YOUR_AGORA_APP_ID',
            stream.agora.channelName,
            stream.agora.token,
            stream.agora.uid
          );

          agoraClient.on('user-published', async (user, mediaType) => {
            await agoraClient.subscribe(user, mediaType);

            if (mediaType === 'video') {
              user.videoTrack.play('remote-video');
            }
            if (mediaType === 'audio') {
              user.audioTrack.play();
            }
          });
        }

        setClient(agoraClient);
      } catch (error) {
        console.error('Setup error:', error);
      }
    };

    setupAgora();

    return () => {
      if (client) {
        localVideoTrack?.close();
        localAudioTrack?.close();
        client.leave();
      }
    };
  }, [streamId, authToken, isStreamer]);

  const handleSendMessage = (content) => {
    socket?.emit('stream:chat', {
      streamId: streamId,
      userId: userId,
      content: content
    });
  };

  const handleSendGift = (giftId, amount) => {
    socket?.emit('stream:gift', {
      streamId: streamId,
      userId: userId,
      giftId: giftId,
      amount: amount
    });
  };

  const handleEndStream = async () => {
    try {
      await axios.post(`/api/v1/stream/${streamId}/end`, {}, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('Stream ended');
    } catch (error) {
      console.error('Failed to end stream:', error);
    }
  };

  return (
    <div className="live-stream-container">
      <div className="video-container">
        <div id="local-video" style={{ width: '100%', height: '500px' }} />
        <div id="remote-video" style={{ width: '100%', height: '500px' }} />
      </div>

      <div className="viewer-count">
        👁️ {viewers} viewers
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className="message">
              <strong>{msg.sender.name}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Send a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>

      {isStreamer && (
        <button onClick={handleEndStream} className="end-stream-btn">
          End Stream
        </button>
      )}
    </div>
  );
};

export default LiveStream;
```

---

## Backend Environment Setup

Add these to your `.env` file:

```env
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Socket.io Configuration
SOCKET_PORT=6002

# Database
DATABASE_URL=mongodb://your_database_url

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE_IN=7d
```

---

## Testing the API

### Using Postman

1. **Start a Stream**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/stream/start`
   - Headers: `Authorization: Bearer {token}`
   - Body:
     ```json
     {
       "title": "Test Stream",
       "description": "Testing live streaming",
       "category": "507f1f77bcf86cd799439013",
       "allowComments": true,
       "allowGifts": true
     }
     ```

2. **Get Stream Details**
   - Method: GET
   - URL: `http://localhost:5000/api/v1/stream/{streamId}`

3. **Get Live Streams**
   - Method: GET
   - URL: `http://localhost:5000/api/v1/stream/live?page=1&limit=20`

4. **End Stream**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/stream/{streamId}/end`
   - Headers: `Authorization: Bearer {token}`

---

## Troubleshooting

### Stream Won't Start
- Verify Agora credentials are correct
- Check network connectivity
- Ensure user is authenticated

### Chat Messages Not Appearing
- Verify Socket.io connection is established
- Check browser console for errors
- Ensure stream exists and is live

### Video Not Playing
- Verify Agora token is valid (not expired)
- Check camera/microphone permissions
- Ensure channel name matches

### Token Expired
- Tokens are valid for 1 hour
- Request new token when needed
- Implement token refresh logic in frontend

---

## Security Best Practices

1. **Always validate authentication** before streaming
2. **Implement rate limiting** for API endpoints
3. **Validate all user input** for chat messages
4. **Use HTTPS** in production
5. **Implement content moderation** for large audiences
6. **Log all stream activities** for audit trails
7. **Implement age verification** for restricted content
8. **Use strong encryption** for sensitive data

---

## Monitoring and Analytics

Track these metrics:
- Peak concurrent viewers
- Average viewer engagement
- Chat message volume
- Gift revenue
- Stream uptime
- Network bandwidth usage

Use the StreamAnalytics model to store historical data.

---

## Performance Optimization Tips

1. Implement viewer count updates batching
2. Use CDN for stream thumbnails
3. Implement message pagination for chat history
4. Cache frequently accessed streams
5. Use database indexes on common queries
6. Implement compression for data transfer
7. Use lazy loading for stream history

---

## Next Steps

1. Implement Category model for stream categorization
2. Add Gift model for gift system
3. Implement stream monetization
4. Add subscription tiers
5. Create admin moderation tools
6. Implement stream recording
7. Add video encoding for multiple bitrates
