const PAPER = "#fff";
const INK = "#111";
const ERASER_RING = "#808080";

const SAFE_COORD = 2e6;
const WIDE_PX = 1e4;
const FLAT_TOL_PX = 0.2;
const CLIP_MARGIN_PX = 2;
const MIN_VISIBLE_PX = 0.4;
const MIN_ARC_STEPS = 8;
const MAX_ARC_STEPS = 1024;
const MAX_DEPTH = 64;

export function render(ctx, camera, size, strokes, eraser) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size.w, size.h);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    drawStroke(ctx, camera, size, stroke);
  }

  if (!eraser) {
    return;
  }

  ctx.strokeStyle = ERASER_RING;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(eraser.x, eraser.y, eraser.r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStroke(ctx, camera, size, stroke) {
  const { x, y, zoom } = camera;
  const { box } = stroke;
  const left = (box.minX - x) * zoom;
  const right = (box.maxX - x) * zoom;
  const top = (box.minY - y) * zoom;
  const bottom = (box.maxY - y) * zoom;

  if (right < 0 || left > size.w || bottom < 0 || top > size.h) {
    return;
  }
  if (right - left < MIN_VISIBLE_PX && bottom - top < MIN_VISIBLE_PX) {
    return;
  }

  const pts = toScreen(stroke.pts, camera);
  const width = stroke.w * zoom;

  if (width > WIDE_PX) {
    drawWide(ctx, size, pts, width / 2);
    return;
  }

  if (pts.length === 2) {
    ctx.beginPath();
    ctx.arc(pts[0], pts[1], width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const pad = width / 2;
  const clip = { minX: -pad, minY: -pad, maxX: size.w + pad, maxY: size.h + pad };
  const pen = { x: NaN, y: NaN };

  ctx.lineWidth = width;
  ctx.beginPath();
  forEachPiece(pts, (piece) => drawPiece(ctx, clip, pen, piece, 0));
  ctx.stroke();
}

function toScreen(pts, { x, y, zoom }) {
  const out = new Array(pts.length);

  for (let i = 0; i < pts.length; i += 2) {
    out[i] = (pts[i] - x) * zoom;
    out[i + 1] = (pts[i + 1] - y) * zoom;
  }

  return out;
}

function forEachPiece(pts, visit) {
  const n = pts.length / 2;

  if (n === 2) {
    visit(line(pts[0], pts[1], pts[2], pts[3]));
    return;
  }

  let ax = pts[0];
  let ay = pts[1];

  for (let i = 1; i < n - 1; i++) {
    const cx = pts[i * 2];
    const cy = pts[i * 2 + 1];
    const bx = (cx + pts[i * 2 + 2]) / 2;
    const by = (cy + pts[i * 2 + 3]) / 2;
    visit([ax, ay, cx, cy, bx, by]);
    ax = bx;
    ay = by;
  }

  visit(line(ax, ay, pts[n * 2 - 2], pts[n * 2 - 1]));
}

function line(ax, ay, bx, by) {
  return [ax, ay, (ax + bx) / 2, (ay + by) / 2, bx, by];
}

function drawPiece(ctx, clip, pen, piece, depth) {
  const [ax, ay, cx, cy, bx, by] = piece;

  if (Math.max(ax, cx, bx) < clip.minX || Math.min(ax, cx, bx) > clip.maxX) {
    return;
  }
  if (Math.max(ay, cy, by) < clip.minY || Math.min(ay, cy, by) > clip.maxY) {
    return;
  }

  const span = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(cx), Math.abs(cy), Math.abs(bx), Math.abs(by));
  if (span > SAFE_COORD && depth < MAX_DEPTH) {
    const [left, right] = split(piece);
    drawPiece(ctx, clip, pen, left, depth + 1);
    drawPiece(ctx, clip, pen, right, depth + 1);
    return;
  }

  if (pen.x !== ax || pen.y !== ay) {
    ctx.moveTo(ax, ay);
  }

  ctx.quadraticCurveTo(cx, cy, bx, by);
  pen.x = bx;
  pen.y = by;
}

function split([ax, ay, cx, cy, bx, by]) {
  const m1x = (ax + cx) / 2;
  const m1y = (ay + cy) / 2;
  const m2x = (cx + bx) / 2;
  const m2y = (cy + by) / 2;
  const mx = (m1x + m2x) / 2;
  const my = (m1y + m2y) / 2;

  return [
    [ax, ay, m1x, m1y, mx, my],
    [mx, my, m2x, m2y, bx, by],
  ];
}

function drawWide(ctx, size, pts, r) {
  const view = {
    minX: -CLIP_MARGIN_PX,
    minY: -CLIP_MARGIN_PX,
    maxX: size.w + CLIP_MARGIN_PX,
    maxY: size.h + CLIP_MARGIN_PX,
    cx: size.w / 2,
    cy: size.h / 2,
    half: Math.hypot(size.w, size.h) / 2 + CLIP_MARGIN_PX,
  };
  const segs = [];
  const found = { covered: false };

  if (pts.length === 2) {
    flatten(line(pts[0], pts[1], pts[0], pts[1]), view, r, segs, found, 0);
  } else {
    forEachPiece(pts, (piece) => flatten(piece, view, r, segs, found, 0));
  }

  if (found.covered) {
    ctx.fillRect(0, 0, size.w, size.h);
    return;
  }

  for (const [ax, ay, bx, by] of segs) {
    fillPolygon(ctx, clipPolygon(strip(ax, ay, bx, by, r), view));
    fillPolygon(ctx, clipPolygon(sector(ax, ay, r, view), view));
    fillPolygon(ctx, clipPolygon(sector(bx, by, r, view), view));
  }
}

function flatten(piece, view, r, out, found, depth) {
  if (found.covered) {
    return;
  }

  const [ax, ay, cx, cy, bx, by] = piece;
  const gapX = Math.max(view.minX - Math.max(ax, cx, bx), Math.min(ax, cx, bx) - view.maxX, 0);
  const gapY = Math.max(view.minY - Math.max(ay, cy, by), Math.min(ay, cy, by) - view.maxY, 0);
  if (Math.hypot(gapX, gapY) > r) {
    return;
  }

  const reach = r - view.half;
  if (Math.hypot(ax - view.cx, ay - view.cy) <= reach || Math.hypot(bx - view.cx, by - view.cy) <= reach) {
    found.covered = true;
    return;
  }

  const bend = Math.hypot(ax - 2 * cx + bx, ay - 2 * cy + by) / 4;
  if (bend <= FLAT_TOL_PX || depth >= MAX_DEPTH) {
    out.push([ax, ay, bx, by]);
    return;
  }

  const [left, right] = split(piece);
  flatten(left, view, r, out, found, depth + 1);
  flatten(right, view, r, out, found, depth + 1);
}

function strip(ax, ay, bx, by, r) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) {
    return [];
  }

  const nx = (-(by - ay) / len) * r;
  const ny = ((bx - ax) / len) * r;
  return [
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ];
}

