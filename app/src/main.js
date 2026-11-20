// Vice City Panels — page wiring.
//
// Owns the editor state, binds every control, and renders the live preview.
// Export renders the same state onto a fresh offscreen canvas at the exact
// post size and downloads it, so what you see is what the PNG holds. A
// `?shot=` query instead sets up a fixed scene for screenshots (./shots.js).

import { drawCover, LAYOUTS, GRADES, panelShapes } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

// One slot per panel the layouts can show; layouts use the first N slots.
const state = {
  layout: 'hero2',
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
  title: 'Sunset Heist',
  subline: 'A Vice City story',
  grade: 'sunset',
  titlePos: 'bottom',
  previewSize: '1080x1080',
  onePhotoEverywhere: false,
};

let selectedPanel = 0;

const PREVIEW_SIZES = {
  '1080x1080': [960, 960],
  '1080x1350': [768, 960],
  '1920x1080': [960, 540],
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

function note(message) {
  status.textContent = message;
}

// --- layout ---------------------------------------------------------------

const layoutRow = $('layout-row');
Object.entries(LAYOUTS).forEach(([id, def]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = def.label;
  button.dataset.layout = id;
  button.addEventListener('click', () => {
    state.layout = id;
    layoutRow.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
    refreshPanelPicker();
    redraw();
  });
  layoutRow.appendChild(button);
});
layoutRow.querySelector('[data-layout="hero2"]').classList.add('active');

// --- grade ----------------------------------------------------------------

const gradeRow = $('grade-row');
Object.entries(GRADES).forEach(([id, def]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = def.label;
  button.dataset.grade = id;
  button.addEventListener('click', () => {
    state.grade = id;
    gradeRow.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
    redraw();
  });
  gradeRow.appendChild(button);
});
gradeRow.querySelector('[data-grade="sunset"]').classList.add('active');

// --- photos ---------------------------------------------------------------

const slotNames = ['Hero', 'Side 1', 'Side 2', 'Side 3'];
const photoSlots = $('photo-slots');

state.panels.forEach((panel, i) => {
  const box = document.createElement('div');
  box.className = 'slot';
  box.innerHTML = `
    <span class="slot-name">${slotNames[i]}</span>
    <label class="file-label">Choose photo
      <input type="file" accept="image/*" data-slot="${i}">
    </label>
    <span class="sample-links">
      <button type="button" data-sample="pier" data-slot="${i}">Pier</button>
      <button type="button" data-sample="boulevard" data-slot="${i}">Boulevard</button>
    </span>`;
  photoSlots.appendChild(box);
});

async function setPanelPhoto(i, img) {
  if (state.onePhotoEverywhere) {
    state.panels.forEach((p) => { p.img = img; });
    note(`Photo placed in every panel.`);
  } else {
    state.panels[i].img = img;
    note(`Photo placed in ${slotNames[i]} panel.`);
  }
  redraw();
}

photoSlots.addEventListener('change', async (event) => {
  const input = event.target;
  if (input.type !== 'file' || !input.files[0]) return;
  try {
    const img = await loadImage(URL.createObjectURL(input.files[0]));
    await setPanelPhoto(Number(input.dataset.slot), img);
  } catch {
    note('That file could not be read as a photo.');
  }
  input.value = '';
});

photoSlots.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-sample]');
  if (!button) return;
  try {
    const img = await loadImage(`samples/${button.dataset.sample}.jpg`);
    await setPanelPhoto(Number(button.dataset.slot), img);
  } catch {
    note('Sample photo failed to load.');
  }
});

$('one-photo').addEventListener('change', (event) => {
  state.onePhotoEverywhere = event.target.checked;
  if (state.onePhotoEverywhere && state.panels[0].img) {
    state.panels.forEach((p) => { p.img = state.panels[0].img; });
    redraw();
  }
  note(state.onePhotoEverywhere
    ? 'One photo across all panels: on.'
    : 'One photo across all panels: off.');
});

// --- per-panel crop -------------------------------------------------------

const panelPicker = $('panel-picker');
function refreshPanelPicker() {
  const count = LAYOUTS[state.layout].panels;
  panelPicker.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = slotNames[i];
    panelPicker.appendChild(option);
  }
  selectedPanel = Math.min(selectedPanel, count - 1);
  panelPicker.value = String(selectedPanel);
  syncCropSliders();
}
refreshPanelPicker();

panelPicker.addEventListener('change', () => {
  selectedPanel = Number(panelPicker.value);
  syncCropSliders();
});

function syncCropSliders() {
  const panel = state.panels[selectedPanel];
  $('zoom').value = panel.zoom;
  $('pan-x').value = panel.ox;
  $('pan-y').value = panel.oy;
  $('zoom-val').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('pan-x-val').textContent = `${Math.round(panel.ox * 100)}`;
  $('pan-y-val').textContent = `${Math.round(panel.oy * 100)}`;
}

$('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  syncCropSliders();
  redraw();
});
$('pan-x').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  syncCropSliders();
  redraw();
});
$('pan-y').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  syncCropSliders();
  redraw();
});

// Clicking the preview picks the panel under the cursor.
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const shapes = panelShapes(state.layout, canvas.width, canvas.height);
  const hit = shapes.findIndex((shape) => {
    if (shape.points) {
      // Point-in-polygon for the diagonal split.
      let inside = false;
      const pts = shape.points;
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        if ((pts[a][1] > y) !== (pts[b][1] > y)
          && x < ((pts[b][0] - pts[a][0]) * (y - pts[a][1])) / (pts[b][1] - pts[a][1]) + pts[a][0]) {
          inside = !inside;
        }
      }
      return inside;
    }
    return x >= shape.x && x < shape.x + shape.w && y >= shape.y && y < shape.y + shape.h;
  });
  if (hit >= 0) {
    selectedPanel = hit;
    panelPicker.value = String(hit);
    syncCropSliders();
    note(`Editing the ${slotNames[hit]} panel — use the zoom and position sliders.`);
  }
});

// --- caption --------------------------------------------------------------

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subline').addEventListener('input', (e) => { state.subline = e.target.value; redraw(); });
$('title-pos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });

// --- preview size ---------------------------------------------------------

$('preview-size').addEventListener('change', (e) => {
  state.previewSize = e.target.value;
  const [w, h] = PREVIEW_SIZES[state.previewSize];
  canvas.width = w;
  canvas.height = h;
  redraw();
});

// --- export ---------------------------------------------------------------

// Renders the cover at an exact post size and returns a PNG data URL.
// The export buttons use this through toBlob; the screenshot scenes and the
// automated checks call it directly.
function renderExport(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  drawCover(off, state);
  return off;
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportPNG(width, height) {
  const started = performance.now();
  const off = renderExport(width, height);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const ms = Math.round(performance.now() - started);
  downloadBlob(blob, `vice-city-panels-${width}x${height}.png`);
  note(`Exported ${width} x ${height} PNG in ${ms} ms — check your downloads.`);
  return { width, height, ms, bytes: blob.size };
}

window.__viceExport = async (width, height) => {
  const off = renderExport(width, height);
  return off.toDataURL('image/png');
};
window.__viceState = state;

document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', () => {
    const [w, h] = button.dataset.export.split('x').map(Number);
    exportPNG(w, h);
  });
});

// --- fixed scenes ---------------------------------------------------------

const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShot(params.get('shot'), params, { state, loadImage, redraw, renderExport });
} else {
  redraw();
}
