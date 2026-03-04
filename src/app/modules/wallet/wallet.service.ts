import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Wallet, WalletTransaction, FeatherPackage } from './wallet.model.js';
import { User } from '../user/user.model.js';
import { Subscription } from '../subscription/subscription.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';

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
          .populate('streamerId', 'name image')
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
   * ==================== FEATHER CONVERSION ====================
   */

  /**
   * Convert feathers to dollars (1200 feathers = $1)
   */
  static async convertFeathersToDollars(userId: string, featherAmount: number) {
    try {
      const FEATHER_TO_DOLLAR_RATE = 1200; // 1200 feathers = $1

      if (featherAmount < FEATHER_TO_DOLLAR_RATE) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Minimum conversion is ${FEATHER_TO_DOLLAR_RATE} feathers ($1)`
        );
      }

      if (featherAmount % FEATHER_TO_DOLLAR_RATE !== 0) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Feather amount must be a multiple of ${FEATHER_TO_DOLLAR_RATE}`
        );
      }

      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.balance < featherAmount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient feather balance'
        );
      }

      const dollarAmount = featherAmount / FEATHER_TO_DOLLAR_RATE;

      // Deduct feathers, add dollars to balance
      wallet.balance -= featherAmount;
      wallet.balance += dollarAmount;
      await wallet.save();

      // Create transaction record
      await WalletTransaction.create({
        userId,
        type: 'feather_conversion',
        amount: dollarAmount,
        description: `Converted ${featherAmount} feathers to $${dollarAmount.toFixed(2)}`,
        status: 'completed',
        metadata: { featherAmount, dollarAmount },
      });

      logger.info(`✓ Feathers converted: ${userId} (${featherAmount} → \$${dollarAmount})`);

      return {
        feathersConverted: featherAmount,
        dollarsReceived: dollarAmount,
        newBalance: wallet.balance,
      };
    } catch (error) {
      errorLogger.error('Convert feathers error', error);
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
    payoutMethod: 'bank_transfer' | 'stripe' | 'paypal' = 'bank_transfer',
    payoutDetails?: Record<string, any>
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

      if (!['bank_transfer', 'stripe', 'paypal'].includes(payoutMethod)) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid payout method');
      }

      if (!payoutDetails) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Payout details are required');
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
        description: `Withdrawal request via ${payoutMethod} ($${amount})`,
        status: 'pending',
        metadata: {
          payoutMethod,
          payoutDetails,
        },
      });

      logger.info(`✓ Withdrawal created: ${userId} ($${amount}) via ${payoutMethod}`);

      return {
        message: 'Withdrawal request created successfully',
        transactionId: transaction._id,
        amount,
        payoutMethod,
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
          .populate('userId', 'name email image')
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

  /**
   * Get platform revenue/commission (Admin)
   */
  static async getPlatformRevenue() {
    try {
      // Get all platform commission transactions
      const platformTransactions = await WalletTransaction.find({
        type: 'platform_commission',
        status: 'completed',
      }).sort({ createdAt: -1 });

      // Calculate total revenue
      const totalRevenue = platformTransactions.reduce(
        (sum, txn) => sum + txn.amount,
        0
      );

      // Group by source (subscription, gift, etc.)
      const revenueBySource = platformTransactions.reduce((acc: any, txn) => {
        const source = txn.metadata?.source || 'other';
        if (!acc[source]) {
          acc[source] = 0;
        }
        acc[source] += txn.amount;
        return acc;
      }, {});

      // Last 30 days revenue
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const last30DaysRevenue = platformTransactions
        .filter(txn => new Date(txn.createdAt) >= thirtyDaysAgo)
        .reduce((sum, txn) => sum + txn.amount, 0);

      logger.info(`✓ Platform revenue calculated: $${totalRevenue.toFixed(2)}`);
      
      return {
        totalRevenue,
        revenueBySource,
        last30DaysRevenue,
        totalTransactions: platformTransactions.length,
        recentTransactions: platformTransactions.slice(0, 10), // Last 10 transactions
      };
    } catch (error) {
      errorLogger.error('Get platform revenue error', error);
      throw error;
    }
  }
}

export default WalletService;
