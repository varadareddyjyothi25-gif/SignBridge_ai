import { describe, it, expect } from 'vitest';
import { ISLLandmarkClassifier } from '../ml/islClassifier';
import type { LandmarkPoint } from '../ml/featureExtractor';

describe('ISL Landmark Classifier & Rejection Policy', () => {
  const classifier = new ISLLandmarkClassifier(0.65);

  it('rejects ambiguous/unstructured landmarks as Not recognized', () => {
    // Unstructured ambiguous landmarks (e.g. resting flat hand with uniform non-ISL shape)
    const unstructuredLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + Math.sin(i) * 0.05,
      y: 0.5 + Math.cos(i) * 0.05,
      z: 0.0
    }));

    const result = classifier.classifyLandmarks(unstructuredLandmarks);
    expect(result.isRecognized).toBe(false);
    expect(result.displayName).toBe('Not recognized');
  });

  it('respects dynamic rejection threshold adjustments', () => {
    const testLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + (i * 0.005),
      y: 0.8 - (i * 0.015),
      z: 0.0
    }));

    classifier.setRejectionThreshold(0.999);
    const highThresholdResult = classifier.classifyLandmarks(testLandmarks);
    expect(highThresholdResult.isRecognized).toBe(false);

    classifier.setRejectionThreshold(0.65); // Reset
  });

  it('correctly provides probability calibration distributions', () => {
    const landmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5,
      y: 0.8 - (i * 0.02),
      z: 0.0
    }));

    const result = classifier.classifyLandmarks(landmarks);
    expect(result.rawProbabilities).toBeDefined();
    if (result.rawProbabilities) {
      const sum = Object.values(result.rawProbabilities).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });
});
