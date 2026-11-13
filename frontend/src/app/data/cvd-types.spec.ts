import { CVD_OPTIONS, cvdFilterId, cvdOption, toFeColorMatrix } from './cvd-types';

describe('cvd-types', () => {
  const withMatrix = CVD_OPTIONS.filter((o) => o.matrix);

  it('offers the four types from the proposal plus a typical option', () => {
    expect(CVD_OPTIONS.map((o) => o.id)).toEqual([
      'none',
      'protanopia',
      'deuteranopia',
      'tritanopia',
      'achromatopsia',
    ]);
  });

  it('keeps white as white (every matrix row sums to 1)', () => {
    for (const option of withMatrix) {
      const m = option.matrix!;
      for (const row of [0, 3, 6]) {
        expect(m[row] + m[row + 1] + m[row + 2]).toBeCloseTo(1, 4);
      }
    }
  });

  it('expands a 3x3 matrix to 20 feColorMatrix values with an opaque alpha row', () => {
    const values = toFeColorMatrix(cvdOption('protanopia').matrix!).trim().split(/\s+/);
    expect(values).toHaveLength(20);
    expect(values.slice(15)).toEqual(['0', '0', '0', '1', '0']);
  });

  it('rejects a matrix of the wrong size', () => {
    expect(() => toFeColorMatrix([1, 0, 0])).toThrow();
  });

  it('builds a stable filter id', () => {
    expect(cvdFilterId('deuteranopia')).toBe('cvd-deuteranopia');
  });
});
