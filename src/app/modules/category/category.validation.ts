import { z } from 'zod';

export const createCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1, 'Title is required'),
          slug: z.string().toLowerCase().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          order: z.string().optional(),
     }),
});

export const updateCategorySchema = z.object({
     body: z.object({
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          order: z.string().optional(),
     }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
