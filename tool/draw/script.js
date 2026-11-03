import { bounds, chordLength, deviation, hits, resample, simplify, smooth, snapAngle } from "./geometry.js";
import { render } from "./render.js";
import { load, save } from "./store.js";

const PEN_PX = 3;
const ERASER_PX = 12;
const HOLD_MS = 450;
const HOLD_SLOP_PX = 4;
const MIN_STEP_PX = 1.5;
const SMOOTH_TAU_MS = 28;
const RESAMPLE_PX = 2;
const RELEASE_PASSES = 12;
const HOLD_PASSES = 60;
const SIMPLIFY_PX = 0.25;
const STRAIGHT_RATIO = 0.08;
const MIN_LINE_PX = 12;
const ANGLE_SNAP = (5 * Math.PI) / 180;
const MIN_ZOOM = 1e-12;
const MAX_ZOOM = 1e12;
const WHEEL_ZOOM_RATE = 0.01;
const WHEEL_ZOOM_MAX_STEP = 50;
const LINE_DELTA_PX = 16;
const TOUCH_CANCEL_MS = 200;
const SAVE_DELAY_MS = 400;
const FIT_MARGIN_PX = 40;
const PEN_ERASER_BUTTONS = 32;
const START_CAMERA = Object.freeze({ x: 0, y: 0, zoom: 1 });

const Tool = Object.freeze({ PEN: "pen", ERASER: "eraser" });
const Kind = Object.freeze({ DRAW: "draw", ERASE: "erase", PAN: "pan", PINCH: "pinch" });
const Shape = Object.freeze({ FREE: "free", LINE: "line" });
const Op = Object.freeze({ ADD: "add", REMOVE: "remove" });
const Pointer = Object.freeze({ MOUSE: "mouse", PEN: "pen", TOUCH: "touch" });
const MOUSE_LEFT = 0;
const DELTA_LINE = 1;
const DELTA_PAGE = 2;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const toolButtons = document.querySelectorAll("[data-tool]");
const undoButton = document.getElementById("undo");
const redoButton = document.getElementById("redo");
const homeButton = document.getElementById("home");
const status = document.getElementById("status");

const saved = load();
let camera = saved?.camera ?? { ...START_CAMERA };
let strokes = (saved?.strokes ?? []).map(makeStroke);
let size = { w: 0, h: 0 };
let tool = Tool.PEN;
let action = null;
let hover = null;
let penSeen = false;
let spaceDown = false;
let renderQueued = false;
let saveTimer = null;

const touches = new Map();
const undoStack = [];
const redoStack = [];

function makeStroke({ w, pts }) {
  return { w, pts, box: bounds(pts, w / 2) };
}

function toWorld(sx, sy) {
  return [camera.x + sx / camera.zoom, camera.y + sy / camera.zoom];
}

function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function zoomAt(sx, sy, factor) {
  const [wx, wy] = toWorld(sx, sy);
  const zoom = clampZoom(camera.zoom * factor);
  camera = { x: wx - sx / zoom, y: wy - sy / zoom, zoom };
  cameraChanged();
}

function goHome() {
  if (strokes.length === 0) {
    camera = { ...START_CAMERA };
    cameraChanged();
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let thinnest = Infinity;

  for (const { box, w } of strokes) {
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
    thinnest = Math.min(thinnest, w);
  }

  const fitX = Math.max(1, size.w - 2 * FIT_MARGIN_PX) / (maxX - minX);
  const fitY = Math.max(1, size.h - 2 * FIT_MARGIN_PX) / (maxY - minY);
  const zoom = clampZoom(Math.min(fitX, fitY, PEN_PX / thinnest));
  camera = {
    x: (minX + maxX) / 2 - size.w / 2 / zoom,
    y: (minY + maxY) / 2 - size.h / 2 / zoom,
    zoom,
  };
  cameraChanged();
}

function cameraChanged() {
  requestRender();
  scheduleSave();
}

function requestRender() {
  if (renderQueued) {
    return;
  }

  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const showRing = hover && (tool === Tool.ERASER || action?.kind === Kind.ERASE);
    const ring = showRing ? { x: hover.x, y: hover.y, r: ERASER_PX } : null;
    render(ctx, camera, size, strokes, ring);
  });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY_MS);
}

function flushSave() {
  if (saveTimer === null) {
    return;
  }

  clearTimeout(saveTimer);
  saveTimer = null;
  status.hidden = save(camera, strokes);
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: window.innerWidth, h: window.innerHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestRender();
}

