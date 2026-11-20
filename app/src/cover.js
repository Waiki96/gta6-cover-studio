// Vice City Panels — the cover renderer.
//
// A cover is a set of photo panels clipped to a layout, a colour grade washed
// over the whole thing, and a big bold title with a subline. Everything draws
// onto one 2D canvas at whatever size the caller asks for, so the live preview
// and the exported PNG share exactly the same code path.

export const LAYOUTS = {
  single: { label: 'Single hero', panels: 1 },
  hero2: { label: 'Hero + side', panels: 2 },
  hero3: { label: 'Hero + two sides', panels: 3 },
  quad: { label: 'Four panels', panels: 4 },
  diagonal: { label: 'Diagonal split', panels: 2 },
};

export const GRADES = {
  sunset: { label: 'Sunset', wash: ['rgba(255,150,70,0.10)', 'rgba(255,60,140,0.30)'], accent: '#ff2e88', deep: '#2b1030' },
  neon: { label: 'Neon', wash: ['rgba(0,229,255,0.12)', 'rgba(255,0,153,0.32)'], accent: '#00e5ff', deep: '#12082e' },
  dusk: { label: 'Dusk', wash: ['rgba(90,80,200,0.10)', 'rgba(20,10,60,0.42)'], accent: '#ffb347', deep: '#0d0a24' },
  none: { label: 'No grade', wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.16)'], accent: '#ffffff', deep: '#14101c' },
};

// Panel geometry for a layout. Each entry is either a rectangle {x, y, w, h} or,
// for the diagonal split, a polygon {points: [[x, y], ...]}. Coordinates are in
// canvas pixels; `gap` is the dark gutter between panels.
export function panelShapes(layout, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.014));
  switch (layout) {
    case 'single':
      return [{ x: 0, y: 0, w, h }];
    case 'hero2': {
      const split = Math.round(w * 0.62);
      return [
        { x: 0, y: 0, w: split - g, h },
        { x: split + g, y: 0, w: w - split - g, h },
      ];
    }
    case 'hero3': {
      const split = Math.round(w * 0.58);
      const half = Math.round(h / 2);
      return [
        { x: 0, y: 0, w: split - g, h },
        { x: split + g, y: 0, w: w - split - g, h: half - g },
        { x: split + g, y: half + g, w: w - split - g, h: h - half - g },
      ];
    }
    case 'quad': {
      const halfW = Math.round(w / 2);
      const halfH = Math.round(h / 2);
      return [
        { x: 0, y: 0, w: halfW - g, h: halfH - g },
        { x: halfW + g, y: 0, w: w - halfW - g, h: halfH - g },
        { x: 0, y: halfH + g, w: halfW - g, h: h - halfH - g },
        { x: halfW + g, y: halfH + g, w: w - halfW - g, h: h - halfH - g },
      ];
    }
    case 'diagonal': {
      const top = Math.round(w * 0.64);
      const bottom = Math.round(w * 0.36);
      return [
        { points: [[0, 0], [top, 0], [bottom, h], [0, h]] },
        { points: [[top, 0], [w, 0], [w, h], [bottom, h]] },
      ];
    }
    default:
      return [{ x: 0, y: 0, w, h }];
  }
}

// Bounding box of a shape, used to cover-fit a photo inside it.
function shapeBounds(shape) {
  if (shape.points) {
    const xs = shape.points.map((p) => p[0]);
    const ys = shape.points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
}

function clipTo(ctx, shape) {
  ctx.beginPath();
  if (shape.points) {
    ctx.moveTo(shape.points[0][0], shape.points[0][1]);
    for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i][0], shape.points[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  }
  ctx.clip();
}

// Draws one photo into one panel: cover-fit, then zoomed around the centre and
// shifted by the panel's offsets (ox, oy in fractions of the panel size).
function drawPanelPhoto(ctx, shape, panel) {
  const img = panel.img;
  if (!img) return;
  const b = shapeBounds(shape);
  const zoom = panel.zoom || 1;
  const scale = Math.max(b.w / img.naturalWidth, b.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = b.x + (b.w - pw) / 2 + (panel.ox || 0) * b.w;
  const dy = b.y + (b.h - ph) / 2 + (panel.oy || 0) * b.h;
  ctx.save();
  clipTo(ctx, shape);
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

// Empty panel: a flat deep colour with a faint diagonal sheen so an unfilled
// slot still reads as a designed panel rather than a hole.
function drawEmptyPanel(ctx, shape, deep) {
  ctx.save();
  clipTo(ctx, shape);
  ctx.fillStyle = deep;
  const b = shapeBounds(shape);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const sheen = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}

function strokeShape(ctx, shape, color, width) {
  ctx.save();
  ctx.beginPath();
  if (shape.points) {
    ctx.moveTo(shape.points[0][0], shape.points[0][1]);
    for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i][0], shape.points[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// Fits a font size so `text` fits inside `maxWidth`, then returns it.
function fitSize(ctx, text, start, maxWidth, family) {
  let size = start;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

const FAMILY = '"Arial Black", "Segoe UI", system-ui, sans-serif';

function drawTitle(ctx, w, h, title, subline, accent, position) {
  const text = (title || '').trim().toUpperCase();
  const sub = (subline || '').trim();
  if (!text && !sub) return;
  const bottom = position !== 'top';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    const size = fitSize(ctx, text, Math.round(h * 0.115), w * 0.84, FAMILY);
    const cx = w / 2;
    const cy = bottom ? h - h * 0.10 : h * 0.11;
    ctx.translate(cx, cy);
    ctx.rotate(-0.028); // a slight lean, poster style
    ctx.translate(-cx, -cy);
    // Coloured echo behind the letters, then a heavy black outline, then white.
    ctx.font = `900 ${size}px ${FAMILY}`;
    ctx.fillStyle = accent;
    ctx.fillText(text, cx + size * 0.03, cy + size * 0.035);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = '#0a0612';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, cy);
  }
  if (sub) {
    const size = fitSize(ctx, sub.toUpperCase(), Math.round(h * 0.038), w * 0.8, FAMILY);
    ctx.font = `900 ${size}px ${FAMILY}`;
    const cy = bottom ? h - h * 0.028 : h * 0.20;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.strokeStyle = '#0a0612';
    ctx.strokeText(sub.toUpperCase(), w / 2, cy);
    ctx.fillStyle = accent;
    ctx.fillText(sub.toUpperCase(), w / 2, cy);
  }
  ctx.restore();
}

// state: { layout, panels: [{img, zoom, ox, oy}, ...], title, subline,
//          grade, titlePos }
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const shapes = panelShapes(state.layout || 'hero2', w, h);

  // Gutter colour shows through between panels.
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(0, 0, w, h);

  shapes.forEach((shape, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    if (panel.img) drawPanelPhoto(ctx, shape, panel);
    else drawEmptyPanel(ctx, shape, grade.deep);
    strokeShape(ctx, shape, 'rgba(255,255,255,0.85)', Math.max(2, Math.round(Math.min(w, h) * 0.004)));
  });

  // Colour grade: a warm-to-hot wash from top to bottom, then a vignette.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawTitle(ctx, w, h, state.title, state.subline, grade.accent, state.titlePos || 'bottom');
}
