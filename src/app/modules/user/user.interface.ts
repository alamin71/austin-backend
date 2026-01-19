import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user.js';

export type ISocialLinks = {
     x?: string;
     instagram?: string;
     youtube?: string;
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
     _id?: any;
};

export type UserModel = {
     isExistUserById(id: string): any;
     isExistUserByEmail(email: string): any;
     isExistUserByPhone(contact: string): any;
     isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
