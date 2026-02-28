import { Schema, model } from 'mongoose';

interface IStreamWarning {
     stream: Schema.Types.ObjectId;
     streamer: Schema.Types.ObjectId;
     admin: Schema.Types.ObjectId;
     reason: string;
     severity: 'warning' | 'critical' | 'violation';
     description: string;
     status: 'active' | 'resolved' | 'appealed';
     actionTaken?: string;
     createdAt?: Date;
     updatedAt?: Date;
}

const streamWarningSchema = new Schema<IStreamWarning>(
     {
          stream: {
               type: Schema.Types.ObjectId,
               ref: 'Stream',
               required: true,
          },
          streamer: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          admin: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          reason: {
               type: String,
               enum: [
                    'inappropriate_content',
                    'abusive_behavior',
                    'spam',
                    'copyright_violation',
                    'misleading_title',
                    'violent_content',
                    'other',
               ],
               required: true,
          },
          severity: {
               type: String,
               enum: ['warning', 'critical', 'violation'],
               default: 'warning',
          },
          description: {
               type: String,
               required: true,
          },
          status: {
               type: String,
               enum: ['active', 'resolved', 'appealed'],
               default: 'active',
          },
          actionTaken: {
               type: String,
          },
     },
     {
          timestamps: true,
     },
);

streamWarningSchema.index({ streamer: 1, createdAt: -1 });
streamWarningSchema.index({ stream: 1 });
streamWarningSchema.index({ status: 1 });

export const StreamWarning = model<IStreamWarning>(
     'StreamWarning',
     streamWarningSchema,
);
