import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user.js';

export type ISocialLinks = {
     x?: string;
     instagram?: string;
     youtube?: string;
};

export type IPrivacySettings = {
     publicProfile: boolean;
     whoCanSeeFollowers: 'everyone' | 'friends' | 'onlyme';
     whoCanSeeFriendsList: 'everyone' | 'friends' | 'onlyme';
     allowFriendRequests: 'everyone' | 'nobody';
};

export type IActiveSession = {
     deviceType: string;
     deviceName: string;
     lastActive: Date;
     loginTime: Date;
     ip?: string;
     sessionId: string;
};

export type ISecuritySettings = {
     twoFactorEnabled: boolean;
     twoFactorSecret?: string;
     activeSessions?: IActiveSession[];
};

export type IBlockedUser = {
     userId: any;
     blockedAt: Date;
};

export type IUser = {
     name: string;
     userName: string;
     role: USER_ROLES;
     email: string;
     password?: string;
     image?: string;
     avatar?: string;
     bio?: string;
     socialLinks?: ISocialLinks;
     isDeleted: boolean;
     stripeCustomerId: string;
     address?: string;
     status: 'active' | 'blocked';
     verified: boolean;
     // OAuth fields
     authProvider?: 'email' | 'google' | 'apple';
     authProviderId?: string;
     // OTP fields
     otp?: string;
     otpExpiry?: Date;
     isEmailVerified?: boolean;
     authentication?: {
          isResetPassword: boolean;
          oneTimeCode: number;
          expireAt: Date;
     };
     // Social features
     followers?: any[];
     following?: any[];
     friends?: any[];
     blockedUsers?: IBlockedUser[];
     privacySettings?: IPrivacySettings;
     securitySettings?: ISecuritySettings;
     _id?: any;
};

export type UserModel = {
     isExistUserById(id: string): any;
     isExistUserByEmail(email: string): any;
     isExistUserByPhone(contact: string): any;
     isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
