import { Package } from '../package/package.model';
import { ISubscription } from './subscription.interface';
import { Subscription } from './subscription.model';
import stripe from '../../../config/stripe';
import { User } from '../user/user.model';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import config from '../../../config';

const subscriptionDetailsFromDB = async (id: string): Promise<{ subscription: ISubscription | {} }> => {
     const subscription = await Subscription.findOne({ userId: id }).populate('package', 'title credit duration').lean();

     if (!subscription) {
          return { subscription: {} }; // Return empty object if no subscription found
     }

     const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

     // Check subscription status and update database accordingly
     if (subscriptionFromStripe?.status !== 'active') {
          await Promise.all([User.findByIdAndUpdate(id, { isSubscribed: false }, { new: true }), Subscription.findOneAndUpdate({ user: id }, { status: 'expired' }, { new: true })]);
     }

     return { subscription };
};

const companySubscriptionDetailsFromDB = async (id: string): Promise<{ subscription: ISubscription | {} }> => {
     const subscription = await Subscription.findOne({ userId: id }).populate('package', 'title credit').lean();
     if (!subscription) {
          return { subscription: {} }; // Return empty object if no subscription found
     }

     const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

     // Check subscription status and update database accordingly
     if (subscriptionFromStripe?.status !== 'active') {
          await Promise.all([User.findByIdAndUpdate(id, { isSubscribed: false }, { new: true }), Subscription.findOneAndUpdate({ user: id }, { status: 'expired' }, { new: true })]);
     }

     return { subscription };
};

const subscriptionsFromDB = async (query: Record<string, unknown>): Promise<ISubscription[]> => {
     const conditions: any[] = [];

     const { searchTerm, limit, page, paymentType } = query;

     // Handle search term - search in both package title and user details
     if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
          const trimmedSearchTerm = searchTerm.trim();

          // Find matching packages by title or paymentType
          const matchingPackageIds = await Package.find({
               $or: [{ title: { $regex: trimmedSearchTerm, $options: 'i' } }, { paymentType: { $regex: trimmedSearchTerm, $options: 'i' } }],
          }).distinct('_id');

          // Find matching users by email, name, company, etc.
          const matchingUserIds = await User.find({
               $or: [
                    { email: { $regex: trimmedSearchTerm, $options: 'i' } },
                    { name: { $regex: trimmedSearchTerm, $options: 'i' } },
                    { company: { $regex: trimmedSearchTerm, $options: 'i' } },
                    { contact: { $regex: trimmedSearchTerm, $options: 'i' } },
               ],
          }).distinct('_id');

          // Create search conditions
          const searchConditions = [];

          if (matchingPackageIds.length > 0) {
               searchConditions.push({ package: { $in: matchingPackageIds } });
          }

          if (matchingUserIds.length > 0) {
               searchConditions.push({ userId: { $in: matchingUserIds } });
          }

          // Only add search condition if we found matching packages or users
          if (searchConditions.length > 0) {
               conditions.push({ $or: searchConditions });
          } else {
               // If no matches found, return empty result early
               return {
                    data: [],
                    meta: {
                         page: parseInt(page as string) || 1,
                         total: 0,
                    },
               } as any;
          }
     }

     // Handle payment type filter
     if (paymentType && typeof paymentType === 'string' && paymentType.trim()) {
          const packageIdsWithPaymentType = await Package.find({
               paymentType: paymentType.trim(),
          }).distinct('_id');

          if (packageIdsWithPaymentType.length > 0) {
               conditions.push({ package: { $in: packageIdsWithPaymentType } });
          } else {
               // If no packages match the payment type, return empty result
               return {
                    data: [],
                    meta: {
                         page: parseInt(page as string) || 1,
                         total: 0,
                    },
               } as any;
          }
     }

     // Build final query conditions
     const whereConditions = conditions.length > 0 ? { $and: conditions } : {};

     // Pagination
     const pages = Math.max(1, parseInt(page as string) || 1);
     const size = Math.max(1, Math.min(100, parseInt(limit as string) || 10)); // Limit max size
     const skip = (pages - 1) * size;

     try {
          // Execute query with population
          const result = await Subscription.find(whereConditions)
               .populate([
                    {
                         path: 'package',
                         select: 'title paymentType credit description',
                    },
                    {
                         path: 'userId',
                         select: 'email name linkedIn contact company website',
                    },
               ])
               .select('userId package price trxId currentPeriodStart currentPeriodEnd status createdAt updatedAt')
               .sort({ createdAt: -1 }) // Add sorting by creation date
               .skip(skip)
               .limit(size)
               .lean(); // Use lean() for better performance

          // Get total count for pagination
          const count = await Subscription.countDocuments(whereConditions);

          const data: any = {
               data: result,
               meta: {
                    page: pages,
                    limit: size,
                    total: count,
                    totalPages: Math.ceil(count / size),
               },
          };

          return data;
     } catch (error) {
          console.error('Error fetching subscriptions:', error);
          throw new Error('Failed to fetch subscriptions');
     }
};
const createSubscriptionCheckoutSession = async (userId: string, packageId: string) => {
     const isExistPackage = await Package.findOne({
          _id: packageId,
          status: 'active',
     });
     if (!isExistPackage) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Package not found');
     }
     const user = await User.findById(userId).select('+stripeCustomerId');
     if (!user || !user.stripeCustomerId) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
     }

     // Convert Mongoose String types to primitive strings
     const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: String(user.stripeCustomerId),
          line_items: [
               {
                    price: String(isExistPackage.priceId),
                    quantity: 1,
               },
          ],
          metadata: {
               userId: String(userId),
               subscriptionId: String(isExistPackage._id),
          },
          // your backend url for success and cancel
          success_url: `${config.backend_url}/api/v1/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.backend_url}/subscription/cancel`,
     });
     return {
          url: session.url,
          sessionId: session.id,
     };
};

