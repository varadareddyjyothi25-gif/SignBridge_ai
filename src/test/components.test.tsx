import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignVisualizer } from '../components/SignVisualizer';
import { TextToSignView } from '../components/TextToSignView';
import { VALIDATED_ISL_DICTIONARY } from '../ml/dictionaryData';
import { AuthProvider } from '../context/AuthContext';

describe('SignVisualizer & TextToSign Component UI', () => {
  const sampleSign = VALIDATED_ISL_DICTIONARY[0]; // NAMASTE

  it('renders sign title, category, and step instructions', () => {
    render(<SignVisualizer entry={sampleSign} />);

    expect(screen.getByText(sampleSign.englishPhrase)).toBeInTheDocument();
    expect(screen.getByText(/ISLRTC Indian Sign Language/i)).toBeInTheDocument();
    expect(screen.getByText(sampleSign.stepInstructions[0])).toBeInTheDocument();
  });

  it('toggles playback pause/play state when button is clicked', () => {
    render(<SignVisualizer entry={sampleSign} />);

    const pauseBtn = screen.getByLabelText(/pause animation/i);
    expect(pauseBtn).toBeInTheDocument();

    fireEvent.click(pauseBtn);
    expect(screen.getByLabelText(/play animation/i)).toBeInTheDocument();
  });

  it('changes playback speed when speed pill is clicked', () => {
    render(<SignVisualizer entry={sampleSign} />);

    const halfSpeedBtn = screen.getByRole('button', { name: '0.5x' });
    fireEvent.click(halfSpeedBtn);
    expect(halfSpeedBtn).toHaveClass('bg-brand-600');
  });

  it('TextToSignView renders search and shows unsupported message for unknown words', () => {
    render(
      <AuthProvider>
        <TextToSignView />
      </AuthProvider>
    );

    const input = screen.getByPlaceholderText(/type an english or hindi word/i);
    const searchBtn = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'Supercalifragilistic' } });
    fireEvent.click(searchBtn);

    expect(screen.getByText(/unsupported word or phrase/i)).toBeInTheDocument();
  });
});
