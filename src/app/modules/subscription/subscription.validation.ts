import { z } from 'zod';

export const subscriptionValidation = {
  createTierSchema: z.object({
    body: z.object({
      name: z.string().min(1, 'Tier name is required'),
      slug: z.enum(['supporter', 'premium', 'exclusive']),
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

  updateTierSchema: z.object({
    body: z.object({
      name: z.string().min(1, 'Tier name is required').optional(),
      slug: z.enum(['supporter', 'premium', 'exclusive']).optional(),
      price: z.number().positive('Price must be positive').optional(),
      billingPeriod: z.enum(['monthly', 'yearly']).optional(),
      features: z.array(z.string()).optional(),
      badge: z
        .object({
          icon: z.string().optional(),
          displayName: z.string().optional(),
        })
        .optional(),
      isActive: z.boolean().optional(),
    }),
  }),

  createSubscriptionSchema: z.object({
    body: z.object({
      streamerId: z.string(),
      tierId: z.string(),
      platform: z.literal('web'),
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

  iapSettlementWebhookSchema: z.object({
    body: z.object({
      transactionId: z.string().min(1),
      settlementStatus: z.enum(['released', 'failed']),
      storePayoutId: z.string().optional(),
      failureReason: z.string().optional(),
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
