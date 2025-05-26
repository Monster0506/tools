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

  // Canvas Size Controls
  const canvasWidthInput = document.getElementById("canvas-width-input");
  const canvasHeightInput = document.getElementById("canvas-height-input");
  const applyCanvasSizeBtn = document.getElementById("apply-canvas-size-btn");

  // --- State Variables ---
  let layers = [];
  let selectedLayerId = null;
  let nextLayerId = 1;
  let canvas = null;
  let ctx = null;
  // Default Canvas Size Updated
  let currentCanvasWidth = 1024;
  let currentCanvasHeight = 1024;
  const MIN_CANVAS_DIM = 100;
  const MAX_CANVAS_DIM = 4096;

  let maintainAspectRatio = true;
  let draggedLayerElement = null;

  // --- Tools Definition --- (Same as your last version)
  const availableTools = [
    { id: "select", name: "Select/Move", type: "core" },
    { id: "resize", name: "Resize", type: "geometry" },
    { id: "rotate", name: "Rotate", type: "geometry" },
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
    { id: "addText", name: "Add Text", type: "creator" },
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
    { id: "curves", name: "Curves", type: "effect" },
  ];
  let activeTool = "select";

  // --- Canvas Setup ---
  function initializeCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "main-canvas";
    // Set initial size from currentCanvasWidth/Height
    canvas.width = currentCanvasWidth;
    canvas.height = currentCanvasHeight;
    canvasWrapper.appendChild(canvas);
    ctx = canvas.getContext("2d");

    // Update input fields with initial/current canvas size
    canvasWidthInput.value = currentCanvasWidth;
    canvasHeightInput.value = currentCanvasHeight;

    renderCanvas();
  }

  // --- New Function: Update Canvas Size ---
  function handleUpdateCanvasSize() {
    let newWidth = parseInt(canvasWidthInput.value, 10);
    let newHeight = parseInt(canvasHeightInput.value, 10);

    // Validate dimensions
    newWidth = Math.max(MIN_CANVAS_DIM, Math.min(MAX_CANVAS_DIM, newWidth));
    newHeight = Math.max(MIN_CANVAS_DIM, Math.min(MAX_CANVAS_DIM, newHeight));

    // Update input fields with validated values
    canvasWidthInput.value = newWidth;
    canvasHeightInput.value = newHeight;

    // Update global canvas dimension trackers
    currentCanvasWidth = newWidth;
    currentCanvasHeight = newHeight;

    // Update actual canvas element dimensions
    if (canvas) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;
      renderCanvas(); // Re-render with new size
    }
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

  // --- Pixel Manipulation Effect Helpers --- (applyGradientMapToImage, applyPixelate - Same as before)
  function applyGradientMapToImage(
    sourceImage,
    targetWidth,
    targetHeight,
    stopsArray,
  ) {
    /* ... Same ... */
    const tempCanvas = document.createElement("canvas");
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
    /* ... Same ... */
    const tempCanvas = document.createElement("canvas");
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
    const lut = new Uint8Array(256);
    // Ensure points are sorted by input and include 0 and 255 if not present
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
    // Remove duplicate input points, keeping the last one
    const uniquePoints = [];
    const seenInputs = new Set();
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
      if (!seenInputs.has(sortedPoints[i].input)) {
        uniquePoints.unshift(sortedPoints[i]);
        seenInputs.add(sortedPoints[i].input);
      }
    }

    let p = 0; // current point index
    for (let i = 0; i < 256; i++) {
      if (p < uniquePoints.length - 1) {
        if (i > uniquePoints[p + 1].input) {
          p++;
        }
      }
      const p1 = uniquePoints[p];
      const p2 = uniquePoints[p + 1] || p1; // If last point, p2 is same as p1

      if (p1.input === p2.input || i <= p1.input) {
        // At or before first point in segment
        lut[i] = p1.output;
      } else {
        // Interpolate
        const t = (i - p1.input) / (p2.input - p1.input);
        lut[i] = Math.round(p1.output + (p2.output - p1.output) * t);
      }
      lut[i] = Math.max(0, Math.min(255, lut[i])); // Clamp
    }
    return lut;
  }

  // --- Rendering Functions ---
  function renderCanvas() {
    if (!ctx || !canvas) return; // Ensure canvas exists
    // Clear canvas with current dimensions
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboardBackground(); // Uses canvas.width and canvas.height

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

        let currentImageSource = layer.image;
        if (layer.gradientMap.enabled && layer.gradientMap.stops.length >= 2) {
          currentImageSource = applyGradientMapToImage(
            currentImageSource,
            layer.width,
            layer.height,
            layer.gradientMap.stops,
          );
        }
        if (layer.pixelateSize > 1) {
          currentImageSource = applyPixelate(
            currentImageSource,
            layer.width,
            layer.height,
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
          0,
          0,
          currentImageSource.width,
          currentImageSource.height,
          layer.x,
          layer.y,
          layer.width,
          layer.height,
        );
        ctx.filter = "none";

        if (layer.tintStrength > 0 && layer.tintColor !== "rgba(0,0,0,0)") {
          /* ... tint logic ... */ ctx.globalAlpha =
            layer.opacity * layer.tintStrength;
          ctx.fillStyle = layer.tintColor;
          ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
          ctx.globalAlpha = layer.opacity;
        }
        if (layer.vignette.strength > 0) {
          /* ... vignette logic ... */ const vgn = layer.vignette;
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
      /* ... selection outline logic ... */
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
    if (!canvas || !ctx) return;
    const TILE_SIZE = 20;
    // Use current canvas dimensions
    const numTilesX = Math.ceil(canvas.width / TILE_SIZE);
    const numTilesY = Math.ceil(canvas.height / TILE_SIZE);
    for (let r = 0; r < numTilesY; r++) {
      for (let c = 0; c < numTilesX; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#cccccc" : "#ffffff";
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  function applyCurvesToImage(
    sourceImage,
    targetWidth,
    targetHeight,
    curvePoints,
  ) {
    const tempCanvas = document.createElement("canvas");
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
      const lut = generateCurveLUT(curvePoints.rgb); // Assuming points.rgb for combined RGB curve

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent pixels
        data[i] = lut[data[i]]; // Red
        data[i + 1] = lut[data[i + 1]]; // Green
        data[i + 2] = lut[data[i + 2]]; // Blue
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
  // --- Layer Management Functions --- (addImageAsLayer, updateLayersList, etc. - Same as before)
  function addImageAsLayer(fileOrImage, name = "New Layer") {
    const processImage = (img, layerName) => {
      const newLayer = {
        id: nextLayerId++,
        name:
          layerName.length > 20
            ? layerName.substring(0, 17) + "..."
            : layerName,
        image: img,
        x: 50,
        y: 50,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        originalWidth: img.naturalWidth || img.width,
        originalHeight: img.naturalHeight || img.height,
        aspectRatio:
          (img.naturalWidth || img.width) /
          (img.naturalHeight || img.height || 1),
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
          // Default S-curve like points for RGB
          enabled: false,
          rgb: [
            { input: 0, output: 0 }, // Shadow point
            { input: 64, output: 48 }, // Dark midtone
            { input: 128, output: 128 }, // Midpoint
            { input: 192, output: 208 }, // Light midtone
            { input: 255, output: 255 }, // Highlight point
          ],
          // Could add r, g, b arrays here for individual channel curves later
        },
      };
      const maxDim = Math.max(newLayer.width, newLayer.height);
      const canvasMaxDim =
        Math.min(currentCanvasWidth, currentCanvasHeight) * 0.75;
      if (maxDim > canvasMaxDim && newLayer.width > 0 && newLayer.height > 0) {
        const scale = canvasMaxDim / maxDim;
        newLayer.width = Math.round(newLayer.width * scale);
        newLayer.height = Math.round(newLayer.height * scale);
      }
      if (newLayer.width <= 0) newLayer.width = 100;
      if (newLayer.height <= 0) newLayer.height = 50;
      layers.push(newLayer);
      selectLayer(newLayer.id);
    };
    if (fileOrImage instanceof File) {
      /* ... Same ... */ const reader = new FileReader();
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
      const layerName = document.createElement("span");
      layerName.className = "layer-name";
      layerName.textContent = layer.name;
      const visibilityToggle = document.createElement("button");
      visibilityToggle.className = "visibility-toggle";
      visibilityToggle.innerHTML = layer.visible ? "👁️" : "🙈";
      visibilityToggle.title = layer.visible ? "Hide Layer" : "Show Layer";
      visibilityToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLayerVisibility(layer.id);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-layer-btn";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.title = "Delete Layer";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteLayer(layer.id);
      });
      layerItem.appendChild(visibilityToggle);
      layerItem.appendChild(layerName);
      layerItem.appendChild(deleteBtn);
      layerItem.addEventListener("click", () => selectLayer(layer.id));
      layersListContainer.appendChild(layerItem);
    });
  }
  function selectLayer(layerId) {
    /* ... Same ... */ selectedLayerId = layerId;
    updateLayersList();
    renderCanvas();
    updatePropertiesPanel();
  }
  function getLayerById(layerId) {
    /* ... Same ... */ return layers.find((l) => l.id === layerId);
  }
  function toggleLayerVisibility(layerId) {
    /* ... Same ... */ const layer = getLayerById(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      updateLayersList();
      renderCanvas();
    }
  }
  function deleteLayer(layerId) {
    /* ... Same ... */ layers = layers.filter((layer) => layer.id !== layerId);
    if (selectedLayerId === layerId) {
      selectedLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
    }
    updateLayersList();
    renderCanvas();
    updatePropertiesPanel();
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
    /* ... Same ... */ e.preventDefault();
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
    /* ... Same ... */ if (e.target === layersListContainer) {
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
    /* ... Same logic structure, ensure Gradient Map UI is correct ... */
    propertiesContainer.innerHTML = "";
    const selectedLayer = getLayerById(selectedLayerId);
    const toolDefinition = availableTools.find((t) => t.id === activeTool);

    if (
      toolDefinition &&
      toolDefinition.type === "creator" &&
      toolDefinition.id === "addText"
    ) {
      /* ... Same ... */ const toolHeader = document.createElement("h4");
      toolHeader.textContent = `${toolDefinition.name} Tool`;
      propertiesContainer.appendChild(toolHeader);
      let textContent = "Hello World",
        fontFamily = "Arial",
        fontSize = 48,
        textColor = "#000000";
      propertiesContainer.appendChild(
        createTextInput(
          "Text:",
          "text-content-input",
          textContent,
          (val) => (textContent = val),
        ),
      );
      propertiesContainer.appendChild(
        createTextInput(
          "Font Family:",
          "text-font-input",
          fontFamily,
          (val) => (fontFamily = val),
          "Arial, Verdana, sans-serif",
        ),
      );
      propertiesContainer.appendChild(
        createNumberInput(
          "Font Size (px):",
          "text-fontsize-input",
          fontSize,
          (val) => (fontSize = val),
          8,
          200,
        ),
      );
      propertiesContainer.appendChild(
        createColorInput(
          "Color:",
          "text-color-input",
          textColor,
          (val) => (textColor = val),
        ),
      );
      propertiesContainer.appendChild(
        createButton("Add Text as New Layer", () => {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.font = `${fontSize}px ${fontFamily}`;
          const textMetrics = tempCtx.measureText(textContent);
          let actualHeight =
            textMetrics.actualBoundingBoxAscent +
            textMetrics.actualBoundingBoxDescent;
          if (isNaN(actualHeight) || actualHeight === 0)
            actualHeight = fontSize * 1.2;
          tempCanvas.width = Math.ceil(textMetrics.width) + 10;
          tempCanvas.height = Math.ceil(actualHeight) + 10;
          tempCtx.font = `${fontSize}px ${fontFamily}`;
          tempCtx.fillStyle = textColor;
          tempCtx.textAlign = "left";
          tempCtx.textBaseline = "top";
          tempCtx.fillText(textContent, 5, 5);
          addImageAsLayer(
            tempCanvas,
            `Text: ${textContent.substring(0, 10)}...`,
          );
        }),
      );
      return;
    }
    if (!selectedLayer) {
      propertiesContainer.textContent = "Select a layer to see its properties.";
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
        };
        propertiesContainer.appendChild(resetButton);
      } else if (toolDefinition.id === "flip") {
        /* ... Same ... */ propertiesContainer.appendChild(
          createButton("Flip Horizontal", () => {
            selectedLayer.flipHorizontal = !selectedLayer.flipHorizontal;
            renderCanvas();
          }),
        );
        propertiesContainer.appendChild(
          createButton("Flip Vertical", () => {
            selectedLayer.flipVertical = !selectedLayer.flipVertical;
            renderCanvas();
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
            },
          ),
        );
      } else if (toolDefinition.id === "gradientMap") {
        const gm = selectedLayer.gradientMap;
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
          updatePropertiesPanel(); /* Re-render panel to show/hide stops */
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
                  // Ensure stops remain sorted by position for simplicity, or handle complex sorting
                  gm.stops.sort((a, b) => a.position - b.position);
                  renderCanvas();
                  updatePropertiesPanel(); // Re-render to reflect sorted order if positions cross
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
                },
              ),
            );
          });
          // Basic add/remove stop (simplified: only allows 2 stops for now)
          // For more stops, you'd need a dynamic list and more complex UI
        }
      } else if (toolDefinition.id === "curves") {
        const curves = selectedLayer.curves;
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
              // Only show UI for the predefined 5 points
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
                  point.output = Math.max(0, Math.min(255, val)); // Clamp
                  renderCanvas();
                },
                0,
                255,
                1,
              );
              // Make output input smaller
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
              updatePropertiesPanel(); // Refresh UI
            }),
          );
        }
      }
    }
  }

  // --- Export Functionality ---
  function exportImage() {
    /* ... Same, ensure curves are applied ... */
    if (!canvas || layers.length === 0) {
      alert("Nothing to export.");
      return;
    }
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
        let currentImageSource = layer.image;
        if (layer.curves.enabled && layer.curves.rgb.length > 0) {
          currentImageSource = applyCurvesToImage(
            currentImageSource,
            layer.width,
            layer.height,
            layer.curves,
          );
        }
        if (layer.gradientMap.enabled && layer.gradientMap.stops.length >= 2) {
          currentImageSource = applyGradientMapToImage(
            currentImageSource,
            layer.width,
            layer.height,
            layer.gradientMap.stops,
          );
        }
        if (layer.pixelateSize > 1) {
          currentImageSource = applyPixelate(
            currentImageSource,
            layer.width,
            layer.height,
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
          0,
          0,
          currentImageSource.width,
          currentImageSource.height,
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
          exportCtx.globalAlpha = layer.opacity;
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
    const dataURL = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "transformed-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Event Listeners & Initialization ---
  addImageBtn.addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", (event) => {
    /* ... Same ... */ const files = event.target.files;
    if (files) {
      for (const file of files) {
        if (file.type.startsWith("image/")) addImageAsLayer(file);
        else alert(`${file.name} is not a recognized image type.`);
      }
      imageFileInput.value = null;
    }
  });
  exportImageBtn.addEventListener("click", exportImage);
  applyCanvasSizeBtn.addEventListener("click", handleUpdateCanvasSize); // New listener
  document.addEventListener("keydown", (e) => {
    /* ... Same ... */ if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selectedLayerId !== null &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      const layerName = getLayerById(selectedLayerId)?.name || "this layer";
      if (confirm(`Are you sure you want to delete ${layerName}?`))
        deleteLayer(selectedLayerId);
    }
  });

  function init() {
    initializeCanvas(); // This now sets up canvas with new default size
    populateTools();
    updateLayersList();
    updatePropertiesPanel();
    setActiveTool("select");
  }
  init();
});
