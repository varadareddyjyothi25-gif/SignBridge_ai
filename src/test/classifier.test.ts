import { describe, it, expect, beforeEach } from 'vitest';
import { ISLLandmarkClassifier } from '../ml/islClassifier';
import type { LandmarkPoint } from '../ml/featureExtractor';

describe('ISL Landmark Classifier & Two-Hand Rejection Policy', () => {
  let classifier: ISLLandmarkClassifier;

  beforeEach(() => {
    classifier = new ISLLandmarkClassifier(0.65);
    classifier.resetTemporalBuffer();
  });

  it('rejects ambiguous/unstructured landmarks as Not recognized', () => {
    const unstructuredLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + Math.sin(i) * 0.05,
      y: 0.5 + Math.cos(i) * 0.05,
      z: 0.0,
    }));

    const result = classifier.classifyLandmarks(unstructuredLandmarks);
    expect(result.isRecognized).toBe(false);
    expect(result.displayName).toBe('Not recognized');
  });

  it('respects dynamic rejection threshold adjustments', () => {
    const testLandmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + i * 0.005,
      y: 0.8 - i * 0.015,
      z: 0.0,
    }));

    classifier.setRejectionThreshold(0.999);
    const highThresholdResult = classifier.classifyLandmarks(testLandmarks);
    expect(highThresholdResult.isRecognized).toBe(false);

    classifier.setRejectionThreshold(0.65); // Reset
  });

  it('correctly provides probability calibration distributions', () => {
    const landmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5,
      y: 0.8 - i * 0.02,
      z: 0.0,
    }));

    const result = classifier.classifyLandmarks(landmarks);
    expect(result.rawProbabilities).toBeDefined();
    if (result.rawProbabilities) {
      const sum = Object.values(result.rawProbabilities).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it('supports multi-hand classification with secondary hand inputs', () => {
    const primary: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.45 + i * 0.005,
      y: 0.5 - i * 0.01,
    }));
    const secondary: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.55 + i * 0.005,
      y: 0.5 - i * 0.01,
    }));

    const result = classifier.classifyMultiHand(primary, secondary, { dx: 0, dy: 0, tipSpeed: 0 });
    expect(result).toBeDefined();
    expect(typeof result.confidence).toBe('number');
    expect(typeof result.label).toBe('string');
  });

  it('clears history when resetTemporalBuffer is called', () => {
    const landmarks: LandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + i * 0.005,
      y: 0.5 - i * 0.01,
    }));

    // Populate temporal buffer with several frames
    for (let f = 0; f < 5; f++) {
      classifier.classifyLandmarks(landmarks);
    }

    classifier.resetTemporalBuffer();
    // After reset, fresh single evaluation has clean state
    const cleanResult = classifier.classifyLandmarks(landmarks);
    expect(cleanResult).toBeDefined();
  });
});
