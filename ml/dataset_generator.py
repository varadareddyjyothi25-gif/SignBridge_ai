"""
SignBridge AI - Advanced Multi-Hand, Canonical Intrinsic & Temporal ISL Landmark Dataset Generator
Generates realistic, standardized 3D coordinate samples for validated Indian Sign Language (ISL)
signs supporting single-hand gestures (both right and left hands), two-hand coordinated gestures,
tilt variations, and kinematic motion sequences.
"""

import json
import math
import os
import random
import numpy as np

CLASSES = [
    # Single-Hand Static / Kinematic Signs
    "HELLO",         # Single hand: open palm greeting with lateral wave motion
    "YES",           # Single hand: closed fist with vertical nodding motion
    "NO",            # Single hand: index and middle extended, pinching / lateral shake
    "GOOD",          # Single hand: thumbs-up vertical
    "BAD",           # Single hand: thumbs-down inverted
    "PEACE",         # Single hand: V-sign (Index + Middle extended)
    "SUPER",         # Single hand: A-OK sign (Thumb + Index pinch, 3 extended)
    "I_LOVE_YOU",    # Single hand: Thumb + Index + Pinky extended
    "NUMBER_1",      # Single hand: Index extended only
    "NUMBER_2",      # Single hand: Index + Middle extended
    "NUMBER_3",      # Single hand: Thumb + Index + Middle extended
    "NUMBER_4",      # Single hand: 4 fingers extended, thumb curled
    "NUMBER_5",      # Single hand: All 5 fingers extended spread
    "WATER",         # Single hand: Cupped hand tilting toward lips

    # Two-Hand Coordinated Signs
    "NAMASTE",       # Two hands: both palms pressed together at chest, fingers vertical
    "HELP",          # Two hands: dominant thumbs-up fist resting on flat non-dominant palm
    "DOCTOR",        # Two hands: dominant index/middle tapping non-dominant wrist pulse
    "THANK_YOU",     # Kinematic: dominant hand moves from chin outward towards recipient
    "PLEASE",        # Dominant flat hand circular motion on chest

    # Rejection Class
    "UNKNOWN"        # Out-of-distribution / unstructured poses / relaxed random hands
]

def base_hand_template(is_left=False, center=(0.5, 0.75)):
    """Returns open hand landmarks (21 points) in normalized coords [0, 1]."""
    cx, cy = center
    sign = 1.0 if not is_left else -1.0 # ulnar direction (pinky side)

    # 0: Wrist
    lm = [[cx, cy, 0.0]]

    # Thumb: 1 (CMC), 2 (MCP), 3 (IP), 4 (Tip)
    lm.extend([
        [cx - sign * 0.05, cy - 0.06, -0.01],
        [cx - sign * 0.09, cy - 0.12, -0.02],
        [cx - sign * 0.12, cy - 0.18, -0.03],
        [cx - sign * 0.14, cy - 0.23, -0.04]
    ])
    # Index: 5 (MCP), 6 (PIP), 7 (DIP), 8 (Tip)
    lm.extend([
        [cx - sign * 0.03, cy - 0.20, -0.01],
        [cx - sign * 0.035, cy - 0.28, -0.01],
        [cx - sign * 0.038, cy - 0.35, -0.01],
        [cx - sign * 0.04, cy - 0.42, -0.01]
    ])
    # Middle: 9 (MCP), 10 (PIP), 11 (DIP), 12 (Tip)
    lm.extend([
        [cx, cy - 0.21, 0.0],
        [cx, cy - 0.30, 0.0],
        [cx, cy - 0.38, 0.0],
        [cx, cy - 0.45, 0.0]
    ])
    # Ring: 13 (MCP), 14 (PIP), 15 (DIP), 16 (Tip)
    lm.extend([
        [cx + sign * 0.03, cy - 0.20, 0.01],
        [cx + sign * 0.035, cy - 0.28, 0.01],
        [cx + sign * 0.038, cy - 0.35, 0.01],
        [cx + sign * 0.04, cy - 0.42, 0.01]
    ])
    # Pinky: 17 (MCP), 18 (PIP), 19 (DIP), 20 (Tip)
    lm.extend([
        [cx + sign * 0.06, cy - 0.17, 0.02],
        [cx + sign * 0.07, cy - 0.24, 0.02],
        [cx + sign * 0.08, cy - 0.30, 0.02],
        [cx + sign * 0.09, cy - 0.36, 0.02]
    ])
    return np.array(lm, dtype=np.float32)

