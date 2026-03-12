import { z } from 'zod';

const sendMessageZodSchema = z.object({
     body: z.object({
          message: z.string().optional(),
          type: z.enum(['text', 'image', 'file']).optional(),
          mediaUrl: z.string().optional(),
          replyToId: z.string().optional(),
     }),
});

const updateStatusZodSchema = z.object({
     body: z.object({
          status: z.enum(['open', 'in-progress', 'closed'], {
               required_error: 'Status is required',
          }),
     }),
});

export const CustomerSupportValidation = {
     sendMessageZodSchema,
     updateStatusZodSchema,
};
