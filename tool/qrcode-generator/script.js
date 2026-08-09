document.addEventListener("DOMContentLoaded", () => {
  const qrTypeSelect = document.getElementById("qrType");
  const qrVersionSelect = document.getElementById("qrVersion");
  const qrSizeSelect = document.getElementById("qrSize");
  const qrErrorCorrectionSelect = document.getElementById("qrErrorCorrection");
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const qrCodeContainer = document.getElementById("qrcode");
  const errorMessage = document.getElementById("errorMessage");
  const inputSections = document.querySelectorAll(".input-section");

  const fileInputElement = document.getElementById("fileInput");
  const fileInfoElement = document.getElementById("fileInfo");
  let qrCodeInstance = null;

  const ditherEnabledCheckbox = document.getElementById("ditherEnabled");
  const ditherOptions = document.getElementById("ditherOptions");
  const ditherImageInput = document.getElementById("ditherImageInput");
  const ditherIntensityInput = document.getElementById("ditherIntensity");
  const ditherIntensityValue = document.getElementById("ditherIntensityValue");
  const ditherWarning = document.getElementById("ditherWarning");

  ditherEnabledCheckbox.addEventListener("change", () => {
    ditherOptions.style.display = ditherEnabledCheckbox.checked
      ? "block"
      : "none";
  });
  ditherIntensityInput.addEventListener("input", () => {
    ditherIntensityValue.textContent = ditherIntensityInput.value;
  });

  function applyDithering(data, qr, size) {
    return new Promise((resolve, reject) => {
      const file = ditherImageInput.files[0];
      if (!file) {
        reject(new Error("Select an image to embed before generating."));
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const moduleCount = qr.getModuleCount();
          const version = (moduleCount - 17) / 4;
          const functionMask = QRDither.buildFunctionMask(moduleCount, version);
          const dataModuleCount = QRDither.countDataModules(functionMask);

          const MAX_FLIP_FRACTION = 0.35;
          const intensity = Number(ditherIntensityInput.value) / 100;
          const flipBudget = Math.floor(
            dataModuleCount * intensity * MAX_FLIP_FRACTION,
          );

          const grayGrid = QRDither.sampleImageToGrid(img, moduleCount);
          const { matrix } = QRDither.ditherQRMatrix({
            isDark: (r, c) => qr.isDark(r, c),
            moduleCount,
            version,
            grayGrid,
            flipBudget,
          });

          const quietZoneModules = 4;
          const moduleSize = Math.max(
            1,
            Math.round(size / (moduleCount + quietZoneModules * 2)),
          );
          const ditheredCanvas = QRDither.renderMatrixToCanvas(
            matrix,
            moduleCount,
            moduleSize,
            quietZoneModules,
          );

          qrCodeContainer.innerHTML = "";
          qrCodeContainer.appendChild(ditheredCanvas);

          const scannable = QRDither.verifyScannable(ditheredCanvas, data);
          ditherWarning.textContent =
            scannable === false
              ? "This dithered QR code may not scan reliably. Try lowering the intensity."
              : "";

          resolve();
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load the selected image."));
      };

      img.src = objectUrl;
    });
  }

  function updateInputFields() {
    const selectedType = qrTypeSelect.value;
    inputSections.forEach((section) => {
      section.style.display = "none";
    });
    const sectionToShow = document.getElementById(`input-${selectedType}`);
    if (sectionToShow) {
      sectionToShow.style.display = "block";
    }
  }

  function clearQRCode() {
    qrCodeContainer.innerHTML = "";
    errorMessage.textContent = "";
    ditherWarning.textContent = "";
    downloadBtn.style.display = "none";
    copyBtn.style.display = "none";
    copyLinkBtn.style.display = "none";
    qrCodeInstance = null;
  }

  function formatData() {
    return new Promise((resolve, reject) => {
      const type = qrTypeSelect.value;
      let dataValue = ""; // To hold the final string for QR code

      try {
        switch (type) {
          case "url":
            dataValue = document.getElementById("urlInput").value;
            if (!dataValue || !/^https?:\/\//i.test(dataValue)) {
              throw new Error("Please enter a valid URL (e.g., https://...)");
            }
            resolve(dataValue);
            break;
          case "text":
            dataValue = document.getElementById("textInput").value;
            if (!dataValue) {
              throw new Error("Please enter some text.");
            }
            resolve(dataValue);
            break;
          case "wifi":
            const ssid = document.getElementById("wifiSSID").value;
            const password = document.getElementById("wifiPassword").value;
            const encryption = document.getElementById("wifiEncryption").value;
            if (!ssid) {
              throw new Error("Wi-Fi Network Name (SSID) is required.");
            }
            dataValue = `WIFI:T:${encryption};S:${ssid};${
              password ? `P:${password};` : ""
            };`;
            resolve(dataValue);
            break;
          case "vcard":
            const name = document.getElementById("vcardName").value;
            const phone = document.getElementById("vcardPhone").value;
            const email = document.getElementById("vcardEmail").value;
            const org = document.getElementById("vcardOrg").value;
            if (!name && !phone && !email && !org) {
              throw new Error("Please enter at least one contact detail.");
            }
            dataValue = `BEGIN:VCARD\nVERSION:3.0\n`;
            if (name)
              dataValue += `FN:${name}\nN:${name.split(" ").reverse().join(";")}\n`;
            if (org) dataValue += `ORG:${org}\n`;
            if (phone) dataValue += `TEL;TYPE=CELL:${phone}\n`;
            if (email) dataValue += `EMAIL:${email}\n`;
            dataValue += `END:VCARD`;
            resolve(dataValue);
            break;
          case "email":
            const emailRecipient =
              document.getElementById("emailRecipient").value;
            const emailSubject = document.getElementById("emailSubject").value;
            const emailBody = document.getElementById("emailBody").value;
            if (!emailRecipient) {
              throw new Error("Please enter a recipient email address.");
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)) {
              throw new Error("Please enter a valid recipient email address.");
            }
            dataValue = `MATMSG:TO:${emailRecipient};SUB:${emailSubject || ""};BODY:${
              emailBody || ""
            };;`;
            resolve(dataValue);
            break;
          case "sms":
            const smsNumber = document.getElementById("smsNumber").value;
            const smsBody = document.getElementById("smsBody").value;
            if (!smsNumber) {
              throw new Error("Please enter a phone number.");
            }
            if (!/^\+?\d+$/.test(smsNumber)) {
              throw new Error("Please enter a valid phone number.");
            }
            dataValue = `SMSTO:${smsNumber}:${smsBody || ""}`;
            resolve(dataValue);
            break;
          case "geo":
            const geoLatitude = document.getElementById("geoLatitude").value;
            const geoLongitude = document.getElementById("geoLongitude").value;
            if (!geoLatitude || !geoLongitude) {
              throw new Error("Please enter both latitude and longitude.");
            }
            if (
              !/^-?\d+(\.\d+)?$/.test(geoLatitude) ||
              !/^-?\d+(\.\d+)?$/.test(geoLongitude)
            ) {
              throw new Error("Latitude and longitude must be numeric values.");
            }
            dataValue = `geo:${geoLatitude},${geoLongitude}`;
            resolve(dataValue);
            break;
          case "file":
            const fileInput = document.getElementById("fileInput");
            if (!fileInput.files || fileInput.files.length === 0) {
              throw new Error("Please select a file.");
            }
            const file = fileInput.files[0];
            const MAX_FILE_SIZE = 1.5 * 1024; // 1.5 KB - adjust as needed

            if (file.size > MAX_FILE_SIZE) {
              throw new Error(
                `File too large (${(file.size / 1024).toFixed(2)} KB). Max: ${(
                  MAX_FILE_SIZE / 1024
                ).toFixed(2)} KB.`,
              );
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target.result); // This is the Data URL
            };
            reader.onerror = (error) => {
              console.error("File reading error:", error);
              reject(new Error("Error reading file."));
            };
            reader.readAsDataURL(file);
            // Note: resolve/reject is handled by FileReader callbacks, so no explicit resolve/reject here for the switch case.
            break; // Break from switch, promise will resolve/reject later
          default:
            throw new Error("Invalid QR code type selected.");
        }
        // For synchronous cases that didn't throw:
        // errorMessage.textContent = ""; // Already handled by reject or generateQRCode
      } catch (error) {
        // This catch handles synchronous errors from the switch cases
        reject(error); // Reject the promise with the error
      }
    });
  }

  // --- MODIFIED: generateQRCode is now async ---
  async function generateQRCode() {
    clearQRCode();
    errorMessage.textContent = ""; // Clear previous errors
    successMessage.textContent = "";

    try {
      const data = await formatData(); // Await the promise from formatData

      if (data) {
        // data will be null if formatData promise was rejected before this point
        const qrSize = Number(qrSizeSelect.value);
        const typeNumber = Number(qrVersionSelect.value); // 0 = auto

        let qr;
        try {
          qr = qrcode(typeNumber, qrErrorCorrectionSelect.value);
          qr.addData(data);
          qr.make();
        } catch (genError) {
          if (/overflow/i.test(String(genError && genError.message ? genError.message : genError))) {
            throw new Error(
              'This data doesn\'t fit in the selected QR version. Choose "Auto" or a larger version.',
            );
          }
          throw genError instanceof Error ? genError : new Error(String(genError));
        }

        qrCodeInstance = qr;

        const moduleCount = qr.getModuleCount();
        const quietZoneModules = 4;
        const moduleSize = Math.max(
          1,
          Math.round(qrSize / (moduleCount + quietZoneModules * 2)),
        );
        const matrix = QRDither.buildMatrix(
          (r, c) => qr.isDark(r, c),
          moduleCount,
        );
        const canvas = QRDither.renderMatrixToCanvas(
          matrix,
          moduleCount,
          moduleSize,
          quietZoneModules,
        );
        qrCodeContainer.appendChild(canvas);

        if (ditherEnabledCheckbox.checked) {
          try {
            await applyDithering(data, qr, qrSize);
          } catch (ditherError) {
            console.error("Dithering failed:", ditherError);
            errorMessage.textContent =
              ditherError.message || "Failed to apply dithering.";
            return;
          }
        }

        downloadBtn.style.display = "inline-block";
        if (navigator.clipboard && navigator.clipboard.write) {
          copyBtn.style.display = "inline-block";
        }
        copyLinkBtn.style.display = "inline-block";
      }
      // If data is null/undefined (e.g., promise rejected and caught below), buttons remain hidden
    } catch (error) {
      // Catches rejections from formatData or errors in this function
      console.error("QR Code generation failed:", error);
      errorMessage.textContent = error.message || "Failed to generate QR Code.";
      downloadBtn.style.display = "none";
      copyBtn.style.display = "none";
      copyLinkBtn.style.display = "none";
    }
  }

  async function copyQRCodeToClipboard() {
    errorMessage.textContent = "";
    successMessage.textContent = "";

    if (!navigator.clipboard || !navigator.clipboard.write) {
      errorMessage.textContent = "Clipboard API not supported by this browser.";
      console.warn("Clipboard API (write) not available.");
      return;
    }

    const canvas = qrCodeContainer.querySelector("canvas");
    if (!canvas) {
      errorMessage.textContent = "Could not find QR code canvas to copy.";
      return;
    }

    console.log("Attempting to create blob from canvas...");
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          errorMessage.textContent = "Failed to convert canvas to blob.";
          console.error("canvas.toBlob callback received null blob.");
          return;
        }

        console.log("Blob created successfully:", blob);
        console.log("Attempting to write blob to clipboard...");

        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);

          console.log("navigator.clipboard.write promise resolved.");
          successMessage.textContent = "QR Code image copied to clipboard!";
          setTimeout(() => {
            successMessage.textContent = "";
          }, 3000);
        } catch (err) {
          console.error("Failed to write to clipboard:", err);
          errorMessage.textContent = `Failed to copy: ${err.name} - ${err.message}. Check console & permissions.`;
          if (err.name === "NotAllowedError") {
            errorMessage.textContent += " Browser permission denied?";
          }
        }
      }, "image/png");
    } catch (err) {
      console.error("Error during canvas.toBlob call setup:", err);
      errorMessage.textContent =
        "An unexpected error occurred during image preparation.";
    }
  }

  function downloadQRCode() {
    if (!qrCodeInstance || !qrCodeContainer.querySelector("canvas")) {
      errorMessage.textContent = "No QR code generated to download.";
      return;
    }

    const canvas = qrCodeContainer.querySelector("canvas");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");

      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "qrcode.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      errorMessage.textContent = "";
    } else {
      errorMessage.textContent = "Could not find QR code canvas to download.";
    }
  }
  function copyShareableLink() {
    const type = qrTypeSelect.value;
    const data = {};

    switch (type) {
      case "url":
        data.url = document.getElementById("urlInput").value;
        break;
      case "text":
        data.text = document.getElementById("textInput").value;
        break;
      case "wifi":
        data.ssid = document.getElementById("wifiSSID").value;
        data.password = document.getElementById("wifiPassword").value;
        data.encryption = document.getElementById("wifiEncryption").value;
        break;
      case "vcard":
        data.name = document.getElementById("vcardName").value;
        data.phone = document.getElementById("vcardPhone").value;
        data.email = document.getElementById("vcardEmail").value;
        data.org = document.getElementById("vcardOrg").value;
        break;
      case "email":
        data.emailRecipient = document.getElementById("emailRecipient").value;
        data.emailSubject = document.getElementById("emailSubject").value;
        data.emailBody = document.getElementById("emailBody").value;
        break;
      case "sms":
        data.smsNumber = document.getElementById("smsNumber").value;
        data.smsBody = document.getElementById("smsBody").value;
        break;
      case "geo":
        data.geoLatitude = document.getElementById("geoLatitude").value;
        data.geoLongitude = document.getElementById("geoLongitude").value;
        break;
    }

    const shareData = { type: type, data: data };

    const jsonString = JSON.stringify(shareData);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const encodedData = compressed;

    const baseUrl = window.location.href.split("#")[0];
    const shareableLink = `${baseUrl}#data:${encodedData}`;

    navigator.clipboard
      .writeText(shareableLink)
      .then(() => {
        successMessage.textContent = "Shareable link copied to clipboard!";
        setTimeout(() => {
          successMessage.textContent = "";
        }, 3000);
      })
      .catch((err) => {
        errorMessage.textContent = "Failed to copy link: " + err;
      });
  }


