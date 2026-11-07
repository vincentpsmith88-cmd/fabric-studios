import type { Pattern } from '@seamer/pattern-model';

export interface SvgPatternSource {
  name: string;
  pattern: Pattern;
}

const IMPORT_GAP_MM = 40;

export function combineSvgPatterns(sources: readonly SvgPatternSource[]): Pattern {
  if (sources.length === 0) throw new Error('Choose at least one SVG file to import.');

  const first = sources[0];
  if (!first) throw new Error('Choose at least one SVG file to import.');
  const combined = structuredClone(first.pattern);
  combined.id = crypto.randomUUID();
  combined.versionId = crypto.randomUUID();
  combined.versionNumber = 1;
  combined.versionName = 'Initial';
  combined.name = sources.length === 1 ? first.name : 'Combined SVG garment';
  combined.isPublic = false;
  combined.points = [];
  combined.paths = [];
  combined.pieces = [];
  combined.seams = [];
  combined.texts = [];
  combined.layers = [];

  let cursorX = 0;
  for (const source of sources) {
    const points = source.pattern.points;
    if (points.length === 0) {
      throw new Error(`"${source.name}" contains no drawable SVG geometry.`);
    }

    const bounds = points.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      minY: Math.min(result.minY, point.y),
      maxX: Math.max(result.maxX, point.x)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity });
    const { minX, minY, maxX } = bounds;
    const shiftX = cursorX - minX;
    const shiftY = -minY;

    combined.points.push(...points.map(point => ({
      ...point,
      x: point.x + shiftX,
      y: point.y + shiftY
    })));
    combined.paths.push(...source.pattern.paths.map(path => ({
      ...path,
      ...(path.arc ? { arc: { ...path.arc, cx: path.arc.cx + shiftX, cy: path.arc.cy + shiftY } } : {})
    })));
    combined.pieces.push(...source.pattern.pieces.map((piece, index) => ({
      ...piece,
      name: `${source.name}: ${piece.name || `Piece ${index + 1}`}`,
      position: { x: piece.position.x + shiftX, y: piece.position.y + shiftY }
    })));
    combined.seams.push(...source.pattern.seams);
    combined.texts.push(...source.pattern.texts.map(text => ({
      ...text,
      x: text.x + shiftX,
      y: text.y + shiftY
    })));
    for (const layer of source.pattern.layers) {
      if (!combined.layers.some(existing => existing.id === layer.id)) combined.layers.push(layer);
    }

    cursorX += maxX - minX + IMPORT_GAP_MM;
  }

  combined.layers = combined.layers.length
    ? combined.layers
    : [{ id: 'default', name: 'Default', visible: true, locked: false, order: 0, style: null }];
  combined.currentLayerId = combined.layers[0]?.id ?? 'default';
  combined.hasChanged = true;
  combined.enable3d = true;
  combined.viewMode = 'both';
  combined.settings3d = { ...combined.settings3d, sourceCameraFraming: 'viewport' };
  return combined;
}
