document.addEventListener("DOMContentLoaded", () => {
  const htmlInput = document.getElementById("htmlInput");
  const stripButton = document.getElementById("stripButton");
  const strippedOutput = document.getElementById("strippedOutput");
  const resetButton = document.getElementById("resetButton");
  const copyButton = document.getElementById("copyButton");

  const stripHtml = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText;
  };

  stripButton.addEventListener("click", () => {
    const inputText = htmlInput.value;
    const strippedText = stripHtml(inputText);
    strippedOutput.value = strippedText;
  });

  resetButton.addEventListener("click", () => {
    htmlInput.value = "";
    strippedOutput.value = "";
  });

  copyButton.addEventListener("click", () => {
    strippedOutput.select();
    strippedOutput.setSelectionRange(0, 99999);

    try {
      navigator.clipboard
        .writeText(strippedOutput.value)
        .then(() => {
          console.log("Text copied to clipboard");
          const originalButtonText = copyButton.textContent;
          copyButton.textContent = "Copied!";
          setTimeout(() => {
            copyButton.textContent = originalButtonText;
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          alert("Failed to copy text. Please copy manually.");
        });
    } catch (err) {
      console.error("Failed to copy text using clipboard API: ", err);
      try {
        navigator.clipboard.writeText(strippedOutput.value);
        const originalButtonText = copyButton.textContent;
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = originalButtonText;
        }, 2000);
      } catch (fallbackErr) {
        console.error("Failed to copy text using execCommand: ", fallbackErr);
        alert("Failed to copy text. Please copy manually.");
      }
    }
  });
});