function setTool(next) {
  tool = next;

  for (const button of toolButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
  }

  updateCursor();
  requestRender();
}

function updateCursor() {
  if (action?.kind === Kind.PAN) {
    canvas.style.cursor = "grabbing";
    return;
  }
  if (spaceDown) {
    canvas.style.cursor = "grab";
    return;
  }

  canvas.style.cursor = tool === Tool.ERASER ? "none" : "crosshair";
}

function startAction(e) {
  const isMouse = e.pointerType === Pointer.MOUSE;
  if (isMouse && (e.button !== MOUSE_LEFT || spaceDown)) {
    return startPan(e);
  }

  const penEraser = e.pointerType === Pointer.PEN && (e.buttons & PEN_ERASER_BUTTONS) !== 0;
  if (penEraser || tool === Tool.ERASER) {
    return startErase(e);
  }

  return startDraw(e);
}

function startPan(e) {
  return { kind: Kind.PAN, id: e.pointerId, type: e.pointerType, last: { x: e.clientX, y: e.clientY } };
}

function movePan(a, e) {
  camera = {
    x: camera.x - (e.clientX - a.last.x) / camera.zoom,
    y: camera.y - (e.clientY - a.last.y) / camera.zoom,
    zoom: camera.zoom,
  };
  a.last = { x: e.clientX, y: e.clientY };
  cameraChanged();
}

function measurePinch() {
  const [p, q] = touches.values();
  return { mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, dist: Math.hypot(q.x - p.x, q.y - p.y) || 1 };
}

function startPinch() {
  return { kind: Kind.PINCH, type: Pointer.TOUCH, ...measurePinch() };
}

function movePinch(a) {
  if (touches.size < 2) {
    return;
  }

  const m = measurePinch();
  const [wx, wy] = toWorld(a.mx, a.my);
  const zoom = clampZoom((camera.zoom * m.dist) / a.dist);
  camera = { x: wx - m.mx / zoom, y: wy - m.my / zoom, zoom };
  Object.assign(a, m);
  cameraChanged();
}

function startErase(e) {
  const [x, y] = toWorld(e.clientX, e.clientY);
  const a = { kind: Kind.ERASE, id: e.pointerId, type: e.pointerType, x, y, removed: [] };
  eraseAt(a, x, y);
  return a;
}

function moveErase(a, e) {
  const radius = ERASER_PX / camera.zoom;

  for (const sample of samplesOf(e)) {
    const [x, y] = toWorld(sample.clientX, sample.clientY);
    const steps = Math.max(1, Math.ceil(Math.hypot(x - a.x, y - a.y) / (radius / 2)));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      eraseAt(a, a.x + (x - a.x) * t, a.y + (y - a.y) * t);
    }

    a.x = x;
    a.y = y;
  }
}

function eraseAt(a, x, y) {
  const radius = ERASER_PX / camera.zoom;
  const before = a.removed.length;

  for (let i = strokes.length - 1; i >= 0; i--) {
    if (!hits(strokes[i], x, y, radius)) {
      continue;
    }

    a.removed.push({ stroke: strokes[i], index: i });
    strokes.splice(i, 1);
  }

  if (a.removed.length > before) {
    scheduleSave();
  }
}

function finishErase(a) {
  if (a.removed.length > 0) {
    record({ kind: Op.REMOVE, removed: a.removed });
  }
}

function record(op) {
  undoStack.push(op);
  redoStack.length = 0;
  syncHistory();
}

function undo() {
  if (action || undoStack.length === 0) {
    return;
  }

  const op = undoStack.pop();
  revert(op);
  redoStack.push(op);
  historyChanged();
}

function redo() {
  if (action || redoStack.length === 0) {
    return;
  }

  const op = redoStack.pop();
  replay(op);
  undoStack.push(op);
  historyChanged();
}

function historyChanged() {
  syncHistory();
  requestRender();
  scheduleSave();
}

function syncHistory() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function revert(op) {
  if (op.kind === Op.ADD) {
    strokes = strokes.filter((s) => s !== op.stroke);
    return;
  }

  for (let i = op.removed.length - 1; i >= 0; i--) {
    const { stroke, index } = op.removed[i];
    strokes.splice(index, 0, stroke);
  }
}

function replay(op) {
  if (op.kind === Op.ADD) {
    strokes.push(op.stroke);
    return;
  }

  const gone = new Set(op.removed.map((r) => r.stroke));
  strokes = strokes.filter((s) => !gone.has(s));
}

