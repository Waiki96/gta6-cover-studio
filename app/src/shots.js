// Fixed scenes for screenshots. A `?shot=` query builds one deterministic scene
// instead of the empty editor:
//   ?shot=cover  — cover alone, controls hidden, canvas fills the frame
//   ?shot=editor — the full editor with photos already loaded
//   ?shot=export — renders the cover offscreen at w x h and stores the PNG
//                  data URL on window.__exportDataURL (the real export path)
// Shared query knobs: photo, photo2, photo3, photo4 (sample names),
// layout, grade, caption (main title), subline, titlePos, size (preview size).
// window.__shotReady is set once the scene has painted.

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('sample failed to load'));
    img.src = url;
  });
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, app) {
  const { state, loadImage: appLoad, redraw, renderExport } = app;
  const load = appLoad || loadImage;

  const layout = query.get('layout');
  if (layout) {
    const chip = document.querySelector(`[data-layout="${layout}"]`);
    if (chip) chip.click();
    else state.layout = layout;
  }
  const grade = query.get('grade');
  if (grade) {
    const chip = document.querySelector(`[data-grade="${grade}"]`);
    if (chip) chip.click();
    else state.grade = grade;
  }
  if (query.get('caption') !== null) state.title = query.get('caption');
  if (query.get('subline') !== null) state.subline = query.get('subline');
  if (query.get('titlePos')) state.titlePos = query.get('titlePos');
  if (query.get('size')) {
    const sizeSelect = document.getElementById('preview-size');
    if (sizeSelect) {
      sizeSelect.value = query.get('size');
      sizeSelect.dispatchEvent(new Event('change'));
    }
  }

  // Fill the panel slots from the named samples, in order.
  const names = ['photo', 'photo2', 'photo3', 'photo4'];
  for (let i = 0; i < names.length; i++) {
    const name = query.get(names[i]);
    if (!name) continue;
    try {
      state.panels[i].img = await load(`samples/${name}.jpg`);
    } catch {
      // A missing sample leaves the panel empty; the scene still renders.
    }
  }
  // The one-photo toggle is honoured when the scene asks for it.
  if (query.get('onePhoto') === '1' && state.panels[0].img) {
    state.panels.forEach((p) => { p.img = state.panels[0].img; });
  }

  if (shot === 'export') {
    const w = Number(query.get('w') || 1080);
    const h = Number(query.get('h') || 1080);
    const off = renderExport(w, h);
    window.__exportDataURL = off.toDataURL('image/png');
    window.__exportSize = { width: w, height: h };
    window.__shotReady = true;
    return;
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  markReady();
}
