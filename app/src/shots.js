// Vice Cover Studio — screenshot mode.
//
// The parent process captures the entry's screenshots by opening the app
// with a query string, so the shots are deterministic and need no clicking:
//
//   ?shot=cover&photo=boulevard&caption=Sunset%20Heist&layout=grid&grade=sunset&size=square
//       Full-window render of one exported cover.
//   ?shot=editor&photo=car&caption=Boulevard%20Queen&layout=trio&grade=neon
//       The editor itself, with a sample photo loaded and the caption set.
//
// photo names the bundled samples (boulevard, car, pier). Nothing here is
// part of the app's normal flow: without ?shot= the editor opens empty.

import { EXPORT_SIZES, GRADES, LAYOUTS, panelsForLayout, renderCover } from './cover.js';
import { SAMPLES } from './editor.js';

/** Load one bundled sample photo by its short name. */
function loadSamplePhoto(name) {
  const sample = SAMPLES.find((s) => s.src.includes(name)) || SAMPLES[0];
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.dataset.name = sample.name;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`could not load ${sample.src}`));
    img.src = sample.src;
  });
}

/**
 * Handle a ?shot= URL. editorApi is the object buildEditor returned.
 * Returns true when a shot was handled.
 */
export async function handleShot(editorApi) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;

  const { state, redraw, loadSamples } = editorApi;
  const caption = params.get('caption');
  if (caption !== null) {
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

  const photoName = params.get('photo');
  if (photoName) {
    const img = await loadSamplePhoto(photoName);
    state.photos = [img];
    if (editorApi.rebuildTray) editorApi.rebuildTray();
    state.panels.forEach((panel, i) => {
      panel.photo = 0;
      const crops = [
        { zoom: 1, ox: 0, oy: 0 },
        { zoom: 1.35, ox: -0.12, oy: -0.08 },
        { zoom: 1.35, ox: 0.12, oy: 0.08 },
      ];
      const crop = crops[i % crops.length];
      panel.zoom = crop.zoom;
      panel.ox = crop.ox;
      panel.oy = crop.oy;
    });
  } else {
    await loadSamples();
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const sizeName = params.get('size') || 'square';
    const size = EXPORT_SIZES[sizeName] || EXPORT_SIZES.square;
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
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load('100px Anton');
      } catch (error) {
        // The caption still draws in its fallback face.
      }
    }
    renderCover(canvas.getContext('2d'), size.w, size.h, state, -1);
    document.title = 'Vice Cover Studio — cover';
    return true;
  }

  redraw();
  document.title = 'Vice Cover Studio — editor';
  return true;
}
