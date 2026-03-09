import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import React from 'react';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../app/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const { ProtectedRoute } = await import('../app/lib/ProtectedRoute');

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      profileError: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter initialEntries={['/applicant']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows error page when profile fails to load', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: null,
      loading: false,
      profileError: 'infinite recursion detected',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Profile Unavailable')).toBeInTheDocument();
    expect(screen.getByText('infinite recursion detected')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows spinner when user exists but profile is still loading (null, no error)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: null,
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Should show spinner, not content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user and profile are loaded (no role requirement)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', role: 'applicant' },
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when role matches requiredRole', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', role: 'admin' },
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects applicant away from admin routes', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', role: 'applicant' },
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects admin away from applicant routes', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', role: 'admin' },
      loading: false,
      profileError: null,
    });

    render(
      <MemoryRouter initialEntries={['/applicant']}>
        <ProtectedRoute requiredRole="applicant">
          <div>Applicant Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Applicant Content')).not.toBeInTheDocument();
  });
});
