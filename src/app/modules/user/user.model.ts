import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config/index.js';
import { USER_ROLES } from '../../../enums/user.js';
import AppError from '../../../errors/AppError.js';
import { IUser, UserModel } from './user.interface.js';

const userSchema = new Schema<IUser, UserModel>(
     {
          name: {
               type: String,
               required: true,
          },
          userName: {
               // ✅ NEW - unique username
               type: String,
               required: true,
               unique: true,
               lowercase: true,
          },
          role: {
               type: String,
               enum: Object.values(USER_ROLES),
               default: USER_ROLES.USER,
          },
          email: {
               type: String,
               required: true,
               unique: true,
               lowercase: true,
          },
          password: {
               type: String,
               required: false,
               select: false,
               minlength: 8,
          },
          image: {
               type: String,
               default: '',
          },
          avatar: {
               type: String,
               default: '',
          },
          bio: {
               type: String,
               default: '',
          },
          // OAuth fields
          authProvider: {
               type: String,
               enum: ['email', 'google', 'apple'],
               default: 'email',
          },
          authProviderId: {
               type: String,
               default: null,
          },
          // OTP fields
          otp: {
               type: String,
               default: null,
               select: false,
          },
          otpExpiry: {
               type: Date,
               default: null,
               select: false,
          },
          isEmailVerified: {
               type: Boolean,
               default: false,
          },
          socialLinks: {
               type: {
                    x: { type: String, default: '' },
                    instagram: { type: String, default: '' },
                    youtube: { type: String, default: '' },
               },
               default: {},
          },
          status: {
               type: String,
               enum: ['active', 'blocked'],
               default: 'active',
          },
          verified: {
               type: Boolean,
               default: false,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          stripeCustomerId: {
               type: String,
               default: '',
          },
          authentication: {
               type: {
                    isResetPassword: {
                         type: Boolean,
                         default: false,
                    },
                    oneTimeCode: {
                         type: Number,
                         default: null,
                    },
                    expireAt: {
                         type: Date,
                         default: null,
                    },
               },
               select: false,
          },
     },
     { timestamps: true },
);

// Exist User Check
userSchema.statics.isExistUserById = async (id: string) => {
     return await User.findById(id);
};

// db.users.updateOne({email:"tihow91361@linxues.com"},{email:"rakibhassan305@gmail.com"})

userSchema.statics.isExistUserByEmail = async (email: string) => {
     return await User.findOne({ email });
};
userSchema.statics.isExistUserByPhone = async (contact: string) => {
     return await User.findOne({ contact });
};
// Password Matching
userSchema.statics.isMatchPassword = async (password: string, hashPassword: string): Promise<boolean> => {
     return await bcrypt.compare(password, hashPassword);
};

// Pre-Save Hook for Hashing Password & Checking Email Uniqueness
userSchema.pre('save', async function (next) {
     const isExist = await User.findOne({ email: this.get('email') });
     if (isExist) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Email already exists!');
     }

     // Only hash password if it exists and is modified
     if (this.password && this.isModified('password')) {
          this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
     }
     next();
});

// Query Middleware
userSchema.pre('find', function (next) {
     this.find({ isDeleted: { $ne: true } });
     next();
});

userSchema.pre('findOne', function (next) {
     this.find({ isDeleted: { $ne: true } });
     next();
});

userSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});
export const User = model<IUser, UserModel>('User', userSchema);
