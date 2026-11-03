const KEY = "draw:v1";

const QUANTA_PER_WIDTH = 16;

export function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw);
    return { camera: data.camera, strokes: data.strokes.map(decode) };
  } catch (err) {
    console.error("Discarding unreadable drawing", err);
    return null;
  }
}

export function save(camera, strokes) {
  const data = { camera, strokes: strokes.map(encode) };

  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Saving drawing failed", err);
    return false;
  }
}

function encode({ w, pts }) {
  const q = w / QUANTA_PER_WIDTH;
  const ox = pts[0];
  const oy = pts[1];
  const d = new Array(pts.length - 2);

  for (let i = 2; i < pts.length; i += 2) {
    d[i - 2] = Math.round((pts[i] - ox) / q);
    d[i - 1] = Math.round((pts[i + 1] - oy) / q);
  }

  return { w, o: [ox, oy], d };
}

function decode({ w, o, d }) {
  const q = w / QUANTA_PER_WIDTH;
  const pts = [o[0], o[1]];

  for (let i = 0; i < d.length; i += 2) {
    pts.push(o[0] + d[i] * q, o[1] + d[i + 1] * q);
  }

  return { w, pts };
}
