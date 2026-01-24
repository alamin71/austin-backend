import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import config from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
     region: config.aws_region || 'ap-southeast-1',
     credentials: {
          accessKeyId: config.aws_access_key_id || '',
          secretAccessKey: config.aws_secret_access_key || '',
     },
});

export const uploadFileToS3 = async (file: Express.Multer.File, folder: string = 'uploads'): Promise<string> => {
     if (!file) return '';

     const key = `${folder}/${uuidv4()}-${Date.now()}-${file.originalname}`;

     const params = {
          Bucket: config.aws_s3_bucket_name,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
     };

     try {
          await s3Client.send(new PutObjectCommand(params));
          const fileUrl = `https://${config.aws_s3_bucket_name}.s3.${config.aws_region}.amazonaws.com/${key}`;
          return fileUrl;
     } catch (error) {
          console.error('S3 upload error:', error);
          throw error;
     }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
     if (!fileUrl) return;

     try {
          const key = fileUrl.split('.com/')[1];
          const params = {
               Bucket: config.aws_s3_bucket_name,
               Key: key,
          };
          await s3Client.send(new DeleteObjectCommand(params));
     } catch (error) {
          console.error('S3 delete error:', error);
     }
};
