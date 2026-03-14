import { Schema, model } from 'mongoose';
import { IReport } from './report.interface.js';

const reportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportType: {
      type: String,
      enum: ['stream', 'profile', 'post'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        'inappropriate_content',
        'harassment',
        'nudity',
        'violence',
        'spam',
        'impersonation',
        'illegal_activity',
      ],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Prevent the same user from reporting the same target twice
reportSchema.index(
  { reporter: 1, reportType: 1, targetId: 1 },
  { unique: true },
);
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, targetId: 1 });

export const Report = model<IReport>('Report', reportSchema);
