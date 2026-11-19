// Vice Cover Studio — the cover renderer.
//
// One function, renderCover, draws a whole poster on any canvas: the photo
// panels up top, then a dark caption band with bold outlined lettering.
// The editor's live preview and the PNG export both call it, so what the
// maker sees is exactly what the file holds.

/** The three post sizes the app exports. */
export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

/** Panel rectangles, as fractions of the photo area. */
export const LAYOUTS = {
  grid: {
    label: 'Vice Grid',
    panels: [
      { x: 0.0, y: 0.0, w: 0.585, h: 1.0 },
      { x: 0.605, y: 0.0, w: 0.395, h: 0.49 },
      { x: 0.605, y: 0.51, w: 0.395, h: 0.49 },
    ],
  },
  trio: {
    label: 'Neon Trio',
    panels: [
      { x: 0.0, y: 0.0, w: 0.32, h: 1.0 },
      { x: 0.34, y: 0.0, w: 0.32, h: 1.0 },
      { x: 0.68, y: 0.0, w: 0.32, h: 1.0 },
    ],
  },
  split: {
    label: 'Sunset Split',
    panels: [
      { x: 0.0, y: 0.0, w: 0.49, h: 1.0 },
      { x: 0.51, y: 0.0, w: 0.49, h: 1.0 },
    ],
  },
};

/** Colour grades: a canvas filter for the photo, plus a wash over it. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.3) contrast(1.06) sepia(0.22)',
    wash: ['rgba(255, 122, 26, 0.16)', 'rgba(255, 45, 120, 0.12)'],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.14) hue-rotate(-12deg)',
    wash: ['rgba(255, 0, 128, 0.20)', 'rgba(0, 229, 255, 0.14)'],
  },
  pastel: {
    label: 'Vice Pastel',
    filter: 'saturate(0.9) contrast(0.94) brightness(1.06)',
    wash: ['rgba(255, 183, 213, 0.18)', 'rgba(167, 199, 255, 0.14)'],
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(0.96)',
    wash: ['rgba(20, 20, 30, 0.10)', 'rgba(20, 20, 30, 0.10)'],
  },
};

/** Caption text colours. */
export const CAPTION_COLOURS = {
  ink: '#ffffff',
  outline: '#14060f',
  sub: 'rgba(255, 255, 255, 0.72)',
};

/** A fresh editor state: grid layout, sunset grade, empty panels. */
export function freshState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    caption: 'NEON NIGHTS',
    subline: 'a vice cover story',
    photos: [],
    panels: LAYOUTS.grid.panels.map(() => ({ photo: -1, zoom: 1, ox: 0, oy: 0 })),
  };
}

/** Panel placements for a layout, keeping any photo assignments that fit. */
export function panelsForLayout(name, previous) {
  const rects = LAYOUTS[name].panels;
  return rects.map((_, i) => {
    const old = previous && previous[i];
    return old
      ? { photo: old.photo, zoom: old.zoom, ox: old.ox, oy: old.oy }
      : { photo: -1, zoom: 1, ox: 0, oy: 0 };
  });
}

/** Draw one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, panel) {
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * panel.zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Draw the whole poster on a canvas at the given export size. */
export function renderCover(canvas, state, size) {
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gap = Math.max(2, Math.round(size.w * 0.006));

  // Dark gutters show between the panels.
  ctx.fillStyle = '#0a0610';
  ctx.fillRect(0, 0, size.w, size.h);

  const photoH = Math.round(size.h * 0.78);
  const rects = LAYOUTS[state.layout].panels;
  rects.forEach((frac, i) => {
    const rect = {
      x: Math.round(frac.x * size.w) + gap,
      y: Math.round(frac.y * photoH) + gap,
      w: Math.round(frac.w * size.w) - gap * 2,
      h: Math.round(frac.h * photoH) - gap * 2,
    };
    const panel = state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel && panel.photo >= 0 && state.photos[panel.photo]) {
      ctx.filter = grade.filter;
      drawPhotoInto(ctx, state.photos[panel.photo].img, rect, panel);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#1b0f1e';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `700 ${Math.round(size.w * 0.022)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.restore();
  });

  // The grade wash: a warm-to-pink veil over the whole photo area.
  const wash = ctx.createLinearGradient(0, 0, size.w, photoH);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size.w, photoH);

  // Caption band: a dark gradient the lettering sits on.
  const band = ctx.createLinearGradient(0, photoH, 0, size.h);
  band.addColorStop(0, '#0a0610');
  band.addColorStop(1, '#160a18');
  ctx.fillStyle = band;
  ctx.fillRect(0, photoH, size.w, size.h - photoH);

  const caption = (state.caption || '').toUpperCase();
  const capSize = Math.round(size.w * 0.085);
  ctx.font = `${capSize}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, Math.round(capSize * 0.12));
  ctx.strokeStyle = CAPTION_COLOURS.outline;
  const capY = photoH + (size.h - photoH) * 0.38;
  ctx.strokeText(caption, size.w / 2, capY);
  ctx.fillStyle = CAPTION_COLOURS.ink;
  ctx.fillText(caption, size.w / 2, capY);

  ctx.font = `${Math.round(size.w * 0.022)}px system-ui, sans-serif`;
  ctx.fillStyle = CAPTION_COLOURS.sub;
  ctx.fillText(
    state.subline || '',
    size.w / 2,
    photoH + (size.h - photoH) * 0.78,
  );
}
