// Vice Cover Studio — editor.
//
// Owns the page state and the controls: loading the user's photos, picking
// which photo fills which panel, dragging a photo inside its panel to crop
// it, zooming it, choosing the layout, grade and caption, and exporting the
// finished poster as a PNG in one of the three post sizes. The preview is a
// single canvas that re-renders through renderCover on every change, so what
// the editor shows is exactly what the export writes.

import {
  EXPORT_SIZES,
  GRADES,
  LAYOUTS,
  freshState,
  panelsForLayout,
  renderCover,
} from './cover.js';

/** The three bundled sample photos, made with an image model, free to use. */
export const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Sports car', src: 'samples/car.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

/** Read a File into an Image. */
function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not read ${file.name}`));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Load an image from a path inside app/. */
function loadPhotoSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** Build the editor. root is the element holding the whole app; onReady fires
 *  once, with the editor API, after the first draw. */
export function buildEditor(root, onReady) {
  const state = freshState();
  let selectedPanel = 0;
  let activePhoto = -1;
  let exportSize = 'square';

  const preview = root.querySelector('#preview');
  const tray = root.querySelector('#tray');
  const status = root.querySelector('#status');
  const zoom = root.querySelector('#zoom');
  const zoomValue = root.querySelector('#zoom-value');
  const captionInput = root.querySelector('#caption');
  const sublineInput = root.querySelector('#subline');

  function say(message) {
    if (status) status.textContent = message;
  }

  /** Panel rectangles in preview-canvas pixels, for clicks and drags. */
  function panelRects() {
    const photoH = preview.height * 0.78;
    return LAYOUTS[state.layout].panels.map((frac) => ({
      x: frac.x * preview.width,
      y: frac.y * photoH,
      w: frac.w * preview.width,
      h: frac.h * photoH,
    }));
  }

  /** Redraw the preview and outline the selected panel. */
  function redraw() {
    renderCover(preview, state, EXPORT_SIZES[exportSize]);
    const rects = panelRects();
    const rect = rects[selectedPanel];
    if (rect) {
      const ctx = preview.getContext('2d');
      ctx.save();
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(3, preview.width * 0.006);
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.restore();
    }
    syncPanelControls();
  }

  /** Rebuild the photo tray thumbnails. */
  function rebuildTray() {
    tray.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb' + (i === activePhoto ? ' active' : '');
      const thumb = document.createElement('img');
      thumb.src = photo.img.src;
      thumb.alt = photo.name;
      const label = document.createElement('span');
      label.textContent = photo.name;
      button.append(thumb, label);
      button.addEventListener('click', () => {
        activePhoto = i;
        placePhoto(i);
        rebuildTray();
      });
      tray.appendChild(button);
    });
  }

  /** Put the active photo into the selected panel, with a different crop per panel. */
  function placePhoto(photoIndex) {
    if (photoIndex < 0) return;
    const crops = [0, -0.18, 0.18];
    const panel = state.panels[selectedPanel];
    panel.photo = photoIndex;
    panel.zoom = 1.12;
    panel.ox = crops[selectedPanel % crops.length];
    panel.oy = 0;
    redraw();
    say(`Photo ${photoIndex + 1} is in panel ${selectedPanel + 1}. Drag it to reposition.`);
  }

  /** Fill every panel with the active photo, each with its own crop. */
  function fillAllPanels() {
    if (activePhoto < 0) {
      say('Add a photo first, then fill every panel with it.');
      return;
    }
    const crops = [0, -0.18, 0.18];
    state.panels.forEach((panel, i) => {
      panel.photo = activePhoto;
      panel.zoom = 1.12;
      panel.ox = crops[i % crops.length];
      panel.oy = 0;
    });
    redraw();
    say('One photo in every panel.');
  }

  /** Keep the zoom slider and its label on the selected panel. */
  function syncPanelControls() {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    zoom.value = String(panel.zoom);
    zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  }

  /** Add the user's files as photos. */
  async function addFiles(files) {
    for (const file of files) {
      try {
        const img = await readPhotoFile(file);
        state.photos.push({ img, name: file.name });
      } catch (error) {
        say(String(error.message || error));
      }
    }
    if (state.photos.length) {
      activePhoto = state.photos.length - 1;
      rebuildTray();
      say(`${state.photos.length} photo(s) loaded. Click a panel, then a photo, to place it.`);
    }
    redraw();
  }

  /** Load the three bundled sample photos. */
  async function loadSamples() {
    for (const sample of SAMPLES) {
      try {
        const img = await loadPhotoSrc(sample.src);
        state.photos.push({ img, name: sample.name });
      } catch (error) {
        say(String(error.message || error));
      }
    }
    activePhoto = state.photos.length - 1;
    rebuildTray();
    redraw();
    say('Samples loaded. Click a panel, then a photo, to place it.');
  }

  /** Render the poster at an export size and download it as a PNG. */
  function exportCover(sizeKey) {
    const size = EXPORT_SIZES[sizeKey];
    if (!size) return;
    const offscreen = document.createElement('canvas');
    renderCover(offscreen, state, size);
    offscreen.toBlob((blob) => {
      if (!blob) {
        say('The export failed to render.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vice-cover-${sizeKey}-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      say(`Exported ${size.label} — check your downloads.`);
    }, 'image/png');
  }

  /** Click a panel to select it; drag a placed photo to reposition it. */
  function wirePreview() {
    let dragging = null;
    preview.addEventListener('pointerdown', (event) => {
      const box = preview.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * preview.width;
      const y = ((event.clientY - box.top) / box.height) * preview.height;
      const hit = panelRects().findIndex(
        (rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h,
      );
      if (hit < 0) return;
      selectedPanel = hit;
      const panel = state.panels[hit];
      if (panel.photo >= 0) {
        dragging = { x, y, ox: panel.ox, oy: panel.oy, rect: panelRects()[hit] };
        preview.setPointerCapture(event.pointerId);
      }
      redraw();
    });
    preview.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const box = preview.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * preview.width;
      const y = ((event.clientY - box.top) / box.height) * preview.height;
      const panel = state.panels[selectedPanel];
      panel.ox = dragging.ox + (x - dragging.x) / dragging.rect.w;
      panel.oy = dragging.oy + (y - dragging.y) / dragging.rect.h;
      redraw();
    });
    preview.addEventListener('pointerup', () => {
      dragging = null;
    });
  }

  function wirePhotoInput() {
    root.querySelector('#photo-input').addEventListener('change', (event) => {
      addFiles(Array.from(event.target.files || []));
      event.target.value = '';
    });
    root.querySelector('#load-samples').addEventListener('click', loadSamples);
    root.querySelector('#fill-all').addEventListener('click', fillAllPanels);
  }

  function wireControls() {
    root.querySelectorAll('[data-layout]').forEach((button) => {
      button.addEventListener('click', () => {
        state.layout = button.dataset.layout;
        state.panels = panelsForLayout(state.layout, state.panels);
        selectedPanel = 0;
        root.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === button));
        redraw();
      });
    });
    root.querySelectorAll('[data-grade]').forEach((button) => {
      button.addEventListener('click', () => {
        state.grade = button.dataset.grade;
        root.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === button));
        redraw();
      });
    });
    root.querySelectorAll('[data-size]').forEach((button) => {
      button.addEventListener('click', () => {
        exportSize = button.dataset.size;
        root.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === button));
        redraw();
      });
    });
    captionInput.addEventListener('input', () => {
      state.caption = captionInput.value;
      redraw();
    });
    sublineInput.addEventListener('input', () => {
      state.subline = sublineInput.value;
      redraw();
    });
    zoom.addEventListener('input', () => {
      const panel = state.panels[selectedPanel];
      panel.zoom = Number(zoom.value);
      syncPanelControls();
      redraw();
    });
    root.querySelector('#export').addEventListener('click', () => exportCover(exportSize));
  }

  function buildOptionButtons() {
    const layouts = root.querySelector('#layout-options');
    Object.entries(LAYOUTS).forEach(([key, layout], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.layout = key;
      button.textContent = layout.label;
      if (i === 0) button.classList.add('active');
      layouts.appendChild(button);
    });
    const grades = root.querySelector('#grade-options');
    Object.entries(GRADES).forEach(([key, grade], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.grade = key;
      button.textContent = grade.label;
      if (i === 0) button.classList.add('active');
      grades.appendChild(button);
    });
    const sizes = root.querySelector('#size-options');
    Object.entries(EXPORT_SIZES).forEach(([key, size], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.size = key;
      button.textContent = size.label;
      if (i === 0) button.classList.add('active');
      sizes.appendChild(button);
    });
  }

  buildOptionButtons();
  wirePreview();
  wirePhotoInput();
  wireControls();
  rebuildTray();
  syncPanelControls();

  // The Anton display face must be loaded before the first caption draws.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('100px Anton').then(redraw).catch(() => redraw());
    if (document.fonts.ready) document.fonts.ready.then(redraw);
  }
  redraw();
  if (onReady) onReady({ state, redraw, loadSamples, exportCover, rebuildTray });
  return { state, redraw, loadSamples, exportCover, rebuildTray };
}