function populateFromQuery() {
  const params = new URLSearchParams(window.location.search);

  const qr = params.get("qr");
  if (!qr) return;

  const type = params.get("type") || "url";

  qrTypeSelect.value = type;
  updateInputFields();

  try {
    switch (type) {
      case "url":
        document.getElementById("urlInput").value = qr;
        break;
      case "text":
        document.getElementById("textInput").value = qr;
        break;
      case "email":
        document.getElementById("emailRecipient").value = qr;
        break;
      case "sms":
        document.getElementById("smsNumber").value = qr;
        break;
      case "geo":
        const [lat, lon] = qr.split(",");
        document.getElementById("geoLatitude").value = lat || "";
        document.getElementById("geoLongitude").value = lon || "";
        break;

      case "wifi":
      case "vcard": {
        const data = JSON.parse(qr);

        if (type === "wifi") {
          document.getElementById("wifiSSID").value = data.ssid || "";
          document.getElementById("wifiPassword").value = data.password || "";
          document.getElementById("wifiEncryption").value =
            data.encryption || "WPA";
        }

        if (type === "vcard") {
          document.getElementById("vcardName").value = data.name || "";
          document.getElementById("vcardPhone").value = data.phone || "";
          document.getElementById("vcardEmail").value = data.email || "";
          document.getElementById("vcardOrg").value = data.org || "";
        }

        break;
      }
    }

    generateQRCode();
  } catch (e) {
    console.error("Failed to parse query params:", e);
    errorMessage.textContent = "Invalid query parameters.";
  }
}

  function populateFromUrl() {
    const hash = window.location.hash;

    if (hash) {
      const parts = hash.substring(1).split(":");
      if (parts.length === 2 && parts[0] === "data") {
        try {
          const encodedData = parts[1];
          const jsonString =
            LZString.decompressFromEncodedURIComponent(encodedData);
          const decodedData = JSON.parse(jsonString);

          const type = decodedData.type;
          const data = decodedData.data;

          qrTypeSelect.value = type;
          updateInputFields();

          switch (type) {
            case "url":
              document.getElementById("urlInput").value = data.url || "";
              break;
            case "text":
              document.getElementById("textInput").value = data.text || "";
              break;
            case "wifi":
              document.getElementById("wifiSSID").value = data.ssid || "";
              document.getElementById("wifiPassword").value =
                data.password || "";
              document.getElementById("wifiEncryption").value =
                data.encryption || "WPA";
              break;
            case "vcard":
              document.getElementById("vcardName").value = data.name || "";
              document.getElementById("vcardPhone").value = data.phone || "";
              document.getElementById("vcardEmail").value = data.email || "";
              document.getElementById("vcardOrg").value = data.org || "";
              break;
            case "email":
              document.getElementById("emailRecipient").value =
                data.emailRecipient || "";
              document.getElementById("emailSubject").value =
                data.emailSubject || "";
              document.getElementById("emailBody").value = data.emailBody || "";
              break;
            case "sms":
              document.getElementById("smsNumber").value = data.smsNumber || "";
              document.getElementById("smsBody").value = data.smsBody || "";
              break;
            case "geo":
              document.getElementById("geoLatitude").value =
                data.geoLatitude || "";
              document.getElementById("geoLongitude").value =
                data.geoLongitude || "";
              break;
          }

          generateQRCode();
        } catch (e) {
          errorMessage.textContent = "Invalid URL data: " + e;
          console.error("Error parsing URL data:", e);
        }
      }
    }
  }

  qrTypeSelect.addEventListener("change", updateInputFields);
  generateBtn.addEventListener("click", generateQRCode);
  downloadBtn.addEventListener("click", downloadQRCode);
  copyBtn.addEventListener("click", copyQRCodeToClipboard);
  copyLinkBtn.addEventListener("click", copyShareableLink);

  updateInputFields();
  populateFromQuery();
  populateFromUrl();
});
