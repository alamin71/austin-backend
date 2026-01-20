import { z } from 'zod';

export const createGiftSchema = z.object({
     body: z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          image: z.string().url(),
          animation: z.string().url().optional(),
          price: z.number().min(0),
          category: z.enum(['basic', 'premium', 'luxury', 'exclusive']),
          order: z.number().min(0).optional(),
     }),
});

export const updateGiftSchema = z.object({
     body: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          image: z.string().url().optional(),
          animation: z.string().url().optional(),
          price: z.number().min(0).optional(),
          category: z.enum(['basic', 'premium', 'luxury', 'exclusive']).optional(),
          isActive: z.boolean().optional(),
          order: z.number().min(0).optional(),
     }),
});

export const sendGiftSchema = z.object({
     body: z.object({
          giftId: z.string(),
          quantity: z.number().min(1).max(100).default(1),
          message: z.string().max(200).optional(),
          isAnonymous: z.boolean().default(false),
     }),
});