function startDraw(e) {
  const [x, y] = toWorld(e.clientX, e.clientY);
  const stroke = makeStroke({ w: PEN_PX / camera.zoom, pts: [x, y] });
  strokes.push(stroke);

  const a = {
    kind: Kind.DRAW,
    id: e.pointerId,
    type: e.pointerType,
    t0: e.timeStamp,
    t: e.timeStamp,
    stroke,
    shape: Shape.FREE,
    sx: x,
    sy: y,
    raw: { x, y },
    anchor: { x: e.clientX, y: e.clientY },
    holdTimer: null,
  };
  armHold(a);
  return a;
}

function moveDraw(a, e) {
  for (const sample of samplesOf(e)) {
    addSample(a, sample.clientX, sample.clientY, sample.timeStamp);
  }

  const moved = Math.hypot(e.clientX - a.anchor.x, e.clientY - a.anchor.y);
  if (a.shape === Shape.FREE && moved > HOLD_SLOP_PX) {
    a.anchor = { x: e.clientX, y: e.clientY };
    armHold(a);
  }

  refreshBox(a.stroke);
}

function addSample(a, sx, sy, t) {
  const [x, y] = toWorld(sx, sy);
  a.raw = { x, y };

  if (a.shape === Shape.LINE) {
    setLineEnd(a, x, y);
    return;
  }

  const k = 1 - Math.exp(-Math.max(t - a.t, 1) / SMOOTH_TAU_MS);
  a.t = t;
  a.sx += (x - a.sx) * k;
  a.sy += (y - a.sy) * k;

  const pts = a.stroke.pts;
  const step = Math.hypot(a.sx - pts[pts.length - 2], a.sy - pts[pts.length - 1]) * camera.zoom;
  if (step < MIN_STEP_PX) {
    return;
  }

  pts.push(a.sx, a.sy);
}

function setLineEnd(a, x, y) {
  const [x0, y0] = a.stroke.pts;
  const [ex, ey] = snapAngle(x0, y0, x, y, ANGLE_SNAP);
  a.stroke.pts = [x0, y0, ex, ey];
}

function armHold(a) {
  clearTimeout(a.holdTimer);
  a.holdTimer = setTimeout(() => onHold(a), HOLD_MS);
}

function onHold(a) {
  if (action !== a) {
    return;
  }

  const pts = withRawEnd(a);
  const longEnough = chordLength(pts) * camera.zoom >= MIN_LINE_PX;

  if (longEnough && deviation(pts) <= STRAIGHT_RATIO) {
    a.shape = Shape.LINE;
    setLineEnd(a, a.raw.x, a.raw.y);
  } else {
    a.stroke.pts = smooth(resample(pts, RESAMPLE_PX / camera.zoom), HOLD_PASSES);
    a.sx = a.raw.x;
    a.sy = a.raw.y;
  }

  refreshBox(a.stroke);
  requestRender();
}

function withRawEnd(a) {
  const pts = a.stroke.pts.slice();
  const last = pts.length - 2;
  if (pts[last] !== a.raw.x || pts[last + 1] !== a.raw.y) {
    pts.push(a.raw.x, a.raw.y);
  }

  return pts;
}

function finishDraw(a) {
  clearTimeout(a.holdTimer);

  if (a.shape === Shape.FREE) {
    const spacing = RESAMPLE_PX / camera.zoom;
    const smoothed = smooth(resample(withRawEnd(a), spacing), RELEASE_PASSES);
    a.stroke.pts = simplify(smoothed, SIMPLIFY_PX / camera.zoom);
  }

  refreshBox(a.stroke);
  record({ kind: Op.ADD, stroke: a.stroke });
  scheduleSave();
}

function abandon(a) {
  if (a?.kind === Kind.ERASE) {
    finishErase(a);
    return;
  }
  if (a?.kind !== Kind.DRAW) {
    return;
  }

  if (a.t0 + TOUCH_CANCEL_MS > performance.now()) {
    clearTimeout(a.holdTimer);
    strokes = strokes.filter((s) => s !== a.stroke);
    return;
  }

  finishDraw(a);
}

function refreshBox(stroke) {
  stroke.box = bounds(stroke.pts, stroke.w / 2);
}

function samplesOf(e) {
  const coalesced = e.getCoalescedEvents?.() ?? [];
  return coalesced.length > 0 ? coalesced : [e];
}

