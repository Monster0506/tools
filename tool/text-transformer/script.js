document.addEventListener("DOMContentLoaded", () => {
  const inputTextarea = document.getElementById("input-text");
  const transformationsContainer = document.getElementById(
    "transformations-container",
  );
  const searchInput = document.getElementById("search-transformations");
  const suggestionsDropdown = document.getElementById("search-suggestions");
  const outputTextareas = {};
  let transformationRegistry = [];
  const parameterValues = {};
  let activeSuggestionIndex = -1;
  let focusedElement = null;

  const morseMap = {
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
    0: "-----",
    " ": "/",
    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "'": ".----.",
    "!": "-.-.--",
    "/": "-..-.",
    "(": "-.--.",
    ")": "-.--.-",
    "&": ".-...",
    ":": "---...",
    ";": "-.-.-.",
    "=": "-...-",
    "+": ".-.-.",
    "-": "-....-",
    _: "..--.-",
    '"': ".-..-.",
    $: "...-..-",
    "@": ".--.-.",
  };
  const reverseMorseMap = Object.fromEntries(
    Object.entries(morseMap).map(([key, value]) => [value, key]),
  );

  const transformationFunctions = {
    transformCountCharacter: (text, params) => {
      const charToCount = params?.charToCount || "a";
      const caseSensitive = params?.caseSensitive || false;
      if (!charToCount) return "0 occurrences";
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(
          charToCount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          flags,
        );
        return (
          (text.match(regex) || []).length.toString() +
          ` occurrences of '${charToCount}'`
        );
      } catch (e) {
        return "Error: Invalid character for regex.";
      }
    },
    transformGenerateLoremIpsum: (_text, params) => {
      const numParagraphs = parseInt(params?.numParagraphs, 10) || 1;
      const singleParagraph =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
      return Array(Math.max(1, numParagraphs))
        .fill(singleParagraph)
        .join("\n\n");
    },
    transformFindReplace: (text, params) => {
      const findString = params?.findString || "";
      const replaceString = params?.replaceString || "";
      const caseSensitive = params?.caseSensitive || false;
      const global = params?.global !== undefined ? params.global : true;
      if (!findString) return text;
      try {
        const flags = (global ? "g" : "") + (caseSensitive ? "" : "i");
        const regex = new RegExp(
          findString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          flags,
        );
        return text.replace(regex, replaceString);
      } catch (e) {
        return "Error: Invalid find string for regex.";
      }
    },
    transformPadStart: (text, params) => {
      const targetLength = parseInt(params?.targetLength, 10) || 0;
      const padString = params?.padString || " ";
      return text.padStart(targetLength, padString);
    },
    transformPadEnd: (text, params) => {
      const targetLength = parseInt(params?.targetLength, 10) || 0;
      const padString = params?.padString || " ";
      return text.padEnd(targetLength, padString);
    },
    transformRepeatText: (text, params) => {
      const repeatCount = parseInt(params?.repeatCount, 10) || 1;
      return text.repeat(Math.max(0, repeatCount));
    },
    transformLowercase: (text, _params) => text.toLowerCase(),
    transformUppercase: (text, _params) => text.toUpperCase(),
    transformTitlecase: (text, _params) =>
      text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
    transformSentencecase: (text, _params) =>
      text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
    transformInvertcase: (text, _params) =>
      text
        .split("")
        .map((char) =>
          char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase(),
        )
        .join(""),
    transformAlternatingcase: (text, _params) =>
      text
        .split("")
        .map((char, i) =>
          i % 2 === 0 ? char.toLowerCase() : char.toUpperCase(),
        )
        .join(""),
    transformCamelcase: (text, _params) =>
      text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => chr.toUpperCase()),
    transformPascalcase: (text, _params) => {
      const camel = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => chr.toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    },
    transformSnakecase: (text, _params) =>
      text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]+/g, "")
        .replace(/__+/g, "_"),
    transformKebabcase: (text, _params) =>
      text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-"),
    transformDotcase: (text, _params) =>
      text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ".")
        .replace(/[^\w.]+/g, "")
        .replace(/\.\.+/g, "."),
    transformBase64Encode: (text, _params) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        let binaryString = "";
        data.forEach((byte) => (binaryString += String.fromCharCode(byte)));
        return btoa(binaryString);
      } catch (e) {
        return "Error: Encode failed.";
      }
    },
    transformBase64Decode: (text, _params) => {
      try {
        const binaryString = atob(text);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      } catch (e) {
        return "Error: Decode failed.";
      }
    },
    transformUrlEncode: (text, _params) => {
      try {
        return encodeURIComponent(text);
      } catch (e) {
        return "Error: Encode failed.";
      }
    },
    transformUrlDecode: (text, _params) => {
      try {
        return decodeURIComponent(text);
      } catch (e) {
        return "Error: Decode failed.";
      }
    },
    transformTextToBinary: (text, _params) => {
      try {
        return text
          .split("")
          .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
          .join(" ");
      } catch (e) {
        return "Error: Conversion failed.";
      }
    },
    transformBinaryToText: (text, _params) => {
      try {
        return text
          .trim()
          .split(" ")
          .map((bin) => {
            const decimal = parseInt(bin, 2);
            if (isNaN(decimal)) throw new Error("Invalid binary");
            return String.fromCharCode(decimal);
          })
          .join("");
      } catch (e) {
        return "Error: Conversion failed.";
      }
    },
    transformEscapeJsString: (text, _params) =>
      text
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t"),
    transformUnescapeJsString: (text, _params) => {
      try {
        return eval(`"${text}"`);
      } catch (e) {
        return "Error: Invalid escaped string.";
      }
    },
    transformRemoveExtraSpaces: (text, _params) =>
      text.trim().replace(/\s+/g, " "),
    transformTrimAllWhitespace: (text, _params) => text.replace(/\s/g, ""),
    transformStripHtml: (text, _params) => {
      const doc = new DOMParser().parseFromString(text, "text/html");
      return doc.body.textContent || "";
    },
    transformHtmlEntityEncode: (text, _params) =>
      text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;"),
    transformHtmlEntityDecode: (text, _params) => {
      try {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
      } catch (e) {
        return "Error: Decode failed.";
      }
    },
    transformTrimLeading: (text, _params) => text.replace(/^\s+/, ""),
    transformTrimTrailing: (text, _params) => text.replace(/\s+$/, ""),
    transformSortLinesAlpha: (text, _params) =>
      text.split("\n").sort().join("\n"),
    transformSortLinesRevAlpha: (text, _params) =>
      text.split("\n").sort().reverse().join("\n"),
    transformRemoveDuplicateLines: (text, _params) =>
      Array.from(new Set(text.split("\n"))).join("\n"),
    transformNumberLines: (text, _params) =>
      text
        .split("\n")
        .map((line, i) => `${i + 1}. ${line}`)
        .join("\n"),
    transformPrefixLines: (text, _params) =>
      text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    transformRemoveBlankLines: (text, _params) =>
      text
        .split("\n")
        .filter((line) => line.trim() !== "")
        .join("\n"),
    transformSplitToCommaLines: (text, _params) => text.split(",").join("\n"),
    transformJoinLinesWithComma: (text, _params) => text.split("\n").join(","),
    transformShuffleLines: (text, _params) => {
      const lines = text.split("\n");
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      return lines.join("\n");
    },
    transformSortLinesNumericAsc: (text, _params) =>
      text
        .split("\n")
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b)
        .join("\n"),
    transformSortLinesNumericDesc: (text, _params) =>
      text
        .split("\n")
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a)
        .join("\n"),
    transformReverseLinesOrder: (text, _params) =>
      text.split("\n").reverse().join("\n"),
    transformReverse: (text, _params) => text.split("").reverse().join(""),
    transformCharCount: (text, _params) => text.length.toString(),
    transformWordCount: (text, _params) =>
      text.trim() === "" ? "0" : text.trim().split(/\s+/).length.toString(),
    transformLineCount: (text, _params) =>
      text === "" ? "0" : text.split("\n").length.toString(),
    transformExtractEmails: (text, _params) => {
      const emails = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
      return emails ? emails.join("\n") : "No emails found.";
    },
    transformExtractUrls: (text, _params) => {
      const urls = text.match(/\b(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi);
      return urls ? urls.join("\n") : "No URLs found.";
    },
    transformSlugify: (text, _params) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-"),
    transformExtractNumbers: (text, _params) =>
      text.match(/-?\d+(\.\d+)?/g)?.join("\n") || "No numbers found.",
    transformUnixTimeToDate: (text, _params) => {
      const num = parseInt(text);
      if (isNaN(num)) return "Error: Invalid timestamp.";
      return new Date(num * 1000).toISOString();
    },
    transformDateToUnixTime: (text, _params) => {
      try {
        const timestamp = Math.floor(new Date(text).getTime() / 1000);
        if (isNaN(timestamp)) return "Error: Invalid date string.";
        return timestamp.toString();
      } catch (e) {
        return "Error: Invalid date format.";
      }
    },
    transformRot13: (text, _params) =>
      text.replace(/[a-zA-Z]/g, (c) => {
        const code = c.charCodeAt(0);
        const start = code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - start + 13) % 26) + start);
      }),
    transformMorseCodeEncode: (text, _params) => {
      if (!text.trim()) return "";
      return text
        .toUpperCase()
        .split("")
        .map((char) => morseMap[char] || "")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");
    },
    transformMorseCodeDecode: (text, _params) => {
      if (!text.trim()) return "";
      return text
        .trim()
        .split(" / ")
        .map((morseWord) =>
          morseWord
            .split(" ")
            .map((morseLetterCode) => reverseMorseMap[morseLetterCode] || "")
            .join(""),
        )
        .join(" ");
    },
    transformSha1Hash: async (text, _params) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-1", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        return "Error: SHA-1 failed.";
      }
    },
    transformSha256Hash: async (text, _params) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        return "Error: SHA-256 failed.";
      }
    },
    transformSha384Hash: async (text, _params) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-384", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        return "Error: SHA-384 failed.";
      }
    },
    transformSha512Hash: async (text, _params) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-512", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        return "Error: SHA-512 failed.";
      }
    },
    transformJsonPrettify: (text, _params) => {
      try {
        if (text.trim() === "") return "";
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch (e) {
        return "Error: Invalid JSON.";
      }
    },
    transformJsonMinify: (text, _params) => {
      try {
        if (text.trim() === "") return "";
        return JSON.stringify(JSON.parse(text));
      } catch (e) {
        return "Error: Invalid JSON.";
      }
    },
    transformJsonValidate: (text, _params) => {
      try {
        if (text.trim() === "") return "Empty input is not valid JSON.";
        JSON.parse(text);
        return "Valid JSON";
      } catch (e) {
        return `Invalid JSON: ${e.message}`;
      }
    },
    transformGenerateUuid: async (_text, _params) => {
      try {
        return crypto.randomUUID();
      } catch (e) {
        return "Error: crypto.randomUUID not available.";
      }
    },
  };

  function createTransformationBlockDOM(transform) {
    const block = document.createElement("div");
    block.className = "transformation-block";
    block.id = `block-${transform.id}`;
    block.dataset.transformId = transform.id;

    const title = document.createElement("h3");
    title.textContent = transform.label;
    block.appendChild(title);

    if (transform.params && transform.params.length > 0) {
      const paramsContainer = document.createElement("div");
      paramsContainer.className = "params-container";

      transform.params.forEach((param) => {
        const paramWrapper = document.createElement("div");
        paramWrapper.className = "param-wrapper";
        if (param.type === "checkbox") {
          paramWrapper.classList.add("checkbox-param");
        }

        const labelEl = document.createElement("label");
        labelEl.htmlFor = `param-${transform.id}-${param.id}`;
        labelEl.textContent = param.label;

        let input;
        if (param.type === "select") {
          input = document.createElement("select");
          (param.options || []).forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.text;
            if (
              String(opt.value) ===
              String(parameterValues[transform.id]?.[param.id])
            ) {
              option.selected = true;
            }
            input.appendChild(option);
          });
        } else {
          input = document.createElement("input");
          input.type = param.type;
          if (param.type === "checkbox") {
            input.checked =
              parameterValues[transform.id]?.[param.id] || param.defaultValue;
          } else {
            input.value =
              parameterValues[transform.id]?.[param.id] || param.defaultValue;
          }
          if (param.placeholder) input.placeholder = param.placeholder;
          if (param.min !== undefined) input.min = param.min;
          if (param.max !== undefined) input.max = param.max;
          if (param.step !== undefined) input.step = param.step;
          if (param.maxLength !== undefined) input.maxLength = param.maxLength;
        }
        input.id = `param-${transform.id}-${param.id}`;
        input.dataset.paramId = param.id;
        input.dataset.transformId = transform.id;

        if (param.type === "checkbox") {
          paramWrapper.appendChild(input);
          paramWrapper.appendChild(labelEl);
        } else {
          paramWrapper.appendChild(labelEl);
          paramWrapper.appendChild(input);
        }
        paramsContainer.appendChild(paramWrapper);

        const eventType =
          param.type === "checkbox" || param.type === "select"
            ? "change"
            : "input";
        input.addEventListener(eventType, (e) => {
          const T_ID = e.target.dataset.transformId;
          const P_ID = e.target.dataset.paramId;
          parameterValues[T_ID][P_ID] =
            e.target.type === "checkbox" ? e.target.checked : e.target.value;
          applySingleTransformation(T_ID);
        });
      });
      block.appendChild(paramsContainer);
    }

    const outputTextarea = document.createElement("textarea");
    outputTextarea.id = `output-${transform.id}`;
    outputTextarea.className = "output-textarea";
    outputTextarea.rows = 3;
    outputTextarea.readOnly = true;
    outputTextarea.tabIndex = -1;
    outputTextareas[transform.id] = outputTextarea;
    block.appendChild(outputTextarea);

    const button = document.createElement("button");
    button.className = "copy-button";
    button.dataset.target = `output-${transform.id}`;
    button.textContent = "Copy";
    button.tabIndex = -1;
    block.appendChild(button);
    return block;
  }

  async function applySingleTransformation(transformId) {
    const transform = transformationRegistry.find((t) => t.id === transformId);
    if (
      !transform ||
      !outputTextareas[transform.id] ||
      typeof transform.func !== "function"
    )
      return;
    const currentText = inputTextarea.value;
    const params = parameterValues[transform.id] || {};
    try {
      let result;
      if (transform.isAsync) {
        outputTextareas[transform.id].value = "Processing...";
        result = await transform.func(currentText, params);
      } else {
        result = transform.func(currentText, params);
      }
      outputTextareas[transform.id].value = result;
    } catch (error) {
      console.error(`Error in transformation ${transform.id}:`, error);
      outputTextareas[transform.id].value = "Error during transformation.";
    }
  }

  async function applyAllTransformations() {
    if (!inputTextarea) return;
    const currentText = inputTextarea.value;
    for (const transform of transformationRegistry) {
      if (
        outputTextareas[transform.id] &&
        typeof transform.func === "function"
      ) {
        const params = parameterValues[transform.id] || {};
        try {
          let result;
          if (transform.isAsync) {
            outputTextareas[transform.id].value = "Processing...";
            result = await transform.func(currentText, params);
          } else {
            result = transform.func(currentText, params);
          }
          outputTextareas[transform.id].value = result;
        } catch (error) {
          console.error(`Error in transformation ${transform.id}:`, error);
          outputTextareas[transform.id].value = "Error during transformation.";
        }
      }
    }
  }

  function renderTransformations(filterText = "") {
    if (!transformationsContainer) return;
    transformationsContainer.innerHTML = "";
    const normalizedFilter = filterText.toLowerCase().trim();
    const filteredRegistry = transformationRegistry.filter(
      (transform) =>
        transform.label.toLowerCase().includes(normalizedFilter) ||
        transform.id.toLowerCase().includes(normalizedFilter) ||
        (transform.category &&
          transform.category.toLowerCase().includes(normalizedFilter)),
    );
    const groupedByCategory = filteredRegistry.reduce((acc, transform) => {
      const category = transform.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(transform);
      return acc;
    }, {});
    const categoryOrder = [
      "Case & Formatting",
      "Encoding & Decoding",
      "Hashing",
      "Structured Data",
      "Whitespace & HTML",
      "Line Operations",
      "Text Manipulation",
      "Data & Utilities",
      "Ciphers",
      "Generators",
    ];
    const sortedCategoryNames = Object.keys(groupedByCategory).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    for (const categoryName of sortedCategoryNames) {
      const transformationsInCategory = groupedByCategory[categoryName];
      if (transformationsInCategory.length === 0) continue;
      const categorySection = document.createElement("section");
      categorySection.className = "category-section";
      categorySection.dataset.categoryName = categoryName;
      const categoryTitle = document.createElement("h2");
      categoryTitle.textContent = categoryName;
      categoryTitle.tabIndex = -1;
      categorySection.appendChild(categoryTitle);
      const categoryGrid = document.createElement("div");
      categoryGrid.className = "category-grid";
      transformationsInCategory.forEach((transform) => {
        if (transform.params && !parameterValues[transform.id]) {
          parameterValues[transform.id] = {};
          transform.params.forEach((p) => {
            parameterValues[transform.id][p.id] =
              p.type === "checkbox" ? p.defaultValue : String(p.defaultValue);
          });
        }
        const blockDOM = createTransformationBlockDOM(transform);
        categoryGrid.appendChild(blockDOM);
      });
      categorySection.appendChild(categoryGrid);
      transformationsContainer.appendChild(categorySection);
    }
    applyAllTransformations();
  }

  function showSuggestions(searchTerm) {
    if (!suggestionsDropdown) return;
    suggestionsDropdown.innerHTML = "";
    activeSuggestionIndex = -1;

    const showAllOnFocus =
      document.activeElement === searchInput && !searchTerm;

    const itemsToFilter = transformationRegistry;
    let suggestedItems = [];

    if (searchTerm) {
      suggestedItems = itemsToFilter
        .filter(
          (transform) =>
            transform.label.toLowerCase().includes(searchTerm) ||
            transform.id.toLowerCase().includes(searchTerm) ||
            (transform.category &&
              transform.category.toLowerCase().includes(searchTerm)),
        )
        .slice(0, 10);
    } else if (showAllOnFocus) {
      suggestedItems = itemsToFilter.slice(0, 10);
    }

    if (suggestedItems.length === 0) {
      suggestionsDropdown.style.display = "none";
      return;
    }

    suggestedItems.forEach((transform) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "suggestion-item";
      itemDiv.dataset.transformId = transform.id;
      itemDiv.dataset.label = transform.label;

      let displayLabel = transform.label;
      if (searchTerm) {
        const matchIndex = displayLabel.toLowerCase().indexOf(searchTerm);
        if (matchIndex > -1) {
          displayLabel = `${displayLabel.substring(0, matchIndex)}<strong>${displayLabel.substring(matchIndex, matchIndex + searchTerm.length)}</strong>${displayLabel.substring(matchIndex + searchTerm.length)}`;
        }
      }
      itemDiv.innerHTML = `${displayLabel} <span class="category-hint">(${transform.category || "General"})</span>`;

      itemDiv.addEventListener("mousedown", (e) => {
        e.preventDefault();
        searchInput.value = transform.label;
        suggestionsDropdown.style.display = "none";
        renderTransformations(transform.label);
        const targetBlock = document.getElementById(`block-${transform.id}`);
        if (targetBlock) {
          setTimeout(() => focusItem(targetBlock), 0);
        }
      });
      suggestionsDropdown.appendChild(itemDiv);
    });
    suggestionsDropdown.style.display = "block";
  }

  function updateActiveSuggestion(items) {
    items.forEach((item, index) => {
      item.classList.toggle(
        "active-suggestion",
        index === activeSuggestionIndex,
      );
      if (index === activeSuggestionIndex)
        item.scrollIntoView({ block: "nearest" });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () =>
      showSuggestions(searchInput.value.toLowerCase().trim()),
    );
    searchInput.addEventListener("focus", () =>
      showSuggestions(searchInput.value.toLowerCase().trim()),
    );
    searchInput.addEventListener("blur", () =>
      setTimeout(() => {
        if (!suggestionsDropdown.matches(":hover")) {
          suggestionsDropdown.style.display = "none";
        }
      }, 150),
    );
    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsDropdown.querySelectorAll(".suggestion-item");
      if (suggestionsDropdown.style.display === "none" || items.length === 0)
        return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeSuggestionIndex =
          (activeSuggestionIndex - 1 + items.length) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestionIndex > -1 && items[activeSuggestionIndex]) {
          items[activeSuggestionIndex].dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true }),
          );
        } else if (searchInput.value.trim()) {
          suggestionsDropdown.style.display = "none";
          renderTransformations(searchInput.value.trim());
        }
      } else if (e.key === "Escape") {
        suggestionsDropdown.style.display = "none";
      }
    });
  }

  function getFocusableItems() {
    return Array.from(
      transformationsContainer.querySelectorAll(
        '.category-section h2[tabindex="-1"], .transformation-block[id^="block-"]',
      ),
    ).filter((el) => el.offsetParent !== null);
  }

  function focusItem(item) {
    if (focusedElement) focusedElement.classList.remove("custom-focus");
    focusedElement = item;
    if (focusedElement) {
      focusedElement.classList.add("custom-focus");
      focusedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (focusedElement.matches(".category-section h2"))
        focusedElement.focus();
    }
  }

  function focusNext(current, direction) {
    const globalFocusableItems = getFocusableItems();
    if (globalFocusableItems.length === 0) return;

    let currentGlobalIndex = current
      ? globalFocusableItems.indexOf(current)
      : -1;
    let nextItem = null;

    if (direction === "home") {
      nextItem = globalFocusableItems[0];
    } else if (direction === "end") {
      nextItem = globalFocusableItems[globalFocusableItems.length - 1];
    } else if (
      current &&
      (direction === "j" ||
        direction === "arrowdown" ||
        direction === "k" ||
        direction === "arrowup")
    ) {
      const parentGrid = current.closest(".category-grid");
      if (parentGrid && current.matches(".transformation-block")) {
        const itemsInGrid = Array.from(
          parentGrid.querySelectorAll(".transformation-block"),
        ).filter((el) => el.offsetParent !== null);
        const currentIndexInGrid = itemsInGrid.indexOf(current);
        const numCols = Math.max(
          1,
          window.getComputedStyle(parentGrid).gridTemplateColumns.split(" ")
            .length,
        );

        if (direction === "j" || direction === "arrowdown") {
          const targetGridIndex = currentIndexInGrid + numCols;
          if (targetGridIndex < itemsInGrid.length) {
            nextItem = itemsInGrid[targetGridIndex];
          } else {
            currentGlobalIndex = globalFocusableItems.indexOf(
              itemsInGrid[itemsInGrid.length - 1],
            );
            nextItem =
              globalFocusableItems[
                (currentGlobalIndex + 1) % globalFocusableItems.length
              ];
          }
        } else if (direction === "k" || direction === "arrowup") {
          const targetGridIndex = currentIndexInGrid - numCols;
          if (targetGridIndex >= 0) {
            nextItem = itemsInGrid[targetGridIndex];
          } else {
            currentGlobalIndex = globalFocusableItems.indexOf(itemsInGrid[0]);
            nextItem =
              globalFocusableItems[
                (currentGlobalIndex - 1 + globalFocusableItems.length) %
                  globalFocusableItems.length
              ];
          }
        }
      }
    }

    if (!nextItem) {
      if (
        currentGlobalIndex === -1 &&
        (direction === "j" ||
          direction === "arrowdown" ||
          direction === "l" ||
          direction === "arrowright")
      ) {
        currentGlobalIndex = 0;
      } else if (
        currentGlobalIndex === -1 &&
        (direction === "k" ||
          direction === "arrowup" ||
          direction === "h" ||
          direction === "arrowleft")
      ) {
        currentGlobalIndex = globalFocusableItems.length - 1;
      } else if (
        direction === "j" ||
        direction === "arrowdown" ||
        direction === "l" ||
        direction === "arrowright"
      ) {
        currentGlobalIndex =
          (currentGlobalIndex + 1) % globalFocusableItems.length;
      } else if (
        direction === "k" ||
        direction === "arrowup" ||
        direction === "h" ||
        direction === "arrowleft"
      ) {
        currentGlobalIndex =
          (currentGlobalIndex - 1 + globalFocusableItems.length) %
          globalFocusableItems.length;
      }
      nextItem = globalFocusableItems[currentGlobalIndex];
    }

    if (nextItem) focusItem(nextItem);
  }

  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const altKey = event.altKey;
    const ctrlKey = event.ctrlKey && !isMac;
    const metaKey = event.metaKey && isMac;
    const activeEl = document.activeElement;
    const isInputFocused =
      activeEl === inputTextarea ||
      activeEl === searchInput ||
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "SELECT" ||
      activeEl.tagName === "TEXTAREA";

    if ((altKey || ctrlKey || metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      inputTextarea.focus();
      if (focusedElement) focusedElement.classList.remove("custom-focus");
      focusedElement = null;
    } else if (
      (ctrlKey && event.key.toLowerCase() === "k") ||
      (altKey && event.key.toLowerCase() === "s")
    ) {
      event.preventDefault();
      searchInput.focus();
      if (focusedElement) focusedElement.classList.remove("custom-focus");
      focusedElement = null;
    } else if (event.key === "Escape") {
      if (suggestionsDropdown.style.display === "block") {
        suggestionsDropdown.style.display = "none";
        event.preventDefault();
      } else if (
        isInputFocused &&
        activeEl !== inputTextarea &&
        activeEl !== searchInput
      ) {
        activeEl.blur();
        if (focusedElement) focusItem(focusedElement);
        event.preventDefault();
      } else if (activeEl === searchInput && searchInput.value !== "") {
        searchInput.value = "";
        renderTransformations();
        event.preventDefault();
      } else if (activeEl === searchInput) {
        searchInput.blur();
        event.preventDefault();
      } else if (focusedElement) {
        focusedElement.classList.remove("custom-focus");
        focusedElement = null;
        inputTextarea.focus();
        event.preventDefault();
      }
    } else if (
      searchInput === activeEl &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      return;
    } else if (!isInputFocused) {
      let keyHandled = true;
      const key = event.key.toLowerCase();
      if (
        !focusedElement &&
        (key === "arrowdown" ||
          key === "j" ||
          key === "arrowright" ||
          key === "l" ||
          key === "home" ||
          key === "end")
      ) {
        focusNext(
          null,
          key === "arrowdown" || key === "j"
            ? "j"
            : key === "arrowright" || key === "l"
              ? "l"
              : key,
        );
      } else if (focusedElement) {
        switch (key) {
          case "j":
          case "arrowdown":
            focusNext(focusedElement, "j");
            break;
          case "k":
          case "arrowup":
            focusNext(focusedElement, "k");
            break;
          case "l":
          case "arrowright":
            focusNext(focusedElement, "l");
            break;
          case "h":
          case "arrowleft":
            focusNext(focusedElement, "h");
            break;
          case "home":
            focusNext(null, "home");
            break;
          case "end":
            focusNext(null, "end");
            break;
          case "enter":
            if (focusedElement.matches(".transformation-block")) {
              const firstParamInput = focusedElement.querySelector(
                ".params-container input, .params-container select",
              );
              if (firstParamInput) firstParamInput.focus();
              else {
                const cb = focusedElement.querySelector(".copy-button");
                if (cb) cb.click();
              }
            }
            break;
          case " ":
            if (focusedElement.matches(".transformation-block")) {
              const cb = focusedElement.querySelector(".copy-button");
              if (cb) cb.click();
            }
            break;
          default:
            keyHandled = false;
            break;
        }
      } else keyHandled = false;
      if (keyHandled) event.preventDefault();
    }
  });

  async function initializeApp() {
    try {
      const response = await fetch(
        "/tool/text-transformer/transformations.json",
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const loadedDefinitions = await response.json();
      transformationRegistry = loadedDefinitions.map((def) => {
        if (!transformationFunctions[def.funcName]) {
          console.warn(`Func "${def.funcName}" not found for "${def.id}".`);
          return { ...def, func: () => `Func ${def.funcName} missing.` };
        }
        if (def.params && def.params.length > 0) {
          parameterValues[def.id] = {};
          def.params.forEach((p) => {
            parameterValues[def.id][p.id] =
              p.type === "checkbox" ? p.defaultValue : String(p.defaultValue);
          });
        }
        return { ...def, func: transformationFunctions[def.funcName] };
      });
      renderTransformations();
      if (inputTextarea)
        inputTextarea.addEventListener("input", () =>
          applyAllTransformations(),
        );
      if (transformationsContainer) {
        transformationsContainer.addEventListener("click", (event) => {
          const button = event.target.closest(".copy-button");
          if (!button) return;
          const targetId = button.dataset.target;
          const targetTextarea = document.getElementById(targetId);
          if (targetTextarea) {
            navigator.clipboard
              .writeText(targetTextarea.value)
              .then(() => {
                const originalText = button.textContent;
                button.textContent = "Copied!";
                button.classList.add("copied");
                setTimeout(() => {
                  button.textContent = originalText;
                  button.classList.remove("copied");
                }, 1500);
              })
              .catch((err) => {
                console.error("Copy failed: ", err);
                alert("Failed to copy.");
              });
          }
        });
      }
      if (inputTextarea && inputTextarea.value) applyAllTransformations();
    } catch (error) {
      console.error("App Init Error:", error);
      if (transformationsContainer)
        transformationsContainer.innerHTML = `<p class="error-message">Error loading. Check console.</p>`;
    }
  }
  initializeApp();
});
