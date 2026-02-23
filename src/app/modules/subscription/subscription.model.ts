import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionTier {
  name: string;
  slug: 'basic' | 'standard' | 'premium';
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  badge: {
    icon: string;
    displayName: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  streamerId: mongoose.Types.ObjectId;
  tier: mongoose.Types.ObjectId;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  paymentMethod: 'iap_ios' | 'iap_android' | 'stripe';
  transactionId: string;
  iapReceiptToken?: string;
  stripeSubscriptionId?: string;
  renewalAttempts: number;
  lastRenewalDate?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Tier Schema - Admin creates/manages tiers
const subscriptionTierSchema = new Schema<ISubscriptionTier>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    features: [String],
    badge: {
      icon: String,
      displayName: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Subscription Schema - User subscriptions
const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionTier',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending'],
      default: 'pending',
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      enum: ['iap_ios', 'iap_android', 'stripe'],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    iapReceiptToken: String,
    stripeSubscriptionId: String,
    renewalAttempts: {
      type: Number,
      default: 0,
    },
    lastRenewalDate: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ userId: 1, streamerId: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
subscriptionTierSchema.index({ isActive: 1 });

export const SubscriptionTier = mongoose.model<ISubscriptionTier>(
  'SubscriptionTier',
  subscriptionTierSchema
);
export const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema
);
