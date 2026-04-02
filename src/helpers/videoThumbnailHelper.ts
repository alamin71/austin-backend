import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { uploadFileToS3 } from './s3Helper.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Download a file from a URL to a local path
 */
export async function downloadFile(url: string, dest: string): Promise<void> {
    const writer = fs.createWriteStream(dest);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * Generate a thumbnail from a video URL and upload to S3
 * @param videoUrl S3 video URL
 * @param s3Folder S3 folder to upload thumbnail
 * @returns S3 thumbnail URL
 */
export async function generateAndUploadThumbnail(videoUrl: string, s3Folder = 'thumbnails'): Promise<string> {
    const tempThumb = path.join('/tmp', uuidv4() + '.jpg');
    try {
        // Generate thumbnail directly from remote video (any format: mp4, m3u8, etc)
        await new Promise((resolve, reject) => {
            ffmpeg(videoUrl)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg thumbnail error:', err);
                    reject(err);
                })
                .screenshots({
                    timestamps: ['5'], // 5 seconds
                    filename: path.basename(tempThumb),
                    folder: path.dirname(tempThumb),
                    size: '320x240',
                });
        });
        // Read thumbnail file as buffer
        const buffer = fs.readFileSync(tempThumb);
        // Prepare fake multer file object for S3 helper
        const file = {
            originalname: path.basename(tempThumb),
            mimetype: 'image/jpeg',
            buffer,
        } as any;
        // Upload to S3
        const s3Url = await uploadFileToS3(file, s3Folder);
        return s3Url;
    } finally {
        // Cleanup temp files
        if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb);
    }
}
