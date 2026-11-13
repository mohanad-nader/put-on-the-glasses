export type ColorBlindness =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia';

export interface CvdOption {
  id: ColorBlindness;
  label: string;
  hint: string;
  /** Row-major 3x3 matrix applied to linear RGB, or null for "no filter". */
  matrix: readonly number[] | null;
}

/**
 * Dichromacy matrices from Machado, Oliveira and Fernandes (2009), severity 1.0.
 * Achromatopsia uses the Rec. 709 luminance weights (correct for linear RGB).
 */
export const CVD_OPTIONS: readonly CvdOption[] = [
  { id: 'none', label: 'Typical', hint: 'No filter', matrix: null },
  {
    id: 'protanopia',
    label: 'Protanopia',
    hint: 'Red-blind',
    matrix: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia',
    hint: 'Green-blind',
    matrix: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia',
    hint: 'Blue-blind',
    matrix: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  },
  {
    id: 'achromatopsia',
    label: 'Achromatopsia',
    hint: 'Total color blindness',
    matrix: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
  },
];

export function cvdOption(id: ColorBlindness): CvdOption {
  return CVD_OPTIONS.find((o) => o.id === id) ?? CVD_OPTIONS[0];
}

/** DOM id of the SVG filter for a type (defined once in SvgDefs). */
export function cvdFilterId(id: ColorBlindness): string {
  return `cvd-${id}`;
}

/** Expands a 3x3 matrix into the 4x5 value list that feColorMatrix expects. */
export function toFeColorMatrix(m: readonly number[]): string {
  if (m.length !== 9) {
    throw new Error('A color-blindness matrix needs exactly 9 values.');
  }
  return [
    `${m[0]} ${m[1]} ${m[2]} 0 0`,
    `${m[3]} ${m[4]} ${m[5]} 0 0`,
    `${m[6]} ${m[7]} ${m[8]} 0 0`,
    '0 0 0 1 0',
  ].join('  ');
}
