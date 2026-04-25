import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Wallet, WalletTransaction, FeatherPackage } from './wallet.model.js';
import { ChallengeProgress } from '../challenge/challenge.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';

const FEATHER_TO_COIN_RATE = 1200;
const DAILY_FEATHER_TARGET = 200;

const ACCOUNT_TIERS = [
  { name: 'Hatchling', minFeathers: 0, nextTarget: 1200 },
  { name: 'Rising Bird', minFeathers: 1200, nextTarget: 5000 },
  { name: 'Sky Explorer', minFeathers: 5000, nextTarget: 12000 },
  { name: 'Phoenix', minFeathers: 12000, nextTarget: 25000 },
  { name: 'Legend', minFeathers: 25000, nextTarget: 25000 },
];

class WalletService {
  private static async ensureWalletLedgers(wallet: any) {
    let changed = false;

    if (typeof wallet.featherBalance !== 'number') {
      wallet.featherBalance = Math.max(0, Math.floor(wallet.balance || 0));
      changed = true;
    }

    if (typeof wallet.cashBalance !== 'number') {
      wallet.cashBalance = 0;
      changed = true;
    }

    if (typeof wallet.pendingCashBalance !== 'number') {
      wallet.pendingCashBalance = 0;
      changed = true;
    }

    if (typeof wallet.totalFeathersEarned !== 'number') {
      wallet.totalFeathersEarned = Math.max(0, Math.floor(wallet.totalEarned || 0));
      changed = true;
    }

    if (typeof wallet.totalFeathersSpent !== 'number') {
      wallet.totalFeathersSpent = Math.max(0, Math.floor(wallet.totalSpent || 0));
      changed = true;
    }

    if (typeof wallet.totalCashEarned !== 'number') {
      wallet.totalCashEarned = 0;
      changed = true;
    }

    if (typeof wallet.totalCashSpent !== 'number') {
      wallet.totalCashSpent = 0;
      changed = true;
    }

    if (typeof wallet.totalCashWithdrawn !== 'number') {
      wallet.totalCashWithdrawn = Math.max(0, Number(wallet.totalWithdrawn || 0));
      changed = true;
    }

    if (changed) {
      await wallet.save();
    }
  }

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
          featherBalance: 0,
          cashBalance: 0,
          pendingCashBalance: 0,
          totalFeathersEarned: 0,
          totalFeathersSpent: 0,
          totalCashEarned: 0,
          totalCashSpent: 0,
          totalCashWithdrawn: 0,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          totalWithdrawn: 0,
        });
        logger.info(`✓ Wallet created for user: ${userId}`);
      }

      await this.ensureWalletLedgers(wallet);

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
        featherBalance: wallet.featherBalance,
        cashBalance: wallet.cashBalance,
        pendingCashBalance: wallet.pendingCashBalance,
        totalFeathersEarned: wallet.totalFeathersEarned,
        totalFeathersSpent: wallet.totalFeathersSpent,
        totalCashEarned: wallet.totalCashEarned,
        totalCashSpent: wallet.totalCashSpent,
        totalCashWithdrawn: wallet.totalCashWithdrawn,
        // Legacy compatibility fields
        balance: wallet.cashBalance,
        totalEarned: wallet.totalCashEarned,
        totalSpent: wallet.totalCashSpent,
        totalWithdrawn: wallet.totalCashWithdrawn,
      };
    } catch (error) {
      errorLogger.error('Get wallet balance error', error);
      throw error;
    }
  }

  /**
   * Get account progression data for wallet/progression screen
   */
  static async getAccountProgression(userId: string) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const currentFeathers = Math.max(0, Math.floor(wallet.featherBalance || 0));

      const activeTier =
        [...ACCOUNT_TIERS]
          .reverse()
          .find((tier) => currentFeathers >= tier.minFeathers) || ACCOUNT_TIERS[0];

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyEarnedRows = await ChallengeProgress.aggregate([
        {
          $match: {
            userId: wallet.userId,
            status: 'completed',
            challengeDate: { $gte: since },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$feathersEarned' },
          },
        },
      ]);

      const dailyProgress = Math.max(0, Math.floor(dailyEarnedRows[0]?.total || 0));
      const coinBalance = Math.floor(currentFeathers / FEATHER_TO_COIN_RATE);
      const featherConvertBalance = currentFeathers / FEATHER_TO_COIN_RATE;

      return {
        tierName: activeTier.name,
        currentFeathers,
        nextTierTarget: activeTier.nextTarget,
        dailyProgress,
        dailyTarget: DAILY_FEATHER_TARGET,
        coinBalance,
        featherConvertBalance,
        cashBalance: wallet.cashBalance,
      };
    } catch (error) {
      errorLogger.error('Get account progression error', error);
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

      wallet.featherBalance += amount;
      wallet.totalFeathersEarned += amount;

      // Keep legacy fields in sync for backward compatibility.
      wallet.balance = wallet.featherBalance;
      wallet.totalEarned = wallet.totalFeathersEarned;
      await wallet.save();

      // Create transaction record
      await WalletTransaction.create({
        userId,
        type: source === 'purchase' ? 'feather_purchase' : 'feather_purchase',
        amount,
        description: `${amount} feathers added (${source})`,
        transactionId,
        status: 'completed',
        metadata: { unit: 'feather' },
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
   * Send gift (deduct feathers from sender, add feathers to receiver)
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
      if (senderWallet.featherBalance < featherAmount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient feather balance'
        );
      }

      // Deduct from sender
      senderWallet.featherBalance -= featherAmount;
      senderWallet.totalFeathersSpent += featherAmount;

      // Legacy compatibility fields
      senderWallet.balance = senderWallet.featherBalance;
      senderWallet.totalSpent = senderWallet.totalFeathersSpent;
      await senderWallet.save();

      // Add feathers to receiver
      const receiverWallet = await this.getOrCreateWallet(receiverId);
      receiverWallet.featherBalance += featherAmount;
      receiverWallet.totalFeathersEarned += featherAmount;

      // Legacy compatibility fields
      receiverWallet.balance = receiverWallet.featherBalance;
      receiverWallet.totalEarned = receiverWallet.totalFeathersEarned;
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
          metadata: { unit: 'feather', giftValue },
        },
        {
          userId: receiverId,
          type: 'gift_received',
          amount: featherAmount,
          description: `Gift received from viewer (${featherAmount} feathers)`,
          streamerId: senderId,
          transactionId,
          status: 'completed',
          metadata: { unit: 'feather', featherAmount, giftValue },
        },
      ]);

      logger.info(
        `✓ Gift sent: ${senderId} → ${receiverId} (${featherAmount} feathers)`
      );

      return {
        senderBalance: senderWallet.featherBalance,
        receiverFeatherBalance: receiverWallet.featherBalance,
        transferredFeathers: featherAmount,
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

      wallet.cashBalance += earnings;
      wallet.totalCashEarned += earnings;

      // Legacy compatibility fields
      wallet.balance = wallet.cashBalance;
      wallet.totalEarned = wallet.totalCashEarned;
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
      const MINIMUM_FEATHER_CONVERSION = 200;

      if (!Number.isInteger(featherAmount) || featherAmount <= 0) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Feather amount must be a positive integer'
        );
      }

      if (featherAmount < MINIMUM_FEATHER_CONVERSION) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Minimum conversion is ${MINIMUM_FEATHER_CONVERSION} feathers`
        );
      }

      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.featherBalance < featherAmount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient feather balance'
        );
      }

      const dollarAmount = featherAmount / FEATHER_TO_DOLLAR_RATE;

      // Deduct feathers ledger and add dollars in cash ledger.
      wallet.featherBalance -= featherAmount;
      wallet.cashBalance += dollarAmount;
      wallet.totalCashEarned += dollarAmount;

      // Legacy compatibility fields
      wallet.balance = wallet.cashBalance;
      wallet.totalEarned = wallet.totalCashEarned;
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
        newFeatherBalance: wallet.featherBalance,
        newCashBalance: wallet.cashBalance,
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

      if (wallet.cashBalance < amount) {
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
      wallet.cashBalance -= amount;
      wallet.totalCashWithdrawn += amount;

      // Legacy compatibility fields
      wallet.balance = wallet.cashBalance;
      wallet.totalWithdrawn = wallet.totalCashWithdrawn;
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
          .sort({ totalCashEarned: -1 })
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

  /**
   * Auto-credit admin cashBalance when commission is earned
   * Called after platform_commission transaction is created
   */
  static async autoCreditAdminOnCommission(adminUserId: string, commissionAmount: number) {
    try {
      const wallet = await this.getOrCreateWallet(adminUserId);

      // Credit admin's cashBalance
      wallet.cashBalance += commissionAmount;
      wallet.totalCashEarned += commissionAmount;

      // Maintain legacy fields for compatibility
      wallet.balance = wallet.cashBalance;
      wallet.totalEarned = wallet.totalCashEarned;

      await wallet.save();
      logger.info(`✓ Admin cashBalance credited: $${commissionAmount.toFixed(2)} (Total: $${wallet.cashBalance.toFixed(2)})`);

      return wallet;
    } catch (error) {
      errorLogger.error('Auto-credit admin on commission error', error);
      throw error;
    }
  }

  /**
   * Credit a user's pending cash ledger (not withdrawable until settlement release)
   */
  static async creditPendingCash(userId: string, amount: number) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      wallet.pendingCashBalance += amount;
      await wallet.save();
      logger.info(`✓ Pending cash credited: ${userId} ($${amount.toFixed(2)})`);
      return wallet;
    } catch (error) {
      errorLogger.error('Credit pending cash error', error);
      throw error;
    }
  }

  /**
   * Move settled cash from pending ledger to available cash ledger
   */
  static async releasePendingCash(userId: string, amount: number) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.pendingCashBalance < amount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient pending cash balance for settlement release'
        );
      }

      wallet.pendingCashBalance -= amount;
      wallet.cashBalance += amount;
      wallet.totalCashEarned += amount;

      // Maintain legacy fields for compatibility
      wallet.balance = wallet.cashBalance;
      wallet.totalEarned = wallet.totalCashEarned;

      await wallet.save();
      logger.info(`✓ Pending cash released: ${userId} ($${amount.toFixed(2)})`);
      return wallet;
    } catch (error) {
      errorLogger.error('Release pending cash error', error);
      throw error;
    }
  }

  /**
   * Roll back pending cash when settlement fails/refunds.
   */
  static async rollbackPendingCash(userId: string, amount: number) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.pendingCashBalance < amount) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          'Insufficient pending cash balance for rollback'
        );
      }

      wallet.pendingCashBalance -= amount;
      await wallet.save();
      logger.info(`✓ Pending cash rolled back: ${userId} ($${amount.toFixed(2)})`);
      return wallet;
    } catch (error) {
      errorLogger.error('Rollback pending cash error', error);
      throw error;
    }
  }
}

export default WalletService;
