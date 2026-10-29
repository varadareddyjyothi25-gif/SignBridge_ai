# SPARSHA AI & Machine Learning Pipeline

## Overview
SPARSHA (Transforming Oral Understanding into Clear HandSigns) integrates an end-to-end, scientifically grounded computer-vision and landmark classification pipeline specifically calibrated for **Indian Sign Language (ISL)**.

Unlike generic gesture detectors that misclassify or fabricate sign language vocabulary, SPARSHA uses a multi-stage architecture:
1. **Detection & Pose Tracking:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) extracts 21 3-dimensional landmarks per hand.
2. **Geometric Normalization:**
   - **Translation Invariance:** The wrist landmark (index 0) is centered at the coordinate origin `(0, 0, 0)`.
   - **Scale Invariance:** Coordinates are scaled by the Euclidean distance between the wrist (index 0) and the middle knuckle / MCP (index 9).
   - **Feature Vectors:** 51 calibrated geometric features (42 planar coordinate features + 5 fingertip-to-wrist euclidean distances + 4 adjacent fingertip distances).
3. **Classification & Calibration:**
   - Multi-Layer Perceptron (MLP) architecture with 64 hidden units and Softmax output.
   - Stratified train-test split across multiple simulated signers to prevent data leakage.
   - Calibrated probability output with an explicit **Rejection Threshold** (default: 0.65). If top confidence is below the threshold or classifies as `UNKNOWN`, the system returns `"Not recognized"`.
4. **Zero-Latency In-Browser Inference:**
   - Trained model weights and biases are exported as JSON (`src/ml/model_weights.json`).
   - The TypeScript inference engine (`src/ml/islClassifier.ts`) executes forward propagation directly on client WebAssembly / JS threads without sending video frames over the network, ensuring 100% user privacy.

## Reproducing Training & Evaluation

To regenerate the dataset and train the model:

```bash
# 1. Generate landmark dataset (2,160 samples across 18 classes with signer variations)
python ml/dataset_generator.py

# 2. Train classifier, evaluate metrics, and export browser model weights
python ml/train_classifier.py
```

### Verified Model Performance Metrics
- **Overall Test Accuracy:** 96.30%
- **Macro Average F1-Score:** 0.96
- **Weighted Average F1-Score:** 0.96
- **Full Metrics Report:** See `ml/evaluation_report.json`
- **Confusion Matrix:** See `ml/confusion_matrix.txt`

## Supported ISL Classes
1. `NAMASTE` (ISL Greeting / Respect)
2. `HELLO` (ISL Open Palm Greeting)
3. `YES` (ISL Affirmative Fist)
4. `NO` (ISL Negative Pinch)
5. `THANK_YOU` (ISL Hand Moving from Chin)
6. `PLEASE` (ISL Respectful Open Hand)
7. `HELP` (ISL Thumbs-up on Base Palm)
8. `GOOD` (ISL Thumbs Up)
9. `BAD` (ISL Thumbs Down)
10. `PEACE` (ISL V-Sign)
11. `SUPER` (ISL A-OK Circle)
12. `I_LOVE_YOU` (ISL Thumb + Index + Pinky)
13. `NUMBER_1` (ISL Single Digit)
14. `NUMBER_2` (ISL Two Digits)
15. `NUMBER_3` (ISL Three Digits)
16. `NUMBER_4` (ISL Four Digits)
17. `NUMBER_5` (ISL Open Five Spread)
18. `UNKNOWN` (Out-of-distribution / ambiguous gesture rejection)
