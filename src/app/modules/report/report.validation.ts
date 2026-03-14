import { z } from 'zod';

const REASONS = [
  'inappropriate_content',
  'harassment',
  'nudity',
  'violence',
  'spam',
  'impersonation',
  'illegal_activity',
] as const;

const createReportSchema = z.object({
  body: z.object({
    // Accept either API enum key or UI label text. Service layer normalizes it.
    reason: z.string({ required_error: 'Reason is required' }).min(1),
    details: z.string().max(1000).optional(),
  }),
});

const updateReportStatusSchema = z.object({
  body: z.object({
    status: z.enum(['reviewed', 'resolved', 'dismissed']),
  }),
});

export const ReportValidation = {
  createReportSchema,
  updateReportStatusSchema,
};
