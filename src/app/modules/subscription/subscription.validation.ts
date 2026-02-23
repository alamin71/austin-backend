import { z } from 'zod';

export const subscriptionValidation = {
  createTierSchema: z.object({
    body: z.object({
      name: z.string().min(1, 'Tier name is required'),
      slug: z.enum(['basic', 'standard', 'premium']),
      price: z.number().positive('Price must be positive'),
      billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
      features: z.array(z.string()),
      badge: z.object({
        icon: z.string(),
        displayName: z.string(),
      }),
      isActive: z.boolean().default(true),
    }),
  }),

  createSubscriptionSchema: z.object({
    body: z.object({
      streamerId: z.string(),
      tierId: z.string(),
      platform: z.enum(['web', 'ios', 'android']),
      receiptData: z.string().optional(),
    }),
  }),

  iapSubscriptionSchema: z.object({
    body: z.object({
      streamerId: z.string(),
      tierId: z.string(),
      receiptData: z.string(),
      platform: z.enum(['ios', 'android']),
    }),
  }),

  confirmSubscriptionSchema: z.object({
    body: z.object({
      paymentIntentId: z.string(),
      stripeSubscriptionId: z.string(),
    }),
  }),

  cancelSubscriptionSchema: z.object({
    body: z.object({
      cancellationReason: z.string().optional(),
    }),
  }),
};