def curl_finger(landmarks, finger_indices, curl_factor=0.85):
    """Curls a finger towards the palm (MCP base)."""
    mcp_idx = finger_indices[0]
    base = landmarks[mcp_idx].copy()
    for idx in finger_indices[1:]:
        vec = landmarks[idx] - base
        landmarks[idx] = base + vec * (1.0 - curl_factor) + np.array([0.0, 0.06 * curl_factor, 0.04 * curl_factor])
    return landmarks

def rotate_landmarks(landmarks, angle_rad, center_idx=0):
    """Rotates landmarks around a center index by angle_rad."""
    cx, cy = landmarks[center_idx, 0], landmarks[center_idx, 1]
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    rot = landmarks.copy()
    for i in range(len(rot)):
        dx = rot[i, 0] - cx
        dy = rot[i, 1] - cy
        rot[i, 0] = cx + dx * cos_a - dy * sin_a
        rot[i, 1] = cy + dx * sin_a + dy * cos_a
    return rot

def generate_sample(cls_name, signer_id, force_left=None):
    """
    Generates a realistic multi-hand sample:
    - Supports right-handed and left-handed execution
    - Includes tilt and position variation
    - Includes kinematic motion vectors
    """
    is_left = random.choice([True, False]) if force_left is None else force_left
    cx = random.uniform(0.35, 0.65)
    cy = random.uniform(0.60, 0.80)

    primary = base_hand_template(is_left=is_left, center=(cx, cy))
    secondary = None
    has_secondary = False

    motion = {
        "dx": 0.0,
        "dy": 0.0,
        "tip_speed": 0.0,
        "osc_x": 0.0,
        "osc_y": 0.0
    }

    # Proportional scaling
    scale = random.uniform(0.90, 1.10)
    primary[:, :2] = (primary[:, :2] - primary[0, :2]) * scale + primary[0, :2]

    # In-plane tilt angle (-25 to +25 degrees)
    tilt = random.uniform(-0.40, 0.40)

    sign = 1.0 if not is_left else -1.0

    if cls_name == "HELLO":
        motion["osc_x"] = random.uniform(0.35, 0.65)
        motion["tip_speed"] = random.uniform(0.40, 0.70)

    elif cls_name == "YES":
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        motion["osc_y"] = random.uniform(0.35, 0.65)
        motion["dy"] = random.uniform(0.20, 0.45)
        motion["tip_speed"] = random.uniform(0.25, 0.50)

    elif cls_name == "NO":
        curl_finger(primary, [1, 2, 3, 4], 0.70)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        primary[8, 0] = primary[0, 0] - sign * 0.01
        primary[12, 0] = primary[0, 0]
        motion["osc_x"] = random.uniform(0.30, 0.60)

    elif cls_name == "GOOD":
        # Thumbs up: four fingers curled, thumb pointing upward along wrist axis
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        primary[4] = primary[2] + np.array([-sign * 0.01, -0.16, 0.0])

    elif cls_name == "BAD":
        # Thumbs down: four fingers curled, thumb pointing downward
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        # Flip hand upside-down
        primary = rotate_landmarks(primary, math.pi, center_idx=0)
        tilt = random.uniform(-0.25, 0.25) # Reapply small tilt

    elif cls_name == "PEACE":
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        primary[8, 0] -= sign * 0.035
        primary[12, 0] += sign * 0.035

    elif cls_name == "SUPER":
        # Thumb meets index in a circle, middle/ring/pinky extended
        curl_finger(primary, [1, 2, 3, 4], 0.40)
        curl_finger(primary, [5, 6, 7, 8], 0.50)
        pinch_pt = (primary[4] + primary[8]) / 2.0
        primary[4] = pinch_pt
        primary[8] = pinch_pt

    elif cls_name == "I_LOVE_YOU":
        curl_finger(primary, [9, 10, 11, 12], 0.85)
        curl_finger(primary, [13, 14, 15, 16], 0.85)

    elif cls_name == "NUMBER_1":
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [9, 10, 11, 12], 0.85)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)

    elif cls_name == "NUMBER_2":
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)

    elif cls_name == "NUMBER_3":
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)

    elif cls_name == "NUMBER_4":
        curl_finger(primary, [1, 2, 3, 4], 0.80)

    elif cls_name == "NUMBER_5":
        primary[4, 0] -= sign * 0.04
        primary[20, 0] += sign * 0.04

    elif cls_name == "WATER":
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.45)
        motion["dy"] = random.uniform(-0.35, -0.15)
        motion["tip_speed"] = random.uniform(0.20, 0.40)

    # --- TWO-HAND GESTURES ---
    elif cls_name == "NAMASTE":
        has_secondary = True
        # Dominant right hand + secondary left hand
        primary = base_hand_template(is_left=False, center=(0.53, 0.65))
        secondary = base_hand_template(is_left=True, center=(0.47, 0.65))
        tilt = random.uniform(-0.08, 0.08)

    elif cls_name == "HELP":
        has_secondary = True
        secondary = base_hand_template(is_left=True, center=(0.50, 0.72))
        # Secondary flat palm horizontal
        secondary = rotate_landmarks(secondary, -math.pi / 2, center_idx=0)
        # Dominant thumbs up resting on secondary palm
        primary = base_hand_template(is_left=False, center=(0.50, 0.60))
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        primary[4] = primary[2] + np.array([-0.01, -0.16, 0.0])
        motion["dy"] = random.uniform(-0.40, -0.20)
        motion["tip_speed"] = random.uniform(0.30, 0.50)
        tilt = random.uniform(-0.08, 0.08)

    elif cls_name == "DOCTOR":
        has_secondary = True
        secondary = base_hand_template(is_left=True, center=(0.45, 0.68))
        secondary = rotate_landmarks(secondary, -math.pi / 2.2, center_idx=0)
        # Dominant index/middle tapping secondary wrist
        primary = base_hand_template(is_left=False, center=(0.46, 0.58))
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        motion["osc_y"] = random.uniform(0.30, 0.60)
        motion["tip_speed"] = random.uniform(0.25, 0.50)
        tilt = random.uniform(-0.08, 0.08)

    elif cls_name == "THANK_YOU":
        has_secondary = random.choice([True, False])
        if has_secondary:
            secondary = base_hand_template(is_left=True, center=(0.42, 0.60))
        motion["dy"] = random.uniform(0.30, 0.60)
        motion["tip_speed"] = random.uniform(0.35, 0.65)

    elif cls_name == "PLEASE":
        has_secondary = random.choice([True, False])
        if has_secondary:
            secondary = base_hand_template(is_left=True, center=(0.42, 0.70))
        motion["osc_x"] = random.uniform(0.30, 0.60)
        motion["osc_y"] = random.uniform(0.30, 0.60)
        motion["tip_speed"] = random.uniform(0.30, 0.55)

    elif cls_name == "UNKNOWN":
        has_secondary = random.choice([True, False])
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, random.uniform(0.1, 0.9))
        if has_secondary:
            secondary = base_hand_template(is_left=True, center=(0.42, 0.70))
            for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
                curl_finger(secondary, f, random.uniform(0.1, 0.9))

    # Apply tilt rotation
    if abs(tilt) > 1e-4:
        primary = rotate_landmarks(primary, tilt, center_idx=0)
        if has_secondary and secondary is not None:
            secondary = rotate_landmarks(secondary, tilt * 0.5, center_idx=0)

    # Realistic noise
    primary += np.random.normal(0, 0.008, primary.shape)
    if has_secondary and secondary is not None:
        secondary += np.random.normal(0, 0.008, secondary.shape)

    return {
        "label": cls_name,
        "signer_id": signer_id,
        "primary_landmarks": primary.tolist(),
        "secondary_landmarks": secondary.tolist() if (has_secondary and secondary is not None) else None,
        "has_secondary": has_secondary,
        "is_left": is_left,
        "motion": motion
    }

def generate_dataset(samples_per_class=175, output_file="ml/isl_landmarks_dataset.json"):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    dataset = []
    signers = [f"signer_{i+1}" for i in range(6)]

    for cls in CLASSES:
        for i in range(samples_per_class):
            signer = signers[i % len(signers)]
            sample = generate_sample(cls, signer)
            dataset.append(sample)

    print(f"Generated {len(dataset)} canonical multi-hand samples across {len(CLASSES)} classes.")
    with open(output_file, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"Dataset successfully saved to {output_file}")

if __name__ == "__main__":
    generate_dataset()
