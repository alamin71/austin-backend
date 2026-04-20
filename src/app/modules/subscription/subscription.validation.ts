import { z } from 'zod';

const numberLikeSchema = z.preprocess((value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return value;
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return value;
}, z.number());

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

const slugSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return value;
}, z.enum(['supporter', 'premium', 'exclusive']));

const updateTierBodySchema = z
  .object({
    name: z.string().min(1, 'Tier name is required').optional(),
    slug: slugSchema.optional(),
    price: numberLikeSchema.positive('Price must be positive').optional(),
    billingPeriod: z.enum(['monthly', 'yearly']).optional(),
    features: z.array(z.string()).optional(),
    badge: z
      .object({
        icon: z.string().optional(),
        displayName: z.string().optional(),
      })
      .optional(),
    isActive: booleanLikeSchema.optional(),
  })
  .passthrough()
  .superRefine((body, ctx) => {
    const rawBody = body as Record<string, unknown>;
    const hasDeclaredField = [
      body.name,
      body.slug,
      body.price,
      body.billingPeriod,
      body.features,
      body.badge,
      body.isActive,
    ].some((value) => value !== undefined);

    const hasIndexedFeatures = Object.keys(rawBody).some((key) => /^features\[\d+\]$/.test(key));
    const hasBracketBadge =
      rawBody['badge[displayName]'] !== undefined || rawBody['badge[icon]'] !== undefined;

    if (!hasDeclaredField && !hasIndexedFeatures && !hasBracketBadge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one field to update',
      });
    }
  });

export const subscriptionValidation = {
  createTierSchema: z.object({
    body: z.object({
      name: z.string().min(1, 'Tier name is required'),
      slug: slugSchema,
      price: numberLikeSchema.positive('Price must be positive'),
      billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
      features: z.array(z.string()).optional(),
      badge: z
        .object({
          icon: z.string().optional(),
          displayName: z.string().optional(),
        })
        .optional(),
      isActive: booleanLikeSchema.default(true),
    }).passthrough(),
  }),

  updateTierSchema: z.object({
    body: updateTierBodySchema,
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
