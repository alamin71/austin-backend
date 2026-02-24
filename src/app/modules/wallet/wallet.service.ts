import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Wallet, WalletTransaction, FeatherPackage } from './wallet.model.js';
import { User } from '../user/user.model.js';
import { Subscription } from '../subscription/subscription.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import config from '../../../config/index.js';
import Stripe from 'stripe';

const stripe = new Stripe((config.stripe as any)?.stripe_secret_key || '');

class WalletService {
  /**
   * ==================== WALLET BASICS ====================
   */

  /**
   * Get or create user wallet
   */
  static async getOrCreateWallet(userId: string) {
    try {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          totalWithdrawn: 0,
        });
        logger.info(`✓ Wallet created for user: ${userId}`);
      }

      return wallet;
    } catch (error) {
      errorLogger.error('Get or create wallet error', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  static async getWalletBalance(userId: string) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      return {
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        totalWithdrawn: wallet.totalWithdrawn,
      };
    } catch (error) {
      errorLogger.error('Get wallet balance error', error);
      throw error;
    }
  }

  /**
   * ==================== FEATHER MANAGEMENT ====================
   */

  /**
   * Get all feather packages
   */
  static async getFeatherPackages() {
    try {
      const packages = await FeatherPackage.find({ isActive: true })
        .sort({ order: 1, priceUSD: 1 });
      return packages;
    } catch (error) {
      errorLogger.error('Get feather packages error', error);
      throw error;
    }
  }

  /**
   * Add feathers to user (after payment)
   */
  static async addFeathers(
    userId: string,
    amount: number,
    source: 'purchase' | 'bonus' | 'admin',
    transactionId?: string
  ) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      wallet.balance += amount;
      await wallet.save();

      // Create transaction record
      await WalletTransaction.create({
        userId,
        type: source === 'purchase' ? 'feather_purchase' : 'feather_purchase',
        amount,
        description: `${amount} feathers added (${source})`,
        transactionId,
        status: 'completed',
      });

      logger.info(`✓ Added ${amount} feathers to user ${userId}`);
      return wallet;
    } catch (error) {
      errorLogger.error('Add feathers error', error);
      throw error;
    }
  }

  /**
   * ==================== GIFT OPERATIONS ====================
   */

  /**
   * Send gift (deduct feathers from sender, add to receiver)
   */
  static async sendGift(
    senderId: string,
    receiverId: string,
    streamId: string,
    featherAmount: number,
    giftValue: number // USD value
  ) {
    try {
      // Check sender has enough feathers
      const senderWallet = await this.getOrCreateWallet(senderId);
      if (senderWallet.balance < featherAmount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient feather balance'
        );
      }

      // Check if sender is subscribed to receiver
      const isSubscribed = await Subscription.findOne({
        userId: senderId,
        streamerId: receiverId,
        status: 'active',
        currentPeriodEnd: { $gt: new Date() },
      });

      if (!isSubscribed) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          'You must be subscribed to this streamer to send gifts'
        );
      }

      // Deduct from sender
      senderWallet.balance -= featherAmount;
      senderWallet.totalSpent += giftValue;
      await senderWallet.save();

      // Add to receiver
      const receiverWallet = await this.getOrCreateWallet(receiverId);
      const platformFee = giftValue * 0.15; // 15% commission
      const streamerEarnings = giftValue - platformFee;

      receiverWallet.balance += streamerEarnings;
      receiverWallet.totalEarned += streamerEarnings;
      await receiverWallet.save();

      // Record transactions
      const transactionId = `gift_${Date.now()}`;

      await WalletTransaction.create([
        {
          userId: senderId,
          type: 'gift_sent',
          amount: -featherAmount,
          description: `Gift sent to streamer (${featherAmount} feathers)`,
          streamerId: receiverId,
          transactionId,
          status: 'completed',
          metadata: { giftValue, platformFee },
        },
        {
          userId: receiverId,
          type: 'gift_received',
          amount: streamerEarnings,
          description: `Gift received from viewer ($${streamerEarnings.toFixed(2)})`,
          streamerId: senderId,
          transactionId,
          status: 'completed',
          metadata: { featherAmount, platformFee },
        },
      ]);

      logger.info(
        `✓ Gift sent: ${senderId} → ${receiverId} (${featherAmount} feathers, $${giftValue})`
      );

      return {
        senderBalance: senderWallet.balance,
        streamerEarnings,
        platformFee,
      };
    } catch (error) {
      errorLogger.error('Send gift error', error);
      throw error;
    }
  }

  /**
   * ==================== TRANSACTION HISTORY ====================
   */

  /**
   * Get wallet transaction history
   */
  static async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const query: any = { userId };

      if (type) {
        query.type = type;
      }

      const [transactions, total] = await Promise.all([
        WalletTransaction.find(query)
          .populate('streamerId', 'name avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        WalletTransaction.countDocuments(query),
      ]);

      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      errorLogger.error('Get transaction history error', error);
      throw error;
    }
  }

  /**
   * ==================== SUBSCRIPTION EARNINGS ====================
   */

  /**
   * Process subscription payment (add earnings to streamer)
   */
  static async addSubscriptionEarnings(
    streamerId: string,
    amount: number,
    transactionId: string
  ) {
    try {
      const wallet = await this.getOrCreateWallet(streamerId);
      const platformFee = amount * 0.15;
      const earnings = amount - platformFee;

      wallet.balance += earnings;
      wallet.totalEarned += earnings;
      await wallet.save();

      await WalletTransaction.create({
        userId: streamerId,
        type: 'subscription',
        amount: earnings,
        description: `Subscription earnings ($${earnings.toFixed(2)})`,
        transactionId,
        status: 'completed',
        metadata: { platformFee },
      });

      logger.info(`✓ Subscription earnings added: ${streamerId} (+$${earnings})`);
      return wallet;
    } catch (error) {
      errorLogger.error('Add subscription earnings error', error);
      throw error;
    }
  }

  /**
   * ==================== WITHDRAWAL ====================
   */

  /**
   * Create withdrawal request
   */
  static async createWithdrawal(
    userId: string,
    amount: number,
    bankDetails: {
      accountHolder: string;
      bankName: string;
      accountNumber: string;
      routingNumber: string;
    }
  ) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.balance < amount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient balance for withdrawal'
        );
      }

      if (amount < 20) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Minimum withdrawal amount is $20'
        );
      }

      // Deduct from balance
      wallet.balance -= amount;
      wallet.totalWithdrawn += amount;
      await wallet.save();

      // Create transaction
      const transaction = await WalletTransaction.create({
        userId,
        type: 'withdrawal',
        amount: -amount,
        description: `Withdrawal request ($${amount})`,
        status: 'pending',
        metadata: { bankDetails },
      });

      logger.info(`✓ Withdrawal created: ${userId} ($${amount})`);

      return {
        message: 'Withdrawal request created successfully',
        transactionId: transaction._id,
        amount,
        status: 'pending',
      };
    } catch (error) {
      errorLogger.error('Create withdrawal error', error);
      throw error;
    }
  }

  /**
   * ==================== ADMIN: WALLET MANAGEMENT ====================
   */

  /**
   * Create feather package (Admin)
   */
  static async createFeatherPackage(packageData: any) {
    try {
      const package_ = await FeatherPackage.create(packageData);
      logger.info(`✓ Feather package created: ${package_.name}`);
      return package_;
    } catch (error) {
      errorLogger.error('Create feather package error', error);
      throw error;
    }
  }

  /**
   * Update feather package (Admin)
   */
  static async updateFeatherPackage(packageId: string, updateData: any) {
    try {
      const package_ = await FeatherPackage.findByIdAndUpdate(
        packageId,
        updateData,
        { new: true }
      );

      if (!package_) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Feather package not found');
      }

      logger.info(`✓ Feather package updated: ${package_.name}`);
      return package_;
    } catch (error) {
      errorLogger.error('Update feather package error', error);
      throw error;
    }
  }

  /**
   * Get all wallets (Admin)
   */
  static async getAllWallets(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [wallets, total] = await Promise.all([
        Wallet.find()
          .populate('userId', 'name email avatar')
          .sort({ totalEarned: -1 })
          .skip(skip)
          .limit(limit),
        Wallet.countDocuments(),
      ]);

      return {
        data: wallets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      errorLogger.error('Get all wallets error', error);
      throw error;
    }
  }
}

export default WalletService;
