import modelWeights from './model_weights.json';
import {
  extractMultiHandFeatures,
  type LandmarkPoint,
  type MotionData
} from './featureExtractor';
import { VALIDATED_ISL_DICTIONARY, type ISLSignEntry } from './dictionaryData';

export interface ClassificationResult {
  label: string;
  displayName: string;
  confidence: number;
  isRecognized: boolean;
  category?: string;
  description?: string;
  isTwoHanded?: boolean;
  matchedEntry?: ISLSignEntry;
  rawPredictedClass?: string;
  margin?: number;
  rejectionReason?: string;
  rawProbabilities?: { [key: string]: number };
  consensusBuffer?: string[];
}

// In-browser feedforward neural network inference with multi-hand support & temporal smoothing
export class ISLLandmarkClassifier {
  private weights0: number[][];
  private biases0: number[];
  private weights1: number[][];
  private biases1: number[];
  private classes: string[];
  private rejectionThreshold: number;
  private marginThreshold: number;

  // Temporal smoothing ring buffer (last 5 predictions)
  private predictionBuffer: string[] = [];
  private readonly BUFFER_SIZE = 5;

  constructor(threshold: number = 0.65) {
    this.classes = (modelWeights as any).classes;
    this.rejectionThreshold = threshold;
    this.marginThreshold = 0.15;
    this.weights0 = (modelWeights as any).weights0 || (modelWeights as any).layers?.[0]?.weights;
    this.biases0 = (modelWeights as any).biases0 || (modelWeights as any).layers?.[0]?.biases;
    this.weights1 = (modelWeights as any).weights1 || (modelWeights as any).layers?.[1]?.weights;
    this.biases1 = (modelWeights as any).biases1 || (modelWeights as any).layers?.[1]?.biases;
  }

  public setRejectionThreshold(threshold: number): void {
    this.rejectionThreshold = Math.max(0.0, Math.min(1.0, threshold));
  }

  public getRejectionThreshold(): number {
    return this.rejectionThreshold;
  }

  public resetTemporalBuffer(): void {
    this.predictionBuffer = [];
  }

  public getBufferHistory(): string[] {
    return [...this.predictionBuffer];
  }

