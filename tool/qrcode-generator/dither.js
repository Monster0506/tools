// Error-diffusion image dithering for QR codes.
// Flips a bounded number of non-structural (data/EC) modules toward a
// target image, diffusing the resulting error to neighboring modules
// (Floyd-Steinberg), so forced mismatches get visually compensated.
(function (global) {
  // ISO/IEC 18004 Annex E alignment pattern center coordinates, index = version (1-40).
  const ALIGNMENT_PATTERN_TABLE = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ];

  function buildFunctionMask(moduleCount, version) {
    const mask = Array.from({ length: moduleCount }, () =>
      new Array(moduleCount).fill(false),
    );
    const mark = (r, c) => {
      if (r >= 0 && r < moduleCount && c >= 0 && c < moduleCount) {
        mask[r][c] = true;
      }
    };
    const markBlock = (r0, c0, size) => {
      for (let r = r0; r < r0 + size; r++) {
        for (let c = c0; c < c0 + size; c++) mark(r, c);
      }
    };

    // Finder patterns + separators (8x8 blocks at three corners).
    markBlock(0, 0, 8);
    markBlock(0, moduleCount - 8, 8);
    markBlock(moduleCount - 8, 0, 8);

    // Timing patterns.
    for (let i = 0; i < moduleCount; i++) {
      mark(6, i);
      mark(i, 6);
    }

    // Format info strips (conservative: whole row/col 8).
    for (let i = 0; i < moduleCount; i++) {
      mark(8, i);
      mark(i, 8);
    }

    // Version info blocks (version 7+).
    if (version >= 7) {
      markBlock(0, moduleCount - 11, 6);
      markBlock(moduleCount - 11, 0, 6);
    }

    // Alignment patterns (5x5 blocks at each coordinate pair).
    const positions = ALIGNMENT_PATTERN_TABLE[version] || [];
    for (const r of positions) {
      for (const c of positions) {
        markBlock(r - 2, c - 2, 5);
      }
    }

    // Fixed dark module.
    mark(4 * version + 9, 8);

    return mask;
  }

  function sampleImageToGrid(image, moduleCount) {
    const canvas = document.createElement("canvas");
    canvas.width = moduleCount;
    canvas.height = moduleCount;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, 0, 0, moduleCount, moduleCount);
    const { data } = ctx.getImageData(0, 0, moduleCount, moduleCount);

    const grid = Array.from({ length: moduleCount }, () =>
      new Array(moduleCount).fill(255),
    );
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const i = (r * moduleCount + c) * 4;
        const alpha = data[i + 3] / 255;
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Transparent pixels fall back to white (no ink wanted).
        grid[r][c] = gray * alpha + 255 * (1 - alpha);
      }
    }
    return grid;
  }

  function ditherQRMatrix({ isDark, moduleCount, version, grayGrid, flipBudget }) {
    const functionMask = buildFunctionMask(moduleCount, version);
    const errorGrid = Array.from({ length: moduleCount }, () =>
      new Array(moduleCount).fill(0),
    );
    const finalDark = Array.from({ length: moduleCount }, () =>
      new Array(moduleCount).fill(false),
    );

    let flipsUsed = 0;
    let flipsRequested = 0;

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const requiredDark = isDark(r, c);
        const desiredGray = Math.max(
          0,
          Math.min(255, grayGrid[r][c] + errorGrid[r][c]),
        );
        const desiredDark = desiredGray < 128;

        let chosenDark = requiredDark;
        if (!functionMask[r][c] && desiredDark !== requiredDark) {
          flipsRequested++;
          if (flipsUsed < flipBudget) {
            chosenDark = desiredDark;
            flipsUsed++;
          }
        }
        finalDark[r][c] = chosenDark;

        const actualGray = chosenDark ? 0 : 255;
        const error = desiredGray - actualGray;

        if (c + 1 < moduleCount) errorGrid[r][c + 1] += (error * 7) / 16;
        if (r + 1 < moduleCount) {
          if (c - 1 >= 0) errorGrid[r + 1][c - 1] += (error * 3) / 16;
          errorGrid[r + 1][c] += (error * 5) / 16;
          if (c + 1 < moduleCount) errorGrid[r + 1][c + 1] += (error * 1) / 16;
        }
      }
    }

    return { matrix: finalDark, flipsUsed, flipsRequested };
  }

  function renderMatrixToCanvas(matrix, moduleCount, moduleSize, quietZoneModules) {
    const totalModules = moduleCount + quietZoneModules * 2;
    const canvas = document.createElement("canvas");
    canvas.width = totalModules * moduleSize;
    canvas.height = totalModules * moduleSize;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            (c + quietZoneModules) * moduleSize,
            (r + quietZoneModules) * moduleSize,
            moduleSize,
            moduleSize,
          );
        }
      }
    }
    return canvas;
  }

  function verifyScannable(canvas, expectedText) {
    if (typeof jsQR !== "function") return null; // decoder unavailable, can't verify
    const ctx = canvas.getContext("2d");
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const result = jsQR(data, width, height);
    return !!result && result.data === expectedText;
  }

  function buildMatrix(isDark, moduleCount) {
    const matrix = Array.from({ length: moduleCount }, () =>
      new Array(moduleCount).fill(false),
    );
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        matrix[r][c] = isDark(r, c);
      }
    }
    return matrix;
  }

  function countDataModules(functionMask) {
    let count = 0;
    for (const row of functionMask) {
      for (const isFunction of row) {
        if (!isFunction) count++;
      }
    }
    return count;
  }

  global.QRDither = {
    buildFunctionMask,
    buildMatrix,
    countDataModules,
    sampleImageToGrid,
    ditherQRMatrix,
    renderMatrixToCanvas,
    verifyScannable,
  };
})(window);
