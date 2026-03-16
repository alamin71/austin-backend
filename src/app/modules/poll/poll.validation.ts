import { z } from 'zod';

export const createPollSchema = z.object({
     body: z.object({
          question: z.string().trim().min(1).max(200),
          description: z.string().trim().max(1000).optional(),
          image: z.string().url().optional(),
          options: z.preprocess(
               (value) => {
                    if (Array.isArray(value)) return value;
                    if (typeof value === 'string') {
                         try {
                              const parsed = JSON.parse(value);
                              return Array.isArray(parsed) ? parsed : value.split(',');
                         } catch {
                              return value.split(',');
                         }
                    }

                    return value;
               },
               z
                    .array(z.string().trim().min(1).max(100))
                    .min(2)
                    .max(10),
          ),
          allowMultipleVotes: z.preprocess(
               (value) => {
                    if (typeof value === 'boolean') return value;
                    if (typeof value === 'string') {
                         return value.toLowerCase() === 'true';
                    }
                    return false;
               },
               z.boolean().optional().default(false),
          ),
     }),
});

export const votePollSchema = z.object({
     body: z.object({
          optionIndex: z.preprocess(
               (value) => {
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string' && value.trim() !== '') {
                         return Number(value);
                    }
                    return value;
               },
               z.number().int().min(0),
          ),
     }),
});

export const addPollOptionSchema = z.object({
     body: z.object({
          option: z.string().trim().min(1).max(100),
     }),
});

export const deletePollOptionSchema = z.object({
     body: z.object({
          optionIndex: z.preprocess(
               (value) => {
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string' && value.trim() !== '') {
                         return Number(value);
                    }
                    return value;
               },
               z.number().int().min(0),
          ),
     }),
});
