// import { StatusCodes } from 'http-status-codes';
// import Stripe from 'stripe';
// import stripe from '../../../config/stripe';
// import AppError from '../../../errors/AppError';
// import { User } from '../../../app/modules/user/user.model';
// import { Package } from '../../../app/modules/package/package.model';
// import { Subscription } from '../../../app/modules/subscription/subscription.model';
// const formatUnixToDate = (timestamp: number) => new Date(timestamp * 1000);

// export const handleSubscriptionUpdated = async (data: Stripe.Subscription) => {
//      try {
//           // Retrieve the subscription from Stripe
//           const subscription = await stripe.subscriptions.retrieve(data.id);

//           // Retrieve the customer associated with the subscription
//           const customer = (await stripe.customers.retrieve(subscription.customer as string)) as Stripe.Customer;

//           // Extract price ID from subscription items
//           const priceId = subscription.items.data[0]?.price?.id;

//           // Retrieve the invoice to get the transaction ID and amount paid
//           const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);

//           const trxId = invoice?.payment_intent;
//           const amountPaid = invoice?.total / 100;
//           // Extract other needed fields from the subscription object
//           const remaining = subscription.items.data[0]?.quantity || 0;
//           // Convert Unix timestamp to Date
//           const currentPeriodStart = formatUnixToDate(subscription.current_period_start);
//           const currentPeriodEnd = formatUnixToDate(subscription.current_period_end);
//           const subscriptionId = subscription.id;
//           if (customer?.email) {
//                // Find the user by email
//                const existingUser = await User.findOne({ email: customer?.email });

//                if (!existingUser) {
//                     throw new AppError(StatusCodes.NOT_FOUND, `User not found for email: ${customer?.email}`);
//                }
//                // Find the pricing plan by priceId
//                const pricingPlan = await Package.findOne({ priceId });
//                if (!pricingPlan) {
//                     throw new AppError(StatusCodes.NOT_FOUND, `Pricing plan with Price ID: ${priceId} not found!`);
//                }

//                // Find the current active subscription and populate the package field
//                const currentActiveSubscription = await Subscription.findOne({
//                     userId: existingUser._id,
//                     status: 'active',
//                }).populate('package');

//                if (currentActiveSubscription) {
//                     if (String((currentActiveSubscription?.package as any)?.priceId) !== priceId) {
//                          // Deactivate the old subscription
//                          await Subscription.findByIdAndUpdate(
//                               currentActiveSubscription?._id,
//                               {
//                                    status: 'deactivated',
//                                    remaining: 0,
//                                    currentPeriodEnd: null,
//                                    currentPeriodStart: null,
//                               },
//                               { new: true },
//                          );

//                          // Create a new subscription
//                          const newSubscription = new Subscription({
//                               userId: existingUser._id,
//                               customerId: customer.id,
//                               package: pricingPlan._id,
//                               price: amountPaid,
//                               trxId,
//                               subscriptionId,
//                               currentPeriodStart,
//                               currentPeriodEnd,
//                               remaining,
//                               status: 'active',
//                          });

//                          await newSubscription.save();
//                     }
//                }
//           } else {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'No email found for the customer!');
//           }
//      } catch (error) {
//           if (error instanceof AppError) {
//                throw error;
//           } else {
//                throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating subscription status');
//           }
//      }
// };
