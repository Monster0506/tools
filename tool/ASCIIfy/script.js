// /tool/ASCIIfy/script.js

document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
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

  // --- Helper function to escape HTML special characters ---
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
    // Unicode code point as key, ASCII replacement string as value
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

    // ... add more mappings as needed
  };

  // --- Main processing function ---
  function processText() {
    const inputText = inputArea.value;
    let highlightedHtml = "";
    let cleanedText = "";

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      const charCode = char.charCodeAt(0);

      // Check if the character is within the standard ASCII range (0-127)
      if (charCode >= 0 && charCode <= 127) {
        // It's ASCII
        highlightedHtml += escapeHtml(char);
        cleanedText += char;
      } else {
        // It's Non-ASCII
        // Wrap in a span for highlighting (escape the character itself too)
        highlightedHtml += `<span class="non-ascii">${escapeHtml(char)}</span>`;

        // Check for a smart replacement
        if (asciiReplacements[char]) {
          cleanedText += asciiReplacements[char];
        } else {
          // No specific replacement found, remove the character
          // cleanedText += '?'; // Optional: Fallback to a placeholder
        }
      }
    }

    highlightedOutputCode.innerHTML = highlightedHtml;
    cleanedOutput.value = cleanedText;
  }

  // --- Event Listener for Input Textarea ---
  inputArea.addEventListener("input", processText);

  // --- Event Listener for File Input ---
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      return; // No file selected
    }

    // Check if the file type is plain text
    if (file.type && !file.type.startsWith("text/")) {
      alert("Please upload a valid text file (.txt).");
      // Reset file input value so the change event fires again if needed
      event.target.value = null;
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      inputArea.value = e.target.result;
      // Manually trigger processing after loading file content
      processText();
    };

    reader.onerror = (e) => {
      console.error("File reading error:", e);
      alert("Error reading file.");
    };

    reader.readAsText(file);

    // Reset file input value so the change event fires again for the same file
    event.target.value = null;
  });

  // --- Event Listener for Copy Button ---
  copyButton.addEventListener("click", () => {
    if (!cleanedOutput.value) return; // Don't copy if empty

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

  // --- Event Listener for Download Button ---
  downloadButton.addEventListener("click", () => {
    const textToSave = cleanedOutput.value;
    if (!textToSave) {
      alert("Nothing to download.");
      return;
    }

    // Create a Blob object
    const blob = new Blob([textToSave], { type: "text/plain;charset=utf-8" });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = "asciified_text.txt"; // Set the desired filename
    document.body.appendChild(a); // Append to body (required for Firefox)

    // Programmatically click the anchor
    a.click();

    // Clean up: remove the anchor and revoke the URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // --- Event Listener for Collapsible Section ---
  toggleHighlightButton.addEventListener("click", () => {
    const isExpanded =
      toggleHighlightButton.getAttribute("aria-expanded") === "true";

    // Toggle ARIA attribute
    toggleHighlightButton.setAttribute("aria-expanded", !isExpanded);

    // Toggle class for CSS transition
    highlightContent.classList.toggle("collapsed");

    // Update icon
    toggleIcon.textContent = isExpanded ? "[+]" : "[-]";
  });

  // --- Initial State Setup for Collapsible ---
  // Set initial state based on aria-expanded (optional, if you want it closed by default)
  const initiallyExpanded =
    toggleHighlightButton.getAttribute("aria-expanded") === "true";
  if (!initiallyExpanded) {
    highlightContent.classList.add("collapsed");
    toggleIcon.textContent = "[+]";
  }

  // --- Initial processing (optional) ---
  processText();
});
