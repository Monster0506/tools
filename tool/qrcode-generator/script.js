document.addEventListener("DOMContentLoaded", () => {
  const qrTypeSelect = document.getElementById("qrType");
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const qrCodeContainer = document.getElementById("qrcode");
  const errorMessage = document.getElementById("errorMessage");
  const inputSections = document.querySelectorAll(".input-section");
  let qrCodeInstance = null;

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
    downloadBtn.style.display = "none";
    copyBtn.style.display = "none";
    copyLinkBtn.style.display = "none";
    qrCodeInstance = null;
  }

  function formatData() {
    const type = qrTypeSelect.value;
    let data = "";

    try {
      switch (type) {
        case "url":
          data = document.getElementById("urlInput").value;
          if (!data || !data.startsWith("http")) {
            throw new Error("Please enter a valid URL (e.g., https://...)");
          }
          break;
        case "text":
          data = document.getElementById("textInput").value;
          if (!data) {
            throw new Error("Please enter some text.");
          }
          break;
        case "wifi":
          const ssid = document.getElementById("wifiSSID").value;
          const password = document.getElementById("wifiPassword").value;
          const encryption = document.getElementById("wifiEncryption").value;
          if (!ssid) {
            throw new Error("Wi-Fi Network Name (SSID) is required.");
          }
          // Format: WIFI:T:<encryption>;S:<ssid>;P:<password>;;
          data = `WIFI:T:${encryption};S:${ssid};${
            password ? `P:${password};` : ""
          };`;
          break;
        case "vcard":
          const name = document.getElementById("vcardName").value;
          const phone = document.getElementById("vcardPhone").value;
          const email = document.getElementById("vcardEmail").value;
          const org = document.getElementById("vcardOrg").value;
          if (!name && !phone && !email && !org) {
            throw new Error("Please enter at least one contact detail.");
          }
          // Basic vCard Version 3.0 format
          data = `BEGIN:VCARD\nVERSION:3.0\n`;
          if (name)
            data += `FN:${name}\nN:${name.split(" ").reverse().join(";")}\n`;
          if (org) data += `ORG:${org}\n`;
          if (phone) data += `TEL;TYPE=CELL:${phone}\n`;
          if (email) data += `EMAIL:${email}\n`;
          data += `END:VCARD`;
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

          data = `MATMSG:TO:${emailRecipient};SUB:${emailSubject || ""};BODY:${
            emailBody || ""
          };;`;
          break;
        case "sms":
          const smsNumber = document.getElementById("smsNumber").value;
          const smsBody = document.getElementById("smsBody").value;

          if (!smsNumber) {
            throw new Error("Please enter a phone number.");
          }
          // Basic phone number validation
          if (!/^\+?\d+$/.test(smsNumber)) {
            throw new Error("Please enter a valid phone number.");
          }

          data = `SMSTO:${smsNumber}:${smsBody || ""}`;
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

          data = `geo:${geoLatitude},${geoLongitude}`;
          break;
        default:
          throw new Error("Invalid QR code type selected.");
      }
      errorMessage.textContent = "";
      return data;
    } catch (error) {
      errorMessage.textContent = error.message;
      return null;
    }
  }

  function generateQRCode() {
    clearQRCode();
    const data = formatData();

    if (data) {
      try {
        qrCodeInstance = new QRCode(qrCodeContainer, {
          text: data,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
        downloadBtn.style.display = "inline-block";
        copyBtn.style.display = "inline-block";
        copyLinkBtn.style.display = "inline-block";
      } catch (error) {
        console.error("QR Code generation failed:", error);
        errorMessage.textContent =
          "Failed to generate QR Code. Check console for details.";
        downloadBtn.style.display = "none";
        copyBtn.style.display = "none";
        copyLinkBtn.style.display = "none";
      }
    } else {
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
  populateFromUrl();
});
