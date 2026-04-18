import { string, z } from 'zod';

export const createUserZodSchema = z.object({
     body: z.object({
          name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
          email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),

          password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
          phone: string().default('').optional(),
          profile: z.string().optional(),
          location: z.string().optional(),
     }),
});

const createBusinessUserZodSchema = z.object({
     body: z.object({
          name: z.string({ required_error: 'Name is required' }),
          phone: z.string({ required_error: 'Contact is required' }),
          email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
          password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
          profile: z.string().optional(),
          location: z.string().optional(),
     }),
});

const updateUserZodSchema = z.object({
     body: z.object({
          name: z.string().optional(),
          contact: z.string().optional(),
          address: z.string().optional(),
          location: z.string().optional(),
          email: z.string().email('Invalid email address').optional(),
          password: z.string().optional(),
          image: z.string().optional(),
          socialLinks: z
               .object({
                    x: z.string().optional(),
                    instagram: z.string().optional(),
                    youtube: z.string().optional(),
               })
               .optional(),
     }),
});

const disableAccountZodSchema = z.object({
     body: z.object({}),
});

const requestDeleteAccountOtpZodSchema = z.object({
     body: z.object({
          password: z.string({ required_error: 'Password is required' }),
     }),
});

const verifyDeleteAccountOtpZodSchema = z.object({
     body: z.object({
          deleteAccountToken: z.string({ required_error: 'Delete account token is required' }),
          oneTimeCode: z.number({ required_error: 'One time code is required' }),
     }),
});

export const UserValidation = {
     createUserZodSchema,
     updateUserZodSchema,
     createBusinessUserZodSchema,
     disableAccountZodSchema,
     requestDeleteAccountOtpZodSchema,
     verifyDeleteAccountOtpZodSchema,
};
