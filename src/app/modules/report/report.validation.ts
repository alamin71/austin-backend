import { z } from 'zod';

const createReportZodSchema = z.object({
     body: z.object({
          reason: z.array(z.string({ required_error: 'Reason is required' })),
     }),
});

export const ReportValidation = { createReportZodSchema };
