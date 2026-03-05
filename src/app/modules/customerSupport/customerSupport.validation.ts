import { z } from 'zod';

const sendMessageZodSchema = z.object({
     body: z.object({
          message: z.string({ required_error: 'Message is required' }).min(1),
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
