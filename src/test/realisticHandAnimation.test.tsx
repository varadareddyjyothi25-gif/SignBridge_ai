import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RealisticSignViewer } from '../components/RealisticSignViewer';
import { isWebGLAvailable, SKIN_TONES } from '../types/sign3d';
import { SignVisualizer } from '../components/SignVisualizer';
import { VALIDATED_ISL_DICTIONARY } from '../ml/dictionaryData';
import { getSignKinematics } from '../components/RealisticHand3D';

describe('Realistic Human Hand Sign Animation & Viewer', () => {
  const namasteSign = VALIDATED_ISL_DICTIONARY.find((s) => s.label === 'NAMASTE')!;

  it('checks WebGL availability gracefully', () => {
    expect(typeof isWebGLAvailable()).toBe('boolean');
  });

  it('provides all 4 anatomically plausible skin tones', () => {
    const toneKeys = Object.keys(SKIN_TONES);
    expect(toneKeys).toEqual(['fair', 'wheatish', 'olive', 'deep']);
    expect(SKIN_TONES.fair.skinColor).toBeDefined();
    expect(SKIN_TONES.wheatish.skinColor).toBeDefined();
    expect(SKIN_TONES.olive.skinColor).toBeDefined();
    expect(SKIN_TONES.deep.skinColor).toBeDefined();
  });

  it('renders RealisticSignViewer with camera angle presets and skin tone selectors', () => {
    render(<RealisticSignViewer signLabel="NAMASTE" progress={50} isTwoHanded={true} />);

    // Angle buttons
    expect(screen.getByRole('button', { name: /^front$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3d angle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^side$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^top$/i })).toBeInTheDocument();

    // Skin tone buttons
    expect(screen.getByRole('button', { name: /Select Fair skin tone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Wheatish skin tone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Olive \/ Tan skin tone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Deep Brown skin tone/i })).toBeInTheDocument();

    // Coordinated 3D hand badge
    expect(screen.getByText(/Anatomically Rigged 3D Hand/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Hands Coordinated/i)).toBeInTheDocument();
  });

  it('calculates validated two-handed kinematics for NAMASTE, HELP, and DOCTOR', () => {
    const namastePose = getSignKinematics('NAMASTE', 50);
    expect(namastePose.dominant).toBeDefined();
    expect(namastePose.secondary).toBeDefined();
    // Both hands aligned facing each other
    expect(namastePose.dominant.wristPos.x).toBeGreaterThan(0);
    expect(namastePose.secondary!.wristPos.x).toBeLessThan(0);

    const helpPose = getSignKinematics('HELP', 50);
    expect(helpPose.dominant).toBeDefined();
    expect(helpPose.secondary).toBeDefined();
    // Supporting palm is flat palm-up (rot[0] < -1 rad)
    expect(helpPose.secondary!.wristRot[0]).toBeLessThan(-1.0);

    const doctorPose = getSignKinematics('DOCTOR', 50);
    expect(doctorPose.dominant).toBeDefined();
    expect(doctorPose.secondary).toBeDefined();
  });

  it('calculates validated single-hand kinematics for HELLO and YES', () => {
    const helloPose = getSignKinematics('HELLO', 25);
    expect(helloPose.dominant).toBeDefined();
    // Fingers extended for wave
    expect(helloPose.dominant.index.bend[0]).toBeLessThan(0.3);
    expect(helloPose.dominant.middle.bend[0]).toBeLessThan(0.3);

    const yesPose = getSignKinematics('YES', 50);
    expect(yesPose.dominant).toBeDefined();
    // Fist curled for nod
    expect(yesPose.dominant.index.bend[0]).toBeGreaterThan(0.7);
    expect(yesPose.dominant.middle.bend[0]).toBeGreaterThan(0.7);
  });

  it('SignVisualizer embeds Realistic 3D Human Hand view with playback controls', () => {
    render(<SignVisualizer entry={namasteSign} />);

    // Toggle button for 3D hand
    expect(screen.getByRole('button', { name: /Realistic 3D Human Hand/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2D Diagram/i })).toBeInTheDocument();

    // Controls
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByTitle(/restart/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0.5x' })).toBeInTheDocument();

    // Provenance
    expect(screen.getByText(/ISLRTC Indian Sign Language Standard Corpus/i)).toBeInTheDocument();
  });
});
