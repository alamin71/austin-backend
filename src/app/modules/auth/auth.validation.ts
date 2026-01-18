import { z } from 'zod';

const createVerifyEmailZodSchema = z.object({
     body: z.object({
          email: z.string({ required_error: 'Email is required' }),
          oneTimeCode: z.number({ required_error: 'One time code is required' }),
     }),
});

const createLoginZodSchema = z.object({
     body: z.object({
          email: z.string({ required_error: 'Email is required' }),
          password: z.string({ required_error: 'Password is required' }),
     }),
});

// const createRegisterZodSchema = z.object({
//      body: z.object({
//           name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
//           email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
//           password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
//           confirmPassword: z.string({ required_error: 'Confirm Password is required' }),
//      }).refine((data) => data.password === data.confirmPassword, {
//           message: "Passwords don't match",
//           path: ["confirmPassword"],
//      }),
// });

const createRegisterZodSchema = z.object({
     body: z
          .object({
               name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
               userName: z
                    .string({ required_error: 'Username is required' })
                    .min(3, 'Username must be at least 3 characters')
                    .max(50, 'Username must not exceed 50 characters')
                    .regex(/^[a-zA-Z0-9_@.-]+$/, 'Username can only contain alphanumeric, @, _, ., -'),
               email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
               password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
               image: z.string().url('Invalid image URL').optional(),
               confirmPassword: z.string({ required_error: 'Confirm Password is required' }),
               bio: z.string().optional(),
               socialLinks: z
                    .object({
                         x: z.string().url('Invalid X URL').optional().or(z.literal('')),
                         instagram: z.string().url('Invalid Instagram URL').optional().or(z.literal('')),
                         youtube: z.string().url('Invalid YouTube URL').optional().or(z.literal('')),
                    })
                    .optional(),
          })
          .refine((data) => data.password === data.confirmPassword, {
               message: "Passwords don't match",
               path: ['confirmPassword'],
          }),
});
const createForgetPasswordZodSchema = z.object({
     body: z.object({
          email: z.string({ required_error: 'Email is required' }),
     }),
});

const createResetPasswordZodSchema = z.object({
     body: z.object({
          newPassword: z.string({ required_error: 'Password is required' }),
          confirmPassword: z.string({
               required_error: 'Confirm Password is required',
          }),
     }),
});

const createChangePasswordZodSchema = z.object({
     body: z.object({
          currentPassword: z.string({
               required_error: 'Current Password is required',
          }),
          newPassword: z.string({ required_error: 'New Password is required' }),
          confirmPassword: z.string({
               required_error: 'Confirm Password is required',
          }),
     }),
});

export const AuthValidation = {
     createVerifyEmailZodSchema,
     createForgetPasswordZodSchema,
     createLoginZodSchema,
     createResetPasswordZodSchema,
     createChangePasswordZodSchema,
     createRegisterZodSchema,
};
