import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountMenu } from '../../../src/features/account/components/AccountMenu';
import { AuthModal } from '../../../src/features/account/components/AuthModal';
import { ProfileModal } from '../../../src/features/account/components/ProfileModal';
import { AccountSettingsModal } from '../../../src/features/account/components/AccountSettingsModal';
import { useAuthStore } from '../../../src/features/account/stores/authStore';

describe('Account Feature Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      status: 'unauthenticated',
      user: null,
      profile: null,
      session: null,
      isConfigured: true,
      isLoading: false,
      error: null,
      activeModal: 'none',
      authView: 'login',
      pendingEmail: null,
    });
  });

  it('renders Sign In button when unauthenticated and opens AuthModal on click', () => {
    render(<AccountMenu />);

    // Should find sign in trigger
    const signInBtn = screen.getByRole('button', { name: /đăng nhập|sign in/i });
    expect(signInBtn).toBeInTheDocument();

    fireEvent.click(signInBtn);
    expect(useAuthStore.getState().activeModal).toBe('auth');
    expect(useAuthStore.getState().authView).toBe('login');
  });

  it('renders user monogram and opens dropdown when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'u-1', email: 'test@nookspace.app' } as any,
      profile: {
        id: 'u-1',
        email: 'test@nookspace.app',
        displayName: 'Nook User',
        avatarUrl: null,
        bio: null,
        language: 'vi',
        theme: 'dark',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z',
      },
    });

    render(<AccountMenu />);

    const menuTrigger = screen.getByRole('button', { name: /hồ sơ|profile/i });
    expect(menuTrigger).toBeInTheDocument();
    expect(screen.getByText('Nook User')).toBeInTheDocument();

    // Click trigger to open dropdown
    fireEvent.click(menuTrigger);
    expect(screen.getByText('test@nookspace.app')).toBeInTheDocument();
    expect(screen.getByText(/hồ sơ cá nhân|my profile/i)).toBeInTheDocument();
    expect(screen.getByText(/cài đặt tài khoản|account settings/i)).toBeInTheDocument();
  });

  it('renders AuthModal with form inputs and switch view links', () => {
    useAuthStore.setState({
      activeModal: 'auth',
      authView: 'login',
    });

    render(<AuthModal />);

    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

    // Switch to register view
    const registerLink = screen.getByRole('button', { name: /đăng ký|sign up/i });
    fireEvent.click(registerLink);

    expect(useAuthStore.getState().authView).toBe('register');
  });

  it('renders ProfileModal and allows editing fields', () => {
    useAuthStore.setState({
      activeModal: 'profile',
      user: { id: 'u-1', email: 'editor@nookspace.app' } as any,
      profile: {
        id: 'u-1',
        email: 'editor@nookspace.app',
        displayName: 'Original Name',
        avatarUrl: null,
        bio: 'Hello world',
        language: 'vi',
        theme: 'system',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z',
      },
    });

    render(<ProfileModal />);

    const nameInput = screen.getByDisplayValue('Original Name');
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect((nameInput as HTMLInputElement).value).toBe('New Name');
  });

  it('renders AccountSettingsModal with mode explanations', () => {
    useAuthStore.setState({
      activeModal: 'settings',
      user: { id: 'u-99', email: 'settings@nookspace.app' } as any,
    });

    render(<AccountSettingsModal />);

    expect(screen.getByText('settings@nookspace.app')).toBeInTheDocument();
    expect(screen.getByText(/kiến trúc hai chế độ|dual operating modes/i)).toBeInTheDocument();
  });
});