function onTouchDown(e) {
  if (action && action.type !== Pointer.TOUCH) {
    return;
  }

  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);

  if (touches.size > 2) {
    return;
  }
  if (touches.size === 2) {
    abandon(action);
    action = startPinch();
    return;
  }

  action = penSeen ? startPan(e) : startAction(e);
}

function onDown(e) {
  if (e.pointerType === Pointer.PEN) {
    penSeen = true;
  }

  hover = { x: e.clientX, y: e.clientY };

  if (e.pointerType === Pointer.TOUCH) {
    onTouchDown(e);
  } else if (!action) {
    canvas.setPointerCapture(e.pointerId);
    action = startAction(e);
  }

  updateCursor();
  requestRender();
}

function onMove(e) {
  hover = { x: e.clientX, y: e.clientY };

  if (touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  requestRender();

  if (!action) {
    return;
  }
  if (action.kind === Kind.PINCH) {
    movePinch(action);
    return;
  }
  if (action.id !== e.pointerId) {
    return;
  }

  if (action.kind === Kind.PAN) {
    movePan(action, e);
  } else if (action.kind === Kind.ERASE) {
    moveErase(action, e);
  } else {
    moveDraw(action, e);
  }
}

function onUp(e) {
  touches.delete(e.pointerId);

  if (e.pointerType === Pointer.TOUCH) {
    hover = null;
  }

  if (action?.kind === Kind.PINCH) {
    endPinch(action);
  } else if (action?.id === e.pointerId) {
    if (action.kind === Kind.DRAW) {
      finishDraw(action);
    } else if (action.kind === Kind.ERASE) {
      finishErase(action);
    }
    action = null;
  }

  updateCursor();
  requestRender();
}

function endPinch(a) {
  if (touches.size >= 2) {
    Object.assign(a, measurePinch());
    return;
  }
  if (touches.size === 0) {
    action = null;
    return;
  }

  const [[id, p]] = touches;
  action = { kind: Kind.PAN, id, type: Pointer.TOUCH, last: p };
}

function onWheel(e) {
  e.preventDefault();

  let unit = 1;
  if (e.deltaMode === DELTA_LINE) {
    unit = LINE_DELTA_PX;
  } else if (e.deltaMode === DELTA_PAGE) {
    unit = size.h;
  }

  if (e.ctrlKey) {
    const step = Math.max(-WHEEL_ZOOM_MAX_STEP, Math.min(WHEEL_ZOOM_MAX_STEP, e.deltaY * unit));
    zoomAt(e.clientX, e.clientY, Math.exp(-step * WHEEL_ZOOM_RATE));
    return;
  }

  let dx = e.deltaX * unit;
  let dy = e.deltaY * unit;
  if (e.shiftKey && dx === 0) {
    [dx, dy] = [dy, 0];
  }

  camera = { x: camera.x + dx / camera.zoom, y: camera.y + dy / camera.zoom, zoom: camera.zoom };
  cameraChanged();
}

function onKeyDown(e) {
  if (e.code === "Space") {
    e.preventDefault();
    spaceDown = true;
    updateCursor();
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    onShortcut(e);
    return;
  }
  if (e.altKey) {
    return;
  }

  const key = e.key.toLowerCase();
  if (key === "tab") {
    e.preventDefault();
    setTool(tool === Tool.PEN ? Tool.ERASER : Tool.PEN);
  } else if (key === "1" || key === "p") {
    setTool(Tool.PEN);
  } else if (key === "2" || key === "e") {
    setTool(Tool.ERASER);
  } else if (key === "0" || key === "home") {
    goHome();
  }
}

function onShortcut(e) {
  const key = e.key.toLowerCase();
  if (key !== "z" && key !== "y") {
    return;
  }

  e.preventDefault();
  if (key === "z") {
    undo();
  } else {
    redo();
  }
}

function onKeyUp(e) {
  if (e.code !== "Space") {
    return;
  }

  e.preventDefault();
  spaceDown = false;
  updateCursor();
}

canvas.addEventListener("pointerdown", onDown);
canvas.addEventListener("pointermove", onMove);
canvas.addEventListener("pointerup", onUp);
canvas.addEventListener("pointercancel", onUp);
canvas.addEventListener("pointerleave", () => {
  hover = null;
  requestRender();
});
canvas.addEventListener("wheel", onWheel, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("resize", resize);
window.addEventListener("pagehide", flushSave);

for (const button of toolButtons) {
  button.addEventListener("click", () => setTool(button.dataset.tool));
}

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
homeButton.addEventListener("click", goHome);

resize();
setTool(Tool.PEN);
syncHistory();
