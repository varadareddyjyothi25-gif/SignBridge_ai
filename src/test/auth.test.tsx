import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';

const TestAuthConsumer = () => {
  const { user, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="user-status">{user ? user.fullName : 'Guest'}</span>
      <button onClick={() => signIn('tester@sparsha.org', 'securePass123!')}>Sign In Demo</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

describe('Authentication Flow and State Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders guest state initially when not signed in', () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-status')).toHaveTextContent('Guest');
  });

  it('signs in a user and updates auth state cleanly', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Sign In Demo'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Tester');
    });
  });

  it('signs out a user cleanly and clears session', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Sign In Demo'));
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Tester');
    });

    fireEvent.click(screen.getByText('Sign Out'));
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Guest');
    });
  });

  it('validates password length and email structure in AuthModal', async () => {
    render(
      <AuthProvider>
        <AuthModal isOpen={true} initialMode="signup" onClose={() => {}} />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('name@example.com');
    const nameInput = screen.getByPlaceholderText('e.g. Priya Sharma');
    const passwordInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Repeat your password');
    const submitBtn = screen.getByRole('button', { name: /create account/i });

    // Mismatched passwords
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Valid User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });
});
