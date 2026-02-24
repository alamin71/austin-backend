import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Subscription, SubscriptionTier, ISubscriptionTier } from './subscription.model.js';
import { User } from '../user/user.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import config from '../../../config/index.js';
import Stripe from 'stripe';

const stripe = new Stripe((config.stripe as any)?.stripe_secret_key || '');

class SubscriptionService {
  /**
   * ==================== ADMIN: Subscription Tier Management ====================
   */

  /**
   * Create new subscription tier (Admin only)
   */
  static async createSubscriptionTier(tierData: Partial<ISubscriptionTier>) {
    try {
      // Check if tier already exists
      const existingTier = await SubscriptionTier.findOne({ slug: tierData.slug });
      if (existingTier) {
        throw new AppError(StatusCodes.CONFLICT, `Tier '${tierData.slug}' already exists`);
      }

      const tier = await SubscriptionTier.create(tierData);
      logger.info(`✓ Subscription tier created: ${tier.name} (${tier.slug})`);
      return tier;
    } catch (error) {
      errorLogger.error('Create subscription tier error', error);
      throw error;
    }
  }

  /**
   * Get all subscription tiers (for display)
   */
  static async getAllSubscriptionTiers(includeInactive = false) {
    try {
      const query = includeInactive ? {} : { isActive: true };
      const tiers = await SubscriptionTier.find(query).sort({ price: 1 });
      return tiers;
    } catch (error) {
      errorLogger.error('Get subscription tiers error', error);
      throw error;
    }
  }

