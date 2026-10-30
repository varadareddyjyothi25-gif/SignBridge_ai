"""
SignBridge AI - Multi-Hand & Canonical Intrinsic ISL Classifier Training & Export Pipeline
Trains a calibrated neural network on 122-dimensional canonical intrinsic dual-hand & kinematic features,
evaluating single-hand and two-hand classes separately, reporting precision/recall/F1/confusion matrix,
and exporting weights for browser inference.
"""

import json
import math
import os
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def extract_single_hand_canonical_features(landmarks):
    """
    Extracts 53 canonical intrinsic features from 21 landmarks:
    - 42 intrinsic 2D coordinates aligned to longitudinal (u) and ulnar (v) axes
    - 2 global hand orientation features (ux, uy)
    - 5 fingertip-to-wrist euclidean distances
    - 4 adjacent fingertip euclidean distances
    """
    if landmarks is None or len(landmarks) != 21:
        return [0.0] * 53

    lm = np.array(landmarks, dtype=np.float32)
    wrist = lm[0]
    middle_mcp = lm[9]

    rx9 = middle_mcp[0] - wrist[0]
    ry9 = middle_mcp[1] - wrist[1]
    scale = float(math.sqrt(rx9 * rx9 + ry9 * ry9))
    if scale < 1e-6:
        scale = 1.0

    # Longitudinal unit vector u (pointing along middle finger axis)
    ux = rx9 / scale
    uy = ry9 / scale

    # Transverse candidate unit vector v (perpendicular to u)
    vx = -uy
    vy = ux

    # Ensure v points towards pinky (ulnar direction, positive x)
    index_mcp = lm[5]
    pinky_mcp = lm[17]
    wx = pinky_mcp[0] - index_mcp[0]
    wy = pinky_mcp[1] - index_mcp[1]
    if wx * vx + wy * vy < 0:
        vx = -vx
        vy = -vy

    features = []
    norm_points = []

    # 42 intrinsic coordinates
    for i in range(21):
        rx = lm[i][0] - wrist[0]
        ry = lm[i][1] - wrist[1]
        proj_x = float((rx * vx + ry * vy) / scale)
        proj_y = float((rx * ux + ry * uy) / scale)
        norm_points.append((proj_x, proj_y))
        features.extend([proj_x, proj_y])

    # 2 global orientation features
    features.extend([float(ux), float(uy)])

    # 5 fingertip-to-wrist euclidean distances (4, 8, 12, 16, 20)
    tip_indices = [4, 8, 12, 16, 20]
    for idx in tip_indices:
        px, py = norm_points[idx]
        d = float(math.sqrt(px * px + py * py))
        features.append(d)

    # 4 adjacent fingertip distances
    for i in range(len(tip_indices) - 1):
        p1 = norm_points[tip_indices[i]]
        p2 = norm_points[tip_indices[i + 1]]
        dx = p1[0] - p2[0]
        dy = p1[1] - p2[1]
        d = float(math.sqrt(dx * dx + dy * dy))
        features.append(d)

    return features

def extract_full_sample_features(sample):
    """
    Extracts 122 total features:
    - 53 primary hand canonical features
    - 53 secondary hand canonical features (or zeros)
    - 11 inter-hand spatial features
    - 5 kinematic motion features
    """
    primary_lm = sample.get("primary_landmarks")
    secondary_lm = sample.get("secondary_landmarks")
    has_secondary = sample.get("has_secondary", False) and secondary_lm is not None

    feats1 = extract_single_hand_canonical_features(primary_lm)
    feats2 = extract_single_hand_canonical_features(secondary_lm) if has_secondary else [0.0] * 53

    # Inter-hand features (11)
    inter_feats = [0.0] * 11
    if has_secondary and primary_lm and secondary_lm:
        p1 = np.array(primary_lm, dtype=np.float32)
        p2 = np.array(secondary_lm, dtype=np.float32)

        scale1 = math.sqrt((p1[9][0] - p1[0][0])**2 + (p1[9][1] - p1[0][1])**2)
        if scale1 < 1e-6:
            scale1 = 1.0

        # Relative wrist displacement in primary intrinsic frame
        wrist1 = p1[0]
        wrist2 = p2[0]
        rx9 = p1[9][0] - wrist1[0]
        ry9 = p1[9][1] - wrist1[1]
        ux = rx9 / scale1
        uy = ry9 / scale1
        vx = -uy
        vy = ux
        if (p1[17][0] - p1[5][0]) * vx + (p1[17][1] - p1[5][1]) * vy < 0:
            vx = -vx
            vy = -vy

        dx_w = wrist2[0] - wrist1[0]
        dy_w = wrist2[1] - wrist1[1]
        rel_wrist_x = float((dx_w * vx + dy_w * vy) / scale1)
        rel_wrist_y = float((dx_w * ux + dy_w * uy) / scale1)
        wrist_dist = float(math.sqrt(rel_wrist_x**2 + rel_wrist_y**2))

        scale2 = math.sqrt((p2[9][0] - p2[0][0])**2 + (p2[9][1] - p2[0][1])**2)
        scale_ratio = float(scale2 / scale1)

        # 5 fingertip-to-fingertip proximity distances
        tip_dists = []
        for idx in [4, 8, 12, 16, 20]:
            dist = float(math.sqrt((p1[idx][0] - p2[idx][0])**2 + (p1[idx][1] - p2[idx][1])**2) / scale1)
            tip_dists.append(dist)

        # Fist-to-palm center distance
        palm2_center = (p2[0] + p2[9]) / 2.0
        fist_to_palm = float(math.sqrt((p1[0][0] - palm2_center[0])**2 + (p1[0][1] - palm2_center[1])**2) / scale1)

        inter_feats = [
            rel_wrist_x, rel_wrist_y,
            wrist_dist,
            scale_ratio,
            tip_dists[0], tip_dists[1], tip_dists[2], tip_dists[3], tip_dists[4],
            fist_to_palm,
            1.0 # is_two_handed flag
        ]

    # Motion features (5)
    mot = sample.get("motion", {})
    motion_feats = [
        float(mot.get("dx", 0.0)),
        float(mot.get("dy", 0.0)),
        float(mot.get("tip_speed", 0.0)),
        float(mot.get("osc_x", 0.0)),
        float(mot.get("osc_y", 0.0))
    ]

    return feats1 + feats2 + inter_feats + motion_feats

