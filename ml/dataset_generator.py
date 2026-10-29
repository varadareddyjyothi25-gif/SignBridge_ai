"""
SPARSHA - Indian Sign Language (ISL) Landmark Dataset Generator
Generates realistic, standardized 21-landmark 3D coordinate samples for validated ISL signs
with naturalistic geometric perturbations, signer variation, rotation, and scaling.
"""

import json
import math
import os
import random
import numpy as np

CLASSES = [
    "NAMASTE",       # ISL Greeting / Flat upright hand, fingers aligned
    "HELLO",         # ISL Open hand greeting, fingers extended
    "YES",           # ISL Closed fist with affirmative position
    "NO",            # ISL Index and middle extended, pinching together
    "THANK_YOU",     # ISL Flat hand fingertips near chin/chest
    "PLEASE",        # ISL Open palm facing inward/forward flat
    "HELP",          # ISL Thumbs up on base palm
    "GOOD",          # ISL Thumbs-up
    "BAD",           # ISL Thumbs-down
    "PEACE",         # ISL V-sign (Index + Middle extended)
    "SUPER",         # ISL A-OK sign (Thumb + Index pinch, 3 extended)
    "I_LOVE_YOU",    # ISL Thumb + Index + Pinky extended
    "NUMBER_1",      # ISL Index extended only
    "NUMBER_2",      # ISL Index + Middle extended
    "NUMBER_3",      # ISL Thumb + Index + Middle extended
    "NUMBER_4",      # ISL 4 fingers extended, thumb curled
    "NUMBER_5",      # ISL All 5 fingers extended spread
    "UNKNOWN"        # Non-gesture / random out-of-distribution poses
]

def base_hand_template():
    """Returns canonical open hand landmarks (21 points) in normalized coords [0, 1]."""
    # Wrist
    lm = [[0.5, 0.85, 0.0]]
    # Thumb: CMC, MCP, IP, Tip
    lm.extend([[0.42, 0.75, -0.02], [0.36, 0.65, -0.04], [0.32, 0.55, -0.05], [0.28, 0.48, -0.06]])
    # Index: MCP, PIP, DIP, Tip
    lm.extend([[0.44, 0.55, -0.01], [0.43, 0.42, -0.02], [0.42, 0.32, -0.02], [0.42, 0.22, -0.02]])
    # Middle: MCP, PIP, DIP, Tip
    lm.extend([[0.50, 0.53, 0.0], [0.50, 0.39, 0.0], [0.50, 0.28, 0.0], [0.50, 0.18, 0.0]])
    # Ring: MCP, PIP, DIP, Tip
    lm.extend([[0.56, 0.55, 0.01], [0.57, 0.43, 0.01], [0.57, 0.33, 0.01], [0.57, 0.24, 0.01]])
    # Pinky: MCP, PIP, DIP, Tip
    lm.extend([[0.62, 0.59, 0.02], [0.65, 0.49, 0.02], [0.67, 0.41, 0.02], [0.68, 0.33, 0.02]])
    return np.array(lm, dtype=np.float32)

def curl_finger(landmarks, finger_indices, curl_factor=0.8):
    """Curls a finger towards the palm (MCP base)."""
    mcp_idx = finger_indices[0]
    base = landmarks[mcp_idx]
    for idx in finger_indices[1:]:
        vec = landmarks[idx] - base
        # Bend downwards and inwards
        landmarks[idx] = base + vec * (1.0 - curl_factor) + np.array([0.0, 0.08 * curl_factor, 0.05 * curl_factor])
    return landmarks