  /**
   * Update subscription tier (Admin only)
   */
  static async updateSubscriptionTier(tierId: string, updateData: Partial<ISubscriptionTier>) {
    try {
      const tier = await SubscriptionTier.findByIdAndUpdate(tierId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!tier) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Subscription tier not found');
      }

      logger.info(`✓ Subscription tier updated: ${tier.name}`);
      return tier;
    } catch (error) {
      errorLogger.error('Update subscription tier error', error);
      throw error;
    }
  }

  /**
   * Delete subscription tier (Admin only)
   */
  static async deleteSubscriptionTier(tierId: string) {
    try {
      const tier = await SubscriptionTier.findByIdAndDelete(tierId);

      if (!tier) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Subscription tier not found');
      }

      logger.info(`✓ Subscription tier deleted: ${tier.name}`);
      return { message: 'Subscription tier deleted successfully' };
    } catch (error) {
      errorLogger.error('Delete subscription tier error', error);
      throw error;
    }
  }

  /**
   * ==================== USER: Subscription Management ====================
   */

  /**
   * Create subscription with Stripe (Web)
   */
  static async createStripeSubscription(
    userId: string,
    streamerId: string,
    tierId: string
  ) {
    try {
      const user = await User.findById(userId);
      const streamer = await User.findById(streamerId);
      const tier = await SubscriptionTier.findById(tierId);

      if (!user || !streamer || !tier) {
        throw new AppError(StatusCodes.NOT_FOUND, 'User, streamer, or tier not found');
      }

      // Check if already subscribed to this streamer
      const existingSub = await Subscription.findOne({
        userId,
        streamerId,
        status: 'active',
      });

      if (existingSub) {
        throw new AppError(StatusCodes.CONFLICT, 'Already subscribed to this streamer');
      }

      // Create Stripe customer if not exists
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await User.findByIdAndUpdate(userId, { stripeCustomerId });
      }

      // Create a payment intent for subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(tier.price * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomerId,
        metadata: {
          userId,
          streamerId,
          tierId: tierId,
        },
      });

      logger.info(`✓ Stripe payment intent created for subscription: ${paymentIntent.id}`);
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      errorLogger.error('Create Stripe subscription error', error);
      throw error;
    }
  }

  /**
   * Verify and create IAP subscription (iOS/Android)
   */
  static async verifyAndCreateIAPSubscription(
    userId: string,
    streamerId: string,
    tierId: string,
    receiptData: string,
    platform: 'ios' | 'android'
  ) {
    try {
      const tier = await SubscriptionTier.findById(tierId);
      if (!tier) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Subscription tier not found');
      }

      // Verify receipt with Apple/Google
      let isValid = false;
      let transactionId = '';

      if (platform === 'ios') {
        // TODO: Verify with App Store Server API
        // For now, we'll just validate the receipt format
        isValid = !!(receiptData && receiptData.length > 0);
        transactionId = `ios_${Date.now()}`;
      } else if (platform === 'android') {
        // TODO: Verify with Google Play Billing API
        isValid = !!(receiptData && receiptData.length > 0);
        transactionId = `android_${Date.now()}`;
      }

      if (!isValid) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid IAP receipt');
      }

      // Create subscription record
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subscription = await Subscription.create({
        userId,
        streamerId,
        tier: tierId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        paymentMethod: platform === 'ios' ? 'iap_ios' : 'iap_android',
        transactionId,
        iapReceiptToken: receiptData,
      });

      // Add subscriber badge to user
      await User.findByIdAndUpdate(userId, {
        $push: {
          badges: {
            type: 'subscriber',
            icon: tier.badge.icon,
            displayName: tier.badge.displayName,
            earnedAt: new Date(),
            expiresAt: periodEnd,
          },
        },
      });

      logger.info(`✓ IAP subscription created: ${userId} → ${streamerId} (${platform})`);
      return subscription;
    } catch (error) {
      errorLogger.error('Verify and create IAP subscription error', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe subscription (called after payment success)
   */
  static async confirmStripeSubscription(
    paymentIntentId: string,
    stripeSubscriptionId: string
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Payment not completed');
      }

      const userId = paymentIntent.metadata.userId;
      const streamerId = paymentIntent.metadata.streamerId;
      const tierId = paymentIntent.metadata.tierId;

      const tier = await SubscriptionTier.findById(tierId);

      // Create subscription record
      const now = new Date();
      const periodEnd = (tier as any).billingPeriod === 'monthly' 
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const subscription = await Subscription.create({
        userId,
        streamerId,
        tier: tierId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        paymentMethod: 'stripe',
        transactionId: paymentIntentId,
        stripeSubscriptionId,
      });

      // Add badge
      await User.findByIdAndUpdate(userId, {
        $push: {
          badges: {
            type: 'subscriber',
            icon: (tier as any).badge.icon,
            displayName: (tier as any).badge.displayName,
            earnedAt: new Date(),
            expiresAt: periodEnd,
          },
        },
      });

      logger.info(`✓ Stripe subscription confirmed: ${userId} → ${streamerId}`);
      return subscription;
    } catch (error) {
      errorLogger.error('Confirm Stripe subscription error', error);
      throw error;
    }
  }

  /**
   * Check if user is subscribed to streamer
   */
  static async isSubscribed(userId: string, streamerId: string): Promise<boolean> {
    try {
      const subscription = await Subscription.findOne({
        userId,
        streamerId,
        status: 'active',
        currentPeriodEnd: { $gt: new Date() },
      });

      return !!subscription;
    } catch (error) {
      errorLogger.error('Check subscription error', error);
      return false;
    }
  }

  /**
   * Get user's subscriptions
   */
  static async getUserSubscriptions(userId: string) {
    try {
      const subscriptions = await Subscription.find({ userId })
        .populate('tier')
        .populate('streamerId', 'name avatar')
        .sort({ createdAt: -1 });

      return subscriptions;
    } catch (error) {
      errorLogger.error('Get user subscriptions error', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    userId: string,
    streamerId: string,
    cancellationReason?: string
  ) {
    try {
      const subscription = await Subscription.findOne({
        userId,
        streamerId,
        status: 'active',
      });

      if (!subscription) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Subscription not found');
      }

      // Cancel Stripe subscription if applicable
      if (subscription.paymentMethod === 'stripe' && subscription.stripeSubscriptionId) {
        await (stripe.subscriptions as any).cancel(subscription.stripeSubscriptionId);
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = cancellationReason;
      subscription.autoRenew = false;

      await subscription.save();

      // Remove badge
      await User.findByIdAndUpdate(userId, {
        $pull: {
          badges: {
            type: 'subscriber',
          },
        },
      });

      logger.info(`✓ Subscription cancelled: ${userId} → ${streamerId}`);
      return subscription;
    } catch (error) {
      errorLogger.error('Cancel subscription error', error);
      throw error;
    }
  }

  /**
   * ==================== ADMIN: Subscription Analytics ====================
   */

  /**
   * Get subscription analytics (Admin only)
   */
  static async getSubscriptionAnalytics(streamerId?: string) {
    try {
      const matchStage = streamerId ? { $match: { streamerId: streamerId } } : { $match: {} };

      const analytics = await Subscription.aggregate([
        matchStage,
        {
          $facet: {
            totalSubscribers: [
              { $match: { status: 'active' } },
              { $count: 'count' },
            ],
            totalRevenue: [
              {
                $lookup: {
                  from: 'subscriptiontiers',
                  localField: 'tier',
                  foreignField: '_id',
                  as: 'tierData',
                },
              },
              { $unwind: '$tierData' },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: '$tierData.price',
                  },
                },
              },
            ],
            byTier: [
              {
                $lookup: {
                  from: 'subscriptiontiers',
                  localField: 'tier',
                  foreignField: '_id',
                  as: 'tierData',
                },
              },
              { $unwind: '$tierData' },
              {
                $group: {
                  _id: '$tierData.name',
                  count: { $sum: 1 },
                },
              },
            ],
            churnRate: [
              { $match: { status: 'cancelled' } },
              { $count: 'count' },
            ],
          },
        },
      ]);

      return {
        totalActive: analytics[0].totalSubscribers[0]?.count || 0,
        totalRevenue: analytics[0].totalRevenue[0]?.total || 0,
        byTier: analytics[0].byTier,
        cancelled: analytics[0].churnRate[0]?.count || 0,
      };
    } catch (error) {
      errorLogger.error('Get subscription analytics error', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions (Admin only)
   */
  static async getAllSubscriptions(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      streamerId?: string;
    }
  ) {
    try {
      const skip = (page - 1) * limit;
      const query: any = {};

      if (filters?.status) query.status = filters.status;
      if (filters?.streamerId) query.streamerId = filters.streamerId;

      const [subscriptions, total] = await Promise.all([
        Subscription.find(query)
          .populate('userId', 'name email avatar')
          .populate('streamerId', 'name avatar')
          .populate('tier')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Subscription.countDocuments(query),
      ]);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      errorLogger.error('Get all subscriptions error', error);
      throw error;
    }
  }
}

export default SubscriptionService;
