import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminPayout extends Document {
  adminUserId: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  payoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountHolderName?: string;
  };
  stripeDetails?: {
    accountId?: string;
  };
  paypalDetails?: {
    email?: string;
  };
  payoutDetails?: Record<string, any>;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  rejectionReason?: string;
  notes?: string;
  stripePayoutId?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminPayoutSchema = new Schema<IAdminPayout>(
  {
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 20, // Minimum $20 payout
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'stripe', 'paypal'],
      required: true,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountHolderName: String,
    },
    stripeDetails: {
      accountId: String,
    },
    paypalDetails: {
      email: String,
    },
    payoutDetails: {
      type: Schema.Types.Mixed,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    paidAt: Date,
    rejectionReason: String,
    notes: String,
    stripePayoutId: String,
    transactionId: String,
  },
  {
    timestamps: true,
  }
);

export const AdminPayout = mongoose.model<IAdminPayout>('AdminPayout', AdminPayoutSchema);
