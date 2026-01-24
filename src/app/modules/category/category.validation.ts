import { z } from 'zod';

export const createCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1, 'Title is required'),
          image: z.any().optional(), // File validation handled in controller
     }),
});

export const updateCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1).optional(),
          image: z.any().optional(), // File validation handled in controller
     }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
