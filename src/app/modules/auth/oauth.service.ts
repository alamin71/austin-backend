import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { User } from '../user/user.model';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { errorLogger } from '../../../shared/logger';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  c_hash: string;
  email: string;
  email_verified: string;
  auth_time: number;
  nonce_supported: boolean;
}

class OAuthService {
  /**
   * Google OAuth - Verify token and create/update user
   */
  static async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload() as GoogleTokenPayload;

      if (!payload.email) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Email not found in Google token');
      }

      // Find or create user
      let user = await User.findOne({ email: payload.email });

      if (!user) {
        user = await User.create({
          email: payload.email,
          name: payload.name || `${payload.given_name} ${payload.family_name}`,
          avatar: payload.picture,
          isEmailVerified: payload.email_verified,
          role: 'user',
          authProvider: 'google',
          authProviderId: payload.sub,
          password: undefined, // No password for OAuth users
        });
      } else {
        // Update user if not from Google before
        if (!user.authProviderId) {
          user.authProvider = 'google';
          user.authProviderId = payload.sub;
          user.avatar = payload.picture || user.avatar;
          await user.save();
        }
      }

      return user;
    } catch (error) {
      errorLogger.error('Google token verification error', error);
      throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid Google token');
    }
  }

  /**
   * Apple OAuth - Verify token and create/update user
   */
  static async verifyAppleToken(identityToken: string, authorizationCode?: string) {
    try {
      // Verify Apple ID token
      const decodedToken = this.decodeAppleToken(identityToken);

      if (!decodedToken.email) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Email not found in Apple token');
      }

      // Find or create user
      let user = await User.findOne({ email: decodedToken.email });

      if (!user) {
        user = await User.create({
          email: decodedToken.email,
          name: decodedToken.email.split('@')[0], // Use email prefix as default name
          isEmailVerified: decodedToken.email_verified === 'true',
          role: 'user',
          authProvider: 'apple',
          authProviderId: decodedToken.sub,
          password: undefined, // No password for OAuth users
        });
      } else {
        // Update user if not from Apple before
        if (!user.authProviderId) {
          user.authProvider = 'apple';
          user.authProviderId = decodedToken.sub;
          await user.save();
        }
      }

      return user;
    } catch (error) {
      errorLogger.error('Apple token verification error', error);
      throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid Apple token');
    }
  }

  /**
   * Decode Apple JWT token (without verification - you should verify signature in production)
   */
  private static decodeAppleToken(token: string): AppleTokenPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid Apple token format');
    }
  }

  /**
   * OTP - Generate and send OTP
   */
  static async generateAndSendOTP(email: string) {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database (you can use a separate OTP model or cache)
      // For now, we'll update user with OTP (in production, use secure storage)
      await User.updateOne(
        { email },
        {
          otp: otp,
          otpExpiry: expiresAt,
        },
        { upsert: true }
      );

      // Send OTP via email (you can use existing email service)
      // await emailService.sendOTP(email, otp);

      return {
        message: 'OTP sent to your email',
        expiresIn: 600, // 10 minutes in seconds
      };
    } catch (error) {
      errorLogger.error('OTP generation error', error);
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to generate OTP');
    }
  }

  /**
   * OTP - Verify OTP and authenticate user
   */
  static async verifyOTP(email: string, otp: string) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
      }

      if (!user.otp || user.otp !== otp) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
      }

      if (user.otpExpiry && user.otpExpiry < new Date()) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'OTP has expired');
      }

      // Mark email as verified
      user.isEmailVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.error('OTP verification error', error);
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to verify OTP');
    }
  }
}

export default OAuthService;
