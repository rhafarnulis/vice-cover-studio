// Vice Cover Studio — cover renderer.
//
// One function, renderCover, draws a whole poster onto a canvas context:
// several photo panels in a GTA-style multi-panel layout, a Vice City
// sunset or neon colour grade over each photo, and a big bold caption in
// the Anton display face. Everything is drawn from the state object, so the
// editor, the export and the screenshot mode all render through this file
// and always agree with each other.
//
// A panel is { photo, zoom, ox, oy }: photo is an index into state.photos
// (or -1 for empty), zoom is a cover-fit multiplier, and ox/oy pan the photo
// inside its panel as fractions of the panel size. A photo may fill several
// panels at once, each with its own crop — that is the classic poster look.

/** The layouts the poster can use. Each returns panel rectangles in fractions of the poster. */
export const LAYOUTS = {
  grid: {
    label: 'Vice Grid',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.82 },
      { x: 0.62, y: 0, w: 0.38, h: 0.41 },
      { x: 0.62, y: 0.41, w: 0.38, h: 0.41 },
    ],
  },
  trio: {
    label: 'Neon Trio',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 0.82 },
      { x: 0.34, y: 0, w: 0.33, h: 0.82 },
      { x: 0.67, y: 0, w: 0.33, h: 0.82 },
    ],
  },
  split: {
    label: 'Sunset Split',
    panels: [
      { x: 0, y: 0, w: 0.55, h: 0.82 },
      { x: 0.55, y: 0, w: 0.45, h: 0.82 },
    ],
  },
};

/** The colour grades. filter is a canvas filter string; overlay is [top, bottom, alpha]. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.35) contrast(1.08) sepia(0.22)',
    overlay: ['#ff5e3a', '#ff2d78', 0.16],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.5) contrast(1.12) hue-rotate(-12deg)',
    overlay: ['#ff2ea6', '#19c8ff', 0.15],
  },
  pastel: {
    label: 'Vice Pastel',
    filter: 'saturate(1.1) contrast(0.95) brightness(1.06)',
    overlay: ['#ffb3d9', '#7fe3d0', 0.12],
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.15)',
    overlay: null,
  },
};

/** The caption colours. */
export const CAPTION_COLOURS = {
  white: '#ffffff',
  gold: '#ffd166',
  pink: '#ff5da2',
  cyan: '#7fe3ff',
};

/** The export sizes the app offers, in pixels. */
export const EXPORT_SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

/** A fresh state: three panels, no photos yet, sunset grade, empty caption. */
export function freshState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    caption: 'NEON NIGHTS',
    subcaption: 'a vice cover story',
    captionColour: 'white',
    captionSize: 1,
    photos: [],
    panels: [
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Resize the panel list when the layout changes, keeping each panel's photo where it fits. */
export function panelsForLayout(layoutName, oldPanels) {
  const count = LAYOUTS[layoutName].panels.length;
  const panels = [];
  for (let i = 0; i < count; i++) {
    const old = oldPanels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    panels.push({ photo: old.photo, zoom: old.zoom, ox: old.ox, oy: old.oy });
  }
  return panels;
}

/** Draw one photo into a rectangle, cover-fit, zoomed and panned. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Fill a rectangle with a two-colour vertical gradient at the given alpha. */
function gradientOverlay(ctx, rect, top, bottom, alpha) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** The empty-panel look: a dark gradient with a dashed frame and a hint. */
function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#2b2135');
  g.addColorStop(1, '#120e1a');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.02, rect.w * 0.015]);
  ctx.strokeRect(rect.x + rect.w * 0.04, rect.y + rect.h * 0.04, rect.w * 0.92, rect.h * 0.92);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.round(rect.w * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Draw the caption band: a dark fade, the big caption, and the small sub-caption. */
function drawCaptionBand(ctx, W, H, state) {
  const bandH = H * 0.18;
  const y0 = H - bandH;
  const fade = ctx.createLinearGradient(0, y0 - bandH * 0.5, 0, H);
  fade.addColorStop(0, 'rgba(10,6,16,0)');
  fade.addColorStop(0.45, 'rgba(10,6,16,0.82)');
  fade.addColorStop(1, 'rgba(10,6,16,0.94)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, y0 - bandH * 0.5, W, bandH * 1.5);

  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    const size = W * 0.105 * state.captionSize;
    ctx.save();
    ctx.translate(W / 2, y0 + bandH * 0.52);
    ctx.rotate(-0.02);
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(caption, 0, 0);
    ctx.fillStyle = CAPTION_COLOURS[state.captionColour] || '#ffffff';
    ctx.fillText(caption, 0, 0);
    ctx.restore();
  }
  const sub = (state.subcaption || '').trim();
  if (sub) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `500 ${Math.round(W * 0.022)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub.toLowerCase(), W / 2, y0 + bandH * 0.86);
  }
}

/**
 * Draw the whole poster. state holds layout, grade, caption and panels;
 * photos is the array of loaded images state.photos indexes into.
 * selected is the panel index the editor highlights (-1 for none).
 */
export function renderCover(ctx, W, H, state, selected = -1) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0610';
  ctx.fillRect(0, 0, W, H);

  const layout = LAYOUTS[state.layout] || LAYOUTS.grid;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gap = Math.max(4, Math.round(W * 0.006));

  layout.panels.forEach((panel, i) => {
    const rect = {
      x: panel.x * W + (panel.x > 0 ? gap / 2 : 0),
      y: panel.y * H,
      w: panel.w * W - (panel.x > 0 ? gap / 2 : 0) - (panel.x + panel.w < 1 ? gap / 2 : 0),
      h: panel.h * H,
    };
    const setting = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = setting.photo >= 0 ? state.photos[setting.photo] : null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPhotoInto(ctx, img, rect, setting.zoom, setting.ox, setting.oy);
      ctx.filter = 'none';
      if (grade.overlay) {
        ctx.globalCompositeOperation = 'overlay';
        gradientOverlay(ctx, rect, grade.overlay[0], grade.overlay[1], grade.overlay[2]);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      drawEmptyPanel(ctx, rect);
    }
    ctx.restore();

    // Panel frame: a white hairline, and a gold ring on the selected panel.
    ctx.strokeStyle = i === selected ? '#ffd166' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = i === selected ? Math.max(4, W * 0.006) : Math.max(2, W * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  drawCaptionBand(ctx, W, H, state);
}
