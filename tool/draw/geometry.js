const SNAP_STEP = Math.PI / 4;

export function resample(pts, spacing) {
  if (pts.length < 4) {
    return pts.slice();
  }

  const out = [pts[0], pts[1]];
  let carry = 0;

  for (let i = 2; i < pts.length; i += 2) {
    let ax = pts[i - 2];
    let ay = pts[i - 1];
    const bx = pts[i];
    const by = pts[i + 1];
    let seg = Math.hypot(bx - ax, by - ay);

    while (carry + seg >= spacing) {
      const t = (spacing - carry) / seg;
      ax += (bx - ax) * t;
      ay += (by - ay) * t;
      out.push(ax, ay);
      seg -= spacing - carry;
      carry = 0;
    }

    carry += seg;
  }

  if (carry > 0) {
    out.push(pts[pts.length - 2], pts[pts.length - 1]);
  }

  return out;
}

export function smooth(pts, passes) {
  if (pts.length < 6) {
    return pts.slice();
  }

  let src = pts.slice();
  let dst = pts.slice();
  const last = pts.length - 2;

  for (let p = 0; p < passes; p++) {
    for (let i = 2; i < last; i += 2) {
      dst[i] = (src[i - 2] + 2 * src[i] + src[i + 2]) / 4;
      dst[i + 1] = (src[i - 1] + 2 * src[i + 1] + src[i + 3]) / 4;
    }

    [src, dst] = [dst, src];
  }

  return src;
}

export function simplify(pts, epsilon) {
  const count = pts.length / 2;
  if (count < 3) {
    return pts.slice();
  }

  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;
  const stack = [[0, count - 1]];
  const eps2 = epsilon * epsilon;

  while (stack.length > 0) {
    const [first, lastIdx] = stack.pop();
    let maxDist = 0;
    let index = -1;

    for (let i = first + 1; i < lastIdx; i++) {
      const d = segDist2(
        pts[i * 2], pts[i * 2 + 1],
        pts[first * 2], pts[first * 2 + 1],
        pts[lastIdx * 2], pts[lastIdx * 2 + 1],
      );
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist <= eps2) {
      continue;
    }

    keep[index] = 1;
    stack.push([first, index], [index, lastIdx]);
  }

  const out = [];
  for (let i = 0; i < count; i++) {
    if (keep[i]) {
      out.push(pts[i * 2], pts[i * 2 + 1]);
    }
  }

  return out;
}

export function chordLength(pts) {
  const last = pts.length - 2;
  return Math.hypot(pts[last] - pts[0], pts[last + 1] - pts[1]);
}

export function deviation(pts) {
  const length = chordLength(pts);
  if (length === 0) {
    return Infinity;
  }

  const last = pts.length - 2;
  let max = 0;

  for (let i = 2; i < last; i += 2) {
    const d = segDist2(pts[i], pts[i + 1], pts[0], pts[1], pts[last], pts[last + 1]);
    max = Math.max(max, d);
  }

  return Math.sqrt(max) / length;
}

export function snapAngle(ax, ay, bx, by, tolerance) {
  const angle = Math.atan2(by - ay, bx - ax);
  const snapped = Math.round(angle / SNAP_STEP) * SNAP_STEP;

  if (Math.abs(angle - snapped) > tolerance) {
    return [bx, by];
  }

  const length = Math.hypot(bx - ax, by - ay);
  return [ax + Math.cos(snapped) * length, ay + Math.sin(snapped) * length];
}

export function bounds(pts, pad) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }

  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function hits(stroke, x, y, radius) {
  const { box, pts } = stroke;
  if (x < box.minX - radius || x > box.maxX + radius) {
    return false;
  }
  if (y < box.minY - radius || y > box.maxY + radius) {
    return false;
  }

  const reach = radius + stroke.w / 2;
  const reach2 = reach * reach;

  if (pts.length === 2) {
    return (pts[0] - x) ** 2 + (pts[1] - y) ** 2 <= reach2;
  }

  for (let i = 2; i < pts.length; i += 2) {
    if (segDist2(x, y, pts[i - 2], pts[i - 1], pts[i], pts[i + 1]) <= reach2) {
      return true;
    }
  }

  return false;
}

function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  const qx = ax + dx * t - px;
  const qy = ay + dy * t - py;
  return qx * qx + qy * qy;
}
