document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const toolControlsContainer = document.getElementById(
    "tool-controls-container",
  );
  const addImageBtn = document.getElementById("add-image-btn");
  const imageFileInput = document.getElementById("image-file-input");
  const layersListContainer = document.getElementById("layers-list-container");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const propertiesContainer = document.getElementById(
    "selected-tool-properties-container",
  );
  const exportImageBtn = document.getElementById("export-image-btn");
  const canvasWidthInput = document.getElementById("canvas-width-input");
  const canvasHeightInput = document.getElementById("canvas-height-input");
  const applyCanvasSizeBtn = document.getElementById("apply-canvas-size-btn");
  const exportFormatSelect = document.getElementById("export-format-select");
  const exportQualityControl = document.getElementById(
    "export-quality-control",
  );
  const exportQualitySlider = document.getElementById("export-quality-slider");
  const exportQualityValue = document.getElementById("export-quality-value");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  const duplicateLayerBtn = document.getElementById("duplicate-layer-btn");
  const moveLayerUpBtn = document.getElementById("move-layer-up-btn");
  const moveLayerDownBtn = document.getElementById("move-layer-down-btn");

  // Zoom Controls
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomFitBtn = document.getElementById("zoom-fit-btn");
  const zoomLevelDisplay = document.getElementById("zoom-level-display");

  // --- State Variables ---
  let layers = [];
  let selectedLayerId = null;
  let nextLayerId = 1;
  let canvas = null;
  let ctx = null;
  let currentCanvasWidth = 1024;
  let currentCanvasHeight = 1024;
  const MIN_CANVAS_DIM = 100;
  const MAX_CANVAS_DIM = 4096;
  let maintainAspectRatio = true;
  let draggedLayerElement = null;
  let historyStack = [];
  let historyPointer = -1;
  const MAX_HISTORY_STATES = 50;
  let isRestoringState = false;

  // Zoom and Pan State
  let currentZoomLevel = 1.0;
  let canvasTransformX = 0;
  let canvasTransformY = 0;
  const ZOOM_STEP = 0.1;

  // --- Tools Definition --- (Same as before)
  const availableTools = [
    { id: "select", name: "Select/Move (V)", type: "core", shortcut: "v" },
    { id: "crop", name: "Crop (C)", type: "geometry", shortcut: "c" },
    { id: "resize", name: "Resize", type: "geometry" },
    { id: "rotate", name: "Rotate (R)", type: "geometry", shortcut: "r" },
    { id: "flip", name: "Flip", type: "geometry" },
    {
      id: "brightness",
      name: "Brightness",
      type: "filter",
      property: "brightness",
      min: 0,
      max: 200,
      defaultValue: 100,
      unit: "%",
    },
    {
      id: "contrast",
      name: "Contrast",
      type: "filter",
      property: "contrast",
      min: 0,
      max: 200,
      defaultValue: 100,
      unit: "%",
    },
    {
      id: "saturate",
      name: "Saturation",
      type: "filter",
      property: "saturate",
      min: 0,
      max: 200,
      defaultValue: 100,
      unit: "%",
    },
    {
      id: "grayscale",
      name: "Grayscale",
      type: "filter",
      property: "grayscale",
      min: 0,
      max: 100,
      defaultValue: 0,
      unit: "%",
    },
    {
      id: "sepia",
      name: "Sepia",
      type: "filter",
      property: "sepia",
      min: 0,
      max: 100,
      defaultValue: 0,
      unit: "%",
    },
    {
      id: "invert",
      name: "Invert",
      type: "filter",
      property: "invert",
      min: 0,
      max: 100,
      defaultValue: 0,
      unit: "%",
    },
    {
      id: "blur",
      name: "Blur",
      type: "filter",
      property: "blur",
      min: 0,
      max: 20,
      defaultValue: 0,
      unit: "px",
    },
    { id: "tint", name: "Color Tint", type: "effect" },
    { id: "pixelate", name: "Pixelate", type: "effect" },
    { id: "vignette", name: "Vignette", type: "effect" },
    {
      id: "addText",
      name: "Add/Edit Text (T)",
      type: "creator",
      shortcut: "t",
    },
    {
      id: "sharpen",
      name: "Sharpen",
      type: "effect",
      property: "sharpen",
      min: 0,
      max: 100,
      defaultValue: 0,
      unit: "",
    },
    { id: "gradientMap", name: "Gradient Map", type: "effect" },
    { id: "curves", name: "Curves", type: "effect" },
    {
      id: "noise",
      name: "Add Noise",
      type: "effect",
      property: "noise",
      min: 0,
      max: 100,
      defaultValue: 0,
      unit: "",
    },
  ];
  let activeTool = "select";

  // --- Undo/Redo Functions --- (Same as before)
  function deepCopy(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof HTMLImageElement || obj instanceof HTMLCanvasElement) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(deepCopy);
    }
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = deepCopy(obj[key]);
      }
    }
    return copy;
  }
  function saveState() {
    if (isRestoringState) return;
    const state = {
      layers: deepCopy(layers),
      currentCanvasWidth: currentCanvasWidth,
      currentCanvasHeight: currentCanvasHeight,
      selectedLayerId: selectedLayerId,
      activeTool: activeTool,
      currentZoomLevel: currentZoomLevel,
      canvasTransformX: canvasTransformX,
      canvasTransformY: canvasTransformY,
    };
    if (historyPointer < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyPointer + 1);
    }
    historyStack.push(state);
    if (historyStack.length > MAX_HISTORY_STATES) {
      historyStack.shift();
    }
    historyPointer = historyStack.length - 1;
    updateUndoRedoButtons();
  }
  function restoreState(state) {
    isRestoringState = true;
    layers = deepCopy(state.layers);
    currentCanvasWidth = state.currentCanvasWidth;
    currentCanvasHeight = state.currentCanvasHeight;
    selectedLayerId = state.selectedLayerId;
    currentZoomLevel = state.currentZoomLevel || 1.0;
    canvasTransformX = state.canvasTransformX || 0;
    canvasTransformY = state.canvasTransformY || 0;
    if (canvas) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;
      applyCanvasTransform();
    }
    canvasWidthInput.value = currentCanvasWidth;
    canvasHeightInput.value = currentCanvasHeight;
    updateLayersList();
    renderCanvas();
    updatePropertiesPanel();
    updateLayerActionButtons();
    updateZoomDisplay();
    isRestoringState = false;
  }
  function undo() {
    if (historyPointer > 0) {
      historyPointer--;
      restoreState(historyStack[historyPointer]);
      updateUndoRedoButtons();
    }
  }
  function redo() {
    if (historyPointer < historyStack.length - 1) {
      historyPointer++;
      restoreState(historyStack[historyPointer]);
      updateUndoRedoButtons();
    }
  }
  function updateUndoRedoButtons() {
    undoBtn.disabled = historyPointer <= 0;
    redoBtn.disabled = historyPointer >= historyStack.length - 1;
  }

  // --- Canvas Setup & Size Control ---
  function initializeCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "main-canvas";
    canvas.width = currentCanvasWidth;
    canvas.height = currentCanvasHeight;
    canvasWrapper.appendChild(canvas);
    ctx = canvas.getContext("2d");
    canvasWidthInput.value = currentCanvasWidth;
    canvasHeightInput.value = currentCanvasHeight;

    zoomFit(); // Fit canvas to view initially
    renderCanvas();
    saveState();
  }
  function handleUpdateCanvasSize() {
    let newWidth = parseInt(canvasWidthInput.value, 10);
    let newHeight = parseInt(canvasHeightInput.value, 10);
    newWidth = Math.max(MIN_CANVAS_DIM, Math.min(MAX_CANVAS_DIM, newWidth));
    newHeight = Math.max(MIN_CANVAS_DIM, Math.min(MAX_CANVAS_DIM, newHeight));
    canvasWidthInput.value = newWidth;
    canvasHeightInput.value = newHeight;
    currentCanvasWidth = newWidth;
    currentCanvasHeight = newHeight;
    if (canvas) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;
      zoomFit();
      renderCanvas();
    }
    saveState();
  }

  // --- Zoom and Pan Functions ---
  function applyCanvasTransform() {
    if (!canvas) return;
    // Center the transform origin for a more natural zoom
    // Or use 'top left' if you prefer panning from that origin
    canvas.style.transformOrigin = "center center";
    canvas.style.transform = `translate(${canvasTransformX}px, ${canvasTransformY}px) scale(${currentZoomLevel})`;
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${Math.round(currentZoomLevel * 100)}%`;
    }
  }

  function zoomIn() {
    currentZoomLevel += ZOOM_STEP;
    currentZoomLevel = Math.min(currentZoomLevel, 5); // Max zoom 500%
    applyCanvasTransform();
    saveState();
  }

  function zoomOut() {
    currentZoomLevel -= ZOOM_STEP;
    currentZoomLevel = Math.max(currentZoomLevel, 0.1); // Min zoom 10%
    applyCanvasTransform();
    saveState();
  }

  function zoomFit() {
    if (!canvas || !canvasWrapper) return;
    const wrapperWidth = canvasWrapper.clientWidth;
    const wrapperHeight = canvasWrapper.clientHeight;

    if (
      wrapperWidth <= 0 ||
      wrapperHeight <= 0 ||
      currentCanvasWidth <= 0 ||
      currentCanvasHeight <= 0
    ) {
      currentZoomLevel = 1.0; // Fallback
    } else {
      const scaleX = wrapperWidth / currentCanvasWidth;
      const scaleY = wrapperHeight / currentCanvasHeight;
      currentZoomLevel = Math.min(scaleX, scaleY) * 0.98; // *0.98 for a little padding
    }

    // Reset pan to center the fitted canvas (simple centering)
    // For transform-origin: center center, pan is less critical for fit, but good for explicit pan later
    canvasTransformX = 0; // (wrapperWidth - (currentCanvasWidth * currentZoomLevel)) / 2;
    canvasTransformY = 0; // (wrapperHeight - (currentCanvasHeight * currentZoomLevel)) / 2;

    applyCanvasTransform();
    // Don't save state on initial fit or programmatic fit, only on user zoom actions
  }

  // --- Helper: hexToRgb --- (Same as before)
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  // --- Pixel Manipulation Effect Helpers --- (Same as before)
  function applyGradientMapToImage(
    sourceImage,
    targetWidth,
    targetHeight,
    stopsArray,
  ) {
    /* ... Same ... */ const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tempCtx.drawImage(
      sourceImage,
      0,
      0,
      sourceImage.naturalWidth || sourceImage.width,
      sourceImage.naturalHeight || sourceImage.height,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    if (targetWidth <= 0 || targetHeight <= 0) return tempCanvas;
    try {
      const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      const sortedStops = [...stopsArray].sort(
        (a, b) => a.position - b.position,
      );
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        if (alpha === 0) continue;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        let startStop = sortedStops[0];
        let endStop = sortedStops[sortedStops.length - 1];
        if (luminance <= sortedStops[0].position) {
          endStop = sortedStops[0];
        } else if (luminance >= sortedStops[sortedStops.length - 1].position) {
          startStop = sortedStops[sortedStops.length - 1];
        } else {
          for (let j = 0; j < sortedStops.length - 1; j++) {
            if (
              luminance >= sortedStops[j].position &&
              luminance <= sortedStops[j + 1].position
            ) {
              startStop = sortedStops[j];
              endStop = sortedStops[j + 1];
              break;
            }
          }
        }
        const range = endStop.position - startStop.position;
        const t = range === 0 ? 0 : (luminance - startStop.position) / range;
        const startColor = hexToRgb(startStop.color);
        const endColor = hexToRgb(endStop.color);
        data[i] = Math.round(startColor.r + (endColor.r - startColor.r) * t);
        data[i + 1] = Math.round(
          startColor.g + (endColor.g - startColor.g) * t,
        );
        data[i + 2] = Math.round(
          startColor.b + (endColor.b - startColor.b) * t,
        );
      }
      tempCtx.putImageData(imageData, 0, 0);
    } catch (e) {
      console.error("Error applying gradient map:", e);
      tempCtx.drawImage(
        sourceImage,
        0,
        0,
        sourceImage.naturalWidth || sourceImage.width,
        sourceImage.naturalHeight || sourceImage.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );
    }
    return tempCanvas;
  }
  function applyPixelate(sourceImage, targetWidth, targetHeight, pixelateSize) {
    /* ... Same ... */ const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext("2d");
    if (targetWidth <= 0 || targetHeight <= 0 || pixelateSize <= 1) {
      tempCtx.drawImage(
        sourceImage,
        0,
        0,
        sourceImage.naturalWidth || sourceImage.width,
        sourceImage.naturalHeight || sourceImage.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      return tempCanvas;
    }
    tempCtx.imageSmoothingEnabled = false;
    const wSmall = Math.max(1, Math.floor(targetWidth / pixelateSize));
    const hSmall = Math.max(1, Math.floor(targetHeight / pixelateSize));
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = wSmall;
    smallCanvas.height = hSmall;
    const smallCtx = smallCanvas.getContext("2d");
    smallCtx.drawImage(
      sourceImage,
      0,
      0,
      sourceImage.naturalWidth || sourceImage.width,
      sourceImage.naturalHeight || sourceImage.height,
      0,
      0,
      wSmall,
      hSmall,
    );
    tempCtx.drawImage(
      smallCanvas,
      0,
      0,
      wSmall,
      hSmall,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    tempCtx.imageSmoothingEnabled = true;
    return tempCanvas;
  }
  function generateCurveLUT(points) {
    /* ... Same ... */ const lut = new Uint8Array(256);
    const sortedPoints = [...points].sort((a, b) => a.input - b.input);
    if (sortedPoints.length === 0 || sortedPoints[0].input !== 0) {
      sortedPoints.unshift({ input: 0, output: sortedPoints[0]?.output || 0 });
    }
    if (sortedPoints[sortedPoints.length - 1].input !== 255) {
      sortedPoints.push({
        input: 255,
        output: sortedPoints[sortedPoints.length - 1]?.output || 255,
      });
    }
    const uniquePoints = [];
    const seenInputs = new Set();
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
      if (!seenInputs.has(sortedPoints[i].input)) {
        uniquePoints.unshift(sortedPoints[i]);
        seenInputs.add(sortedPoints[i].input);
      }
    }
    let p = 0;
    for (let i = 0; i < 256; i++) {
      if (p < uniquePoints.length - 1) {
        if (i > uniquePoints[p + 1].input) {
          p++;
        }
      }
      const p1 = uniquePoints[p];
      const p2 = uniquePoints[p + 1] || p1;
      if (p1.input === p2.input || i <= p1.input) {
        lut[i] = p1.output;
      } else {
        const t = (i - p1.input) / (p2.input - p1.input);
        lut[i] = Math.round(p1.output + (p2.output - p1.output) * t);
      }
      lut[i] = Math.max(0, Math.min(255, lut[i]));
    }
    return lut;
  }
  function applyCurvesToImage(
    sourceImage,
    targetWidth,
    targetHeight,
    curvePoints,
  ) {
    /* ... Same ... */ const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tempCtx.drawImage(
      sourceImage,
      0,
      0,
      sourceImage.naturalWidth || sourceImage.width,
      sourceImage.naturalHeight || sourceImage.height,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    if (targetWidth <= 0 || targetHeight <= 0) return tempCanvas;
    try {
      const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      const lut = generateCurveLUT(curvePoints.rgb);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
      tempCtx.putImageData(imageData, 0, 0);
    } catch (e) {
      console.error("Error applying curves:", e);
      tempCtx.drawImage(
        sourceImage,
        0,
        0,
        sourceImage.naturalWidth || sourceImage.width,
        sourceImage.naturalHeight || sourceImage.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );
    }
    return tempCanvas;
  }
  function applyNoiseToImage(
    sourceImage,
    targetWidth,
    targetHeight,
    noiseAmount,
  ) {
    /* ... Same ... */ const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tempCtx.drawImage(
      sourceImage,
      0,
      0,
      sourceImage.naturalWidth || sourceImage.width,
      sourceImage.naturalHeight || sourceImage.height,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    if (targetWidth <= 0 || targetHeight <= 0 || noiseAmount <= 0)
      return tempCanvas;
    try {
      const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      const intensity = noiseAmount * 2.55;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const noise = (Math.random() - 0.5) * intensity;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      tempCtx.putImageData(imageData, 0, 0);
    } catch (e) {
      console.error("Error applying noise:", e);
      tempCtx.drawImage(
        sourceImage,
        0,
        0,
        sourceImage.naturalWidth || sourceImage.width,
        sourceImage.naturalHeight || sourceImage.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );
    }
    return tempCanvas;
  }

  // --- Rendering Functions --- (renderCanvas, drawCheckerboardBackground - Same as before)
  function renderCanvas() {
    /* ... Same ... */ if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboardBackground();
    layers.forEach((layer) => {
      if (layer.visible && (layer.image || layer.textCanvas)) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;
        ctx.translate(centerX, centerY);
        if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
        if (layer.flipHorizontal) ctx.scale(-1, 1);
        if (layer.flipVertical) ctx.scale(1, -1);
        ctx.translate(-centerX, -centerY);
        if (layer.cropShape && layer.cropShape !== "none") {
          ctx.beginPath();
          if (layer.cropShape === "circle") {
            ctx.arc(
              layer.x + layer.width / 2,
              layer.y + layer.height / 2,
              Math.min(layer.width, layer.height) / 2,
              0,
              Math.PI * 2,
            );
          } else if (layer.cropShape === "ellipse") {
            ctx.ellipse(
              layer.x + layer.width / 2,
              layer.y + layer.height / 2,
              layer.width / 2,
              layer.height / 2,
              0,
              0,
              Math.PI * 2,
            );
          }
          ctx.clip();
        }
        let currentImageSource = layer.image;
        if (layer.curves.enabled && layer.curves.rgb.length > 0) {
          currentImageSource = applyCurvesToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.curves,
          );
        }
        if (layer.gradientMap.enabled && layer.gradientMap.stops.length >= 2) {
          currentImageSource = applyGradientMapToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.gradientMap.stops,
          );
        }
        if (layer.filters.noise > 0) {
          currentImageSource = applyNoiseToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.filters.noise,
          );
        }
        if (layer.pixelateSize > 1) {
          currentImageSource = applyPixelate(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.pixelateSize,
          );
        }
        let filterString = "";
        filterString += `brightness(${layer.filters.brightness}%) `;
        filterString += `contrast(${layer.filters.contrast}%) `;
        filterString += `saturate(${layer.filters.saturate}%) `;
        filterString += `grayscale(${layer.filters.grayscale}%) `;
        filterString += `sepia(${layer.filters.sepia}%) `;
        filterString += `invert(${layer.filters.invert}%) `;
        if (layer.filters.blur > 0)
          filterString += `blur(${layer.filters.blur}px) `;
        if (layer.filters.sharpen > 0) {
          filterString += `contrast(${100 + layer.filters.sharpen / 2}%) brightness(${100 - layer.filters.sharpen / 10}%) `;
        }
        ctx.filter = filterString.trim() === "" ? "none" : filterString.trim();
        ctx.drawImage(
          currentImageSource,
          currentImageSource === layer.image ? layer.cropX : 0,
          currentImageSource === layer.image ? layer.cropY : 0,
          layer.cropWidth,
          layer.cropHeight,
          layer.x,
          layer.y,
          layer.width,
          layer.height,
        );
        ctx.filter = "none";
        if (layer.tintStrength > 0 && layer.tintColor !== "rgba(0,0,0,0)") {
          ctx.globalAlpha = layer.opacity * layer.tintStrength;
          ctx.fillStyle = layer.tintColor;
          ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        }
        if (layer.vignette.strength > 0) {
          const vgn = layer.vignette;
          const gradX = layer.x + layer.width / 2;
          const gradY = layer.y + layer.height / 2;
          const outerRadius = Math.sqrt(
            Math.pow(layer.width / 2, 2) + Math.pow(layer.height / 2, 2),
          );
          const innerRadius = outerRadius * (1 - vgn.extent);
          const gradient = ctx.createRadialGradient(
            gradX,
            gradY,
            innerRadius,
            gradX,
            gradY,
            outerRadius,
          );
          const transparentColor = `rgba(${hexToRgb(vgn.color).r}, ${hexToRgb(vgn.color).g}, ${hexToRgb(vgn.color).b}, 0)`;
          const opaqueColor = `rgba(${hexToRgb(vgn.color).r}, ${hexToRgb(vgn.color).g}, ${hexToRgb(vgn.color).b}, ${vgn.strength})`;
          gradient.addColorStop(0, transparentColor);
          gradient.addColorStop(vgn.softness, transparentColor);
          gradient.addColorStop(1, opaqueColor);
          ctx.fillStyle = gradient;
          ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        }
        ctx.restore();
      }
    });
    const selectedLayer = getLayerById(selectedLayerId);
    if (selectedLayer && selectedLayer.visible) {
      ctx.save();
      const centerX = selectedLayer.x + selectedLayer.width / 2;
      const centerY = selectedLayer.y + selectedLayer.height / 2;
      ctx.translate(centerX, centerY);
      if (selectedLayer.rotation)
        ctx.rotate((selectedLayer.rotation * Math.PI) / 180);
      if (selectedLayer.flipHorizontal) ctx.scale(-1, 1);
      if (selectedLayer.flipVertical) ctx.scale(1, -1);
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        -selectedLayer.width / 2,
        -selectedLayer.height / 2,
        selectedLayer.width,
        selectedLayer.height,
      );
      ctx.restore();
    }
  }
  function drawCheckerboardBackground() {
    /* ... Same ... */ if (!canvas || !ctx) return;
    const TILE_SIZE = 20;
    const numTilesX = Math.ceil(canvas.width / TILE_SIZE);
    const numTilesY = Math.ceil(canvas.height / TILE_SIZE);
    for (let r = 0; r < numTilesY; r++) {
      for (let c = 0; c < numTilesX; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#cccccc" : "#ffffff";
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // --- Layer Management Functions --- (addImageAsLayer, updateLayersList, etc. - Same as before)
  function addImageAsLayer(
    fileOrImage,
    name = "New Layer",
    isText = false,
    textData = null,
  ) {
    /* ... Same ... */ const processImage = (img, layerName) => {
      const naturalImgWidth = img.naturalWidth || img.width;
      const naturalImgHeight = img.naturalHeight || img.height;
      const newLayer = {
        id: nextLayerId++,
        name:
          layerName.length > 20
            ? layerName.substring(0, 17) + "..."
            : layerName,
        image: img,
        x: 50,
        y: 50,
        width: naturalImgWidth,
        height: naturalImgHeight,
        originalWidth: naturalImgWidth,
        originalHeight: naturalImgHeight,
        cropX: 0,
        cropY: 0,
        cropWidth: naturalImgWidth,
        cropHeight: naturalImgHeight,
        cropShape: "none",
        aspectRatio: naturalImgWidth / (naturalImgHeight || 1),
        opacity: 1.0,
        visible: true,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        tintColor: "rgba(0,0,0,0)",
        tintStrength: 0,
        pixelateSize: 1,
        vignette: { strength: 0, color: "#000000", extent: 0.5, softness: 0.5 },
        filters: {
          brightness: 100,
          contrast: 100,
          saturate: 100,
          grayscale: 0,
          sepia: 0,
          invert: 0,
          blur: 0,
          sharpen: 0,
          noise: 0,
        },
        gradientMap: {
          enabled: false,
          stops: [
            { position: 0, color: "#000000" },
            { position: 1, color: "#FFFFFF" },
          ],
        },
        curves: {
          enabled: false,
          rgb: [
            { input: 0, output: 0 },
            { input: 64, output: 48 },
            { input: 128, output: 128 },
            { input: 192, output: 208 },
            { input: 255, output: 255 },
          ],
        },
        isTextLayer: isText,
        textData: isText ? textData : null,
      };
      const maxDim = Math.max(newLayer.cropWidth, newLayer.cropHeight);
      const canvasMaxDim =
        Math.min(currentCanvasWidth, currentCanvasHeight) * 0.75;
      if (
        maxDim > canvasMaxDim &&
        newLayer.cropWidth > 0 &&
        newLayer.cropHeight > 0
      ) {
        const scale = canvasMaxDim / maxDim;
        newLayer.width = Math.round(newLayer.cropWidth * scale);
        newLayer.height = Math.round(newLayer.cropHeight * scale);
      } else {
        newLayer.width = newLayer.cropWidth;
        newLayer.height = newLayer.cropHeight;
      }
      if (newLayer.width <= 0) newLayer.width = 100;
      if (newLayer.height <= 0) newLayer.height = 50;
      layers.push(newLayer);
      selectLayer(newLayer.id);
    };
    if (fileOrImage instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img, fileOrImage.name);
        img.onerror = () => alert(`Error loading image: ${fileOrImage.name}`);
        img.src = e.target.result;
      };
      reader.onerror = () => alert(`Error reading file: ${fileOrImage.name}`);
      reader.readAsDataURL(fileOrImage);
    } else {
      processImage(fileOrImage, name);
    }
  }
  function updateLayersList() {
    /* ... Same ... */ layersListContainer.innerHTML = "";
    [...layers].reverse().forEach((layer) => {
      const layerItem = document.createElement("div");
      layerItem.className = `layer-item ${layer.id === selectedLayerId ? "selected" : ""}`;
      layerItem.dataset.layerId = layer.id;
      layerItem.draggable = true;
      layerItem.addEventListener("dragstart", handleDragStart);
      layerItem.addEventListener("dragend", handleDragEnd);
      const layerNameSpan = document.createElement("span");
      layerNameSpan.className = "layer-name";
      layerNameSpan.textContent = layer.name;
      layerNameSpan.title = "Double-click to rename";
      layerNameSpan.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        makeLayerNameEditable(layer, layerNameSpan);
      });
      const visibilityToggle = document.createElement("button");
      visibilityToggle.className = "visibility-toggle";
      visibilityToggle.innerHTML = layer.visible ? "👁️" : "🙈";
      visibilityToggle.title = layer.visible
        ? "Hide Layer (Ctrl+,)"
        : "Show Layer (Ctrl+,)";
      visibilityToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLayerVisibility(layer.id);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-layer-btn";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.title = "Delete Layer (Del/Backspace)";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteLayer(layer.id);
      });
      layerItem.appendChild(visibilityToggle);
      layerItem.appendChild(layerNameSpan);
      layerItem.appendChild(deleteBtn);
      layerItem.addEventListener("click", () => selectLayer(layer.id));
      layersListContainer.appendChild(layerItem);
    });
    updateLayerActionButtons();
  }
  function makeLayerNameEditable(layer, spanElement) {
    /* ... Same ... */ const inputElement = document.createElement("input");
    inputElement.type = "text";
    inputElement.value = layer.name;
    inputElement.className = "layer-name-edit";
    spanElement.replaceWith(inputElement);
    inputElement.focus();
    inputElement.select();
    const saveName = () => {
      const newName = inputElement.value.trim();
      if (newName && newName !== layer.name) {
        layer.name = newName;
        saveState();
      }
      updateLayersList();
      if (selectedLayerId === layer.id) {
        const newLayerItem = layersListContainer.querySelector(
          `.layer-item[data-layer-id="${layer.id}"]`,
        );
        if (newLayerItem) newLayerItem.classList.add("selected");
      }
    };
    inputElement.addEventListener("blur", saveName);
    inputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        saveName();
      } else if (e.key === "Escape") {
        inputElement.replaceWith(spanElement);
      }
    });
  }
  function selectLayer(layerId) {
    selectedLayerId = layerId;
    updateLayersList();
    renderCanvas();
    updatePropertiesPanel();
    saveState();
  }
  function getLayerById(layerId) {
    return layers.find((l) => l.id === layerId);
  }
  function toggleLayerVisibility(layerId) {
    const layer = getLayerById(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      updateLayersList();
      renderCanvas();
      saveState();
    }
  }
  function deleteLayer(layerId) {
    layers = layers.filter((layer) => layer.id !== layerId);
    if (selectedLayerId === layerId) {
      selectedLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
    }
    updateLayersList();
    renderCanvas();
    updatePropertiesPanel();
    saveState();
  }
  function handleDragStart(e) {
    /* ... Same ... */ draggedLayerElement = e.target.closest(".layer-item");
    e.dataTransfer.setData("text/plain", draggedLayerElement.dataset.layerId);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (draggedLayerElement) draggedLayerElement.classList.add("dragging");
    }, 0);
  }
  function handleDragEnd() {
    /* ... Same ... */ if (draggedLayerElement) {
      draggedLayerElement.classList.remove("dragging");
      draggedLayerElement.classList.remove("drag-over-before");
      draggedLayerElement.classList.remove("drag-over-after");
    }
    document
      .querySelectorAll(
        ".layer-item.drag-over-before, .layer-item.drag-over-after",
      )
      .forEach((el) => {
        el.classList.remove("drag-over-before");
        el.classList.remove("drag-over-after");
      });
    draggedLayerElement = null;
  }
  layersListContainer.addEventListener("dragover", (e) => {
    /* ... Same, uses drag-over-before/after ... */ e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const afterElement = getDragAfterElement(layersListContainer, e.clientY);
    document
      .querySelectorAll(
        ".layer-item.drag-over-before, .layer-item.drag-over-after",
      )
      .forEach((el) => {
        el.classList.remove("drag-over-before");
        el.classList.remove("drag-over-after");
      });
    if (afterElement) {
      afterElement.classList.add("drag-over-before");
    } else {
      const lastItem = layersListContainer.lastElementChild;
      if (lastItem && lastItem !== draggedLayerElement) {
        lastItem.classList.add("drag-over-after");
      }
    }
  });
  layersListContainer.addEventListener("dragleave", (e) => {
    /* ... Same, uses drag-over-before/after ... */ if (
      e.target === layersListContainer
    ) {
      document
        .querySelectorAll(
          ".layer-item.drag-over-before, .layer-item.drag-over-after",
        )
        .forEach((el) => {
          el.classList.remove("drag-over-before");
          el.classList.remove("drag-over-after");
        });
    }
  });
  layersListContainer.addEventListener("drop", (e) => {
    /* ... Same ... */ e.preventDefault();
    if (!draggedLayerElement) return;
    const draggedLayerId = parseInt(e.dataTransfer.getData("text/plain"));
    const draggedLayerObject = layers.find((l) => l.id === draggedLayerId);
    if (!draggedLayerObject) return;
    const fromIndex = layers.indexOf(draggedLayerObject);
    layers.splice(fromIndex, 1);
    const afterElementInList = getDragAfterElement(
      layersListContainer,
      e.clientY,
    );
    if (afterElementInList == null) {
      layers.unshift(draggedLayerObject);
    } else {
      const afterLayerInListId = parseInt(afterElementInList.dataset.layerId);
      const actualLayerToBeBelowDragged = layers.find(
        (l) => l.id === afterLayerInListId,
      );
      if (actualLayerToBeBelowDragged) {
        const insertionIndex = layers.indexOf(actualLayerToBeBelowDragged);
        layers.splice(insertionIndex, 0, draggedLayerObject);
      } else {
        layers.push(draggedLayerObject);
      }
    }
    handleDragEnd();
    updateLayersList();
    renderCanvas();
    saveState();
  });
  function getDragAfterElement(container, y) {
    /* ... Same ... */ const draggableElements = [
      ...container.querySelectorAll(".layer-item:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }
  function duplicateSelectedLayer() {
    if (!selectedLayerId) return;
    const originalLayer = getLayerById(selectedLayerId);
    if (!originalLayer) return;
    const newLayer = deepCopy(originalLayer);
    newLayer.id = nextLayerId++;
    newLayer.name = `${originalLayer.name} Copy`;
    newLayer.x += 10;
    newLayer.y += 10;
    if (originalLayer.image instanceof HTMLCanvasElement) {
      const newImageCanvas = document.createElement("canvas");
      newImageCanvas.width = originalLayer.image.width;
      newImageCanvas.height = originalLayer.image.height;
      const newImageCtx = newImageCanvas.getContext("2d");
      newImageCtx.drawImage(originalLayer.image, 0, 0);
      newLayer.image = newImageCanvas;
    }
    const originalIndex = layers.indexOf(originalLayer);
    layers.splice(originalIndex + 1, 0, newLayer);
    selectLayer(newLayer.id);
  }
  function moveSelectedLayer(direction) {
    if (!selectedLayerId) return;
    const layer = getLayerById(selectedLayerId);
    if (!layer) return;
    const currentIndex = layers.indexOf(layer);
    const newIndex = currentIndex - direction;
    if (newIndex >= 0 && newIndex < layers.length) {
      layers.splice(currentIndex, 1);
      layers.splice(newIndex, 0, layer);
      updateLayersList();
      renderCanvas();
      saveState();
    }
  }
  function updateLayerActionButtons() {
    const canDuplicate = selectedLayerId !== null;
    duplicateLayerBtn.disabled = !canDuplicate;
    const selectedLayer = getLayerById(selectedLayerId);
    const currentIndex = selectedLayer ? layers.indexOf(selectedLayer) : -1;
    moveLayerUpBtn.disabled = !selectedLayer || currentIndex <= 0;
    moveLayerDownBtn.disabled =
      !selectedLayer || currentIndex >= layers.length - 1;
  }

  // --- Tool Management & Properties Panel --- (Helpers - Same as before)
  function populateTools() {
    /* ... Same ... */ toolControlsContainer.innerHTML = "";
    availableTools.forEach((tool) => {
      const button = document.createElement("button");
      button.dataset.tool = tool.id;
      button.textContent = tool.name;
      button.className = activeTool === tool.id ? "active" : "";
      button.addEventListener("click", () => setActiveTool(tool.id));
      toolControlsContainer.appendChild(button);
    });
  }
  function setActiveTool(toolId) {
    /* ... Same ... */ activeTool = toolId;
    populateTools();
    updatePropertiesPanel();
  }
  function createButton(text, callback) {
    /* ... Same ... */ const button = document.createElement("button");
    button.textContent = text;
    button.addEventListener("click", callback);
    return button;
  }
  function createColorInput(label, id, value, callback) {
    /* ... Same ... */ const container = document.createElement("div");
    container.className = "property-control";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = `${label}: `;
    const inputEl = document.createElement("input");
    inputEl.type = "color";
    inputEl.id = id;
    inputEl.value = value;
    inputEl.addEventListener("input", (e) => callback(e.target.value));
    container.appendChild(labelEl);
    container.appendChild(inputEl);
    return container;
  }
  function createTextInput(label, id, value, callback, placeholder = "") {
    /* ... Same ... */ const container = document.createElement("div");
    container.className = "property-control";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = `${label}: `;
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.id = id;
    inputEl.value = value;
    inputEl.placeholder = placeholder;
    inputEl.addEventListener("input", (e) => callback(e.target.value));
    container.appendChild(labelEl);
    container.appendChild(inputEl);
    return container;
  }
  function createSelectInput(label, id, options, value, callback) {
    /* ... Same ... */ const container = document.createElement("div");
    container.className = "property-control";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = `${label}: `;
    const selectEl = document.createElement("select");
    selectEl.id = id;
    options.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.text;
      if (opt.value === value) optionEl.selected = true;
      selectEl.appendChild(optionEl);
    });
    selectEl.addEventListener("change", (e) => callback(e.target.value));
    container.appendChild(labelEl);
    container.appendChild(selectEl);
    return container;
  }
  function createRangeInput(label, id, min, max, step, value, unit, callback) {
    /* ... Same ... */ const container = document.createElement("div");
    container.className = "property-control";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    const valueSpan = document.createElement("span");
    valueSpan.textContent = ` (${value}${unit})`;
    labelEl.textContent = `${label}: `;
    labelEl.appendChild(valueSpan);
    const inputEl = document.createElement("input");
    inputEl.type = "range";
    inputEl.id = id;
    inputEl.min = min;
    inputEl.max = max;
    inputEl.step = step || 1;
    inputEl.value = value;
    inputEl.addEventListener("input", (e) => {
      const newValue = parseFloat(e.target.value);
      valueSpan.textContent = ` (${newValue}${unit})`;
      callback(newValue);
    });
    container.appendChild(labelEl);
    container.appendChild(inputEl);
    return container;
  }
  function createNumberInput(label, id, value, callback, min, max, step) {
    /* ... Same ... */ const container = document.createElement("div");
    container.className = "property-control";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = `${label}: `;
    const inputEl = document.createElement("input");
    inputEl.type = "number";
    inputEl.id = id;
    inputEl.value = value;
    if (min !== undefined) inputEl.min = min;
    if (max !== undefined) inputEl.max = max;
    if (step !== undefined) inputEl.step = step;
    inputEl.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) callback(val);
    });
    inputEl.addEventListener("change", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) callback(val);
      else
        inputEl.value = getLayerById(selectedLayerId)?.[id.split("-")[1]] || 0;
    });
    container.appendChild(labelEl);
    container.appendChild(inputEl);
    return container;
  }
  function updatePropertiesPanel() {
    /* ... Same logic structure, ensure Text Edit UI is correct ... */ propertiesContainer.innerHTML =
      "";
    const selectedLayer = getLayerById(selectedLayerId);
    const toolDefinition = availableTools.find((t) => t.id === activeTool);
    if (toolDefinition && toolDefinition.id === "addText") {
      const toolHeader = document.createElement("h4");
      toolHeader.textContent =
        selectedLayer && selectedLayer.isTextLayer
          ? "Edit Text Layer"
          : "Add New Text Layer";
      propertiesContainer.appendChild(toolHeader);
      let currentTextData =
        selectedLayer && selectedLayer.isTextLayer
          ? { ...selectedLayer.textData }
          : {
              content: "Hello World",
              fontFamily: "Arial",
              fontSize: 48,
              color: "#000000",
            };
      const contentInput = createTextInput(
        "Text:",
        "text-content-input",
        currentTextData.content,
        (val) => (currentTextData.content = val),
      );
      const fontInput = createTextInput(
        "Font Family:",
        "text-font-input",
        currentTextData.fontFamily,
        (val) => (currentTextData.fontFamily = val),
        "Arial, Verdana, sans-serif",
      );
      const sizeInput = createNumberInput(
        "Font Size (px):",
        "text-fontsize-input",
        currentTextData.fontSize,
        (val) => (currentTextData.fontSize = val),
        8,
        200,
      );
      const colorInput = createColorInput(
        "Color:",
        "text-color-input",
        currentTextData.color,
        (val) => (currentTextData.color = val),
      );
      propertiesContainer.appendChild(contentInput);
      propertiesContainer.appendChild(fontInput);
      propertiesContainer.appendChild(sizeInput);
      propertiesContainer.appendChild(colorInput);
      const actionButtonText =
        selectedLayer && selectedLayer.isTextLayer
          ? "Update Text Layer"
          : "Add Text as New Layer";
      propertiesContainer.appendChild(
        createButton(actionButtonText, () => {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.font = `${currentTextData.fontSize}px ${currentTextData.fontFamily}`;
          const textMetrics = tempCtx.measureText(currentTextData.content);
          let actualHeight =
            textMetrics.actualBoundingBoxAscent +
            textMetrics.actualBoundingBoxDescent;
          if (isNaN(actualHeight) || actualHeight === 0)
            actualHeight = currentTextData.fontSize * 1.2;
          tempCanvas.width = Math.ceil(textMetrics.width) + 10;
          tempCanvas.height = Math.ceil(actualHeight) + 10;
          tempCtx.font = `${currentTextData.fontSize}px ${currentTextData.fontFamily}`;
          tempCtx.fillStyle = currentTextData.color;
          tempCtx.textAlign = "left";
          tempCtx.textBaseline = "top";
          tempCtx.fillText(currentTextData.content, 5, 5);
          if (selectedLayer && selectedLayer.isTextLayer) {
            selectedLayer.image = tempCanvas;
            selectedLayer.textData = { ...currentTextData };
            selectedLayer.name = `Text: ${currentTextData.content.substring(0, 10)}...`;
            selectedLayer.originalWidth = tempCanvas.width;
            selectedLayer.originalHeight = tempCanvas.height;
            selectedLayer.width = tempCanvas.width;
            selectedLayer.height = tempCanvas.height;
            selectedLayer.cropWidth = tempCanvas.width;
            selectedLayer.cropHeight = tempCanvas.height;
            updateLayersList();
            renderCanvas();
            saveState();
          } else {
            addImageAsLayer(
              tempCanvas,
              `Text: ${currentTextData.content.substring(0, 10)}...`,
              true,
              { ...currentTextData },
            );
          }
        }),
      );
      return;
    }
    if (!selectedLayer) {
      propertiesContainer.innerHTML =
        '<p class="placeholder-text">Select a layer to see its properties.</p>';
      updateLayerActionButtons();
      return;
    }
    if (activeTool === "select") {
      /* ... Same ... */ const generalHeader = document.createElement("h4");
      generalHeader.textContent = "Layer Properties";
      propertiesContainer.appendChild(generalHeader);
      propertiesContainer.appendChild(
        createNumberInput(
          "X:",
          `layer-x-${selectedLayer.id}`,
          selectedLayer.x,
          (val) => {
            selectedLayer.x = val;
            renderCanvas();
            saveState();
          },
        ),
      );
      propertiesContainer.appendChild(
        createNumberInput(
          "Y:",
          `layer-y-${selectedLayer.id}`,
          selectedLayer.y,
          (val) => {
            selectedLayer.y = val;
            renderCanvas();
            saveState();
          },
        ),
      );
      const widthInputId = `layer-w-${selectedLayer.id}`;
      const heightInputId = `layer-h-${selectedLayer.id}`;
      propertiesContainer.appendChild(
        createNumberInput(
          "Width:",
          widthInputId,
          selectedLayer.width,
          (val) => {
            if (val <= 0) return;
            if (maintainAspectRatio && selectedLayer.aspectRatio) {
              selectedLayer.height = Math.round(
                val / selectedLayer.aspectRatio,
              );
              const heightInput = document.getElementById(heightInputId);
              if (heightInput) heightInput.value = selectedLayer.height;
            }
            selectedLayer.width = val;
            renderCanvas();
            saveState();
          },
          1,
        ),
      );
      propertiesContainer.appendChild(
        createNumberInput(
          "Height:",
          heightInputId,
          selectedLayer.height,
          (val) => {
            if (val <= 0) return;
            if (maintainAspectRatio && selectedLayer.aspectRatio) {
              selectedLayer.width = Math.round(val * selectedLayer.aspectRatio);
              const widthInput = document.getElementById(widthInputId);
              if (widthInput) widthInput.value = selectedLayer.width;
            }
            selectedLayer.height = val;
            renderCanvas();
            saveState();
          },
          1,
        ),
      );
      const aspectToggleContainer = document.createElement("div");
      const aspectCheckbox = document.createElement("input");
      aspectCheckbox.type = "checkbox";
      aspectCheckbox.id = `aspect-lock-select-${selectedLayer.id}`;
      aspectCheckbox.checked = maintainAspectRatio;
      aspectCheckbox.addEventListener("change", (e) => {
        maintainAspectRatio = e.target.checked;
      });
      const aspectLabel = document.createElement("label");
      aspectLabel.htmlFor = `aspect-lock-select-${selectedLayer.id}`;
      aspectLabel.textContent = " Lock Aspect Ratio";
      aspectToggleContainer.appendChild(aspectCheckbox);
      aspectToggleContainer.appendChild(aspectLabel);
      propertiesContainer.appendChild(aspectToggleContainer);
      propertiesContainer.appendChild(
        createRangeInput(
          "Opacity:",
          `layer-opacity-${selectedLayer.id}`,
          0,
          1,
          0.01,
          selectedLayer.opacity,
          "",
          (val) => {
            selectedLayer.opacity = val;
            renderCanvas();
            saveState();
          },
        ),
      );
    }
    if (toolDefinition) {
      const toolHeader = document.createElement("h4");
      toolHeader.textContent = `${toolDefinition.name} Tool`;
      propertiesContainer.appendChild(toolHeader);
      if (
        toolDefinition.type === "filter" ||
        (toolDefinition.type === "effect" && toolDefinition.property)
      ) {
        /* ... Same ... */ propertiesContainer.appendChild(
          createRangeInput(
            toolDefinition.name,
            `filter-${toolDefinition.property}-${selectedLayer.id}`,
            toolDefinition.min,
            toolDefinition.max,
            toolDefinition.unit === "px"
              ? 1
              : toolDefinition.max > 10
                ? 1
                : 0.01,
            selectedLayer.filters[toolDefinition.property],
            toolDefinition.unit,
            (val) => {
              selectedLayer.filters[toolDefinition.property] = val;
              renderCanvas();
              saveState();
            },
          ),
        );
      } else if (toolDefinition.id === "rotate") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createRangeInput(
            "Angle:",
            `layer-rotation-${selectedLayer.id}`,
            -180,
            180,
            1,
            selectedLayer.rotation,
            "°",
            (val) => {
              selectedLayer.rotation = val;
              renderCanvas();
              saveState();
            },
          ),
        );
      } else if (toolDefinition.id === "resize") {
        /* ... Same ... */ const resizeWidthInputId = `resize-w-${selectedLayer.id}`;
        const resizeHeightInputId = `resize-h-${selectedLayer.id}`;
        propertiesContainer.appendChild(
          createNumberInput(
            "Width:",
            resizeWidthInputId,
            selectedLayer.width,
            (val) => {
              if (val <= 0) return;
              if (maintainAspectRatio && selectedLayer.aspectRatio) {
                selectedLayer.height = Math.round(
                  val / selectedLayer.aspectRatio,
                );
                const heightInput =
                  document.getElementById(resizeHeightInputId);
                if (heightInput) heightInput.value = selectedLayer.height;
              }
              selectedLayer.width = val;
              renderCanvas();
              saveState();
            },
            1,
          ),
        );
        propertiesContainer.appendChild(
          createNumberInput(
            "Height:",
            resizeHeightInputId,
            selectedLayer.height,
            (val) => {
              if (val <= 0) return;
              if (maintainAspectRatio && selectedLayer.aspectRatio) {
                selectedLayer.width = Math.round(
                  val * selectedLayer.aspectRatio,
                );
                const widthInput = document.getElementById(resizeWidthInputId);
                if (widthInput) widthInput.value = selectedLayer.width;
              }
              selectedLayer.height = val;
              renderCanvas();
              saveState();
            },
            1,
          ),
        );
        const aspectToggleResize = document.createElement("div");
        const aspectCheckboxResize = document.createElement("input");
        aspectCheckboxResize.type = "checkbox";
        aspectCheckboxResize.id = `aspect-lock-resize-${selectedLayer.id}`;
        aspectCheckboxResize.checked = maintainAspectRatio;
        aspectCheckboxResize.addEventListener("change", (e) => {
          maintainAspectRatio = e.target.checked;
        });
        const aspectLabelResize = document.createElement("label");
        aspectLabelResize.htmlFor = `aspect-lock-resize-${selectedLayer.id}`;
        aspectLabelResize.textContent = " Lock Aspect Ratio";
        aspectToggleResize.appendChild(aspectCheckboxResize);
        aspectToggleResize.appendChild(aspectLabelResize);
        propertiesContainer.appendChild(aspectToggleResize);
        const resetButton = document.createElement("button");
        resetButton.textContent = "Reset to Original Size";
        resetButton.onclick = () => {
          selectedLayer.width = selectedLayer.originalWidth;
          selectedLayer.height = selectedLayer.originalHeight;
          const wInput = document.getElementById(resizeWidthInputId);
          const hInput = document.getElementById(resizeHeightInputId);
          if (wInput) wInput.value = selectedLayer.width;
          if (hInput) hInput.value = selectedLayer.height;
          renderCanvas();
          saveState();
        };
        propertiesContainer.appendChild(resetButton);
      } else if (toolDefinition.id === "flip") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createButton("Flip Horizontal", () => {
            selectedLayer.flipHorizontal = !selectedLayer.flipHorizontal;
            renderCanvas();
            saveState();
          }),
        );
        propertiesContainer.appendChild(
          createButton("Flip Vertical", () => {
            selectedLayer.flipVertical = !selectedLayer.flipVertical;
            renderCanvas();
            saveState();
          }),
        );
      } else if (toolDefinition.id === "tint") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createColorInput(
            "Tint Color:",
            `tint-color-${selectedLayer.id}`,
            selectedLayer.tintColor,
            (val) => {
              selectedLayer.tintColor = val;
              renderCanvas();
              saveState();
            },
          ),
        );
        propertiesContainer.appendChild(
          createRangeInput(
            "Tint Strength:",
            `tint-strength-${selectedLayer.id}`,
            0,
            1,
            0.01,
            selectedLayer.tintStrength,
            "",
            (val) => {
              selectedLayer.tintStrength = val;
              renderCanvas();
              saveState();
            },
          ),
        );
      } else if (toolDefinition.id === "pixelate") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createRangeInput(
            "Pixel Size:",
            `pixelate-size-${selectedLayer.id}`,
            1,
            Math.min(selectedLayer.width, selectedLayer.height) / 2 || 50,
            1,
            selectedLayer.pixelateSize,
            "px",
            (val) => {
              selectedLayer.pixelateSize = Math.max(1, val);
              renderCanvas();
              saveState();
            },
          ),
        );
      } else if (toolDefinition.id === "vignette") {
        /* ... Same ... */ const vgn = selectedLayer.vignette;
        propertiesContainer.appendChild(
          createRangeInput(
            "Strength:",
            `vignette-strength-${selectedLayer.id}`,
            0,
            1,
            0.01,
            vgn.strength,
            "",
            (val) => {
              vgn.strength = val;
              renderCanvas();
              saveState();
            },
          ),
        );
        propertiesContainer.appendChild(
          createColorInput(
            "Color:",
            `vignette-color-${selectedLayer.id}`,
            vgn.color,
            (val) => {
              vgn.color = val;
              renderCanvas();
              saveState();
            },
          ),
        );
        propertiesContainer.appendChild(
          createRangeInput(
            "Extent:",
            `vignette-extent-${selectedLayer.id}`,
            0,
            1,
            0.01,
            vgn.extent,
            "",
            (val) => {
              vgn.extent = val;
              renderCanvas();
              saveState();
            },
          ),
        );
        propertiesContainer.appendChild(
          createRangeInput(
            "Softness:",
            `vignette-softness-${selectedLayer.id}`,
            0.01,
            1,
            0.01,
            vgn.softness,
            "",
            (val) => {
              vgn.softness = val;
              renderCanvas();
              saveState();
            },
          ),
        );
      } else if (toolDefinition.id === "gradientMap") {
        /* ... Same ... */ const gm = selectedLayer.gradientMap;
        const enabledCheckbox = document.createElement("input");
        enabledCheckbox.type = "checkbox";
        enabledCheckbox.checked = gm.enabled;
        enabledCheckbox.id = `gm-enabled-${selectedLayer.id}`;
        const enabledLabel = document.createElement("label");
        enabledLabel.htmlFor = enabledCheckbox.id;
        enabledLabel.textContent = " Enable Gradient Map";
        enabledCheckbox.addEventListener("change", (e) => {
          gm.enabled = e.target.checked;
          renderCanvas();
          updatePropertiesPanel();
          saveState();
        });
        const enabledContainer = document.createElement("div");
        enabledContainer.appendChild(enabledCheckbox);
        enabledContainer.appendChild(enabledLabel);
        propertiesContainer.appendChild(enabledContainer);
        if (gm.enabled) {
          if (!gm.stops || gm.stops.length < 2) {
            gm.stops = [
              { position: 0, color: "#000000" },
              { position: 1, color: "#FFFFFF" },
            ];
          }
          gm.stops.forEach((stop, index) => {
            propertiesContainer.appendChild(document.createElement("hr"));
            const stopHeader = document.createElement("div");
            stopHeader.textContent = `Stop ${index + 1}`;
            propertiesContainer.appendChild(stopHeader);
            propertiesContainer.appendChild(
              createRangeInput(
                `Position:`,
                `gm-stop${index}-pos-${selectedLayer.id}`,
                0,
                1,
                0.01,
                stop.position,
                "",
                (val) => {
                  stop.position = val;
                  gm.stops.sort((a, b) => a.position - b.position);
                  renderCanvas();
                  updatePropertiesPanel();
                  saveState();
                },
              ),
            );
            propertiesContainer.appendChild(
              createColorInput(
                `Color:`,
                `gm-stop${index}-color-${selectedLayer.id}`,
                stop.color,
                (val) => {
                  stop.color = val;
                  renderCanvas();
                  saveState();
                },
              ),
            );
          });
        }
      } else if (toolDefinition.id === "curves") {
        /* ... Same ... */ const curves = selectedLayer.curves;
        const enabledCheckbox = document.createElement("input");
        enabledCheckbox.type = "checkbox";
        enabledCheckbox.checked = curves.enabled;
        enabledCheckbox.id = `curves-enabled-${selectedLayer.id}`;
        const enabledLabel = document.createElement("label");
        enabledLabel.htmlFor = enabledCheckbox.id;
        enabledLabel.textContent = " Enable Curves";
        enabledCheckbox.addEventListener("change", (e) => {
          curves.enabled = e.target.checked;
          renderCanvas();
          updatePropertiesPanel();
          saveState();
        });
        const enabledContainer = document.createElement("div");
        enabledContainer.appendChild(enabledCheckbox);
        enabledContainer.appendChild(enabledLabel);
        propertiesContainer.appendChild(enabledContainer);
        if (curves.enabled) {
          propertiesContainer.appendChild(document.createElement("hr"));
          const pointLabels = [
            "Shadows",
            "Dark Mid",
            "Midtones",
            "Light Mid",
            "Highlights",
          ];
          curves.rgb.forEach((point, index) => {
            if (index < pointLabels.length) {
              const pointContainer = document.createElement("div");
              pointContainer.className = "curve-point-control";
              pointContainer.textContent = `${pointLabels[index]}: `;
              const inputLabel = document.createElement("span");
              inputLabel.textContent = ` In: ${point.input}`;
              const outputInput = createNumberInput(
                `Out:`,
                `curves-rgb-${index}-output-${selectedLayer.id}`,
                point.output,
                (val) => {
                  point.output = Math.max(0, Math.min(255, val));
                  renderCanvas();
                  saveState();
                },
                0,
                255,
                1,
              );
              outputInput.querySelector("input").style.width = "60px";
              outputInput.querySelector("label").style.marginRight = "5px";
              pointContainer.appendChild(inputLabel);
              pointContainer.appendChild(outputInput);
              propertiesContainer.appendChild(pointContainer);
            }
          });
          propertiesContainer.appendChild(document.createElement("hr"));
          propertiesContainer.appendChild(
            createButton("Reset Curve", () => {
              selectedLayer.curves.rgb = [
                { input: 0, output: 0 },
                { input: 64, output: 48 },
                { input: 128, output: 128 },
                { input: 192, output: 208 },
                { input: 255, output: 255 },
              ];
              renderCanvas();
              updatePropertiesPanel();
              saveState();
            }),
          );
        }
      } else if (toolDefinition.id === "crop") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createNumberInput(
            "Crop X:",
            `crop-x-${selectedLayer.id}`,
            selectedLayer.cropX,
            (val) => {
              selectedLayer.cropX = Math.max(
                0,
                Math.min(val, selectedLayer.originalWidth - 1),
              );
              renderCanvas();
              updatePropertiesPanel();
              saveState();
            },
            0,
            selectedLayer.originalWidth - 1,
          ),
        );
        propertiesContainer.appendChild(
          createNumberInput(
            "Crop Y:",
            `crop-y-${selectedLayer.id}`,
            selectedLayer.cropY,
            (val) => {
              selectedLayer.cropY = Math.max(
                0,
                Math.min(val, selectedLayer.originalHeight - 1),
              );
              renderCanvas();
              updatePropertiesPanel();
              saveState();
            },
            0,
            selectedLayer.originalHeight - 1,
          ),
        );
        propertiesContainer.appendChild(
          createNumberInput(
            "Crop Width:",
            `crop-w-${selectedLayer.id}`,
            selectedLayer.cropWidth,
            (val) => {
              selectedLayer.cropWidth = Math.max(
                1,
                Math.min(
                  val,
                  selectedLayer.originalWidth - selectedLayer.cropX,
                ),
              );
              renderCanvas();
              updatePropertiesPanel();
              saveState();
            },
            1,
            selectedLayer.originalWidth,
          ),
        );
        propertiesContainer.appendChild(
          createNumberInput(
            "Crop Height:",
            `crop-h-${selectedLayer.id}`,
            selectedLayer.cropHeight,
            (val) => {
              selectedLayer.cropHeight = Math.max(
                1,
                Math.min(
                  val,
                  selectedLayer.originalHeight - selectedLayer.cropY,
                ),
              );
              renderCanvas();
              updatePropertiesPanel();
              saveState();
            },
            1,
            selectedLayer.originalHeight,
          ),
        );
        propertiesContainer.appendChild(
          createSelectInput(
            "Crop Shape:",
            `crop-shape-${selectedLayer.id}`,
            [
              { value: "none", text: "Rectangle" },
              { value: "circle", text: "Circle" },
              { value: "ellipse", text: "Ellipse" },
            ],
            selectedLayer.cropShape,
            (val) => {
              selectedLayer.cropShape = val;
              renderCanvas();
              saveState();
            },
          ),
        );
        propertiesContainer.appendChild(document.createElement("hr"));
        propertiesContainer.appendChild(
          createButton("Reset Crop to Full Image", () => {
            selectedLayer.cropX = 0;
            selectedLayer.cropY = 0;
            selectedLayer.cropWidth = selectedLayer.originalWidth;
            selectedLayer.cropHeight = selectedLayer.originalHeight;
            renderCanvas();
            updatePropertiesPanel();
            saveState();
          }),
        );
      }
    }
    updateLayerActionButtons();
  }

  // --- Export Functionality --- (Same as before)
  function exportImage() {
    /* ... Same ... */ if (!canvas || layers.length === 0) {
      alert("Nothing to export. Add some images first.");
      return;
    }
    const format = exportFormatSelect.value;
    const quality = parseFloat(exportQualitySlider.value);
    const filename = `transformed-image.${format.split("/")[1] === "pdf" ? "pdf" : format.split("/")[1]}`;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = currentCanvasWidth;
    exportCanvas.height = currentCanvasHeight;
    const exportCtx = exportCanvas.getContext("2d");
    layers.forEach((layer) => {
      if (layer.visible && (layer.image || layer.textCanvas)) {
        exportCtx.save();
        exportCtx.globalAlpha = layer.opacity;
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;
        exportCtx.translate(centerX, centerY);
        if (layer.rotation) exportCtx.rotate((layer.rotation * Math.PI) / 180);
        if (layer.flipHorizontal) exportCtx.scale(-1, 1);
        if (layer.flipVertical) exportCtx.scale(1, -1);
        exportCtx.translate(-centerX, -centerY);
        if (layer.cropShape && layer.cropShape !== "none") {
          exportCtx.beginPath();
          if (layer.cropShape === "circle") {
            exportCtx.arc(
              layer.x + layer.width / 2,
              layer.y + layer.height / 2,
              Math.min(layer.width, layer.height) / 2,
              0,
              Math.PI * 2,
            );
          } else if (layer.cropShape === "ellipse") {
            exportCtx.ellipse(
              layer.x + layer.width / 2,
              layer.y + layer.height / 2,
              layer.width / 2,
              layer.height / 2,
              0,
              0,
              Math.PI * 2,
            );
          }
          exportCtx.clip();
        }
        let currentImageSource = layer.image;
        if (layer.curves.enabled && layer.curves.rgb.length > 0) {
          currentImageSource = applyCurvesToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.curves,
          );
        }
        if (layer.gradientMap.enabled && layer.gradientMap.stops.length >= 2) {
          currentImageSource = applyGradientMapToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.gradientMap.stops,
          );
        }
        if (layer.filters.noise > 0) {
          currentImageSource = applyNoiseToImage(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.filters.noise,
          );
        }
        if (layer.pixelateSize > 1) {
          currentImageSource = applyPixelate(
            currentImageSource,
            layer.cropWidth,
            layer.cropHeight,
            layer.pixelateSize,
          );
        }
        let filterString = "";
        filterString += `brightness(${layer.filters.brightness}%) `;
        filterString += `contrast(${layer.filters.contrast}%) `;
        filterString += `saturate(${layer.filters.saturate}%) `;
        filterString += `grayscale(${layer.filters.grayscale}%) `;
        filterString += `sepia(${layer.filters.sepia}%) `;
        filterString += `invert(${layer.filters.invert}%) `;
        if (layer.filters.blur > 0)
          filterString += `blur(${layer.filters.blur}px) `;
        if (layer.filters.sharpen > 0) {
          filterString += `contrast(${100 + layer.filters.sharpen / 2}%) brightness(${100 - layer.filters.sharpen / 10}%) `;
        }
        exportCtx.filter =
          filterString.trim() === "" ? "none" : filterString.trim();
        exportCtx.drawImage(
          currentImageSource,
          currentImageSource === layer.image ? layer.cropX : 0,
          currentImageSource === layer.image ? layer.cropY : 0,
          layer.cropWidth,
          layer.cropHeight,
          layer.x,
          layer.y,
          layer.width,
          layer.height,
        );
        exportCtx.filter = "none";
        if (layer.tintStrength > 0 && layer.tintColor !== "rgba(0,0,0,0)") {
          exportCtx.globalAlpha = layer.opacity * layer.tintStrength;
          exportCtx.fillStyle = layer.tintColor;
          exportCtx.fillRect(layer.x, layer.y, layer.width, layer.height);
        }
        if (layer.vignette.strength > 0) {
          const vgn = layer.vignette;
          const gradX = layer.x + layer.width / 2;
          const gradY = layer.y + layer.height / 2;
          const outerRadius = Math.sqrt(
            Math.pow(layer.width / 2, 2) + Math.pow(layer.height / 2, 2),
          );
          const innerRadius = outerRadius * (1 - vgn.extent);
          const gradient = exportCtx.createRadialGradient(
            gradX,
            gradY,
            innerRadius,
            gradX,
            gradY,
            outerRadius,
          );
          const transparentColor = `rgba(${hexToRgb(vgn.color).r}, ${hexToRgb(vgn.color).g}, ${hexToRgb(vgn.color).b}, 0)`;
          const opaqueColor = `rgba(${hexToRgb(vgn.color).r}, ${hexToRgb(vgn.color).g}, ${hexToRgb(vgn.color).b}, ${vgn.strength})`;
          gradient.addColorStop(0, transparentColor);
          gradient.addColorStop(vgn.softness, transparentColor);
          gradient.addColorStop(1, opaqueColor);
          exportCtx.fillStyle = gradient;
          exportCtx.fillRect(layer.x, layer.y, layer.width, layer.height);
        }
        exportCtx.restore();
      }
    });
    if (format === "application/pdf") {
      try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
          alert("jsPDF library not loaded. Cannot export to PDF.");
          return;
        }
        const imgData = exportCanvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation:
            currentCanvasWidth > currentCanvasHeight ? "landscape" : "portrait",
          unit: "px",
          format: [currentCanvasWidth, currentCanvasHeight],
        });
        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          currentCanvasWidth,
          currentCanvasHeight,
        );
        pdf.save(filename);
      } catch (e) {
        console.error("Error exporting PDF:", e);
        alert("Error exporting to PDF. Check console for details.");
      }
    } else {
      const dataURL = exportCanvas.toDataURL(format, quality);
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // --- Event Listeners & Initialization ---
  addImageBtn.addEventListener("click", () => {
    imageFileInput.click();
  });
  imageFileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        if (file.type.startsWith("image/")) addImageAsLayer(file);
        else alert(`${file.name} is not a recognized image type.`);
      }
      imageFileInput.value = null;
    }
  });
  exportImageBtn.addEventListener("click", exportImage);
  applyCanvasSizeBtn.addEventListener("click", handleUpdateCanvasSize);
  exportFormatSelect.addEventListener("change", (e) => {
    const format = e.target.value;
    if (format === "image/jpeg" || format === "image/webp") {
      exportQualityControl.style.display = "block";
    } else {
      exportQualityControl.style.display = "none";
    }
  });
  exportQualitySlider.addEventListener("input", (e) => {
    exportQualityValue.textContent = parseFloat(e.target.value).toFixed(2);
  });
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  duplicateLayerBtn.addEventListener("click", duplicateSelectedLayer);
  moveLayerUpBtn.addEventListener("click", () => moveSelectedLayer(1));
  moveLayerDownBtn.addEventListener("click", () => moveSelectedLayer(-1));
  zoomInBtn.addEventListener("click", zoomIn);
  zoomOutBtn.addEventListener("click", zoomOut);
  zoomFitBtn.addEventListener("click", () => {
    zoomFit();
    saveState(); /* User initiated fit */
  });

  document.addEventListener("keydown", (e) => {
    const isInputFocused =
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.isContentEditable;
    if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if (e.key.toLowerCase() === "y" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      redo();
      return;
    }
    if (isInputFocused && e.key !== "Escape") return;
    const tool = availableTools.find((t) => t.shortcut === e.key.toLowerCase());
    if (tool) {
      e.preventDefault();
      setActiveTool(tool.id);
      return;
    }
    if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      exportImageBtn.click();
      return;
    }
    if (e.key.toLowerCase() === "o" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      addImageBtn.click();
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomIn();
      return;
    } // Zoom In
    if (e.key === "-") {
      e.preventDefault();
      zoomOut();
      return;
    } // Zoom Out
    if (e.key === "0") {
      e.preventDefault();
      zoomFit();
      saveState();
      return;
    } // Zoom Fit

    if (selectedLayerId !== null) {
      const layer = getLayerById(selectedLayerId);
      if (!layer) return;
      let needsRender = false;
      let needsSave = false;
      switch (e.key) {
        case "ArrowUp":
          if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            layer.y -= e.shiftKey ? 10 : 1;
            needsRender = true;
            needsSave = true;
          }
          break;
        case "ArrowDown":
          if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            layer.y += e.shiftKey ? 10 : 1;
            needsRender = true;
            needsSave = true;
          }
          break;
        case "ArrowLeft":
          if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            layer.x -= e.shiftKey ? 10 : 1;
            needsRender = true;
            needsSave = true;
          }
          break;
        case "ArrowRight":
          if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            layer.x += e.shiftKey ? 10 : 1;
            needsRender = true;
            needsSave = true;
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (
            confirm(`Are you sure you want to delete layer "${layer.name}"?`)
          ) {
            deleteLayer(selectedLayerId);
          }
          break;
        case "d":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            duplicateSelectedLayer();
          }
          break;
        case "[":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            moveSelectedLayer(-1);
          }
          break;
        case "]":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            moveSelectedLayer(1);
          }
          break;
        case ",":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            toggleLayerVisibility(selectedLayerId);
          }
          break;
      }
      if (needsRender) renderCanvas();
      if (needsSave) {
        updatePropertiesPanel();
        saveState();
      }
    }
  });

  function init() {
    initializeCanvas();
    populateTools();
    updateLayersList();
    updatePropertiesPanel();
    setActiveTool("select");
    exportQualityValue.textContent = parseFloat(
      exportQualitySlider.value,
    ).toFixed(2);
    updateUndoRedoButtons();
    updateLayerActionButtons(); // Ensure these are set correctly on init
  }
  init();
});
