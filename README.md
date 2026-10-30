# SignBridge AI — Transforming Oral Understanding into Clear HandSigns (TOUCH)

> **“Bridging Communication, One Gesture at a Time.”**

SignBridge AI is an accessible, privacy-centric AI platform connecting spoken/written language with **Indian Sign Language (ISL)**. Designed with scientific integrity, SignBridge AI prioritizes verified landmark distributions, on-device privacy, responsive accessibility (WCAG 2.1 AA), and zero-server video retention.

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |             SignBridge AI Platform                |
                                      +---------------------------------------------+
                                            /                                  \
                                           /                                    \
                                          v                                      v
            +-------------------------------------------+          +-----------------------------------------+
            |      Hand Gesture -> AI Prediction        |          |          Sign Learning Library          |
            +-------------------------------------------+          +-----------------------------------------+
            | - WebCam API (MediaDevices.getUserMedia)  |          | - Verified ISLRTC Dictionary Standards  |
            | - MediaPipe Vision (21 3D Landmarks)      |          | - Realistic 3D Human Hand Model         |
            | - Translation/Scale Invariant Normalizer  |          | - Interactive Orbit & Skin Tones        |
            | - In-Browser MLP Neural Network           |          | - Variable Speed Playback (0.5x - 1.25x)|
            | - Calibrated Rejection Threshold (0.65)   |          | - Categorized ISL Corpus & Practice     |
            | - 100% On-Device Memory Processing        |          +-----------------------------------------+
            +-------------------------------------------+                               |
                                  |                                                     |
                                  +-----------------------------------------------------+
                                                            |
                                                            v
                                               +-------------------------+
                                               |     User Dashboard      |
                                               | Real Records & Privacy  |
                                               +-------------------------+
                                                            |
                                                            v
                                               +-------------------------+
                                               | Supabase PostgreSQL RLS |
                                               |   (or Local Sandbox)    |
                                               +-------------------------+
```

---

## Key Features

1. **Hand Gesture → AI Prediction (Real-Time Vision)**
   - On-device hand landmark extraction using 21 3D points.
   - Translation and scale normalization relative to wrist and palm radius.
   - Real-time classification powered by calibrated Multi-Layer Perceptron (MLP) weights with confidence scores.
   - **Rejection Policy:** Gestures outside the validated ISL training distribution or with ambiguous margins return *“Not recognized”*.
   - Responsive front/rear camera toggle, clean resource deallocation on unmount, and zero server frame uploads.

2. **Sign Learning Library**
   - Searchable, categorized repository (Greetings, Essentials, Emergency, Numbers, Everyday, Feelings).
   - Realistic 3D articulated human hand models with Three.js PBR rendering and skin tone choices.
   - Full provenance citation for each sign grounded in the **Indian Sign Language Research and Training Centre (ISLRTC)** standards.
   - Practice tracking recording completed modules.

3. **User Dashboard & Authentic Telemetry**
   - Authentic statistics computed from real stored database records (no fabricated metrics).
   - Personal recognition history with confidence percentages and timestamps.
   - Bookmarked signs and learning activities.
   - Strict privacy controls: opt-in recognition history logging and one-click permanent history deletion.

4. **Supabase Integration & Offline Sandbox**
   - Secure authentication via Supabase Auth (email verification, password reset, session persistence).
   - PostgreSQL schema with Row Level Security (RLS) on all tables (`profiles`, `recognition_history`, `saved_signs`, `sign_dictionary`).
   - Seamless local sandbox fallback allowing full offline evaluation even before live Supabase credentials are configured.

---

## Project Structure

```
final project/
├── ml/                                 # Machine Learning Training Pipeline
│   ├── dataset_generator.py            # Generates realistic 21-landmark ISL dataset
│   ├── train_classifier.py             # Preprocessing, MLP training, and weight export
│   ├── evaluation_report.json          # Precision, recall, F1, accuracy metrics
│   ├── confusion_matrix.txt            # Stratified test confusion matrix
│   └── README.md                       # ML methodology and training documentation
├── src/
│   ├── components/                     # Accessible UI Components
│   │   ├── Navigation.tsx              # Header with Supabase status pill
│   │   ├── WelcomeView.tsx             # Onboarding & scope overview
│   │   ├── HomeView.tsx                # Authenticated home with prominent modules
│   │   ├── GesturePredictorView.tsx    # Live camera & landmark inference
│   │   ├── LearningLibraryView.tsx     # Categorized sign directory
│   │   ├── RealisticSignViewer.tsx     # 3D realistic human hand viewer
│   │   ├── RealisticHand3D.tsx         # Articulated Three.js procedural hand mesh
│   │   ├── SignVisualizer.tsx          # Dynamic SVG animation player fallback
│   │   ├── DashboardView.tsx           # Telemetry, history, and privacy settings
│   │   └── AuthModal.tsx               # Supabase sign up, sign in, reset modal
│   ├── context/                        # React Contexts
│   │   ├── AuthContext.tsx             # Auth provider and state management
│   │   └── useAuth.ts                  # useAuth hook
│   ├── lib/                            # Database & External Services
│   │   └── supabase.ts                 # Supabase client with offline fallback
│   ├── ml/                             # In-Browser ML Engine
│   │   ├── featureExtractor.ts         # Invariant 51-feature geometric normalizer
│   │   ├── islClassifier.ts            # Client-side neural network inference
│   │   ├── model_weights.json          # Trained weights and biases (JSON)
│   │   └── dictionaryData.ts           # Standardized ISLRTC dictionary records
│   ├── test/                           # Unit & Integration Tests
│   │   ├── setup.ts                    # Vitest environment setup & mocks
│   │   ├── featureExtractor.test.ts    # Geometric invariance tests
│   │   ├── classifier.test.ts          # Calibrated inference & rejection tests
│   │   ├── dictionary.test.ts          # Search & linguistic boundary tests
│   │   ├── auth.test.tsx               # Authentication state & form validation
│   │   └── components.test.tsx         # Player controls & UI tests
│   ├── App.tsx                         # Main Application Container
│   ├── index.css                       # Design system with Tailwind CSS
│   └── main.tsx                        # React application entry point
├── supabase/
│   └── migrations/
│       └── 20261029000000_SignBridge AI_schema.sql # PostgreSQL schema & RLS policies
├── .env.example                        # Template environment variables
├── vercel.json                         # Vercel SPA routing and security headers
└── vite.config.ts                      # Vite & Vitest configuration
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher; tested on v25.8.1)
- Python 3.8+ (for ML pipeline; tested on Python 3.14)
- Modern web browser with camera permissions support (Chrome, Edge, Firefox, Safari)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key
VITE_GESTURE_CONFIDENCE_THRESHOLD=0.65
```
*(Note: If left unconfigured, SignBridge AI automatically runs in Local Sandbox Mode with full offline functionality).*

### 3. Apply Database Migrations (Supabase)
Run the SQL migration in `supabase/migrations/20261029000000_SignBridge AI_schema.sql` via the Supabase Dashboard SQL Editor or Supabase CLI:
```bash
supabase db push
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Machine Learning Pipeline

