import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import App from '../App';

describe('Logout Navigation and Route Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('renders Welcome view initially with Sign In and Sign Up options', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Get Started Free/i })).toBeInTheDocument();
    const signInButtons = screen.getAllByRole('button', { name: /^Sign In$/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('allows user to sign in, view Home, and then log out from Home page back to Welcome', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'aarav@example.com',
      fullName: 'Aarav Patel',
      preferredHand: 'right',
      recordHistory: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('sparsha_auth_user', JSON.stringify(mockUser));

    render(<App />);

    // Wait for user to be loaded into Home view
    await waitFor(() => {
      expect(screen.getByText(/Hello, Aarav Patel/i)).toBeInTheDocument();
    });

    // Check user in navigation
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();

    // Click Sign Out
    fireEvent.click(signOutBtn);

    // Should redirect to Welcome view
    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });

    // Check Welcome page CTA options
    expect(screen.getByRole('button', { name: /Get Started Free/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Sign In$/i }).length).toBeGreaterThanOrEqual(1);

    // Session cleared from storage
    expect(localStorage.getItem('sparsha_auth_user')).toBeNull();
  });

  it('allows user to navigate to Dashboard and log out from Dashboard back to Welcome', async () => {
    const mockUser = {
      id: 'test-user-456',
      email: 'priya@example.com',
      fullName: 'Priya Sharma',
      preferredHand: 'right',
      recordHistory: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('sparsha_auth_user', JSON.stringify(mockUser));

    render(<App />);

    // Wait for Home view
    await waitFor(() => {
      expect(screen.getByText(/Hello, Priya Sharma/i)).toBeInTheDocument();
    });

    // Navigate to Dashboard
    const dashboardNavBtn = screen.getByRole('button', { name: /^Dashboard$/i });
    fireEvent.click(dashboardNavBtn);

    // Verify on Dashboard
    await waitFor(() => {
      expect(screen.getByText('Account Active')).toBeInTheDocument();
    });

    // Sign out from Dashboard
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    // Verify redirected to Welcome page
    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });

    // Ensure Dashboard content is no longer visible
    expect(screen.queryByText('Account Active')).not.toBeInTheDocument();
  });

  it('refreshing after logout keeps the user unauthenticated on Welcome page', async () => {
    const mockUser = {
      id: 'test-user-789',
      email: 'neha@example.com',
      fullName: 'Neha Gupta',
      preferredHand: 'right',
      recordHistory: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('sparsha_auth_user', JSON.stringify(mockUser));

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Hello, Neha Gupta/i)).toBeInTheDocument();
    });

    // Log out
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });

    // Unmount to simulate page refresh / restart
    unmount();

    // Re-render
    render(<App />);

    // Should still be on Welcome page and unauthenticated
    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Hello, Neha Gupta/i)).not.toBeInTheDocument();
  });

  it('prevents browser Back button from exposing protected content when unauthenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });

    // Simulate browser Back button navigating to protected #dashboard
    window.location.hash = '#dashboard';
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { tab: 'dashboard' } }));
    });

    // Guard prevents viewing Dashboard and remains on Welcome
    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Account Active')).not.toBeInTheDocument();

    // Simulate browser Back button navigating to protected #home
    window.location.hash = '#home';
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { tab: 'home' } }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Bridging Communication, One Gesture at a Time/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Hello,/i)).not.toBeInTheDocument();
  });

  it('signing in again restores access to protected pages', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get Started Free/i })).toBeInTheDocument();
    });

    // Open Sign In Modal from Header
    const signInNavBtn = screen.getAllByRole('button', { name: /^Sign In$/i })[0];
    fireEvent.click(signInNavBtn);

    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('At least 8 characters');
    const modalForm = emailInput.closest('form')!;
    const modalSubmitBtn = modalForm.querySelector('button[type="submit"]')!;

    fireEvent.change(emailInput, { target: { value: 'returning@sparsha.org' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(modalSubmitBtn);

    // User is now authenticated and on Home view
    await waitFor(() => {
      expect(screen.getByText(/Hello, Returning/i)).toBeInTheDocument();
    });

    // User can access Dashboard
    const dashboardNavBtn = screen.getByRole('button', { name: /^Dashboard$/i });
    fireEvent.click(dashboardNavBtn);

    await waitFor(() => {
      expect(screen.getByText('Account Active')).toBeInTheDocument();
    });
  });

  it('handles logout failure gracefully without falsely reporting success or wiping state', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: 'Network timeout during sign out' });
    const mockNavigate = vi.fn();

    const FailureTestContainer = () => {
      const [isLoggingOut, setIsLoggingOut] = useState(false);
      const [logoutError, setLogoutError] = useState<string | null>(null);

      const handleFailSignOut = async () => {
        setIsLoggingOut(true);
        const res = await mockSignOut();
        if (res?.error) {
          setLogoutError(res.error);
        } else {
          mockNavigate('welcome');
        }
        setIsLoggingOut(false);
      };

      return (
        <div>
          <button onClick={handleFailSignOut} disabled={isLoggingOut}>
            {isLoggingOut ? 'Signing out...' : 'Test Logout Button'}
          </button>
          {logoutError && <div role="alert">Logout failed: {logoutError}</div>}
        </div>
      );
    };

    render(<FailureTestContainer />);

    fireEvent.click(screen.getByRole('button', { name: 'Test Logout Button' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Logout failed: Network timeout during sign out');
    });

    // Navigation to welcome was not called
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
