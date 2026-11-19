// Vice Cover Studio — screenshot mode.
//
// With ?shot= in the address the page renders one deterministic shot instead
// of the empty editor: a finished cover full-window (?shot=cover), or the
// editor with a sample photo loaded (?shot=editor). The captures for the
// entry are taken this way, with no clicking, so they always show the same
// thing.

import { EXPORT_SIZES, GRADES, LAYOUTS, panelsForLayout, renderCover } from './cover.js';
import { SAMPLES } from './editor.js';

/** Load one of the bundled samples by the name in the query string. */
function loadSamplePhoto(name) {
  const sample = SAMPLES.find((item) => item.src.includes(name));
  if (!sample) throw new Error(`no sample photo named ${name}`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${sample.src}`));
    img.src = sample.src;
  });
}

/** Apply ?shot=... to a live editor. Returns true when a shot was rendered. */
export async function handleShot(editorApi) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;

  const { state, redraw, rebuildTray } = editorApi;
  const caption = params.get('caption');
  if (caption) {
    state.caption = caption;
    const input = document.querySelector('#caption');
    if (input) input.value = caption;
  }
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    state.panels = panelsForLayout(layout, state.panels);
  }
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  // Keep the option buttons in sync with the state set from the URL.
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  });

  const photo = params.get('photo');
  if (photo) {
    const img = await loadSamplePhoto(photo);
    state.photos = [{ img, name: photo }];
    const crops = [0, -0.18, 0.18];
    state.panels.forEach((panel, i) => {
      panel.photo = 0;
      panel.zoom = 1.12;
      panel.ox = crops[i % crops.length];
      panel.oy = 0;
    });
    rebuildTray();
  }
  redraw();

  if (shot === 'cover') {
    const sizeKey = params.get('size') || 'square';
    const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES.square;
    document.body.classList.add('shot-cover');
    const canvas = document.querySelector('#shot-canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.hidden = false;
    // Fit the whole cover inside the viewport — and cap the display size
    // so the caption band is visible even when a screenshot service only
    // captures the top part of the page.
    const fit = Math.min(
      window.innerWidth / size.w,
      window.innerHeight / size.h,
      640 / Math.max(size.w, size.h),
    );
    canvas.style.width = `${Math.floor(size.w * fit)}px`;
    canvas.style.height = `${Math.floor(size.h * fit)}px`;
    canvas.style.margin = '0 auto';
    await document.fonts.load('100px Anton');
    renderCover(canvas, state, size);
    document.title = 'Vice Cover Studio — cover';
    return true;
  }

  if (shot === 'editor') {
    redraw();
    document.title = 'Vice Cover Studio — editor';
    return true;
  }

  return false;
}
