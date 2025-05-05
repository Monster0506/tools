document.addEventListener("DOMContentLoaded", () => {
  const inputArea = document.getElementById("inputArea");
  const highlightedOutputContainer =
    document.getElementById("highlightedOutput");
  const highlightedOutputCode =
    highlightedOutputContainer.querySelector("code");
  const cleanedOutput = document.getElementById("cleanedOutput");
  const copyButton = document.getElementById("copyButton");
  const fileInput = document.getElementById("fileInput"); // File input
  const downloadButton = document.getElementById("downloadButton"); // Download button
  const toggleHighlightButton = document.getElementById("toggleHighlight"); // Collapse trigger
  const highlightContent = document.getElementById("highlightContent"); // Collapsible content
  const toggleIcon = toggleHighlightButton.querySelector(".toggle-icon"); // Collapse icon

  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const asciiReplacements = {
    // Spaces and similar
    "\u00A0": " ", // No-Break Space
    "\u2000": " ", // En Quad
    "\u2001": " ", // Em Quad
    "\u2002": " ", // En Space
    "\u2003": " ", // Em Space
    "\u2004": " ", // Three-Per-Em Space
    "\u2005": " ", // Four-Per-Em Space
    "\u2006": " ", // Six-Per-Em Space
    "\u2007": " ", // Figure Space
    "\u2008": " ", // Punctuation Space
    "\u2009": " ", // Thin Space
    "\u200A": " ", // Hair Space
    "\u202F": " ", // Narrow No-Break Space
    "\u205F": " ", // Medium Mathematical Space
    "\u3000": " ", // Ideographic Space

    // Dashes
    "\u2013": "-", // En Dash
    "\u2014": "--", // Em Dash
    "\u2015": "--", // Horizontal Bar (often used like Em Dash)

    // Quotes
    "\u2018": "'", // Left Single Quotation Mark
    "\u2019": "'", // Right Single Quotation Mark
    "\u201C": '"', // Left Double Quotation Mark
    "\u201D": '"', // Right Double Quotation Mark
    "\u201A": ",", // Single Low-9 Quotation Mark
    "\u201E": ",,", // Double Low-9 Quotation Mark
    "\u2039": "<", // Single Left-Pointing Angle Quotation Mark
    "\u203A": ">", // Single Right-Pointing Angle Quotation Mark

    // Special characters
    "\u2026": "...", // Horizontal Ellipsis
    "\u2030": " per mille", // Per Mille Sign
    "\u2032": "'", // Prime
    "\u2033": '"', // Double Prime
    "\u2034": "'''", // Triple Prime
    "\u2035": "`", // Reverse Prime
    "\u2036": "``", // Reverse Double Prime
    "\u2037": "```", // Reverse Triple Prime
    "\u20B9": "Rs", // Indian Rupee Sign (Example, can add more currencies)
    "\u20AC": "EUR", // Euro Sign (Example)
    "\u00A9": "(c)", // Copyright Symbol
    "\u00AE": "(R)", // Registered Symbol
    "\u2122": "(TM)", // Trade Mark Symbol
    "\u00B0": " degrees ", // Degree Symbol (with spaces for clarity)
    "\u00A7": "Sect. ", // Section Sign (Example)
    "\u00B6": "Para. ", // Pilcrow Sign (Paragraph Mark)
    "\u2020": "+", // Dagger
    "\u2021": "++", // Double Dagger
  };

  function processText() {
    const inputText = inputArea.value;
    let highlightedHtml = "";
    let cleanedText = "";

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      const charCode = char.charCodeAt(0);

      if (charCode >= 0 && charCode <= 127) {
        highlightedHtml += escapeHtml(char);
        cleanedText += char;
      } else {
        highlightedHtml += `<span class="non-ascii">${escapeHtml(char)}</span>`;

        if (asciiReplacements[char]) {
          cleanedText += asciiReplacements[char];
        } else {
        }
      }
    }

    highlightedOutputCode.innerHTML = highlightedHtml;
    cleanedOutput.value = cleanedText;
  }

  inputArea.addEventListener("input", processText);

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (file.type && !file.type.startsWith("text/")) {
      alert("Please upload a valid text file (.txt).");
      event.target.value = null;
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      inputArea.value = e.target.result;
      processText();
    };

    reader.onerror = (e) => {
      console.error("File reading error:", e);
      alert("Error reading file.");
    };

    reader.readAsText(file);

    event.target.value = null;
  });

  copyButton.addEventListener("click", () => {
    if (!cleanedOutput.value) return;

    navigator.clipboard
      .writeText(cleanedOutput.value)
      .then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = "Copied!";
        copyButton.classList.add("copied");
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove("copied");
        }, 1500);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        alert("Failed to copy text.");
      });
  });

  downloadButton.addEventListener("click", () => {
    const textToSave = cleanedOutput.value;
    if (!textToSave) {
      alert("Nothing to download.");
      return;
    }

    const blob = new Blob([textToSave], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "asciified_text.txt";
    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  toggleHighlightButton.addEventListener("click", () => {
    const isExpanded =
      toggleHighlightButton.getAttribute("aria-expanded") === "true";

    toggleHighlightButton.setAttribute("aria-expanded", !isExpanded);

    highlightContent.classList.toggle("collapsed");

    toggleIcon.textContent = isExpanded ? "[+]" : "[-]";
  });

  const initiallyExpanded =
    toggleHighlightButton.getAttribute("aria-expanded") === "true";
  if (!initiallyExpanded) {
    highlightContent.classList.add("collapsed");
    toggleIcon.textContent = "[+]";
  }

  processText();
});
