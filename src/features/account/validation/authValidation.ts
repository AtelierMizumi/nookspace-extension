import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'auth.validation.emailRequired' })
    .email({ message: 'auth.validation.emailInvalid' }),
  password: z
    .string()
    .min(6, { message: 'auth.validation.passwordMinLength' }),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, { message: 'auth.validation.emailRequired' })
      .email({ message: 'auth.validation.emailInvalid' }),
    displayName: z
      .string()
      .trim()
      .max(50, { message: 'auth.validation.displayNameMaxLength' })
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(6, { message: 'auth.validation.passwordMinLength' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'auth.validation.confirmPasswordRequired' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'auth.validation.emailRequired' })
    .email({ message: 'auth.validation.emailInvalid' }),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(50, { message: 'auth.validation.displayNameMaxLength' })
    .nullable()
    .optional(),
  bio: z
    .string()
    .trim()
    .max(200, { message: 'auth.validation.bioMaxLength' })
    .nullable()
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .nullable()
    .optional(),
  language: z.enum(['en', 'vi']).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
