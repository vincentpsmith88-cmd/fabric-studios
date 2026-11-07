import { describe, expect, it } from 'vitest';
import { svgToPattern } from '@seamer/pattern-model/utils/patternImport';
import { assertPatternBuildable3d } from './importSimplePattern';
import { combineSvgPatterns } from './combineSvgPatterns';

function rectangle(name: string, width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path d="M0 0 H${width} V${height} H0 Z"/></svg>`;
  return { name, pattern: svgToPattern(svg, name) };
}

describe('combineSvgPatterns', () => {
  it('keeps SVG drawings as separate, non-overlapping 3D-ready pieces', () => {
    const combined = combineSvgPatterns([
      rectangle('Front.svg', 100, 60),
      rectangle('Back.svg', 80, 40)
    ]);

    expect(combined.pieces).toHaveLength(2);
    expect(combined.pieces.map(piece => piece.name)).toEqual([
      'Front.svg: Piece 1',
      'Back.svg: Piece 1'
    ]);
    expect(Math.min(...combined.points.map(point => point.x))).toBeCloseTo(0);
    expect(Math.max(...combined.points.map(point => point.x))).toBeCloseTo(220);
    expect(Math.min(...combined.points.map(point => point.y))).toBeCloseTo(0);
    expect(Math.max(...combined.points.map(point => point.y))).toBeCloseTo(60);
    expect(combined.enable3d).toBe(true);
    expect(combined.viewMode).toBe('both');
    expect(combined.settings3d.sourceCameraFraming).toBe('viewport');
    expect(() => assertPatternBuildable3d(combined)).not.toThrow();
  });

  it('rejects empty imports instead of replacing the current pattern', () => {
    expect(() => combineSvgPatterns([])).toThrow('Choose at least one SVG file');
  });

  it('preserves the original single-file import name', () => {
    expect(combineSvgPatterns([rectangle('Panel.svg', 30, 20)]).name).toBe('Panel.svg');
  });
});
