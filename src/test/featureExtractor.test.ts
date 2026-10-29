import { describe, it, expect } from 'vitest';
import { extractHandFeatures, type LandmarkPoint } from '../ml/featureExtractor';

describe('Landmark Feature Extractor', () => {
  it('throws an error if fewer than 21 landmarks are provided', () => {
    const invalidLandmarks: LandmarkPoint[] = [{ x: 0.5, y: 0.5 }];
    expect(() => extractHandFeatures(invalidLandmarks)).toThrow(/Expected 21 landmarks/);
  });

  it('produces an invariant 51-dimensional feature vector for 21 landmarks', () => {
    const dummyLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + (i * 0.01),
      y: 0.8 - (i * 0.02),
      z: 0.0
    }));

    const features = extractHandFeatures(dummyLandmarks);
    expect(features).toHaveLength(51);
    expect(features.every(f => typeof f === 'number' && !isNaN(f))).toBe(true);
  });

  it('is translation-invariant when the entire hand is shifted across the screen', () => {
    const baseLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.3 + (i * 0.01),
      y: 0.4 + (i * 0.01),
      z: 0.0
    }));

    // Shift all points by (+0.4, +0.3)
    const shiftedLandmarks: LandmarkPoint[] = baseLandmarks.map(p => ({
      x: p.x + 0.4,
      y: p.y + 0.3,
      z: 0.0
    }));

    const baseFeatures = extractHandFeatures(baseLandmarks);
    const shiftedFeatures = extractHandFeatures(shiftedLandmarks);

    for (let i = 0; i < 51; i++) {
      expect(baseFeatures[i]).toBeCloseTo(shiftedFeatures[i], 4);
    }
  });
});
