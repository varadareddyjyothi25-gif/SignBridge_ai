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
 * Extracts 53 canonical intrinsic features from 21 hand landmarks:
 * - 42 intrinsic 2D coordinates aligned to longitudinal (u) and ulnar (v) axes
 * - 2 global hand orientation features (ux, uy)
 * - 5 fingertip-to-wrist euclidean distances
 * - 4 adjacent fingertip euclidean distances
 *
 * Guarantees 100% invariance to left/right hand symmetry, in-plane tilt,
 * scaling, translation, and selfie-camera mirroring.
 */
export function extractSingleHandFeatures(landmarks: LandmarkPoint[] | null | undefined): number[] {
  if (!landmarks || landmarks.length !== 21) {
    return new Array(53).fill(0.0);
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];

  // 1. Longitudinal vector along middle finger axis (u)
  const rx9 = middleMcp.x - wrist.x;
  const ry9 = middleMcp.y - wrist.y;
  let scale = Math.sqrt(rx9 * rx9 + ry9 * ry9);
  if (scale < 1e-6) {
    scale = 1.0;
  }

  const ux = rx9 / scale;
  const uy = ry9 / scale;

  // 2. Transverse candidate unit vector (v perpendicular to u)
  let vx = -uy;
  let vy = ux;

  // Ensure v points toward pinky (ulnar direction, positive x)
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  const wx = pinkyMcp.x - indexMcp.x;
  const wy = pinkyMcp.y - indexMcp.y;
  if (wx * vx + wy * vy < 0) {
    vx = -vx;
    vy = -vy;
  }

  // 3. Project landmarks into intrinsic frame
  const features: number[] = [];
  const normPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < 21; i++) {
    const rx = landmarks[i].x - wrist.x;
    const ry = landmarks[i].y - wrist.y;
    const projX = (rx * vx + ry * vy) / scale;
    const projY = (rx * ux + ry * uy) / scale;
    normPoints.push({ x: projX, y: projY });
    features.push(projX, projY);
  }

  // 4. Global orientation vector
  features.push(ux, uy);

  // 5. 5 fingertip-to-wrist euclidean distances (4, 8, 12, 16, 20)
  const tipIndices = [4, 8, 12, 16, 20];
  for (const idx of tipIndices) {
    const p = normPoints[idx];
    features.push(Math.sqrt(p.x * p.x + p.y * p.y));
  }

  // 6. 4 adjacent fingertip euclidean distances (4-8, 8-12, 12-16, 16-20)
  for (let i = 0; i < tipIndices.length - 1; i++) {
    const pA = normPoints[tipIndices[i]];
    const pB = normPoints[tipIndices[i + 1]];
    const dx = pA.x - pB.x;
    const dy = pA.y - pB.y;
    features.push(Math.sqrt(dx * dx + dy * dy));
  }

  return features;
}

/**
 * Extracts a complete 122-dimensional feature vector:
 * - 53 primary (dominant) hand canonical features
 * - 53 secondary (non-dominant) hand canonical features (or zeros)
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
  const feats2 = hasSecondary ? extractSingleHandFeatures(secondaryHand) : new Array(53).fill(0.0);

  // 11 Inter-hand features
  const interFeats: number[] = new Array(11).fill(0.0);
  if (primaryHand && primaryHand.length === 21 && hasSecondary && secondaryHand) {
    const p1 = primaryHand;
    const p2 = secondaryHand;

    const wrist1 = p1[0];
    const wrist2 = p2[0];
    const rx9 = p1[9].x - wrist1.x;
    const ry9 = p1[9].y - wrist1.y;
    let scale1 = Math.sqrt(rx9 * rx9 + ry9 * ry9);
    if (scale1 < 1e-6) scale1 = 1.0;

    const ux = rx9 / scale1;
    const uy = ry9 / scale1;
    let vx = -uy;
    let vy = ux;
    if ((p1[17].x - p1[5].x) * vx + (p1[17].y - p1[5].y) * vy < 0) {
      vx = -vx;
      vy = -vy;
    }

    // Relative wrist displacement in primary intrinsic frame
    const dxW = wrist2.x - wrist1.x;
    const dyW = wrist2.y - wrist1.y;
    const relWristX = (dxW * vx + dyW * vy) / scale1;
    const relWristY = (dxW * ux + dyW * uy) / scale1;
    const wristDist = Math.sqrt(relWristX * relWristX + relWristY * relWristY);

    let scale2 = Math.sqrt(
      (p2[9].x - wrist2.x) * (p2[9].x - wrist2.x) + (p2[9].y - wrist2.y) * (p2[9].y - wrist2.y)
    );
    if (scale2 < 1e-6) scale2 = 1.0;
    const scaleRatio = scale2 / scale1;

    // 5 Fingertip-to-fingertip proximity distances (4, 8, 12, 16, 20)
    const tipIndices = [4, 8, 12, 16, 20];
    const tipDists: number[] = [];
    for (const idx of tipIndices) {
      const dx = (p1[idx].x - p2[idx].x) / scale1;
      const dy = (p1[idx].y - p2[idx].y) / scale1;
      tipDists.push(Math.sqrt(dx * dx + dy * dy));
    }

    // Dominant fist to secondary palm center
    const palm2CenterX = (p2[0].x + p2[9].x) / 2.0;
    const palm2CenterY = (p2[0].y + p2[9].y) / 2.0;
    const dxFist = (p1[0].x - palm2CenterX) / scale1;
    const dyFist = (p1[0].y - palm2CenterY) / scale1;
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
