import { z } from 'zod';

export const createCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1, 'Title is required'),
          slug: z.string().toLowerCase().optional(),
          description: z.string().optional(),
          image: z.string({ required_error: 'Image is required' }),
          icon: z.string().url().optional(),
          order: z.number().int().optional(),
     }),
});

export const updateCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          image: z.string().url().optional(),
          icon: z.string().url().optional(),
          isActive: z.boolean().optional(),
          order: z.number().int().optional(),
     }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
