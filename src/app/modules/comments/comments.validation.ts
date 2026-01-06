import { z } from 'zod';

const createCommentSchema = z.object({
     body: z.object({
          content: z.string().min(1, 'Content cannot be empty'),
     }),
});

export const CommentValidationSchema = {
     createCommentSchema,
};
