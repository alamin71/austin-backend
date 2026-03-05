import { z } from 'zod';

const createFeedbackZodSchema = z.object({
     body: z.object({
          rating: z.number({ required_error: 'Rating is required' }).min(1).max(5),
          message: z.string({ required_error: 'Feedback message is required' }).min(1),
     }),
});

export const FeedbackValidation = {
     createFeedbackZodSchema,
};
