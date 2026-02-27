import { Types } from 'mongoose';

export interface INotification {
     user: Types.ObjectId;
     type:
          | 'friend_request_sent'
          | 'friend_request_accepted'
          | 'friend_request_rejected'
          | 'friend_request_received'
          | 'subscription_purchased'
          | 'gift_received'
          | 'stream_live'
          | 'new_follower'
          | 'comment';
     content: string;
     relatedUser?: Types.ObjectId; // The user who triggered the notification (sender of request, gifter, etc)
     relatedId?: Types.ObjectId; // Related document ID (friend request ID, gift ID, etc)
     read: boolean;
     actionUrl?: string; // URL to navigate to (like /friend-requests or /user/:id)
     icon?: string; // Icon or avatar URL
     createdAt?: Date;
     updatedAt?: Date;
     _id?: Types.ObjectId;
}
