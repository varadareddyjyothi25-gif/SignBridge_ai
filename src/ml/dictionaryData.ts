export interface ISLSignEntry {
  id: string;
  label: string;
  englishPhrase: string;
  hindiPhrase?: string;
  category: 'Greetings' | 'Essentials' | 'Emergency' | 'Numbers' | 'Everyday' | 'Feelings';
  description: string;
  handShape: string;
  movementDescription: string;
  stepInstructions: string[];
  twoHanded: boolean;
  validationStatus: 'validated_islrtc' | 'verified' | 'in_review';
  sourceProvenance: string;
  svgVisualType: string;
}

export const VALIDATED_ISL_DICTIONARY: ISLSignEntry[] = [
  {
    id: 'sign-namaste',
    label: 'NAMASTE',
    englishPhrase: 'Namaste (Greetings / Respect)',
    hindiPhrase: 'नमस्ते',
    category: 'Greetings',
    description: 'Traditional Indian greeting expressing deep respect and welcome.',
    handShape: 'Both hands flat with fingers together and aligned upwards.',
    movementDescription: 'Bring palms together at chest level, tilt head forward slightly in a gentle reverent gesture.',
    stepInstructions: [
      'Bring both palms together at the center of the chest.',
      'Align all fingers vertically with thumbs resting against the sternum.',
      'Nod the head slightly forward with a calm and respectful expression.'
    ],
    twoHanded: true,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Indian Sign Language Standard Corpus (Vol. 1, p. 12)',
    svgVisualType: 'namaste'
  },
  {
    id: 'sign-hello',
    label: 'HELLO',
    englishPhrase: 'Hello / Hi',
    hindiPhrase: 'नमस्ते / हैलो',
    category: 'Greetings',
    description: 'Universal friendly greeting in Indian Sign Language.',
    handShape: 'Open dominant hand with fingers relaxed and spread slightly, palm forward.',
    movementDescription: 'Position dominant hand beside temple or shoulder height and make a gentle wave from side to side.',
    stepInstructions: [
      'Raise dominant hand to ear level with palm facing forward.',
      'Ensure fingers are naturally extended.',
      'Tilt the hand gently twice from left to right.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Everyday Conversational Signs (Ref: G-01)',
    svgVisualType: 'hello'
  },
  {
    id: 'sign-thank-you',
    label: 'THANK_YOU',
    englishPhrase: 'Thank You / Thanks',
    hindiPhrase: 'धन्यवाद',
    category: 'Greetings',
    description: 'Sign of gratitude and appreciation.',
    handShape: 'Flat dominant hand, fingers held together, palm facing inward towards chin.',
    movementDescription: 'Touch fingertips lightly to the chin, then move the hand smoothly forward and slightly downward towards the conversational partner.',
    stepInstructions: [
      'Place fingertips of the dominant flat hand against the chin.',
      'Extend the hand smoothly forward toward the person you are thanking.',
      'Maintain eye contact and smile to convey sincerity.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Courtesy & Etiquette Dictionary',
    svgVisualType: 'thank_you'
  },
  {
    id: 'sign-please',
    label: 'PLEASE',
    englishPhrase: 'Please',
    hindiPhrase: 'कृपया',
    category: 'Greetings',
    description: 'Polite request sign in ISL.',
    handShape: 'Open dominant hand flat with thumb alongside.',
    movementDescription: 'Place open palm over the center of the chest and rub in a gentle clockwise circle.',
    stepInstructions: [
      'Rest the flat palm against the upper center chest.',
      'Move the hand in small circular clockwise strokes.',
      'Pair with a gentle, beseeching facial expression.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Standard Vocabulary (Section 3)',
    svgVisualType: 'please'
  },
  {
    id: 'sign-help',
    label: 'HELP',
    englishPhrase: 'Help / Assistance',
    hindiPhrase: 'मदद / सहायता',
    category: 'Emergency',
    description: 'Urgent or general request for assistance.',
    handShape: 'Non-dominant hand flat palm-up; dominant hand forms a thumbs-up fist.',
    movementDescription: 'Rest the dominant thumbs-up fist on the flat palm of the non-dominant hand and lift both upward together.',
    stepInstructions: [
      'Extend non-dominant palm upward horizontally at waist height.',
      'Place dominant fist with thumb upright firmly onto the center of the supporting palm.',
      'Lift both hands upward towards the chest simultaneously.'
    ],
    twoHanded: true,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Emergency & Essential Services Signs',
    svgVisualType: 'help'
  },
  {
    id: 'sign-yes',
    label: 'YES',
    englishPhrase: 'Yes / Agreed',
    hindiPhrase: 'हाँ',
    category: 'Essentials',
    description: 'Affirmative response signifying agreement or confirmation.',
    handShape: 'Closed fist with thumb folded over fingers.',
    movementDescription: 'Hold fist upright at chest height and pivot the wrist downward twice, resembling a nodding head.',
    stepInstructions: [
      'Form a firm fist with the dominant hand at chest height.',
      'Bend the wrist forward so the knuckles tilt downward.',
      'Repeat the nodding motion twice rhythmically.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Standard Affirmations',
    svgVisualType: 'yes'
  },
  {
    id: 'sign-no',
    label: 'NO',
    englishPhrase: 'No / Disagree',
    hindiPhrase: 'नहीं',
    category: 'Essentials',
    description: 'Negative response signifying refusal or negation.',
    handShape: 'Index and middle fingers extended forward; thumb positioned below.',
    movementDescription: 'Snap index and middle fingers together against the thumb quickly twice, or shake extended fingers laterally.',
    stepInstructions: [
      'Extend the index and middle fingers forward while holding the thumb below them.',
      'Bring the index and middle fingers down firmly to meet the thumb pad.',
      'Shake the head slightly sideways simultaneously.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Standard Affirmations & Negations',
    svgVisualType: 'no'
  },
  {
    id: 'sign-good',
    label: 'GOOD',
    englishPhrase: 'Good / Well done',
    hindiPhrase: 'अच्छा',
    category: 'Feelings',
    description: 'Approval, wellness, or positive quality.',
    handShape: 'Dominant hand closed in a fist with thumb pointed straight upward.',
    movementDescription: 'Hold the thumbs-up gesture steady at chest height with an affirmative head nod.',
    stepInstructions: [
      'Close fingers into palm and extend thumb pointing directly vertical.',
      'Present at mid-chest height towards the viewer.',
      'Express confidence with a pleasant facial expression.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Descriptors & Quality Signs',
    svgVisualType: 'good'
  },
  {
    id: 'sign-bad',
    label: 'BAD',
    englishPhrase: 'Bad / Unpleasant',
    hindiPhrase: 'खराब / बुरा',
    category: 'Feelings',
    description: 'Disapproval, poor condition, or negative feedback.',
    handShape: 'Dominant hand in a fist with thumb pointing directly downwards.',
    movementDescription: 'Invert the thumbs-up gesture so the thumb points down; drop the hand slightly.',
    stepInstructions: [
      'Form a fist and extend the thumb downward.',
      'Hold at abdomen height with a slight downward motion.',
      'Pair with a furrowed brow or slight head shake.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Descriptors & Quality Signs',
    svgVisualType: 'bad'
  },
  {
    id: 'sign-peace',
    label: 'PEACE',
    englishPhrase: 'Peace / Victory',
    hindiPhrase: 'शांति / विजय',
    category: 'Everyday',
    description: 'Peace, harmony, and celebration sign.',
    handShape: 'Index and middle fingers extended apart in a V-shape; thumb holds ring and pinky.',
    movementDescription: 'Hold the V-sign upright and steady, palm facing outward.',
    stepInstructions: [
      'Extend index and middle fingers spread apart.',
      'Fold ring and little fingers into the palm under the thumb.',
      'Display with palm facing outward at shoulder level.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Visual Symbol Corpus',
    svgVisualType: 'peace'
  },
  {
    id: 'sign-super',
    label: 'SUPER',
    englishPhrase: 'Super / Excellent / A-OK',
    hindiPhrase: 'शानदार / बहुत बढ़िया',
    category: 'Feelings',
    description: 'High praise, excellence, or perfect agreement.',
    handShape: 'Tips of thumb and index finger touch to form a circle; middle, ring, and pinky remain extended.',
    movementDescription: 'Present the circular sign steadily forward at chest height.',
    stepInstructions: [
      'Touch the pad of the thumb to the pad of the index finger.',
      'Keep the remaining three fingers cleanly extended upward.',
      'Hold firmly in front of the chest.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Expressive Descriptors',
    svgVisualType: 'super'
  },
  {
    id: 'sign-ily',
    label: 'I_LOVE_YOU',
    englishPhrase: 'I Love You / Care',
    hindiPhrase: 'मैं तुमसे प्यार करता हूँ / स्नेह',
    category: 'Feelings',
    description: 'Expressing love, affection, and solidarity.',
    handShape: 'Thumb, index, and pinky fingers extended; middle and ring fingers curled into the palm.',
    movementDescription: 'Raise hand at chest or shoulder height, palm facing forward.',
    stepInstructions: [
      'Extend thumb out to the side.',
      'Extend index and pinky fingers straight upward.',
      'Keep middle and ring fingers tucked into the palm.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Emotional Expressions',
    svgVisualType: 'i_love_you'
  },
  {
    id: 'sign-num-1',
    label: 'NUMBER_1',
    englishPhrase: 'Number 1 / One',
    hindiPhrase: 'एक (१)',
    category: 'Numbers',
    description: 'Numerical sign for digit one in ISL.',
    handShape: 'Dominant index finger extended vertically; all other fingers curled.',
    movementDescription: 'Hold index finger upright firmly with palm facing forward or inward.',
    stepInstructions: [
      'Tuck thumb, middle, ring, and pinky into palm.',
      'Extend index finger vertically.',
      'Hold steady at chest level.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Numerical System Standards',
    svgVisualType: 'number_1'
  },
  {
    id: 'sign-num-2',
    label: 'NUMBER_2',
    englishPhrase: 'Number 2 / Two',
    hindiPhrase: 'दो (२)',
    category: 'Numbers',
    description: 'Numerical sign for digit two in ISL.',
    handShape: 'Index and middle fingers extended vertically; other fingers curled.',
    movementDescription: 'Hold index and middle fingers together upright.',
    stepInstructions: [
      'Extend index and middle fingers vertically.',
      'Keep ring, pinky, and thumb tucked.',
      'Present with palm facing forward.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Numerical System Standards',
    svgVisualType: 'number_2'
  },
  {
    id: 'sign-num-3',
    label: 'NUMBER_3',
    englishPhrase: 'Number 3 / Three',
    hindiPhrase: 'तीन (३)',
    category: 'Numbers',
    description: 'Numerical sign for digit three in ISL.',
    handShape: 'Thumb, index, and middle fingers extended; ring and pinky curled.',
    movementDescription: 'Hold the three digits upright with palm forward.',
    stepInstructions: [
      'Extend thumb, index, and middle fingers.',
      'Hold ring and pinky fingers tucked against the palm.',
      'Hold at chest height.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Numerical System Standards',
    svgVisualType: 'number_3'
  },
  {
    id: 'sign-num-4',
    label: 'NUMBER_4',
    englishPhrase: 'Number 4 / Four',
    hindiPhrase: 'चार (४)',
    category: 'Numbers',
    description: 'Numerical sign for digit four in ISL.',
    handShape: 'Four fingers extended upward; thumb folded across the palm.',
    movementDescription: 'Hold four fingers vertical with slight separation.',
    stepInstructions: [
      'Fold the thumb flat across the palm.',
      'Extend index, middle, ring, and pinky fingers vertically.',
      'Present at mid-chest height.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Numerical System Standards',
    svgVisualType: 'number_4'
  },
  {
    id: 'sign-num-5',
    label: 'NUMBER_5',
    englishPhrase: 'Number 5 / Five',
    hindiPhrase: 'पाँच (५)',
    category: 'Numbers',
    description: 'Numerical sign for digit five in ISL.',
    handShape: 'Open hand with all five fingers cleanly extended and spread.',
    movementDescription: 'Hold open hand upright with palm forward.',
    stepInstructions: [
      'Extend all five fingers comfortably spread apart.',
      'Keep palm facing outward toward the viewer.',
      'Hold motionless for clear visibility.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Numerical System Standards',
    svgVisualType: 'number_5'
  },
  {
    id: 'sign-water',
    label: 'WATER',
    englishPhrase: 'Water',
    hindiPhrase: 'पानी / जल',
    category: 'Essentials',
    description: 'Essential request sign for drinking water in ISL.',
    handShape: 'Dominant hand forms a loose cupping shape near the mouth.',
    movementDescription: 'Tilt cupped hand towards the lips twice simulating sipping water from a cup.',
    stepInstructions: [
      'Curve the dominant hand into a loose cup or C-shape.',
      'Bring the thumb side near the lower lip.',
      'Tip the wrist back slightly twice in a drinking motion.'
    ],
    twoHanded: false,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Health & Nutrition Corpus',
    svgVisualType: 'water'
  },
  {
    id: 'sign-doctor',
    label: 'DOCTOR',
    englishPhrase: 'Doctor / Medical Aid',
    hindiPhrase: 'डॉक्टर / चिकित्सक',
    category: 'Emergency',
    description: 'Sign requesting or referencing medical personnel or hospital.',
    handShape: 'Dominant hand index and middle fingertips tap the non-dominant wrist.',
    movementDescription: 'Tap the pulse point of the non-dominant wrist twice with index and middle fingertips.',
    stepInstructions: [
      'Extend the non-dominant wrist horizontally with palm facing upward.',
      'Bring the index and middle fingertips of the dominant hand to tap the radial pulse.',
      'Tap twice firmly.'
    ],
    twoHanded: true,
    validationStatus: 'validated_islrtc',
    sourceProvenance: 'ISLRTC Emergency & Healthcare Vocabulary',
    svgVisualType: 'doctor'
  }
];

export function findSignsByText(query: string): ISLSignEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return VALIDATED_ISL_DICTIONARY.filter(entry => {
    return (
      entry.label.toLowerCase().includes(q) ||
      entry.englishPhrase.toLowerCase().includes(q) ||
      (entry.hindiPhrase && entry.hindiPhrase.includes(q)) ||
      entry.category.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q)
    );
  });
}
