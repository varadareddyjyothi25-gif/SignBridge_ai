import modelWeights from './model_weights.json';
import { extractHandFeatures, type LandmarkPoint } from './featureExtractor';
import { VALIDATED_ISL_DICTIONARY, type ISLSignEntry } from './dictionaryData';

export interface ClassificationResult {
  label: string;
  displayName: string;
  confidence: number;
  isRecognized: boolean;
  category?: string;
  description?: string;
  matchedEntry?: ISLSignEntry;
  rawProbabilities?: { [key: string]: number };
}

// In-browser feedforward neural network inference
export class ISLLandmarkClassifier {
  private weights0: number[][];
  private biases0: number[];
  private weights1: number[][];
  private biases1: number[];
  private classes: string[];
  private rejectionThreshold: number;

  constructor(threshold: number = 0.65) {
    this.classes = modelWeights.classes;
    this.rejectionThreshold = threshold;
    this.weights0 = modelWeights.layers[0].weights;
    this.biases0 = modelWeights.layers[0].biases;
    this.weights1 = modelWeights.layers[1].weights;
    this.biases1 = modelWeights.layers[1].biases;
  }

  public setRejectionThreshold(threshold: number): void {
    this.rejectionThreshold = Math.max(0.0, Math.min(1.0, threshold));
  }

  public getRejectionThreshold(): number {
    return this.rejectionThreshold;
  }

  public classifyLandmarks(landmarks: LandmarkPoint[]): ClassificationResult {
    const features = extractHandFeatures(landmarks);

    // Layer 1: Dense 51 -> 64 with ReLU activation
    const hiddenSize = this.biases0.length;
    const hidden = new Array<number>(hiddenSize);
    for (let j = 0; j < hiddenSize; j++) {
      let sum = this.biases0[j];
      for (let i = 0; i < features.length; i++) {
        sum += features[i] * this.weights0[i][j];
      }
      hidden[j] = Math.max(0, sum); // ReLU
    }

    // Layer 2: Dense 64 -> N_CLASSES with Softmax activation
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
    const predictedClass = this.classes[bestIdx];

    // Rejection policy:
    // 1. Max probability below configured rejection threshold
    // 2. Ambiguous gesture (margin between top-1 and top-2 is too narrow < 0.15)
    // 3. Classified into the explicit UNKNOWN out-of-distribution class
    if (
      maxProb < this.rejectionThreshold ||
      margin < 0.15 ||
      predictedClass === 'UNKNOWN'
    ) {
      return {
        label: 'UNKNOWN',
        displayName: 'Not recognized',
        confidence: maxProb,
        isRecognized: false,
        rawProbabilities: rawProbs,
      };
    }

    const matchedEntry = VALIDATED_ISL_DICTIONARY.find(
      d => d.label.toUpperCase() === predictedClass.toUpperCase()
    );

    const displayName = matchedEntry ? matchedEntry.englishPhrase.split('/')[0].trim() : predictedClass.replace(/_/g, ' ');

    return {
      label: predictedClass,
      displayName,
      confidence: maxProb,
      isRecognized: true,
      category: matchedEntry?.category,
      description: matchedEntry?.description,
      matchedEntry,
      rawProbabilities: rawProbs,
    };
  }
}

export const defaultClassifier = new ISLLandmarkClassifier(0.65);
