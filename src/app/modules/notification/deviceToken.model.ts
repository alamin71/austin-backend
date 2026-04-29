import { Schema, model, Types } from 'mongoose';

interface IDeviceToken {
     _id?: Types.ObjectId;
     user: Types.ObjectId;
     deviceToken: string;
     deviceType: 'android' | 'ios' | 'web';
     deviceName?: string;
     isActive: boolean;
     createdAt?: Date;
     updatedAt?: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          deviceToken: {
               type: String,
               required: true,
               unique: true,
               trim: true,
          },
          deviceType: {
               type: String,
               enum: ['android', 'ios', 'web'],
               required: true,
          },
          deviceName: {
               type: String,
               trim: true,
          },
          isActive: {
               type: Boolean,
               default: true,
          },
     },
     {
          timestamps: true,
     },
);

// Index for faster queries
deviceTokenSchema.index({ user: 1, isActive: 1 });
deviceTokenSchema.index({ deviceToken: 1 });

export const DeviceToken = model<IDeviceToken>('DeviceToken', deviceTokenSchema);
export type { IDeviceToken };