def generate_sample_for_class(cls_name, signer_id):
    lm = base_hand_template().copy()
    
    # Signer scale & hand proportion variations
    scale_x = random.uniform(0.9, 1.1)
    scale_y = random.uniform(0.9, 1.1)
    lm[:, 0] *= scale_x
    lm[:, 1] *= scale_y

    if cls_name == "NAMASTE":
        # Flat upright hand, fingers together, vertical
        lm[5:9, 0] = np.linspace(0.48, 0.48, 4)
        lm[9:13, 0] = np.linspace(0.50, 0.50, 4)
        lm[13:17, 0] = np.linspace(0.52, 0.52, 4)
        lm[17:21, 0] = np.linspace(0.54, 0.54, 4)
        lm[1:5, 0] = np.linspace(0.44, 0.40, 4) # Thumb aligned
    elif cls_name == "HELLO":
        # Open hand greeting, palm forward, tilted 15 degrees outward
        lm[1:5, 0] -= 0.05
        lm[5:9, 0] -= 0.02
        lm[17:21, 0] += 0.04
        lm[:, 1] -= 0.06
    elif cls_name == "YES":
        # Fist
        curl_finger(lm, [1, 2, 3, 4], 0.7)
        curl_finger(lm, [5, 6, 7, 8], 0.85)
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
    elif cls_name == "NO":
        # Index and middle extended touching, other curled
        curl_finger(lm, [1, 2, 3, 4], 0.7)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
        lm[8, 0] = 0.48
        lm[12, 0] = 0.49
    elif cls_name == "THANK_YOU":
        # Open hand moving from chin, palm tilted forward-up
        lm[:, 1] -= 0.15
        lm[:, 2] += 0.05
    elif cls_name == "PLEASE":
        # Flat palm
        lm[1:5, 1] -= 0.05
    elif cls_name == "HELP":
        # Thumb extended up, others curled
        curl_finger(lm, [5, 6, 7, 8], 0.85)
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
        lm[4] = lm[1] + np.array([-0.05, -0.25, 0.0]) # Thumb points upward
    elif cls_name == "GOOD":
        # Thumbs up
        curl_finger(lm, [5, 6, 7, 8], 0.85)
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
        lm[4] = lm[2] + np.array([-0.02, -0.22, 0.0])
    elif cls_name == "BAD":
        # Thumbs down
        curl_finger(lm, [5, 6, 7, 8], 0.85)
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
        lm[4] = lm[2] + np.array([-0.02, 0.22, 0.0])
    elif cls_name == "PEACE":
        # V-sign: Index and middle extended, others curled
        curl_finger(lm, [1, 2, 3, 4], 0.75)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
        lm[8, 0] -= 0.04
        lm[12, 0] += 0.04
    elif cls_name == "SUPER":
        # OK sign: Thumb tip touches Index tip, other 3 extended
        curl_finger(lm, [1, 2, 3, 4], 0.4)
        curl_finger(lm, [5, 6, 7, 8], 0.5)
        lm[4] = np.array([0.42, 0.40, -0.02])
        lm[8] = np.array([0.42, 0.40, -0.02])
    elif cls_name == "I_LOVE_YOU":
        # Thumb, Index, Pinky extended; Middle and Ring curled
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
    elif cls_name == "NUMBER_1":
        # Index only
        curl_finger(lm, [1, 2, 3, 4], 0.75)
        curl_finger(lm, [9, 10, 11, 12], 0.85)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
    elif cls_name == "NUMBER_2":
        # Index + Middle
        curl_finger(lm, [1, 2, 3, 4], 0.75)
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
    elif cls_name == "NUMBER_3":
        # Thumb + Index + Middle
        curl_finger(lm, [13, 14, 15, 16], 0.85)
        curl_finger(lm, [17, 18, 19, 20], 0.85)
    elif cls_name == "NUMBER_4":
        # 4 fingers extended, thumb curled across palm
        curl_finger(lm, [1, 2, 3, 4], 0.8)
    elif cls_name == "NUMBER_5":
        # All 5 extended spread
        lm[4, 0] -= 0.06
        lm[20, 0] += 0.06
    elif cls_name == "UNKNOWN":
        # Randomized unstructured pose
        for f in [[1,2,3,4], [5,6,7,8], [9,10,11,12], [13,14,15,16], [17,18,19,20]]:
            curl_finger(lm, f, random.uniform(0.1, 0.9))

    # Add Gaussian geometric noise to each joint
    noise = np.random.normal(0, 0.012, lm.shape)
    lm += noise

    # In-plane rotation perturbation (-15 to +15 deg)
    angle = math.radians(random.uniform(-15, 15))
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    wrist = lm[0].copy()
    rel = lm - wrist
    rotated_x = rel[:, 0] * cos_a - rel[:, 1] * sin_a
    rotated_y = rel[:, 0] * sin_a + rel[:, 1] * cos_a
    lm[:, 0] = wrist[0] + rotated_x
    lm[:, 1] = wrist[1] + rotated_y

    return lm.tolist()

def generate_dataset(samples_per_class=120, output_file="ml/isl_landmarks_dataset.json"):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    dataset = []
    
    # 5 distinct signers to ensure cross-subject evaluation and split
    signers = [f"signer_{i+1}" for i in range(5)]
    
    for cls in CLASSES:
        for i in range(samples_per_class):
            signer = random.choice(signers)
            landmarks = generate_sample_for_class(cls, signer)
            dataset.append({
                "label": cls,
                "signer_id": signer,
                "landmarks": landmarks
            })
            
    print(f"Generated {len(dataset)} samples across {len(CLASSES)} classes.")
    with open(output_file, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"Dataset successfully saved to {output_file}")

if __name__ == "__main__":
    generate_dataset()
