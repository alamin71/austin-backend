import { z } from 'zod';

export const startStreamSchema = z.object({
     body: z.object({
          title: z.string({ required_error: 'Title is required' }).min(1).max(200),
          description: z.string().max(1000).optional(),
          category: z.string({ required_error: 'Category is required' }),
          contentRating: z
               .enum(['G', 'PG', 'PG-13', 'R', '18+'], {
                    errorMap: () => ({ message: 'Invalid content rating' }),
               })
               .optional(),
          banner: z.string().url().optional(),
          bannerPosition: z.enum(['top', 'bottom', 'center']).optional(),
          visibility: z.enum(['public', 'followers', 'subscribers']).optional(),
          allowComments: z.boolean().optional(),
          allowGifts: z.boolean().optional(),
          enablePolls: z.boolean().optional(),
          enableAdBanners: z.boolean().optional(),
          isAgeRestricted: z.boolean().optional(),
          isRecordingEnabled: z.boolean().optional(),
          background: z.string().optional(),
          tags: z.array(z.string()).optional(),
     }),
});

export const updateStreamSettingsSchema = z.object({
     body: z.object({
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(1000).optional(),
          allowComments: z.boolean().optional(),
          allowGifts: z.boolean().optional(),
          enablePolls: z.boolean().optional(),
          enableAdBanners: z.boolean().optional(),
     }),
});

export const toggleStreamControlsSchema = z.object({
     body: z.object({
          cameraOn: z.boolean().optional(),
          micOn: z.boolean().optional(),
          background: z.string().optional(),
     }),
});

export const sendChatMessageSchema = z.object({
     body: z.object({
          content: z.string({ required_error: 'Content is required' }).min(1).max(500),
          type: z.enum(['text', 'emoji', 'gift']).optional(),
     }),
});

export const searchStreamsSchema = z.object({
     query: z.object({
          q: z.string({ required_error: 'Search query is required' }),
          page: z.string().optional(),
          limit: z.string().optional(),
     }),
});

export type StartStreamInput = z.infer<typeof startStreamSchema>;
export type UpdateStreamSettingsInput = z.infer<
     typeof updateStreamSettingsSchema
>;
export type ToggleStreamControlsInput = z.infer<
     typeof toggleStreamControlsSchema
>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type SearchStreamsInput = z.infer<typeof searchStreamsSchema>;
