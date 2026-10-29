export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface MotionData {
  dx?: number;
  dy?: number;
  tipSpeed?: number;
  oscX?: number;
  oscY?: number;
}

/**
 * Extracts 51 scale- and translation-invariant geometric features from 21 hand landmarks.
 */
export function extractSingleHandFeatures(landmarks: LandmarkPoint[] | null | undefined): number[] {
  if (!landmarks || landmarks.length !== 21) {
    return new Array(51).fill(0.0);
  }

  const wrist = landmarks[0];

  // 1. Shift wrist to origin (0, 0)
  const relPoints = landmarks.map((p) => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
  }));

  // 2. Scale invariance: Euclidean distance between wrist (0) and middle MCP (9)
  const middleMcp = relPoints[9];
  let scale = Math.sqrt(middleMcp.x * middleMcp.x + middleMcp.y * middleMcp.y);
  if (scale < 1e-6) {
    scale = 1.0;
  }

  const normPoints = relPoints.map((p) => ({
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

/**
 * Extracts a complete 118-dimensional feature vector:
 * - 51 primary (dominant) hand features
 * - 51 secondary (non-dominant) hand features (or zeros)
 * - 11 inter-hand spatial and relative orientation features
 * - 5 kinematic motion features
 */
export function extractMultiHandFeatures(
  primaryHand: LandmarkPoint[] | null | undefined,
  secondaryHand?: LandmarkPoint[] | null,
  motion?: MotionData
): number[] {
  const feats1 = extractSingleHandFeatures(primaryHand);
  const hasSecondary = Boolean(secondaryHand && secondaryHand.length === 21);
  const feats2 = hasSecondary ? extractSingleHandFeatures(secondaryHand) : new Array(51).fill(0.0);

  // 11 Inter-hand features
  const interFeats: number[] = new Array(11).fill(0.0);
  if (primaryHand && primaryHand.length === 21 && hasSecondary && secondaryHand) {
    const wrist1 = primaryHand[0];
    const mcp1 = primaryHand[9];
    let scale1 = Math.sqrt(
      (mcp1.x - wrist1.x) * (mcp1.x - wrist1.x) + (mcp1.y - wrist1.y) * (mcp1.y - wrist1.y)
    );
    if (scale1 < 1e-6) scale1 = 1.0;

    const wrist2 = secondaryHand[0];
    const mcp2 = secondaryHand[9];
    let scale2 = Math.sqrt(
      (mcp2.x - wrist2.x) * (mcp2.x - wrist2.x) + (mcp2.y - wrist2.y) * (mcp2.y - wrist2.y)
    );
    if (scale2 < 1e-6) scale2 = 1.0;

    // Relative wrist displacement
    const relWristX = (wrist2.x - wrist1.x) / scale1;
    const relWristY = (wrist2.y - wrist1.y) / scale1;
    const wristDist = Math.sqrt(relWristX * relWristX + relWristY * relWristY);

    const scaleRatio = scale2 / scale1;

    // 5 Fingertip-to-fingertip proximity distances (4, 8, 12, 16, 20)
    const tipIndices = [4, 8, 12, 16, 20];
    const tipDists: number[] = [];
    for (const idx of tipIndices) {
      const dx = (primaryHand[idx].x - secondaryHand[idx].x) / scale1;
      const dy = (primaryHand[idx].y - secondaryHand[idx].y) / scale1;
      tipDists.push(Math.sqrt(dx * dx + dy * dy));
    }

    // Dominant fist to secondary palm center
    const palm2CenterX = (secondaryHand[0].x + secondaryHand[9].x) / 2.0;
    const palm2CenterY = (secondaryHand[0].y + secondaryHand[9].y) / 2.0;
    const dxFist = (primaryHand[0].x - palm2CenterX) / scale1;
    const dyFist = (primaryHand[0].y - palm2CenterY) / scale1;
    const fistToPalm = Math.sqrt(dxFist * dxFist + dyFist * dyFist);

    interFeats[0] = relWristX;
    interFeats[1] = relWristY;
    interFeats[2] = wristDist;
    interFeats[3] = scaleRatio;
    interFeats[4] = tipDists[0];
    interFeats[5] = tipDists[1];
    interFeats[6] = tipDists[2];
    interFeats[7] = tipDists[3];
    interFeats[8] = tipDists[4];
    interFeats[9] = fistToPalm;
    interFeats[10] = 1.0; // Two-hand presence flag
  }

  // 5 Kinematic motion features
  const motionFeats = [
    motion?.dx || 0.0,
    motion?.dy || 0.0,
    motion?.tipSpeed || 0.0,
    motion?.oscX || 0.0,
    motion?.oscY || 0.0,
  ];

  return [...feats1, ...feats2, ...interFeats, ...motionFeats];
}

/**
 * Backward compatibility wrapper for single-hand calls.
 */
export function extractHandFeatures(landmarks: LandmarkPoint[]): number[] {
  if (!landmarks || landmarks.length !== 21) {
    throw new Error(`Expected 21 landmarks, received ${landmarks ? landmarks.length : 0}`);
  }
  return extractMultiHandFeatures(landmarks, null);
}
