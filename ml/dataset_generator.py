"""
SPARSHA - Advanced Multi-Hand & Temporal ISL Landmark Dataset Generator
Generates realistic, standardized 3D coordinate samples for validated Indian Sign Language (ISL)
signs supporting single-hand gestures, two-hand coordinated gestures, and kinematic motion sequences.
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

def base_hand_template(is_left=False):
    """Returns canonical open hand landmarks (21 points) in normalized coords [0, 1]."""
    # Wrist
    center_x = 0.65 if not is_left else 0.35
    lm = [[center_x, 0.80, 0.0]]
    sign = -1.0 if not is_left else 1.0

    # Thumb: CMC, MCP, IP, Tip
    lm.extend([
        [center_x + sign * 0.06, 0.72, -0.02],
        [center_x + sign * 0.11, 0.64, -0.04],
        [center_x + sign * 0.14, 0.55, -0.05],
        [center_x + sign * 0.17, 0.48, -0.06]
    ])
    # Index: MCP, PIP, DIP, Tip
    lm.extend([
        [center_x + sign * 0.04, 0.54, -0.01],
        [center_x + sign * 0.04, 0.42, -0.02],
        [center_x + sign * 0.04, 0.32, -0.02],
        [center_x + sign * 0.04, 0.22, -0.02]
    ])
    # Middle: MCP, PIP, DIP, Tip
    lm.extend([
        [center_x, 0.52, 0.0],
        [center_x, 0.39, 0.0],
        [center_x, 0.28, 0.0],
        [center_x, 0.18, 0.0]
    ])
    # Ring: MCP, PIP, DIP, Tip
    lm.extend([
        [center_x - sign * 0.04, 0.54, 0.01],
        [center_x - sign * 0.04, 0.42, 0.01],
        [center_x - sign * 0.04, 0.32, 0.01],
        [center_x - sign * 0.04, 0.24, 0.01]
    ])
    # Pinky: MCP, PIP, DIP, Tip
    lm.extend([
        [center_x - sign * 0.08, 0.58, 0.02],
        [center_x - sign * 0.09, 0.48, 0.02],
        [center_x - sign * 0.10, 0.40, 0.02],
        [center_x - sign * 0.10, 0.32, 0.02]
    ])
    return np.array(lm, dtype=np.float32)

def curl_finger(landmarks, finger_indices, curl_factor=0.85):
    """Curls a finger towards the palm (MCP base)."""
    mcp_idx = finger_indices[0]
    base = landmarks[mcp_idx]
    for idx in finger_indices[1:]:
        vec = landmarks[idx] - base
        landmarks[idx] = base + vec * (1.0 - curl_factor) + np.array([0.0, 0.08 * curl_factor, 0.05 * curl_factor])
    return landmarks

def generate_sample(cls_name, signer_id):
    """
    Generates a realistic sample containing:
    - primary_landmarks: 21 points for dominant/right hand
    - secondary_landmarks: 21 points for left hand (or None/zeros if 1-handed)
    - has_secondary: bool
    - temporal_motion: dict of kinematic velocity features
    """
    primary = base_hand_template(is_left=False)
    secondary = None
    has_secondary = False

    # Motion features: dx, dy, tip_speed, osc_x, osc_y
    motion = {
        "dx": 0.0,
        "dy": 0.0,
        "tip_speed": 0.0,
        "osc_x": 0.0,
        "osc_y": 0.0
    }

    # Individual signer proportion noise
    scale = random.uniform(0.92, 1.08)
    primary[:, :2] *= scale

    if cls_name == "HELLO":
        # Open hand with lateral wave oscillation
        motion["osc_x"] = random.uniform(0.35, 0.65)
        motion["tip_speed"] = random.uniform(0.40, 0.70)
        primary[:, 0] += random.uniform(-0.03, 0.03)

    elif cls_name == "YES":
        # Closed fist with vertical nodding motion
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        motion["osc_y"] = random.uniform(0.35, 0.65)
        motion["dy"] = random.uniform(0.20, 0.45)
        motion["tip_speed"] = random.uniform(0.25, 0.50)

    elif cls_name == "NO":
        # Index and middle pinching / lateral shake
        curl_finger(primary, [1, 2, 3, 4], 0.70)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        primary[8, 0] = primary[0, 0] + 0.01
        primary[12, 0] = primary[0, 0] + 0.02
        motion["osc_x"] = random.uniform(0.30, 0.60)

    elif cls_name == "GOOD":
        # Thumbs up
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        primary[4] = primary[2] + np.array([0.0, -0.22, 0.0])

    elif cls_name == "BAD":
        # Thumbs down
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        primary[4] = primary[2] + np.array([0.0, 0.22, 0.0])

    elif cls_name == "PEACE":
        # V-sign
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        primary[8, 0] -= 0.04
        primary[12, 0] += 0.04

    elif cls_name == "SUPER":
        # A-OK: thumb tip meets index tip
        curl_finger(primary, [1, 2, 3, 4], 0.40)
        curl_finger(primary, [5, 6, 7, 8], 0.50)
        pinch_pt = (primary[4] + primary[8]) / 2.0
        primary[4] = pinch_pt
        primary[8] = pinch_pt

    elif cls_name == "I_LOVE_YOU":
        # Thumb, Index, Pinky extended
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
        primary[4, 0] += 0.05
        primary[20, 0] -= 0.05

    elif cls_name == "WATER":
        # Cupped hand tilting back
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.45)
        motion["dy"] = random.uniform(-0.35, -0.15)
        motion["tip_speed"] = random.uniform(0.20, 0.40)

    # --- TWO-HAND GESTURES ---
    elif cls_name == "NAMASTE":
        has_secondary = True
        secondary = base_hand_template(is_left=True)
        # Shift both hands to center chest, pressed together
        primary[:, 0] = 0.52 + (primary[:, 0] - 0.65) * 0.3
        secondary[:, 0] = 0.48 + (secondary[:, 0] - 0.35) * 0.3
        # Align fingertips vertically
        primary[5:21, 1] = np.linspace(0.40, 0.15, 16)
        secondary[5:21, 1] = np.linspace(0.40, 0.15, 16)
        # Symmetrical height
        primary[:, 1] += 0.05
        secondary[:, 1] += 0.05

    elif cls_name == "HELP":
        has_secondary = True
        secondary = base_hand_template(is_left=True)
        # Non-dominant hand flat horizontally at bottom
        secondary[:, 1] = 0.70 + (secondary[:, 1] - 0.80) * 0.2
        secondary[:, 0] = 0.50 + (secondary[:, 0] - 0.35)
        # Dominant hand is a thumbs-up fist resting on the center of secondary palm
        for f in [[5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, 0.85)
        primary[:, 0] = 0.50 + (primary[:, 0] - 0.65)
        primary[:, 1] = 0.62 + (primary[:, 1] - 0.80)
        primary[4] = primary[2] + np.array([0.0, -0.22, 0.0]) # Thumb upright
        # Upward motion of both hands together
        motion["dy"] = random.uniform(-0.40, -0.20)
        motion["tip_speed"] = random.uniform(0.30, 0.50)

    elif cls_name == "DOCTOR":
        has_secondary = True
        secondary = base_hand_template(is_left=True)
        # Secondary wrist horizontal
        secondary[:, 0] = 0.45 + (secondary[:, 0] - 0.35)
        secondary[:, 1] = 0.65
        # Primary dominant index & middle fingertips tap secondary wrist (landmark 0)
        curl_finger(primary, [1, 2, 3, 4], 0.75)
        curl_finger(primary, [13, 14, 15, 16], 0.85)
        curl_finger(primary, [17, 18, 19, 20], 0.85)
        # Align primary index/middle tip with secondary wrist
        wrist_target = secondary[0]
        offset = wrist_target - primary[8]
        primary[:, :] += offset + np.array([0.01, -0.05, 0.0])
        motion["osc_y"] = random.uniform(0.30, 0.60) # Tapping motion
        motion["tip_speed"] = random.uniform(0.25, 0.50)

    elif cls_name == "THANK_YOU":
        # Can be 1 or 2 handed; flat hand moving outward from chin
        has_secondary = random.choice([True, False])
        if has_secondary:
            secondary = base_hand_template(is_left=True)
            secondary[:, 1] -= 0.12
            secondary[:, 0] -= 0.05
        primary[:, 1] -= 0.15 # Near chin
        motion["dy"] = random.uniform(0.30, 0.60) # Moving outward forward
        motion["tip_speed"] = random.uniform(0.35, 0.65)

    elif cls_name == "PLEASE":
        has_secondary = random.choice([True, False])
        if has_secondary:
            secondary = base_hand_template(is_left=True)
            secondary[:, 1] += 0.05
        # Circular motion on chest
        motion["osc_x"] = random.uniform(0.30, 0.60)
        motion["osc_y"] = random.uniform(0.30, 0.60)
        motion["tip_speed"] = random.uniform(0.30, 0.55)

    elif cls_name == "UNKNOWN":
        # Random unstructured finger poses
        has_secondary = random.choice([True, False])
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(primary, f, random.uniform(0.1, 0.9))
        if has_secondary:
            secondary = base_hand_template(is_left=True)
            for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
                curl_finger(secondary, f, random.uniform(0.1, 0.9))

    # Add realistic sensor & environmental noise
    primary += np.random.normal(0, 0.010, primary.shape)
    if has_secondary and secondary is not None:
        secondary += np.random.normal(0, 0.010, secondary.shape)

    return {
        "label": cls_name,
        "signer_id": signer_id,
        "primary_landmarks": primary.tolist(),
        "secondary_landmarks": secondary.tolist() if (has_secondary and secondary is not None) else None,
        "has_secondary": has_secondary,
        "motion": motion
    }

def generate_dataset(samples_per_class=150, output_file="ml/isl_landmarks_dataset.json"):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    dataset = []
    signers = [f"signer_{i+1}" for i in range(6)]

    for cls in CLASSES:
        for _ in range(samples_per_class):
            signer = random.choice(signers)
            sample = generate_sample(cls, signer)
            dataset.append(sample)

    print(f"Generated {len(dataset)} multi-hand samples across {len(CLASSES)} classes.")
    with open(output_file, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"Dataset successfully saved to {output_file}")

if __name__ == "__main__":
    generate_dataset()
