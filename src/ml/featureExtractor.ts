export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

/**
 * Normalizes 21 MediaPipe hand landmarks into a 51-dimensional
 * translation-invariant, scale-invariant feature vector matching the Python training pipeline.
 */
export function extractHandFeatures(landmarks: LandmarkPoint[]): number[] {
  if (!landmarks || landmarks.length !== 21) {
    throw new Error(`Expected 21 landmarks, received ${landmarks ? landmarks.length : 0}`);
  }

  const wrist = landmarks[0];

  // 1. Shift wrist to origin (0, 0)
  const relPoints = landmarks.map(p => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
  }));

  // 2. Scale invariance: Euclidean distance between wrist (0) and middle MCP (9)
  const middleMcp = relPoints[9];
  let scale = Math.sqrt(middleMcp.x * middleMcp.x + middleMcp.y * middleMcp.y);
  if (scale < 1e-6) {
    scale = 1.0;
  }

  const normPoints = relPoints.map(p => ({
    x: p.x / scale,
    y: p.y / scale,
  }));

  const features: number[] = [];

  // 42 2D coordinates (x, y)
  for (const p of normPoints) {
    features.push(p.x, p.y);
  }

  // 5 fingertip-to-wrist euclidean distances (Thumb 4, Index 8, Middle 12, Ring 16, Pinky 20)
  const fingertipIndices = [4, 8, 12, 16, 20];
  for (const idx of fingertipIndices) {
    const tip = normPoints[idx];
    const dist = Math.sqrt(tip.x * tip.x + tip.y * tip.y);
    features.push(dist);
  }

  // 4 adjacent fingertip euclidean distances (4-8, 8-12, 12-16, 16-20)
  for (let i = 0; i < fingertipIndices.length - 1; i++) {
    const tipA = normPoints[fingertipIndices[i]];
    const tipB = normPoints[fingertipIndices[i + 1]];
    const dx = tipA.x - tipB.x;
    const dy = tipA.y - tipB.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    features.push(dist);
  }

  return features;
}
