import { z } from 'zod';

const addCommentSchema = z.object({
  body: z.object({
    text: z
      .string({ required_error: 'Comment text is required' })
      .min(1)
      .max(1000),
  }),
});

export const MomentValidation = {
  addCommentSchema,
};
