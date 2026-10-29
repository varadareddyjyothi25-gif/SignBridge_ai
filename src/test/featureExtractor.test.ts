import { describe, it, expect } from 'vitest';
import {
  extractSingleHandFeatures,
  extractMultiHandFeatures,
  extractHandFeatures,
  type LandmarkPoint,
} from '../ml/featureExtractor';

describe('Landmark Feature Extractor (Canonical Intrinsic & Multi-Hand)', () => {
  it('throws an error if fewer than 21 landmarks are provided to extractHandFeatures', () => {
    const invalidLandmarks: LandmarkPoint[] = [{ x: 0.5, y: 0.5 }];
    expect(() => extractHandFeatures(invalidLandmarks)).toThrow(/Expected 21 landmarks/);
  });

  it('produces an invariant 53-dimensional feature vector for a single hand', () => {
    const dummyLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + i * 0.01,
      y: 0.8 - i * 0.02,
      z: 0.0,
    }));

    const features = extractSingleHandFeatures(dummyLandmarks);
    expect(features).toHaveLength(53);
    expect(features.every((f) => typeof f === 'number' && !isNaN(f))).toBe(true);
  });

  it('produces a full 122-dimensional feature vector for multi-hand setup', () => {
    const primary: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.4 + i * 0.005,
      y: 0.6 - i * 0.01,
    }));
    const secondary: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.6 + i * 0.005,
      y: 0.6 - i * 0.01,
    }));

    const features = extractMultiHandFeatures(primary, secondary, {
      dx: 0.02,
      dy: -0.01,
      tipSpeed: 0.05,
      oscX: 0.01,
      oscY: 0.02,
    });

    expect(features).toHaveLength(122);
    // Two-hand presence flag at index 116 (53 primary + 53 secondary + 10 inter = index 116)
    expect(features[116]).toBe(1.0);
    // Motion features at end (117 to 121)
    expect(features[117]).toBeCloseTo(0.02);
    expect(features[118]).toBeCloseTo(-0.01);
  });

  it('zeroes secondary features when secondary hand is missing', () => {
    const primary: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + i * 0.01,
      y: 0.7 - i * 0.015,
    }));

    const features = extractMultiHandFeatures(primary, null);
    expect(features).toHaveLength(122);
    // Secondary hand features (indices 53 to 105) should all be 0
    const secFeatures = features.slice(53, 106);
    expect(secFeatures.every((v) => v === 0.0)).toBe(true);
    // Two-hand flag (index 116) should be 0.0
    expect(features[116]).toBe(0.0);
  });

  it('is translation-invariant when the hand is shifted across the camera frame', () => {
    const baseLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.3 + i * 0.01,
      y: 0.4 + i * 0.01,
    }));

    const shiftedLandmarks: LandmarkPoint[] = baseLandmarks.map((p) => ({
      x: p.x + 0.35,
      y: p.y + 0.25,
    }));

    const baseFeatures = extractSingleHandFeatures(baseLandmarks);
    const shiftedFeatures = extractSingleHandFeatures(shiftedLandmarks);

    for (let i = 0; i < 53; i++) {
      expect(baseFeatures[i]).toBeCloseTo(shiftedFeatures[i], 4);
    }
  });
});