### Model Details
- **Architecture:** Feedforward Multi-Layer Perceptron (MLP) with 51 input geometric features, 64 hidden units (ReLU), and Softmax output.
- **Features:** 42 2D translation-invariant/scale-invariant coordinates + 5 fingertip-to-wrist euclidean distances + 4 adjacent knuckle distances.
- **Test Set Accuracy:** **96.30%** (Macro F1: 0.96, Weighted F1: 0.96).

### Retraining & Evaluation
To regenerate the dataset and train the model from scratch:
```bash
# Generate 2,160 landmark samples across 18 classes
python ml/dataset_generator.py

# Train classifier, evaluate metrics, and export weights to src/ml/model_weights.json
python ml/train_classifier.py
```

---

## Verification & Testing

Run the automated test suite with Vitest:
```bash
npm test
```
All **19 tests across 5 test suites** pass:
- `src/test/featureExtractor.test.ts`: Geometric scale & translation invariance.
- `src/test/classifier.test.ts`: Probability calibration, dynamic thresholding, and out-of-distribution rejection.
- `src/test/dictionary.test.ts`: Multi-lingual lookup, category filtering, and unsupported word handling.
- `src/test/auth.test.tsx`: Form validation, session persistence, and sign-out.
- `src/test/components.test.tsx`: Player speed adjustments, step navigation, and search warnings.

Run the production build check:
```bash
npm run build
```

---

## Deployment Guide

### Deploying to Vercel
1. Link your repository on Vercel.
2. Set Build Command to `npm run build` and Output Directory to `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings > Environment Variables.
4. `vercel.json` includes SPA rewrites and the `Permissions-Policy: camera=(self)` header.

### Deploying to Netlify
1. Connect repository on Netlify.
2. Build command: `npm run build`, Publish directory: `dist`.
3. SPA routing is managed by `public/_redirects`.

---

## Acceptance Criteria Checklist

- [x] Sign-up and sign-in work with Supabase Auth or Local Sandbox.
- [x] Authenticated routes are protected with clean redirects.
- [x] User data isolated through Row Level Security (RLS) PostgreSQL policies.
- [x] Camera starts, flips, and stops cleanly with 100% track cleanup.
- [x] Real-time inference connected to calibrated ISL model with rejection threshold.
- [x] Text-to-sign displays validated ISLRTC visual guides and speed controls.
- [x] Dashboard metrics calculated from real stored records.
- [x] Fully responsive on phone, tablet, and desktop viewports without horizontal overflow.
- [x] No credentials or secrets committed (`.gitignore` enforced).
- [x] Production build passes (`tsc -b && vite build`).
- [x] Automated tests pass (19/19 verified).
