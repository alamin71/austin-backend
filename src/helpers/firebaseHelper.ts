import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { errorLogger, logger } from '../shared/logger.js';
import config from '../config/index.js';

class FirebaseHelper {
     private static instance: admin.app.App | undefined;

     static initialize() {
          try {
               if (!this.instance) {
                    const serviceAccountPath = config.firebase?.service_account_path;

                    if (!serviceAccountPath) {
                         errorLogger.error('🚨 Firebase service account path not configured');
                         return;
                    }

                    const absolutePath = resolve(process.cwd(), serviceAccountPath);
                    logger.info(`📂 Loading Firebase credentials from: ${absolutePath}`);
                         // Verify file exists
                         try {
                              readFileSync(absolutePath, 'utf8');
                         } catch (fileError) {
                              errorLogger.error(`🚨 Firebase credentials file not found: ${absolutePath}`);
                              return;
                         }
                    const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));

                        // Safely check if apps exist
                        const existingApps = admin.apps || [];
                        if (!existingApps.length) {
                         this.instance = admin.initializeApp({
                              credential: admin.credential.cert(serviceAccount),
                              databaseURL: config.firebase?.database_url,
                         });
                         logger.info('✅ Firebase Admin SDK initialized successfully');
                              logger.info(`📊 Firebase Project: ${serviceAccount.project_id}`);
                    } else {
                         this.instance = admin.app();
                         logger.info('ℹ️  Firebase Admin SDK already initialized');
                    }
               }
          } catch (error) {
               errorLogger.error('🚨 Firebase initialization error:', error);
                   this.instance = undefined;
          }
     }

     static getInstance() {
          if (!this.instance) {
               this.initialize();
          }
              if (!this.instance) {
                   throw new Error('Firebase failed to initialize. Check service account credentials.');
              }
          return this.instance;
     }

     /**
      * Send push notification to single device
      */
     static async sendToDevice(
          deviceToken: string,
          title: string,
          body: string,
          data?: Record<string, string>,
          imageUrl?: string,
     ) {
          try {
                   // Ensure Firebase is initialized before sending
                   this.getInstance();
                   logger.info(`📊 Firebase Admin SDK Loaded:`, {
                        hasCredential: !!admin.credential,
                        hasApp: !!admin.app,
                        hasApps: !!admin.apps,
                        hasMessaging: !!admin.messaging,
                   });

               const message: admin.messaging.Message = {
                    token: deviceToken,
                    notification: {
                         title,
                         body,
                         imageUrl,
                    },
                    data: data || {},
                    android: {
                         priority: 'high',
                         notification: {
                              title,
                              body,
                              imageUrl,
                              channelId: 'default',
                              sound: 'default',
                              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                         },
                    },
                    apns: {
                         payload: {
                              aps: {
                                   alert: {
                                        title,
                                        body,
                                   },
                                   sound: 'default',
                                   badge: 1,
                              },
                         },
                    },
                    webpush: {
                         notification: {
                              title,
                              body,
                              icon: imageUrl,
                              badge: 'https://example.com/badge.png',
                              tag: 'notification',
                              requireInteraction: false,
                         },
                         data: data || {},
                    },
               };

               const response = await admin.messaging().send(message);
               logger.info(`Notification sent successfully: ${response}`);
               return { success: true, messageId: response };
          } catch (error) {
               errorLogger.error('Send to device error:', error);
               return { success: false, error };
          }
     }

     /**
      * Send push notification to multiple devices
      */
     static async sendToMultipleDevices(
          deviceTokens: string[],
          title: string,
          body: string,
          data?: Record<string, string>,
          imageUrl?: string,
     ) {
          try {
                   // Ensure Firebase is initialized before sending
                   this.getInstance();

               const message: admin.messaging.MulticastMessage = {
                    tokens: deviceTokens,
                    notification: {
                         title,
                         body,
                         imageUrl,
                    },
                    data: data || {},
                    android: {
                         priority: 'high',
                         notification: {
                              title,
                              body,
                              imageUrl,
                              channelId: 'default',
                              sound: 'default',
                         },
                    },
                    apns: {
                         payload: {
                              aps: {
                                   alert: {
                                        title,
                                        body,
                                   },
                                   sound: 'default',
                              },
                         },
                    },
                    webpush: {
                         notification: {
                              title,
                              body,
                              icon: imageUrl,
                              badge: 'https://example.com/badge.png',
                         },
                         data: data || {},
                    },
               };

               const response = await admin.messaging().sendEachForMulticast(message);

               logger.info(
                    `✅ Multicast notification sent to ${response.successCount} device(s), ${response.failureCount} failed`,
               );

               if (response.failureCount > 0) {
                    logger.warn(
                         `⚠️  Some devices failed: ${JSON.stringify(
                              response.responses
                                   .map((r, i) => ({
                                        index: i,
                                        success: r.success,
                                        error: r.error?.message,
                                   }))
                                   .filter((r) => !r.success),
                         )}`,
                    );
               }

               return {
                    success: true,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    responses: response.responses,
               };
          } catch (error) {
               errorLogger.error('❌ Send to multiple devices error:', error);
                   // Extract meaningful error message
                   let errorMessage = 'Unknown error';
                   if (error instanceof Error) {
                        errorMessage = error.message;
                   } else if (typeof error === 'object' && error !== null) {
                        errorMessage = JSON.stringify(error);
                   }
                   logger.error(`📊 Firebase Error Details: ${errorMessage}`);
               return { success: false, error };
          }
     }

     /**
      * Send to topic
      */
     static async sendToTopic(
          topic: string,
          title: string,
          body: string,
          data?: Record<string, string>,
          imageUrl?: string,
     ) {
          try {
                   // Ensure Firebase is initialized before sending
                   this.getInstance();

               const message: admin.messaging.Message = {
                    topic,
                    notification: {
                         title,
                         body,
                         imageUrl,
                    },
                    data: data || {},
                    android: {
                         priority: 'high',
                         notification: {
                              title,
                              body,
                              imageUrl,
                              channelId: 'default',
                              sound: 'default',
                         },
                    },
                    apns: {
                         payload: {
                              aps: {
                                   alert: {
                                        title,
                                        body,
                                   },
                                   sound: 'default',
                              },
                         },
                    },
               };

               const response = await admin.messaging().send(message);
               logger.info(`Topic notification sent to ${topic}: ${response}`);
               return { success: true, messageId: response };
          } catch (error) {
               errorLogger.error('Send to topic error:', error);
               return { success: false, error };
          }
     }

     /**
      * Subscribe device to topic
      */
     static async subscribeToTopic(deviceTokens: string[], topic: string) {
          try {
               const response = await admin.messaging().subscribeToTopic(deviceTokens, topic);
               logger.info(`Subscribed ${deviceTokens.length} devices to topic ${topic}`);
               return { success: true };
          } catch (error) {
               errorLogger.error('Subscribe to topic error:', error);
               return { success: false, error };
          }
     }

     /**
      * Unsubscribe device from topic
      */
     static async unsubscribeFromTopic(deviceTokens: string[], topic: string) {
          try {
               const response = await admin.messaging().unsubscribeFromTopic(
                    deviceTokens,
                    topic,
               );
               logger.info(`Unsubscribed ${deviceTokens.length} devices from topic ${topic}`);
               return { success: true };
          } catch (error) {
               errorLogger.error('Unsubscribe from topic error:', error);
               return { success: false, error };
          }
     }
}

export default FirebaseHelper;
