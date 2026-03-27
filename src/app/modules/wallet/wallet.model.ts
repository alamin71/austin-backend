import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  featherBalance: number;
  cashBalance: number;
  pendingCashBalance: number;
  totalFeathersEarned: number;
  totalFeathersSpent: number;
  totalCashEarned: number;
  totalCashSpent: number;
  totalCashWithdrawn: number;
  balance?: number; // Legacy mixed balance (deprecated)
  totalEarned?: number; // Legacy mixed total (deprecated)
  totalSpent?: number; // Legacy mixed total (deprecated)
  totalWithdrawn?: number; // Legacy mixed total (deprecated)
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type:
    | 'gift_received'
    | 'gift_sent'
    | 'feather_purchase'
    | 'withdrawal'
    | 'subscription'
    | 'subscription_earning'
    | 'subscription_commission'
    | 'platform_commission'
    | 'feather_conversion';
  amount: number;
  description: string;
  streamerId?: mongoose.Types.ObjectId;
  transactionId?: string; // Stripe/IAP transaction ID
  status: 'completed' | 'pending' | 'failed';
  metadata?: any; // Additional data
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeatherPackage extends Document {
  name: string;
  featherAmount: number;
  priceUSD: number;
  bonus?: number; // Bonus feathers
  discount?: number; // Percentage discount
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Wallet Schema - Track user balances
const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    featherBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingCashBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFeathersEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFeathersSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCashEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCashSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCashWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Legacy fields for older clients
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Wallet Transaction Schema - Track all money movements
const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'gift_received',
        'gift_sent',
        'feather_purchase',
        'withdrawal',
        'subscription',
        'subscription_earning',
        'subscription_commission',
        'platform_commission',
        'feather_conversion',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    transactionId: String,
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
      index: true,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Feather Package Schema - Admin creates purchase options
const featherPackageSchema = new Schema<IFeatherPackage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g., "1200 Feathers Pack", "25000 Feathers Mega Pack"
    },
    featherAmount: {
      type: Number,
      required: true,
      min: 100,
    },
    priceUSD: {
      type: Number,
      required: true,
      min: 0.99,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
walletTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });
featherPackageSchema.index({ isActive: 1, order: 1 });

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  walletTransactionSchema
);
export const FeatherPackage = mongoose.model<IFeatherPackage>(
  'FeatherPackage',
  featherPackageSchema
);
