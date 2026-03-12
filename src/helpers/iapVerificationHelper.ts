import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { StatusCodes } from 'http-status-codes';
import config from '../config/index.js';
import AppError from '../errors/AppError.js';

type Platform = 'ios' | 'android';
type TierSlug = 'supporter' | 'premium' | 'exclusive';

interface VerifyIapInput {
  platform: Platform;
  receiptData: string;
  tierSlug: TierSlug;
}

interface VerifyIapResult {
  transactionId: string;
  expiresAt: Date;
}

const getPlatformProductId = (platform: Platform, tierSlug: TierSlug): string | undefined => {
  const iapConfig = (config as any).iap || {};

  const key =
    platform === 'ios'
      ? `ios_${tierSlug}_product_id`
      : `android_${tierSlug}_product_id`;

  return iapConfig[key];
};

const parseReceiptPayload = (receiptData: string) => {
  try {
    return JSON.parse(receiptData);
  } catch {
    return null;
  }
};

const verifyAppleReceipt = async (
  receiptData: string,
  expectedProductId?: string
): Promise<VerifyIapResult> => {
  const iapConfig = (config as any).iap || {};
  const sharedSecret = iapConfig.apple_shared_secret;

  if (!sharedSecret) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'APPLE_SHARED_SECRET is required for iOS subscription verification'
    );
  }

  const payload = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  const productionUrl = iapConfig.apple_production_verify_url;
  const sandboxUrl = iapConfig.apple_sandbox_verify_url;

  let response = await axios.post(productionUrl, payload);
  if (response.data?.status === 21007) {
    response = await axios.post(sandboxUrl, payload);
  }

  const status = response.data?.status;
  if (status !== 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, `Apple receipt verification failed (status: ${status})`);
  }

  const latestInfo = Array.isArray(response.data?.latest_receipt_info)
    ? response.data.latest_receipt_info
    : [];

  const inApp = Array.isArray(response.data?.receipt?.in_app)
    ? response.data.receipt.in_app
    : [];

  const transactions = [...latestInfo, ...inApp] as Array<Record<string, any>>;
  if (transactions.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'No iOS subscription transaction found in receipt');
  }

  const validTransactions = transactions.filter((txn) => {
    const cancelled = !!txn.cancellation_date_ms;
    const expiresMs = Number(txn.expires_date_ms || 0);
    const notExpired = expiresMs > Date.now();
    return !cancelled && (expiresMs === 0 || notExpired);
  });

  const productMatched = expectedProductId
    ? validTransactions.find((txn) => txn.product_id === expectedProductId)
    : validTransactions[0];

  if (!productMatched) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'iOS receipt is valid but does not match expected subscription product'
    );
  }

  const transactionId =
    productMatched.transaction_id || productMatched.original_transaction_id;

  if (!transactionId) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Missing iOS transaction ID in receipt');
  }

  const expiresAt = productMatched.expires_date_ms
    ? new Date(Number(productMatched.expires_date_ms))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return { transactionId, expiresAt };
};

const getGoogleAccessToken = async (): Promise<string> => {
  const iapConfig = (config as any).iap || {};
  const clientEmail = iapConfig.google_service_account_email;
  const privateKey = (iapConfig.google_service_account_private_key || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Google Play service account credentials are required for Android verification'
    );
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = accessTokenResponse?.token;

  if (!accessToken) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to obtain Google Play access token');
  }

  return accessToken;
};

const verifyAndroidReceipt = async (
  receiptData: string,
  tierSlug: TierSlug
): Promise<VerifyIapResult> => {
  const iapConfig = (config as any).iap || {};
  const receiptPayload = parseReceiptPayload(receiptData);

  const packageName = receiptPayload?.packageName || iapConfig.google_package_name;
  const subscriptionId = receiptPayload?.subscriptionId || getPlatformProductId('android', tierSlug);
  const purchaseToken = receiptPayload?.purchaseToken || receiptPayload?.token || receiptData;

  if (!packageName || !subscriptionId || !purchaseToken) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Android receipt must include purchaseToken and configured package/subscription product IDs'
    );
  }

  const accessToken = await getGoogleAccessToken();

  const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
    packageName
  )}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(
    purchaseToken
  )}`;

  const response = await axios.get(verifyUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = response.data || {};
  const expiryTimeMillis = Number(data.expiryTimeMillis || 0);
  const isExpired = expiryTimeMillis <= Date.now();
  const isCancelled = data.cancelReason !== undefined && data.cancelReason !== null;

  if (isExpired || isCancelled) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Android subscription is expired or cancelled');
  }

  if (typeof data.paymentState === 'number' && ![1, 2].includes(data.paymentState)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Android payment is not completed yet');
  }

  const transactionId = data.orderId || purchaseToken;
  return {
    transactionId,
    expiresAt: new Date(expiryTimeMillis),
  };
};

export const verifyIapSubscriptionReceipt = async (
  input: VerifyIapInput
): Promise<VerifyIapResult> => {
  const expectedProductId = getPlatformProductId(input.platform, input.tierSlug);

  if (input.platform === 'ios') {
    return verifyAppleReceipt(input.receiptData, expectedProductId);
  }

  return verifyAndroidReceipt(input.receiptData, input.tierSlug);
};
