document.addEventListener("DOMContentLoaded", () => {
  const qrTypeSelect = document.getElementById("qrType");
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
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
          // Basic phone number validation (customize as needed)
          if (!/^\+?\d+$/.test(smsNumber)) {
            throw new Error("Please enter a valid phone number.");
          }

          data = `SMSTO:${smsNumber}:${smsBody || ""}`; // Alternate SMS format:  sms:${smsNumber}?body=${encodeURIComponent(smsBody || "")}
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
      } catch (error) {
        console.error("QR Code generation failed:", error);
        errorMessage.textContent =
          "Failed to generate QR Code. Check console for details.";
        downloadBtn.style.display = "none";
        copyBtn.style.display = "none";
      }
    } else {
      downloadBtn.style.display = "none";
      copyBtn.style.display = "none";
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

  qrTypeSelect.addEventListener("change", updateInputFields);
  generateBtn.addEventListener("click", generateQRCode);
  downloadBtn.addEventListener("click", downloadQRCode);
  copyBtn.addEventListener("click", copyQRCodeToClipboard);

  updateInputFields();
});
