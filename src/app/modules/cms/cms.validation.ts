import { z } from 'zod';

export const createFaqSchema = z.object({
     body: z.object({
          question: z.string().min(1, 'Question is required'),
          answer: z.string().min(1, 'Answer is required'),
     }),
});

export const updateFaqSchema = z.object({
     body: z.object({
          question: z.string().min(1).optional(),
          answer: z.string().min(1).optional(),
     }),
});

export const createStaticContentSchema = z.object({
     body: z.object({
          key: z.enum(['privacyPolicy', 'termsOfService', 'aboutUs']),
          content: z.string().min(1, 'Content is required'),
     }),
});

export const updateStaticContentSchema = z.object({
     body: z.object({
          content: z.string().min(1, 'Content is required'),
     }),
});