def train_and_export():
    dataset_path = "ml/isl_landmarks_dataset.json"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    with open(dataset_path, "r") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} raw samples from {dataset_path}.")

    X = []
    y = []
    signers = []

    for item in data:
        feats = extract_full_sample_features(item)
        X.append(feats)
        y.append(item["label"])
        signers.append(item.get("signer_id", "signer_1"))

    X = np.array(X, dtype=np.float32)
    y = np.array(y)

    print(f"Feature matrix shape: {X.shape} (122 features per sample)")

    classes = sorted(list(set(y)))
    label_to_idx = {c: i for i, c in enumerate(classes)}
    y_idx = np.array([label_to_idx[l] for l in y])

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_idx, test_size=0.20, random_state=42, stratify=y_idx
    )

    print(f"Training split: {X_train.shape[0]} samples, Test split: {X_test.shape[0]} samples.")

    # Train MLP classifier with 128 hidden neurons
    mlp = MLPClassifier(
        hidden_layer_sizes=(128,),
        activation='relu',
        solver='adam',
        alpha=1e-4,
        max_iter=45,
        random_state=42,
        learning_rate_init=0.003
    )

    mlp.fit(X_train, y_train)

    # Predictions and evaluation
    y_pred = mlp.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\n==========================================")
    print(f"Overall Test Accuracy: {acc * 100:.2f}%")
    print(f"==========================================\n")

    report_dict = classification_report(
        y_test, y_pred, target_names=classes, output_dict=True
    )
    report_text = classification_report(y_test, y_pred, target_names=classes)
    print(report_text)

    # Separate Single-Hand vs Two-Hand evaluation
    two_hand_classes = {"NAMASTE", "HELP", "DOCTOR"}
    single_hand_classes = set(classes) - two_hand_classes - {"UNKNOWN"}

    two_hand_mask = [classes[idx] in two_hand_classes for idx in y_test]
    single_hand_mask = [classes[idx] in single_hand_classes for idx in y_test]

    two_hand_acc = accuracy_score(y_test[two_hand_mask], y_pred[two_hand_mask]) if any(two_hand_mask) else 0.0
    single_hand_acc = accuracy_score(y_test[single_hand_mask], y_pred[single_hand_mask]) if any(single_hand_mask) else 0.0

    print(f"Single-Hand Subset Accuracy: {single_hand_acc * 100:.2f}%")
    print(f"Two-Hand Coordinated Subset Accuracy: {two_hand_acc * 100:.2f}%")

    cm = confusion_matrix(y_test, y_pred)
    with open("ml/confusion_matrix.txt", "w") as f:
        f.write(f"Confusion Matrix (Classes: {', '.join(classes)}):\n\n")
        f.write(np.array2string(cm, max_line_width=200))

    eval_summary = {
        "overall_accuracy": float(acc),
        "single_hand_accuracy": float(single_hand_acc),
        "two_hand_accuracy": float(two_hand_acc),
        "classes": classes,
        "feature_count": X.shape[1],
        "test_sample_count": int(X_test.shape[0]),
        "per_class": report_dict
    }

    with open("ml/evaluation_report.json", "w") as f:
        json.dump(eval_summary, f, indent=2)

    # Export weights for browser client inference
    weights_layer0 = mlp.coefs_[0].tolist() # (122, 128)
    biases_layer0 = mlp.intercepts_[0].tolist() # (128,)
    weights_layer1 = mlp.coefs_[1].tolist() # (128, 20)
    biases_layer1 = mlp.intercepts_[1].tolist() # (20,)

    export_data = {
        "classes": classes,
        "input_dim": X.shape[1],
        "hidden_dim": 128,
        "output_dim": len(classes),
        "weights0": weights_layer0,
        "biases0": biases_layer0,
        "weights1": weights_layer1,
        "biases1": biases_layer1
    }

    client_weights_path = "src/ml/model_weights.json"
    with open(client_weights_path, "w") as f:
        json.dump(export_data, f)

    print(f"Successfully exported production model weights to {client_weights_path}.")

if __name__ == "__main__":
    train_and_export()
