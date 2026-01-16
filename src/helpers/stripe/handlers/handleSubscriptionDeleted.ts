// import { StatusCodes } from 'http-status-codes';
// import Stripe from 'stripe';
// import stripe from '../../../config/stripe';
// import AppError from '../../../errors/AppError';
// import { Subscription } from '../../../app/modules/subscription/subscription.model';
// import { User } from '../../../app/modules/user/user.model';
// // const User:any = "";
// // const Subscription:any = "";

// export const handleSubscriptionDeleted = async (data: Stripe.Subscription) => {
//      // Retrieve the subscription from Stripe
//      const subscription = await stripe.subscriptions.retrieve(data.id);

//      // Find the current active subscription
//      const userSubscription = await Subscription.findOne({
//           customerId: subscription.customer,
//           status: 'active',
//      });

//      if (userSubscription) {
//           // Deactivate the subscription
//           await Subscription.findByIdAndUpdate(userSubscription._id, { status: 'cancel' }, { new: true });

//           // Find the user associated with the subscription
//           const existingUser = await User.findById(userSubscription?.userId);

//           if (existingUser) {
//                await User.findByIdAndUpdate(existingUser._id, { hasAccess: false, isSubscribed: false }, { new: true });
//           } else {
//                throw new AppError(StatusCodes.NOT_FOUND, `User not found.`);
//           }
//      } else {
//           throw new AppError(StatusCodes.NOT_FOUND, `Subscription not found.`);
//      }
// };
