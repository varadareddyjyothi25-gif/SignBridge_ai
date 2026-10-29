"""
SPARSHA - Multi-Hand & Temporal ISL Classifier Training & Export Pipeline
Trains a calibrated neural network on 118-dimensional invariant dual-hand & kinematic features,
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

def extract_single_hand_features(landmarks):
    """Extracts 51 geometric features from 21 landmarks."""
    if landmarks is None or len(landmarks) != 21:
        return [0.0] * 51

    lm = np.array(landmarks, dtype=np.float32)
    wrist = lm[0]
    rel = lm - wrist

    middle_mcp = rel[9]
    scale = float(np.linalg.norm(middle_mcp[:2]))
    if scale < 1e-6:
        scale = 1.0

    norm_lm = rel / scale

    features = []
    # 42 2D coordinates (x, y)
    for p in norm_lm:
        features.extend([float(p[0]), float(p[1])])

    # 5 fingertip-to-wrist euclidean distances (4, 8, 12, 16, 20)
    tip_indices = [4, 8, 12, 16, 20]
    for idx in tip_indices:
        d = float(np.linalg.norm(norm_lm[idx][:2]))
        features.append(d)

    # 4 adjacent fingertip distances
    for i in range(len(tip_indices) - 1):
        idx_a = tip_indices[i]
        idx_b = tip_indices[i + 1]
        d = float(np.linalg.norm(norm_lm[idx_a][:2] - norm_lm[idx_b][:2]))
        features.append(d)

    return features

def extract_full_sample_features(sample):
    """
    Extracts 118 total features:
    - 51 primary hand features
    - 51 secondary hand features (or zeros)
    - 11 inter-hand spatial features
    - 5 kinematic motion features
    """
    primary_lm = sample.get("primary_landmarks")
    secondary_lm = sample.get("secondary_landmarks")
    has_secondary = sample.get("has_secondary", False) and secondary_lm is not None

    feats1 = extract_single_hand_features(primary_lm)
    feats2 = extract_single_hand_features(secondary_lm) if has_secondary else [0.0] * 51

    # Inter-hand features (11)
    inter_feats = [0.0] * 11
    if has_secondary and primary_lm and secondary_lm:
        p1 = np.array(primary_lm, dtype=np.float32)
        p2 = np.array(secondary_lm, dtype=np.float32)

        scale1 = np.linalg.norm(p1[9][:2] - p1[0][:2])
        if scale1 < 1e-6:
            scale1 = 1.0

        # Relative wrist displacement (dx, dy)
        rel_wrist = (p2[0] - p1[0]) / scale1
        wrist_dist = float(np.linalg.norm(rel_wrist[:2]))

        scale2 = np.linalg.norm(p2[9][:2] - p2[0][:2])
        scale_ratio = float(scale2 / scale1)

        # 5 fingertip-to-fingertip proximity distances (4, 8, 12, 16, 20)
        tip_dists = []
        for idx in [4, 8, 12, 16, 20]:
            dist = float(np.linalg.norm((p1[idx][:2] - p2[idx][:2]) / scale1))
            tip_dists.append(dist)

        # Fist-to-palm center distance (p1[4] or p1[0] to p2[9])
        palm2_center = (p2[0] + p2[9]) / 2.0
        fist_to_palm = float(np.linalg.norm((p1[0][:2] - palm2_center[:2]) / scale1))

        inter_feats = [
            float(rel_wrist[0]), float(rel_wrist[1]),
            wrist_dist,
            scale_ratio,
            tip_dists[0], tip_dists[1], tip_dists[2], tip_dists[3], tip_dists[4],
            fist_to_palm,
            1.0 # is_two_handed flag
        ]

    # Motion features (5)
    motion = sample.get("motion", {})
    motion_feats = [
        float(motion.get("dx", 0.0)),
        float(motion.get("dy", 0.0)),
        float(motion.get("tip_speed", 0.0)),
        float(motion.get("osc_x", 0.0)),
        float(motion.get("osc_y", 0.0))
    ]

    total_vector = feats1 + feats2 + inter_feats + motion_feats
    return total_vector

def train_and_export():
    dataset_path = "ml/isl_landmarks_dataset.json"
    if not os.path.exists(dataset_path):
        from dataset_generator import generate_dataset
        generate_dataset()

    with open(dataset_path, "r") as f:
        data = json.load(f)

    X = []
    y = []
    classes = sorted(list(set(item["label"] for item in data)))
    class_to_idx = {cls: idx for idx, cls in enumerate(classes)}

    for item in data:
        feats = extract_full_sample_features(item)
        X.append(feats)
        y.append(class_to_idx[item["label"]])

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    # Train / Test split (80/20) stratified
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Multi-Layer Perceptron (128 hidden units) with early stopping
    mlp = MLPClassifier(
        hidden_layer_sizes=(128,),
        activation='relu',
        solver='adam',
        max_iter=600,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1
    )
    mlp.fit(X_train, y_train)

    y_pred = mlp.predict(X_test)
    y_prob = mlp.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=classes, output_dict=True)
    report_text = classification_report(y_test, y_pred, target_names=classes)
    cm = confusion_matrix(y_test, y_pred)

    # Evaluate single-hand vs two-hand performance separately
    two_hand_classes = ["NAMASTE", "HELP", "DOCTOR", "THANK_YOU", "PLEASE"]
    single_hand_classes = [c for c in classes if c not in two_hand_classes and c != "UNKNOWN"]

    two_hand_indices = [class_to_idx[c] for c in two_hand_classes if c in class_to_idx]
    single_hand_indices = [class_to_idx[c] for c in single_hand_classes if c in class_to_idx]

    mask_two_hand = np.isin(y_test, two_hand_indices)
    mask_single_hand = np.isin(y_test, single_hand_indices)

    acc_two_hand = accuracy_score(y_test[mask_two_hand], y_pred[mask_two_hand]) if np.sum(mask_two_hand) > 0 else 0.0
    acc_single_hand = accuracy_score(y_test[mask_single_hand], y_pred[mask_single_hand]) if np.sum(mask_single_hand) > 0 else 0.0

    print("\n========== SPARSHA ADVANCED MULTI-HAND ISL EVALUATION REPORT ==========")
    print(f"Overall Test Accuracy: {acc * 100:.2f}%")
    print(f"Single-Hand Gestures Accuracy: {acc_single_hand * 100:.2f}%")
    print(f"Two-Hand Coordinated Gestures Accuracy: {acc_two_hand * 100:.2f}%\n")
    print(report_text)

    # Save confusion matrix and report
    os.makedirs("ml", exist_ok=True)
    with open("ml/evaluation_report.json", "w") as f:
        json.dump({
            "accuracy": acc,
            "accuracy_single_hand": acc_single_hand,
            "accuracy_two_hand": acc_two_hand,
            "classes": classes,
            "input_features": 118,
            "metrics": report
        }, f, indent=2)

    with open("ml/confusion_matrix.txt", "w") as f:
        f.write(f"Classes: {', '.join(classes)}\n\nConfusion Matrix:\n")
        f.write(np.array2string(cm, separator=', '))

    # Export weights for in-browser client inference
    weights_0 = mlp.coefs_[0].tolist() # (118, 128)
    biases_0 = mlp.intercepts_[0].tolist() # (128,)
    weights_1 = mlp.coefs_[1].tolist() # (128, len(classes))
    biases_1 = mlp.intercepts_[1].tolist() # (len(classes),)

    exported_model = {
        "model_name": "SPARSHA_ISL_MultiHand_MLP_v2",
        "input_features": 118,
        "classes": classes,
        "default_rejection_threshold": 0.65,
        "margin_threshold": 0.15,
        "layers": [
            {
                "weights": weights_0,
                "biases": biases_0,
                "activation": "relu"
            },
            {
                "weights": weights_1,
                "biases": biases_1,
                "activation": "softmax"
            }
        ]
    }

    os.makedirs("src/ml", exist_ok=True)
    weights_export_path = "src/ml/model_weights.json"
    with open(weights_export_path, "w") as f:
        json.dump(exported_model, f, indent=2)

    print(f"\nModel exported successfully to {weights_export_path}")
    print(f"Evaluation report written to ml/evaluation_report.json and ml/confusion_matrix.txt")

if __name__ == "__main__":
    train_and_export()
