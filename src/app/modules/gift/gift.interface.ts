import { Types } from 'mongoose';

export interface IGift {
     _id?: Types.ObjectId;
     name: string;
     description?: string;
     image: string;
     animation?: string; // Lottie animation URL
     price: number; // Price in USD cents
     category: 'basic' | 'premium' | 'luxury' | 'exclusive';
     isActive: boolean;
     order: number; // Display order
     createdAt?: Date;
     updatedAt?: Date;
}

export interface IGiftTransaction {
     _id?: Types.ObjectId;
     sender: Types.ObjectId; // User who sent the gift
     receiver: Types.ObjectId; // Streamer who received the gift
     stream: Types.ObjectId; // Stream where gift was sent
     gift: Types.ObjectId; // Reference to the gift
     quantity: number;
     totalAmount: number; // Total price (price * quantity)
     message?: string; // Optional message with gift
     isAnonymous: boolean;
     status: 'pending' | 'completed' | 'refunded';
     createdAt?: Date;
     updatedAt?: Date;
}
