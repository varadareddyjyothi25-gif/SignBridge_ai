"""
SPARSHA - ISL Landmark Classifier Training & Export Pipeline
Trains a calibrated classifier on normalized MediaPipe 21-hand-landmark vectors,
evaluates precision/recall/F1/confusion matrix, and exports model weights to JSON for
browser inference.
"""

import json
import math
import os
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def extract_features(landmarks):
    """
    Extracts 51 translation-invariant, scale-invariant features from 21 hand landmarks.
    - landmarks: list of 21 [x, y, z] points
    """
    lm = np.array(landmarks, dtype=np.float32)
    wrist = lm[0]
    
    # 1. Translation invariance: shift wrist to origin
    rel_lm = lm - wrist
    
    # 2. Scale invariance: normalize by distance between wrist (0) and middle MCP (9)
    middle_mcp = rel_lm[9]
    scale = np.linalg.norm(middle_mcp[:2])
    if scale < 1e-6:
        scale = 1.0
        
    norm_lm = rel_lm / scale
    
    features = []
    # 42 2D coordinates (x, y for all 21 points)
    for p in norm_lm:
        features.extend([float(p[0]), float(p[1])])
        
    # 5 fingertip-to-wrist euclidean distances (Thumb 4, Index 8, Middle 12, Ring 16, Pinky 20)
    fingertip_indices = [4, 8, 12, 16, 20]
    for idx in fingertip_indices:
        d = float(np.linalg.norm(norm_lm[idx][:2]))
        features.append(d)
        
    # 4 adjacent fingertip distances: (4-8, 8-12, 12-16, 16-20)
    for i in range(len(fingertip_indices) - 1):
        idx_a = fingertip_indices[i]
        idx_b = fingertip_indices[i+1]
        d = float(np.linalg.norm(norm_lm[idx_a][:2] - norm_lm[idx_b][:2]))
        features.append(d)
        
    return features

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
        feats = extract_features(item["landmarks"])
        X.append(feats)
        y.append(class_to_idx[item["label"]])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)
    
    # Train / Test split (80/20) stratified
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Train Multi-Layer Perceptron (MLP) with calibrated probabilities
    # MLP with 1 hidden layer of 64 units produces clean, fast feedforward weights
    mlp = MLPClassifier(
        hidden_layer_sizes=(64,),
        activation='relu',
        solver='adam',
        max_iter=500,
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
    
    print("\n========== SPARSHA ISL CLASSIFIER EVALUATION REPORT ==========")
    print(f"Overall Test Accuracy: {acc * 100:.2f}%\n")
    print(report_text)
    
    # Save confusion matrix and report
    os.makedirs("ml", exist_ok=True)
    with open("ml/evaluation_report.json", "w") as f:
        json.dump({
            "accuracy": acc,
            "classes": classes,
            "metrics": report
        }, f, indent=2)
        
    with open("ml/confusion_matrix.txt", "w") as f:
        f.write(f"Classes: {', '.join(classes)}\n\nConfusion Matrix:\n")
        f.write(np.array2string(cm, separator=', '))
        
    # Export weights for in-browser client inference
    # Layers: Input (51) -> Dense 64 (ReLU) -> Dense N_CLASSES (Softmax)
    weights_0 = mlp.coefs_[0].tolist() # (51, 64)
    biases_0 = mlp.intercepts_[0].tolist() # (64,)
    weights_1 = mlp.coefs_[1].tolist() # (64, len(classes))
    biases_1 = mlp.intercepts_[1].tolist() # (len(classes),)
    
    exported_model = {
        "model_name": "SPARSHA_ISL_Landmark_MLP_v1",
        "input_features": 51,
        "classes": classes,
        "default_rejection_threshold": 0.65,
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