  /**
   * Classifies multi-hand inputs with canonical intrinsic geometry and temporal motion.
   */
  public classifyMultiHand(
    primaryHand: LandmarkPoint[] | null | undefined,
    secondaryHand?: LandmarkPoint[] | null,
    motion?: MotionData
  ): ClassificationResult {
    if (!primaryHand || primaryHand.length !== 21) {
      this.resetTemporalBuffer();
      return {
        label: 'UNKNOWN',
        displayName: 'No hand detected',
        confidence: 0.0,
        isRecognized: false,
        rejectionReason: 'No hand detected in camera frame',
        consensusBuffer: [],
      };
    }

    const features = extractMultiHandFeatures(primaryHand, secondaryHand, motion);

    // Layer 1: Dense 122 -> 128 with ReLU activation
    const hiddenSize = this.biases0.length;
    const hidden = new Array<number>(hiddenSize);
    for (let j = 0; j < hiddenSize; j++) {
      let sum = this.biases0[j];
      for (let i = 0; i < features.length; i++) {
        sum += features[i] * this.weights0[i][j];
      }
      hidden[j] = Math.max(0, sum); // ReLU
    }

    // Layer 2: Dense 128 -> N_CLASSES with Softmax activation
    const numClasses = this.classes.length;
    const logits = new Array<number>(numClasses);
    let maxLogit = -Infinity;

    for (let k = 0; k < numClasses; k++) {
      let sum = this.biases1[k];
      for (let j = 0; j < hiddenSize; j++) {
        sum += hidden[j] * this.weights1[j][k];
      }
      logits[k] = sum;
      if (sum > maxLogit) maxLogit = sum;
    }

    // Numerically stable Softmax
    let sumExp = 0;
    const probs = new Array<number>(numClasses);
    for (let k = 0; k < numClasses; k++) {
      probs[k] = Math.exp(logits[k] - maxLogit);
      sumExp += probs[k];
    }

    let bestIdx = 0;
    let maxProb = 0;
    const rawProbs: { [key: string]: number } = {};

    for (let k = 0; k < numClasses; k++) {
      probs[k] = probs[k] / sumExp;
      rawProbs[this.classes[k]] = probs[k];
      if (probs[k] > maxProb) {
        maxProb = probs[k];
        bestIdx = k;
      }
    }

    let secondMaxProb = 0;
    for (let k = 0; k < numClasses; k++) {
      if (k !== bestIdx && probs[k] > secondMaxProb) {
        secondMaxProb = probs[k];
      }
    }

    const margin = maxProb - secondMaxProb;
    const rawClass = this.classes[bestIdx];
    let rejectedLabel = rawClass;
    let rejectionReason = 'None (Valid prediction)';

    // Multi-hand constraint: if the predicted sign is two-handed, enforce secondary hand presence
    const isTwoHandedSign = ['NAMASTE', 'HELP', 'DOCTOR'].includes(rawClass);
    const hasSecondaryHand = Boolean(secondaryHand && secondaryHand.length === 21);

    if (isTwoHandedSign && !hasSecondaryHand) {
      rejectedLabel = 'UNKNOWN';
      rejectionReason = `Requires both hands (secondary hand missing for ${rawClass})`;
    } else if (rawClass === 'UNKNOWN') {
      rejectedLabel = 'UNKNOWN';
      rejectionReason = 'Pose recognized as out-of-distribution (UNKNOWN)';
    } else if (maxProb < this.rejectionThreshold) {
      rejectedLabel = 'UNKNOWN';
      rejectionReason = `Confidence ${(maxProb * 100).toFixed(1)}% < threshold ${(this.rejectionThreshold * 100).toFixed(1)}%`;
    } else if (margin < this.marginThreshold) {
      rejectedLabel = 'UNKNOWN';
      rejectionReason = `Ambiguous margin ${(margin * 100).toFixed(1)}% < ${(this.marginThreshold * 100).toFixed(1)}%`;
    }

    // Temporal consensus smoothing:
    this.predictionBuffer.push(rejectedLabel);
    if (this.predictionBuffer.length > this.BUFFER_SIZE) {
      this.predictionBuffer.shift();
    }

    // Determine consensus class across buffer
    const counts: { [label: string]: number } = {};
    for (const label of this.predictionBuffer) {
      counts[label] = (counts[label] || 0) + 1;
    }

    let consensusClass = 'UNKNOWN';
    let maxCount = 0;
    for (const [lbl, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        consensusClass = lbl;
      }
    }

    // Require majority consensus (at least 3 of 5 frames) to switch or confirm recognized state
    const finalClass = maxCount >= 3 ? consensusClass : 'UNKNOWN';
    if (finalClass === 'UNKNOWN' && rejectionReason === 'None (Valid prediction)') {
      rejectionReason = `Temporal consensus unstable (${maxCount}/${this.predictionBuffer.length} frames)`;
    }

    if (finalClass === 'UNKNOWN') {
      return {
        label: 'UNKNOWN',
        displayName: 'Not recognized',
        confidence: maxProb,
        isRecognized: false,
        rawPredictedClass: rawClass,
        margin,
        rejectionReason,
        rawProbabilities: rawProbs,
        consensusBuffer: [...this.predictionBuffer],
      };
    }

    const matchedEntry = VALIDATED_ISL_DICTIONARY.find(
      (d) => d.label.toUpperCase() === finalClass.toUpperCase()
    );

    const displayName = matchedEntry
      ? matchedEntry.englishPhrase.split('/')[0].trim()
      : finalClass.replace(/_/g, ' ');

    return {
      label: finalClass,
      displayName,
      confidence: maxProb,
      isRecognized: true,
      category: matchedEntry?.category,
      description: matchedEntry?.description,
      isTwoHanded: matchedEntry?.twoHanded,
      matchedEntry,
      rawPredictedClass: rawClass,
      margin,
      rejectionReason: 'None (Confirmed by majority consensus)',
      rawProbabilities: rawProbs,
      consensusBuffer: [...this.predictionBuffer],
    };
  }

  /**
   * Single-hand backward compatibility method.
   */
  public classifyLandmarks(landmarks: LandmarkPoint[]): ClassificationResult {
    return this.classifyMultiHand(landmarks, null);
  }
}

export const defaultClassifier = new ISLLandmarkClassifier(0.65);
