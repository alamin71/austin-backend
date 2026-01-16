// import { StatusCodes } from 'http-status-codes';
// import Stripe from 'stripe';
// import stripe from '../../../config/stripe';
// import AppError from '../../../errors/AppError';
// import { Package } from '../../../app/modules/package/package.model';
// import { User } from '../../../app/modules/user/user.model';
// import { Subscription } from '../../../app/modules/subscription/subscription.model';
// import { sendNotifications } from '../../notificationsHelper';

// const formatUnixToIsoUtc = (timestamp: number): string => {
//      const date = new Date(timestamp * 1000);
//      return date.toISOString().replace('Z', '+00:00');
// };

// export const handleSubscriptionCreated = async (data: Stripe.Subscription) => {
//      try {
//           const getAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
//           if (!getAdmin) {
//                throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found!');
//           }
//           const subscription = await stripe.subscriptions.retrieve(data.id);
//           const customer = (await stripe.customers.retrieve(subscription.customer as string)) as Stripe.Customer;
//           const priceId = subscription.items.data[0]?.price?.id;
//           const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
//           const trxId = invoice?.payment_intent as string;
//           const amountPaid = invoice?.total / 100;

//           // Extract other needed fields from the subscription object
//           const remaining = subscription.items.data[0]?.quantity || 0;
//           // Convert Unix timestamp to Date
//           const currentPeriodStart = formatUnixToIsoUtc(subscription.current_period_start);
//           const currentPeriodEnd = formatUnixToIsoUtc(subscription.current_period_end);
//           const subscriptionId = subscription.id;
//           // Check if customer email is available
//           if (!customer?.email) {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'No email found for the customer!');
//           }

//           if (customer?.email) {
//                const existingUser = await User.findOne({ email: customer?.email });
//                if (!existingUser) {
//                     throw new AppError(StatusCodes.NOT_FOUND, `User not found for email: ${customer.email}`);
//                }
//                if (existingUser) {
//                     const pricingPlan = await Package.findOne({ priceId });
//                     if (!pricingPlan) {
//                          throw new AppError(StatusCodes.NOT_FOUND, `Pricing plan not found for Price ID: ${priceId}`);
//                     }

//                     if (pricingPlan) {
//                          // Check if the user already has an active subscription
//                          const currentActiveSubscription = await Subscription.findOne({
//                               userId: existingUser._id,
//                               status: 'active',
//                          });

//                          if (currentActiveSubscription) {
//                               throw new AppError(StatusCodes.CONFLICT, 'User already has an active subscription. Skipping.');
//                          }

//                          // Create the new subscription
//                          const newSubscription = new Subscription({
//                               userId: existingUser._id,
//                               customerId: customer?.id,
//                               package: pricingPlan._id,
//                               status: 'active',
//                               price: amountPaid,
//                               trxId,
//                               remaining,
//                               currentPeriodStart,
//                               currentPeriodEnd,
//                               subscriptionId,
//                          });

//                          // Save the new subscription to the database
//                          await newSubscription.save();

//                          // Update the user status
//                          await User.findByIdAndUpdate(
//                               existingUser._id,
//                               {
//                                    isSubscribed: true,
//                                    hasAccess: true,
//                                    isFreeTrial: false,
//                                    trialExpireAt: null,
//                                    packageName: pricingPlan.title,
//                               },
//                               { new: true },
//                          );

//                          await sendNotifications({
//                               title: `${existingUser.name}`,
//                               receiver: getAdmin._id,
//                               message: `A new subscription has been purchase for ${existingUser.name}`,
//                               type: 'ORDER',
//                          });
//                     } else {
//                          throw new AppError(StatusCodes.NOT_FOUND, `Pricing plan not found for Price ID: ${priceId}`);
//                     }
//                } else {
//                     throw new AppError(StatusCodes.NOT_FOUND, `User not found for email: ${customer?.email}`);
//                }
//           } else {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'No email found for the customer!');
//           }
//      } catch (error) {
//           console.error('Error in handleSubscriptionCreated:', error);
//           throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, `Error in handleSubscriptionCreated: ${error instanceof Error ? error.message : error}`);
//      }
// };
