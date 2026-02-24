import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
     ip_address: process.env.IP_ADDRESS || '0.0.0.0',
     port: Number(process.env.PORT) || 5000,
     socket_port: Number(process.env.SOCKET_PORT) || 6002,
     allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || '*',
     frontend_url: process.env.FONTEND_URL,
     backend_url: process.env.BACKEND_URL,
     reset_pass_expire_time: process.env.RESET_TOKEN_EXPIRE_TIME,
     database_url: process.env.DATABASE_URL,
     node_env: process.env.NODE_ENV,

     bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,

     jwt: {
          jwt_secret: process.env.JWT_SECRET,
          jwt_expire_in: process.env.JWT_EXPIRE_IN,
          jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
          jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
     },

     email: {
          email_header: process.env.EMAIL_HEADER_NAME,
          from: process.env.EMAIL_FROM,
          user: process.env.EMAIL_USER,
          port: process.env.EMAIL_PORT,
          host: process.env.EMAIL_HOST,
          pass: process.env.EMAIL_PASS,
     },

     // ✅ AWS S3 Configuration
     aws_region: process.env.AWS_REGION || 'ap-south-1',
     aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
     aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
     aws_s3_bucket_name: process.env.AWS_S3_BUCKET_NAME,

     express_sessoin: process.env.EXPRESS_SESSION_SECRET_KEY,
     social: {
          google_client_id: process.env.GOOGLE_CLIENT_ID,
          facebook_client_id: process.env.FACEBOOK_CLIENT_ID,
          google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
          facebook_client_secret: process.env.FACEBOOK_CLIENT_SECRET,
          callback_url: process.env.GOOGLE_CALLBACK_URL,
     },
     twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
     },
     stripe: {
          stripe_secret_key: process.env.STRIPE_SECRET_KEY,
          paymentSuccess_url: process.env.STRIPE_PAYMENT_SUCCESS_URL,
          stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
          stripe_webhook_url: process.env.STRIPE_WEBHOOK_URL,
          stripe_product_id: process.env.STRIPE_PRODUCT_ID,
     },
     agora: {
          app_id: process.env.AGORA_APP_ID,
          app_certificate: process.env.AGORA_APP_CERTIFICATE,
          customer_id: process.env.AGORA_CUSTOMER_ID,
          customer_secret: process.env.AGORA_CUSTOMER_SECRET,
          recording_callback_url: process.env.AGORA_RECORDING_CALLBACK_URL,
          storage_vendor: process.env.AGORA_STORAGE_VENDOR,
          storage_region: process.env.AGORA_STORAGE_REGION,
          storage_bucket: process.env.AGORA_STORAGE_BUCKET,
          storage_access_key: process.env.AGORA_STORAGE_ACCESS_KEY,
          storage_secret_key: process.env.AGORA_STORAGE_SECRET_KEY,
     },
     super_admin: {
          email: process.env.SUPER_ADMIN_EMAIL,
          password: process.env.SUPER_ADMIN_PASSWORD,
     },
};
