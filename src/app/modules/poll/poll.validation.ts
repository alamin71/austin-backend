import { z } from 'zod';

export const createPollSchema = z.object({
     body: z.object({
          question: z.string().min(1).max(200),
          options: z
               .array(z.string().min(1).max(100))
               .min(2)
               .max(10),
          duration: z.number().min(30).max(3600),
          allowMultipleVotes: z.boolean().default(false),
     }),
});

export const votePollSchema = z.object({
     body: z.object({
          optionIndex: z.number().min(0),
     }),
});
