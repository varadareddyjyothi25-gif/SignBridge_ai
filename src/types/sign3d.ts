export type SkinToneId = 'fair' | 'wheatish' | 'olive' | 'deep';

export interface SkinToneDefinition {
  id: SkinToneId;
  label: string;
  skinColor: number;
  creaseColor: number;
  specularColor: number;
  nailColor: number;
}

export const SKIN_TONES: Record<SkinToneId, SkinToneDefinition> = {
  fair: {
    id: 'fair',
    label: 'Fair',
    skinColor: 0xf3d2bd,
    creaseColor: 0xd49b78,
    specularColor: 0xffeae0,
    nailColor: 0xffd9df,
  },
  wheatish: {
    id: 'wheatish',
    label: 'Wheatish',
    skinColor: 0xdeb07d,
    creaseColor: 0xaa723e,
    specularColor: 0xfae2cc,
    nailColor: 0xf2c4c8,
  },
  olive: {
    id: 'olive',
    label: 'Olive / Tan',
    skinColor: 0xbe844d,
    creaseColor: 0x7e491c,
    specularColor: 0xedd2b2,
    nailColor: 0xdeb0b5,
  },
  deep: {
    id: 'deep',
    label: 'Deep Brown',
    skinColor: 0x7c4925,
    creaseColor: 0x47230b,
    specularColor: 0xc89975,
    nailColor: 0xb5848c,
  },
};

export function isWebGLAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}
