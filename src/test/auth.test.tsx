import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('../app/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithOtp: (...args: any[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const { AuthProvider, useAuth } = await import('../app/lib/AuthContext');

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? auth.user.id : 'null'}</span>
      <span data-testid="profile">{auth.profile ? auth.profile.email : 'null'}</span>
      <span data-testid="error">{auth.profileError || 'none'}</span>
      <button data-testid="signout" onClick={auth.signOut}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('starts in loading state and transitions to not loading when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('profile').textContent).toBe('null');
  });

  it('fetches profile when session exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const profileChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@test.com', role: 'applicant', first_name: 'Test' },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(profileChain);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('profile').textContent).toBe('test@test.com');
  });

  it('sets profileError when profile fetch fails', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const profileChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'infinite recursion', code: '42P17' },
      }),
    };
    mockFrom.mockReturnValue(profileChain);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('error').textContent).toContain('infinite recursion');
    expect(screen.getByTestId('profile').textContent).toBe('null');
  });

  it('clears state on sign out', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const profileChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@test.com', role: 'applicant' },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(profileChain);
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile').textContent).toBe('test@test.com');
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('signout'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('profile').textContent).toBe('null');
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
