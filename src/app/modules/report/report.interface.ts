import { Types } from 'mongoose';

export type ReportType = 'stream' | 'profile' | 'post';

export type ReportReason =
  | 'inappropriate_content'
  | 'harassment'
  | 'nudity'
  | 'violence'
  | 'spam'
  | 'impersonation'
  | 'illegal_activity';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface IReport {
  _id?: Types.ObjectId;
  reporter: Types.ObjectId;
  reportType: ReportType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
