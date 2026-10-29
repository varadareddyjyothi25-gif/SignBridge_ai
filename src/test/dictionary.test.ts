import { describe, it, expect } from 'vitest';
import { VALIDATED_ISL_DICTIONARY, findSignsByText } from '../ml/dictionaryData';

describe('Validated ISL Dictionary', () => {
  it('contains validated entries with non-empty descriptions and step instructions', () => {
    expect(VALIDATED_ISL_DICTIONARY.length).toBeGreaterThan(10);

    for (const entry of VALIDATED_ISL_DICTIONARY) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.englishPhrase).toBeTruthy();
      expect(entry.validationStatus).toBe('validated_islrtc');
      expect(entry.sourceProvenance).toContain('ISLRTC');
      expect(entry.stepInstructions.length).toBeGreaterThan(0);
    }
  });

  it('finds entries by English phrase or category', () => {
    const namaste = findSignsByText('Namaste');
    expect(namaste.length).toBeGreaterThan(0);
    expect(namaste[0].label).toBe('NAMASTE');

    const greetings = findSignsByText('Greetings');
    expect(greetings.length).toBeGreaterThan(1);
  });

  it('finds entries by Hindi text', () => {
    const hindiResult = findSignsByText('नमस्ते');
    expect(hindiResult.length).toBeGreaterThan(0);
  });

  it('returns empty array when query does not match any entry without inventing words', () => {
    const nonExistent = findSignsByText('completely_unsupported_quantum_word');
    expect(nonExistent).toEqual([]);
  });

  it('returns empty array for whitespace-only query', () => {
    const empty = findSignsByText('   ');
    expect(empty).toEqual([]);
  });
});