function sector(cx, cy, r, view) {
  const inside = cx >= view.minX && cx <= view.maxX && cy >= view.minY && cy <= view.maxY;
  let start = 0;
  let span = Math.PI * 2;

  if (!inside) {
    const ref = Math.atan2(view.cy - cy, view.cx - cx);
    const corners = [
      [view.minX, view.minY],
      [view.maxX, view.minY],
      [view.maxX, view.maxY],
      [view.minX, view.maxY],
    ];
    let lo = Infinity;
    let hi = -Infinity;

    for (const [x, y] of corners) {
      let rel = Math.atan2(y - cy, x - cx) - ref;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      lo = Math.min(lo, rel);
      hi = Math.max(hi, rel);
    }

    start = ref + lo;
    span = hi - lo;
  }

  const step = Math.sqrt((8 * FLAT_TOL_PX) / r);
  const count = Math.min(MAX_ARC_STEPS, Math.max(MIN_ARC_STEPS, Math.ceil(span / step)));
  const poly = inside ? [] : [[cx, cy]];

  for (let i = 0; i <= count; i++) {
    const angle = start + (span * i) / count;
    poly.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  return poly;
}

function clipPolygon(poly, view) {
  const edges = [
    (p) => p[0] - view.minX,
    (p) => view.maxX - p[0],
    (p) => p[1] - view.minY,
    (p) => view.maxY - p[1],
  ];
  let out = poly;

  for (const inside of edges) {
    if (out.length === 0) {
      break;
    }

    const input = out;
    out = [];

    for (let i = 0; i < input.length; i++) {
      const p = input[i];
      const q = input[(i + 1) % input.length];
      const dp = inside(p);
      const dq = inside(q);

      if (dp >= 0) {
        out.push(p);
      }
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }

  return out;
}

function fillPolygon(ctx, poly) {
  if (poly.length < 3) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);

  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0], poly[i][1]);
  }

  ctx.closePath();
  ctx.fill();
}
