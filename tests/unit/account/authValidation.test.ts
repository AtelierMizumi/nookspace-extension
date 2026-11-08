import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../../../src/features/account/validation/authValidation';

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const res = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid email formats', () => {
      const res = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('auth.validation.emailInvalid');
      }
    });

    it('rejects password shorter than 6 chars', () => {
      const res = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('auth.validation.passwordMinLength');
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const res = registerSchema.safeParse({
        email: 'newuser@example.com',
        displayName: 'Nook Explorer',
        password: 'securepassword',
        confirmPassword: 'securepassword',
      });
      expect(res.success).toBe(true);
    });

    it('rejects when password and confirmPassword do not match', () => {
      const res = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: 'passwordA',
        confirmPassword: 'passwordB',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('auth.validation.passwordsDoNotMatch');
      }
    });

    it('rejects display name exceeding 50 characters', () => {
      const res = registerSchema.safeParse({
        email: 'newuser@example.com',
        displayName: 'a'.repeat(51),
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('auth.validation.displayNameMaxLength');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid email for recovery', () => {
      const res = resetPasswordSchema.safeParse({
        email: 'recovery@example.com',
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty email', () => {
      const res = resetPasswordSchema.safeParse({
        email: '',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts valid profile updates', () => {
      const res = updateProfileSchema.safeParse({
        displayName: 'Updated Name',
        bio: 'Focus and Productivity',
        language: 'vi',
      });
      expect(res.success).toBe(true);
    });

    it('rejects bio longer than 200 characters', () => {
      const res = updateProfileSchema.safeParse({
        bio: 'x'.repeat(201),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('auth.validation.bioMaxLength');
      }
    });
  });
});
