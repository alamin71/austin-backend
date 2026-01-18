import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

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
     password: string;
     image?: string;
     bio?: string;
     socialLinks?: ISocialLinks;
     isDeleted: boolean;
     stripeCustomerId: string;
     address: string;
     status: 'active' | 'blocked';
     verified: boolean;
     authentication?: {
          isResetPassword: boolean;
          oneTimeCode: number;
          expireAt: Date;
     };
};

export type UserModel = {
     isExistUserById(id: string): any;
     isExistUserByEmail(email: string): any;
     isExistUserByPhone(contact: string): any;
     isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
