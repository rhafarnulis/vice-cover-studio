// Vice Cover Studio — editor.
//
// Owns the page state and the controls: loading the user's photos, picking
// which photo fills which panel, dragging a photo inside its panel to crop
// it, zooming it, choosing the layout, grade and caption, and exporting the
// finished poster as a PNG in one of the three post sizes. The preview is a
// single canvas that re-renders through renderCover on every change, so what
// the editor shows is exactly what the export writes.

import { CAPTION_COLOURS, EXPORT_SIZES, GRADES, LAYOUTS, freshState, panelsForLayout, renderCover } from './cover.js';

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

/**
 * Build the editor. root is the element holding the whole app; onReady fires
 * once the first render is done. Returns the state and a redraw function.
 */
export function buildEditor(root, onReady) {
  const state = freshState();
  let selectedPanel = 0;
  let activePhoto = -1;
  let exportSize = 'square';
  let previewScale = 1;
  let dragging = null;

  const preview = root.querySelector('#preview');
  const pctx = preview.getContext('2d');
  const tray = root.querySelector('#tray');
  const zoom = root.querySelector('#zoom');
  const zoomValue = root.querySelector('#zoom-value');
  const captionInput = root.querySelector('#caption');
  const subcaptionInput = root.querySelector('#subcaption');
  const captionSize = root.querySelector('#caption-size');
  const status = root.querySelector('#status');

  /** Say something in the status line. */
  function say(text) {
    if (status) status.textContent = text;
  }

  /** The preview canvas is fixed at 900 px wide; scale the poster into it. */
  function fitPreview() {
    const size = EXPORT_SIZES[exportSize];
    const scale = 900 / size.w;
    preview.width = Math.round(size.w * scale);
    preview.height = Math.round(size.h * scale);
    previewScale = scale;
  }

  /** Re-render the preview from the current state. */
  function redraw() {
    fitPreview();
    const size = EXPORT_SIZES[exportSize];
    renderCover(pctx, preview.width, preview.height, state, selectedPanel);
    void size;
  }

  /** Rebuild the photo tray thumbnails from state.photos. */
  function rebuildTray() {
    tray.innerHTML = '';
    state.photos.forEach((img, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb' + (i === activePhoto ? ' active' : '');
      button.title = img.dataset.name || `Photo ${i + 1}`;
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = button.title;
      const label = document.createElement('span');
      label.textContent = button.title;
      button.append(thumb, label);
      button.addEventListener('click', () => {
        activePhoto = i;
        assignActivePhotoToSelected();
        rebuildTray();
      });
      tray.appendChild(button);
    });
    if (state.photos.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'tray-hint';
      hint.textContent = 'No photos yet — add your own, or load the samples below.';
      tray.appendChild(hint);
    }
  }

  /** Put the active photo into the selected panel, with a different crop per panel. */
  function assignActivePhotoToSelected() {
    if (activePhoto < 0) return;
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.photo = activePhoto;
    // One photo across several panels reads as different shots when each
    // panel crops a different corner of it.
    const crops = [
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1.35, ox: -0.12, oy: -0.08 },
      { zoom: 1.35, ox: 0.12, oy: 0.08 },
    ];
    const crop = crops[selectedPanel % crops.length];
    panel.zoom = crop.zoom;
    panel.ox = crop.ox;
    panel.oy = crop.oy;
    syncPanelControls();
    redraw();
    say(`Photo ${activePhoto + 1} is in panel ${selectedPanel + 1}. Drag it to reposition.`);
  }

  /** Fill every panel with the active photo, each with its own crop. */
  function fillAllPanels() {
    if (activePhoto < 0) {
      say('Pick a photo first, then fill all panels with it.');
      return;
    }
    state.panels.forEach((panel, i) => {
      panel.photo = activePhoto;
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
    syncPanelControls();
    redraw();
    say('One photo fills every panel, each cropped differently.');
  }

  /** Show the selected panel's zoom in the slider. */
  function syncPanelControls() {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    zoom.value = String(panel.zoom);
    zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  }

  /** Which panel, if any, holds the point (x, y) in preview pixels. */
  function panelAt(x, y) {
    const layout = LAYOUTS[state.layout];
    const W = preview.width;
    const H = preview.height;
    for (let i = 0; i < layout.panels.length; i++) {
      const p = layout.panels[i];
      if (x >= p.x * W && x < (p.x + p.w) * W && y >= p.y * H && y < (p.y + p.h) * H) return i;
    }
    return -1;
  }

  /** Wire the preview canvas: click selects a panel, drag pans its photo. */
  function wirePreview() {
    preview.addEventListener('pointerdown', (event) => {
      const rect = preview.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * preview.width;
      const y = ((event.clientY - rect.top) / rect.height) * preview.height;
      const hit = panelAt(x, y);
      if (hit < 0) return;
      selectedPanel = hit;
      syncPanelControls();
      redraw();
      const panel = state.panels[hit];
      dragging = { x, y, ox: panel.ox, oy: panel.oy, moved: false };
      preview.setPointerCapture(event.pointerId);
    });
    preview.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = preview.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * preview.width;
      const y = ((event.clientY - rect.top) / rect.height) * preview.height;
      const panel = state.panels[selectedPanel];
      if (!panel || panel.photo < 0) return;
      const layout = LAYOUTS[state.layout];
      const p = layout.panels[selectedPanel];
      panel.ox = Math.max(-0.4, Math.min(0.4, dragging.ox + (x - dragging.x) / (p.w * preview.width)));
      panel.oy = Math.max(-0.4, Math.min(0.4, dragging.oy + (y - dragging.y) / (p.h * preview.height)));
      if (Math.abs(x - dragging.x) + Math.abs(y - dragging.y) > 2) dragging.moved = true;
      redraw();
    });
    preview.addEventListener('pointerup', () => {
      dragging = null;
    });
  }

  /** Wire the file input that reads the user's own photos. */
  function wirePhotoInput() {
    const input = root.querySelector('#photo-input');
    input.addEventListener('change', async () => {
      const files = [...input.files].filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      say(`Loading ${files.length} photo${files.length === 1 ? '' : 's'}…`);
      for (const file of files) {
        try {
          const img = await readPhotoFile(file);
          img.dataset.name = file.name.replace(/\.[^.]+$/, '');
          state.photos.push(img);
        } catch (error) {
          say(String(error.message || error));
        }
      }
      activePhoto = state.photos.length - 1;
      rebuildTray();
      redraw();
      say(`${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded. Click a panel, then a photo, to place it.`);
      input.value = '';
    });
  }

  /** Load the bundled sample photos into the tray. */
  async function loadSamples() {
    say('Loading samples…');
    for (const sample of SAMPLES) {
      try {
        const img = await loadPhotoSrc(sample.src);
        img.dataset.name = sample.name;
        state.photos.push(img);
      } catch (error) {
        say(String(error.message || error));
      }
    }
    activePhoto = 0;
    rebuildTray();
    redraw();
    say('Samples loaded. Click a panel, then a photo, to place it.');
  }

  /** Wire the layout, grade, caption and export controls. */
  function wireControls() {
    root.querySelectorAll('[data-layout]').forEach((button) => {
      button.addEventListener('click', () => {
        state.layout = button.dataset.layout;
        state.panels = panelsForLayout(state.layout, state.panels);
        if (selectedPanel >= state.panels.length) selectedPanel = 0;
        root.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === button));
        syncPanelControls();
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
    root.querySelectorAll('[data-colour]').forEach((button) => {
      button.addEventListener('click', () => {
        state.captionColour = button.dataset.colour;
        root.querySelectorAll('[data-colour]').forEach((b) => b.classList.toggle('active', b === button));
        redraw();
      });
    });
    captionInput.addEventListener('input', () => {
      state.caption = captionInput.value;
      redraw();
    });
    subcaptionInput.addEventListener('input', () => {
      state.subcaption = subcaptionInput.value;
      redraw();
    });
    captionSize.addEventListener('input', () => {
      state.captionSize = Number(captionSize.value);
      redraw();
    });
    zoom.addEventListener('input', () => {
      const panel = state.panels[selectedPanel];
      if (!panel) return;
      panel.zoom = Number(zoom.value);
      zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
      redraw();
    });
    root.querySelector('#fill-all').addEventListener('click', fillAllPanels);
    root.querySelector('#load-samples').addEventListener('click', loadSamples);
    root.querySelectorAll('[data-size]').forEach((button) => {
      button.addEventListener('click', () => {
        exportSize = button.dataset.size;
        root.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === button));
        redraw();
      });
    });
    root.querySelector('#export').addEventListener('click', exportCover);
  }

  /** Render the poster at the chosen export size and download it as a PNG. */
  function exportCover() {
    const size = EXPORT_SIZES[exportSize];
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    renderCover(canvas.getContext('2d'), size.w, size.h, state, -1);
    canvas.toBlob((blob) => {
      if (!blob) {
        say('Export failed — try again.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vice-cover-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      say(`Exported ${size.w} × ${size.h} PNG.`);
    }, 'image/png');
  }

  /** Fill the layout/grade/colour/size buttons from the cover module's tables. */
  function buildOptionButtons() {
    const layoutRow = root.querySelector('#layout-row');
    Object.entries(LAYOUTS).forEach(([name, layout], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.layout = name;
      button.className = i === 0 ? 'chip active' : 'chip';
      button.textContent = layout.label;
      layoutRow.appendChild(button);
    });
    const gradeRow = root.querySelector('#grade-row');
    Object.entries(GRADES).forEach(([name, grade], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.grade = name;
      button.className = i === 0 ? 'chip active' : 'chip';
      button.textContent = grade.label;
      gradeRow.appendChild(button);
    });
    const colourRow = root.querySelector('#colour-row');
    Object.entries(CAPTION_COLOURS).forEach(([name, colour], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.colour = name;
      button.className = 'swatch' + (i === 0 ? ' active' : '');
      button.style.background = colour;
      button.title = name;
      button.setAttribute('aria-label', `Caption colour ${name}`);
      colourRow.appendChild(button);
    });
    const sizeRow = root.querySelector('#size-row');
    Object.entries(EXPORT_SIZES).forEach(([name, size], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.size = name;
      button.className = i === 0 ? 'chip active' : 'chip';
      button.textContent = size.label;
      sizeRow.appendChild(button);
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