const upgradeSubscriptionToDB = async (userId: string, packageId: string) => {
     const activeSubscription = await Subscription.findOne({
          userId,
          status: 'active',
     });

     if (!activeSubscription || !activeSubscription.subscriptionId) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'No active subscription found to upgrade');
     }

     const packageDoc = await Package.findById(packageId);

     if (!packageDoc || !packageDoc.priceId) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Package not found or missing Stripe Price ID');
     }

     const user = await User.findById(userId).select('+stripeCustomerId');

     if (!user || !user.stripeCustomerId) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
     }

     const stripeSubscription = await stripe.subscriptions.retrieve(activeSubscription.subscriptionId);
     console.log(stripeSubscription, 'this is stripe subscription existing');

     await stripe.subscriptions.update(activeSubscription.subscriptionId, {
          items: [
               {
                    id: stripeSubscription.items.data[0].id,
                    price: packageDoc.priceId,
               },
          ],
          proration_behavior: 'create_prorations',
          metadata: {
               userId,
               packageId: packageDoc._id.toString(),
          },
     });
     console.log(' thsi is stripe subscription updated');
     const portalSession = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: config.frontend_url,
          flow_data: {
               type: 'subscription_update',
               subscription_update: {
                    subscription: activeSubscription.subscriptionId,
               },
          },
     });

     return {
          url: portalSession.url,
     };
};
const cancelSubscriptionToDB = async (userId: string) => {
     const activeSubscription = await Subscription.findOne({
          userId,
          status: 'active',
     });
     if (!activeSubscription || !activeSubscription.subscriptionId) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No active subscription found to cancel');
     }

     await stripe.subscriptions.cancel(activeSubscription.subscriptionId);

     await Subscription.findOneAndUpdate({ userId, status: 'active' }, { status: 'canceled' }, { new: true });

     return { success: true, message: 'Subscription canceled successfully' };
};
const successMessage = async (id: string) => {
     const session = await stripe.checkout.sessions.retrieve(id);
     return session;
};
export const SubscriptionService = {
     subscriptionDetailsFromDB,
     subscriptionsFromDB,
     companySubscriptionDetailsFromDB,
     createSubscriptionCheckoutSession,
     upgradeSubscriptionToDB,
     cancelSubscriptionToDB,
     successMessage,
};
