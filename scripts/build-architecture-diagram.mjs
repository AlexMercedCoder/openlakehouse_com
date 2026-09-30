// Draws the open lakehouse reference architecture as a standalone SVG and PNG
// from the site's own layer taxonomy (src/data/layers.ts), so the download and
// the site can never disagree about what the layers are.
//
//   npm run diagram
//
// Writes public/diagrams/open-lakehouse-reference-architecture.svg and .png.
// Commit both; the build does not run this (it needs sharp's SVG renderer and
// local fonts, and the output only changes when the taxonomy does).
//
// Released under CC BY 4.0, attribution Alex Merced. The license and credit are
// drawn into the image and written into the SVG metadata.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { LAYERS } from '../src/data/layers.ts';

const OUT_DIR = path.join(process.cwd(), 'public/diagrams');
const NAME = 'open-lakehouse-reference-architecture';

const W = 1200;
const PAD = 48;
const HEAD_H = 158;
const ROW_H = 78;
const GAP = 6;
const FOOT_H = 92;
const layers = LAYERS.slice().sort((a, b) => b.order - a.order); // agents on top, foundations at the base
const H = HEAD_H + layers.length * ROW_H + (layers.length - 1) * GAP + FOOT_H;

const INK = '#111111';
const SOFT = '#33383D';
const MUTED = '#5F666D';
const GROUND = '#FBFBFA';
const SURFACE = '#FFFFFF';
const HAIRLINE = '#E2E3E1';
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'DejaVu Sans Mono', Menlo, monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Rough advance width for chip sizing; generous so labels never touch the edge.
const textW = (s, size) => s.length * size * 0.56;

const LABEL_X = PAD + 22;
const CHIP_X0 = 560;
const CHIP_MAX_X = W - PAD - 16;

function row(layer, i) {
  const y = HEAD_H + i * (ROW_H + GAP);
  const hue = layer.hue.light;
  let cx = CHIP_X0;
  const chips = [];
  for (const ex of layer.exemplars) {
    const w = textW(ex, 14) + 24;
    if (cx + w > CHIP_MAX_X) break;
    chips.push(
      `<g><rect x="${cx}" y="${y + ROW_H / 2 - 15}" width="${w.toFixed(1)}" height="30" rx="3" fill="${SURFACE}" stroke="${hue}" stroke-width="1.25"/>` +
        `<text x="${(cx + w / 2).toFixed(1)}" y="${y + ROW_H / 2 + 5}" text-anchor="middle" font-family="${SANS}" font-size="14" fill="${INK}">${esc(ex)}</text></g>`,
    );
    cx += w + 8;
  }
  return `
  <g id="layer-${layer.id}">
    <rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${ROW_H}" fill="${SURFACE}" stroke="${HAIRLINE}"/>
    <rect x="${PAD}" y="${y}" width="8" height="${ROW_H}" fill="${hue}"/>
    <text x="${LABEL_X}" y="${y + 24}" font-family="${MONO}" font-size="12" letter-spacing="1.2" fill="${hue}">LAYER ${String(layer.order + 1).padStart(2, "0")}</text>
    <text x="${LABEL_X}" y="${y + 49}" font-family="${SANS}" font-size="22" font-weight="700" fill="${INK}">${esc(layer.label)}</text>
    <text x="${LABEL_X}" y="${y + 68}" font-family="${SANS}" font-size="13" fill="${MUTED}">${esc(layer.question)}</text>
    ${chips.join('\n    ')}
  </g>`;
}

const titleText = 'Open lakehouse reference architecture';
const descText =
  'Nine layers of an open lakehouse, drawn bottom to top in the order the stack is assembled. ' +
  layers
    .slice()
    .reverse()
    .map((l) => `Layer ${l.order + 1}, ${l.label}: ${l.question} Examples: ${l.exemplars.join(', ')}.`)
    .join(' ') +
  ' Diagram by Alex Merced, opendatalakehouse.com, licensed CC BY 4.0.';

const footY = H - FOOT_H + 34;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="odl-arch-title odl-arch-desc">
  <title id="odl-arch-title">${esc(titleText)}</title>
  <desc id="odl-arch-desc">${esc(descText)}</desc>
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <cc:Work rdf:about="https://opendatalakehouse.com/diagrams/${NAME}.svg">
        <dc:title>${esc(titleText)}</dc:title>
        <dc:creator>Alex Merced</dc:creator>
        <dc:source>https://opendatalakehouse.com/architecture/</dc:source>
        <cc:license rdf:resource="https://creativecommons.org/licenses/by/4.0/"/>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <g aria-hidden="true">
    <text x="${PAD}" y="${PAD + 10}" font-family="${MONO}" font-size="13" letter-spacing="1.6" fill="${MUTED}">OPENDATALAKEHOUSE.COM  |  REFERENCE ARCHITECTURE</text>
    <text x="${PAD}" y="${PAD + 48}" font-family="${SANS}" font-size="34" font-weight="800" fill="${INK}">The open lakehouse, layer by layer</text>
    <text x="${PAD}" y="${PAD + 74}" font-family="${SANS}" font-size="15" fill="${SOFT}">Each layer has one job and several interchangeable implementations. Read bottom to top: the order the stack is assembled.</text>
    <text x="${CHIP_X0}" y="${HEAD_H - 10}" font-family="${MONO}" font-size="11" letter-spacing="1.2" fill="${MUTED}">EXAMPLES AT THIS LAYER</text>
    ${layers.map(row).join('\n')}
    <line x1="${PAD}" y1="${H - FOOT_H + 12}" x2="${W - PAD}" y2="${H - FOOT_H + 12}" stroke="${HAIRLINE}"/>
    <text x="${PAD}" y="${footY}" font-family="${SANS}" font-size="14" fill="${SOFT}">Diagram by Alex Merced. Licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Credit "Alex Merced, opendatalakehouse.com".</text>
    <text x="${PAD}" y="${footY + 24}" font-family="${SANS}" font-size="12" fill="${MUTED}">Project names are trademarks of their owners and are used descriptively. Examples are illustrative, not endorsements or a complete list.</text>
  </g>
</svg>
`;

mkdirSync(OUT_DIR, { recursive: true });
const svgPath = path.join(OUT_DIR, `${NAME}.svg`);
writeFileSync(svgPath, svg);
const pngPath = path.join(OUT_DIR, `${NAME}.png`);
await sharp(Buffer.from(svg), { density: 144 }).png({ compressionLevel: 9 }).toFile(pngPath);
console.log(`diagram: wrote ${path.relative(process.cwd(), svgPath)} and ${path.relative(process.cwd(), pngPath)} (${W}x${H})`);
