import { Types } from 'mongoose';
import { Notification } from './notification.model.js';

export class NotificationService {
     static async createNotification(
          userId: string,
          type: string,
          content: string,
          relatedUser?: string,
          relatedId?: string,
          actionUrl?: string,
          icon?: string,
     ) {
          try {
               const notification = await Notification.create({
                    user: new Types.ObjectId(userId),
                    type,
                    content,
                    relatedUser: relatedUser ? new Types.ObjectId(relatedUser) : null,
                    relatedId: relatedId ? new Types.ObjectId(relatedId) : null,
                    read: false,
                    actionUrl,
                    icon,
               });

               return notification;
          } catch (error) {
               console.error('Error creating notification:', error);
               return null;
          }
     }

     static async getNotifications(userId: string, limit = 20, skip = 0) {
          const notifications = await Notification.find({ user: userId })
               .populate('relatedUser', 'name userName image')
               .sort({ createdAt: -1 })
               .limit(limit)
               .skip(skip);

          const total = await Notification.countDocuments({ user: userId });

          return { notifications, total };
     }

     static async getUnreadCount(userId: string) {
          const count = await Notification.countDocuments({
               user: userId,
               read: false,
          });

          return { unreadCount: count };
     }

     static async markAsRead(notificationId: string) {
          const notification = await Notification.findByIdAndUpdate(
               notificationId,
               { read: true },
               { new: true },
          );

          return notification;
     }

     static async markAllAsRead(userId: string) {
          await Notification.updateMany(
               { user: userId, read: false },
               { read: true },
          );

          return { message: 'All notifications marked as read' };
     }

     static async deleteNotification(notificationId: string) {
          await Notification.findByIdAndDelete(notificationId);
          return { message: 'Notification deleted' };
     }

     static async clearAllNotifications(userId: string) {
          await Notification.deleteMany({ user: userId });
          return { message: 'All notifications cleared' };
     }
}
