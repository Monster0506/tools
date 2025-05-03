document.addEventListener("DOMContentLoaded", () => {
  // Keep references to elements needed frequently or across functions
  const doiInput = document.getElementById("doiInput");
  const extractButton = document.getElementById("extractButton");
  const outputArea = document.getElementById("outputArea");
  const metadataOutput = outputArea.querySelector(".metadata-output"); // Used in multiple places
  const coreMetadataContainer = metadataOutput.querySelector(
    // Get this once
    ".core-metadata-container",
  );
  const rawOutput = outputArea.querySelector(".raw-output");
  const rawJsonPre = rawOutput.querySelector(".raw-json");
  const errorSection = document.querySelector(".error-section");
  const errorMessage = errorSection.querySelector(".error-message");

  // Add event listener to the extract button
  extractButton.addEventListener("click", handleExtractClick);

  // Allow extraction on pressing Enter key
  doiInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleExtractClick();
    }
  });

  // Add event listeners to expandable headers dynamically
  // This avoids relying on global section variables
  document.querySelectorAll(".expandable-header").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.closest(".expandable-section"); // Find parent section
      if (section) {
        toggleExpandable(section); // Pass the specific section element
      }
    });
  });

  async function handleExtractClick() {
    const doi = doiInput.value.trim(); // Get DOI from input

    // --- UI Reset and Preparation ---
    clearOutput(); // Clear previous results and hide sections
    hideError(); // Hide any previous error messages
    showLoading(); // Show loading state on the button

    // --- Input Validation ---
    if (!doi) {
      displayError("Please enter a DOI."); // Show error if input is empty
      hideLoading(); // Hide loading state
      return; // Stop execution
    }

    // --- API Call Preparation ---
    const normalizedDoi = normalizeDoi(doi); // Normalize the DOI format
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(normalizedDoi)}`; // Construct the API URL, ensuring DOI is properly encoded

    // --- Fetch Data and Handle Response ---
    try {
      const response = await fetch(apiUrl); // Make the API request

      // --- Handle HTTP Errors ---
      if (!response.ok) {
        // Check for specific common errors
        if (response.status === 404) {
          displayError(`DOI not found: ${normalizedDoi}`); // Specific message for 404
        } else if (response.status === 400) {
          displayError(
            `Bad Request: Check the format of the DOI (${normalizedDoi}).`,
          ); // Specific message for 400
        } else {
          // Generic message for other HTTP errors
          displayError(
            `Error fetching data: ${response.status} ${response.statusText}`,
          );
        }
        hideLoading(); // Hide loading state on error
        return; // Stop execution on error
      }

      // --- Process Successful Response ---
      const data = await response.json(); // Parse the JSON response body

      // Check if the API call was successful according to CrossRef's status
      if (data.status === "ok" && data.message) {
        // Call functions to display different parts of the metadata
        displayCoreMetadata(data.message);
        displayAuthors(data.message.author);
        displayReferences(data.message.reference);
        displayFunders(data.message.funder);
        displayLicenses(data.message.license);
        displayLinks(data.message.link, data.message.resource); // Pass both link types
        displayUpdates(data.message["update-to"], data.message["updated-by"]); // Pass both update types
        displayRawJson(data); // Display the full raw JSON response

        showOutput(); // Make the output area visible
      } else {
        // Handle cases where the response is OK (200) but CrossRef status indicates an issue
        const errorMessage =
          data.message?.[0]?.message ||
          "Could not retrieve valid metadata for this DOI.";
        displayError(errorMessage);
      }
    } catch (error) {
      // --- Handle Network or Parsing Errors ---
      console.error("Fetch error:", error); // Log the full error to the console

      // Check if it's a TypeError (often indicates network issues or CORS problems)
      if (error instanceof TypeError) {
        displayError(
          "Network error: Could not connect to the CrossRef API. Please check your connection or try again later.",
        );
      } else {
        // Generic error for other issues during fetch/processing
        displayError("An unexpected error occurred while fetching data.");
      }
    } finally {
      // --- Cleanup ---
      // This block always runs, regardless of success or error
      hideLoading(); // Ensure loading state is always removed
    }
  }

  function normalizeDoi(doi) {
    // ... (no changes needed)
    let normalized = doi;
    if (normalized.startsWith("https://")) normalized = normalized.slice(8);
    if (normalized.startsWith("http://")) normalized = normalized.slice(7);
    if (normalized.startsWith("dx.")) normalized = normalized.slice(3);
    if (normalized.startsWith("doi.org/")) normalized = normalized.slice(8);
    return normalized;
  }

  function displayCoreMetadata(metadata) {
    if (!coreMetadataContainer) {
      console.error("Error: Could not find .core-metadata-container");
      return;
    }

    let html = "";

    const fullJournal = Array.isArray(metadata["container-title"])
      ? metadata["container-title"].join(", ") // Join if array
      : metadata["container-title"] || "N/A"; // Use directly or fallback

    const shortJournal = Array.isArray(metadata["short-container-title"])
      ? metadata["short-container-title"].join(", ")
      : metadata["short-container-title"] || "N/A";

    const volume = metadata.volume || "N/A";
    const issue = metadata.issue || "N/A";

    const year =
      metadata.issued &&
      metadata.issued["date-parts"] &&
      Array.isArray(metadata.issued["date-parts"][0]) &&
      metadata.issued["date-parts"][0].length > 0
        ? metadata.issued["date-parts"][0][0] // Get the year part
        : "N/A";

    const title = Array.isArray(metadata.title)
      ? metadata.title.join(" ")
      : metadata.title || "N/A";

    const page = metadata.page || "N/A";

    let firstPage = "N/A";
    let lastPage = "N/A";
    if (page !== "N/A") {
      const pageParts = page.split("-");
      firstPage = pageParts[0].trim();
      if (pageParts.length > 1) {
        lastPage = pageParts[pageParts.length - 1].trim();
      } else {
        lastPage = firstPage;
      }
    }

    const doi = metadata.DOI || "N/A";
    const crossRefURL = metadata.URL || "N/A";

    html += `<p><strong>Full Journal:</strong> ${fullJournal}</p>`;
    html += `<p><strong>Short Journal:</strong> ${shortJournal}</p>`;
    html += `<p><strong>Volume:</strong> ${volume}</p>`;
    html += `<p><strong>Issue:</strong> ${issue}</p>`;
    html += `<p><strong>Year:</strong> ${year}</p>`;
    html += `<p><strong>Article Title:</strong> ${title}</p>`;
    html += `<p><strong>Page(s):</strong> ${page}</p>`; // Display the original full page string
    html += `<p><strong>First Page:</strong> ${firstPage}</p>`;
    html += `<p><strong>Last Page:</strong> ${lastPage}</p>`;

    if (doi !== "N/A") {
      html += `<p><strong>DOI:</strong> <a href="https://doi.org/${doi}" target="_blank">${doi}</a></p>`;
    } else {
      html += `<p><strong>DOI:</strong> ${doi}</p>`;
    }

    if (crossRefURL !== "N/A") {
      html += `<p><strong>CrossRef URL:</strong> <a href="${crossRefURL}" target="_blank">${crossRefURL}</a></p>`;
    } else {
      html += `<p><strong>CrossRef URL:</strong> ${crossRefURL}</p>`;
    }

    // --- Update the DOM ---
    coreMetadataContainer.innerHTML = html; // Set the content of the designated container
  }
  // --- Updated Display Functions ---

  function displayAuthors(authors) {
    // Get section element inside the function
    const authorsSection = document.getElementById("authorsSection");
    if (!authorsSection) {
      console.error("displayAuthors: Could not find #authorsSection");
      return;
    }
    const authorsContent = authorsSection.querySelector(".expandable-content");
    const icon = authorsSection.querySelector(".expand-icon");

    if (!authorsContent || !icon) {
      console.error(
        "displayAuthors: Could not find .expandable-content or .expand-icon within #authorsSection",
      );
      authorsSection.classList.add("hidden"); // Hide if essential parts missing
      return;
    }

    authorsContent.innerHTML = ""; // Clear previous content
    authorsSection.classList.remove("expanded"); // Reset expansion state
    authorsContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    if (authors && Array.isArray(authors) && authors.length > 0) {
      let html = "<ul>";
      authors.forEach((author) => {
        html += "<li>";
        if (author.given && author.family) {
          html += `<strong>Name:</strong> ${author.given} ${author.family}`;
        } else if (author.name) {
          // Handle cases where name is a single string
          html += `<strong>Name:</strong> ${author.name}`;
        } else {
          html += "<strong>Name:</strong> Unknown Author";
        }

        if (author.ORCID) {
          // Ensure ORCID is displayed correctly as a link
          const orcidUrl = author.ORCID.startsWith("http")
            ? author.ORCID
            : `https://orcid.org/${author.ORCID}`;
          html += `<br><strong>ORCID:</strong> <a href="${orcidUrl}" target="_blank">${author.ORCID}</a>`;
        }

        if (
          author.affiliation &&
          Array.isArray(author.affiliation) &&
          author.affiliation.length > 0
        ) {
          html += "<br><strong>Affiliations:</strong>";
          html += "<ul>";
          author.affiliation.forEach((affiliation) => {
            if (affiliation.name) {
              html += `<li>${affiliation.name}</li>`;
            }
          });
          html += "</ul>";
        }
        html += "</li>";
      });
      html += "</ul>";
      authorsContent.innerHTML = html;
      authorsSection.classList.remove("hidden"); // Make section visible
    } else {
      authorsSection.classList.add("hidden"); // Hide section if no authors
    }
  }

  function displayReferences(references) {
    // Get section element inside the function
    const referencesSection = document.getElementById("referencesSection");
    if (!referencesSection) {
      console.error("displayReferences: Could not find #referencesSection");
      return;
    }
    const referencesContent = referencesSection.querySelector(
      ".expandable-content",
    );
    const icon = referencesSection.querySelector(".expand-icon");

    if (!referencesContent || !icon) {
      console.error(
        "displayReferences: Could not find .expandable-content or .expand-icon within #referencesSection",
      );
      referencesSection.classList.add("hidden");
      return;
    }

    referencesContent.innerHTML = ""; // Clear previous content
    referencesSection.classList.remove("expanded"); // Reset expansion state
    referencesContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    if (references && Array.isArray(references) && references.length > 0) {
      let html = "<ul>";
      references.forEach((reference) => {
        html += "<li>";
        let detailsAdded = false; // Track if any detail was added for line breaks

        if (reference["article-title"]) {
          html += `<strong>Article:</strong> ${reference["article-title"]}`;
          detailsAdded = true;
        }
        if (reference["journal-title"]) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Journal:</strong> ${reference["journal-title"]}`;
          detailsAdded = true;
        }
        if (reference.year) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Year:</strong> ${reference.year}`;
          detailsAdded = true;
        }
        if (reference.volume) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Volume:</strong> ${reference.volume}`;
          detailsAdded = true;
        }
        if (reference.issue) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Issue:</strong> ${reference.issue}`;
          detailsAdded = true;
        }
        if (reference["first-page"]) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Page:</strong> ${reference["first-page"]}`;
          detailsAdded = true;
        }
        if (reference.DOI) {
          if (detailsAdded) html += "<br>";
          html += `<strong>DOI:</strong> <a href="https://doi.org/${reference.DOI}" target="_blank">${reference.DOI}</a>`;
          detailsAdded = true;
        }
        if (reference.unstructured) {
          // Fallback for unstructured reference data
          if (detailsAdded) html += "<br>";
          html += `<strong>Details:</strong> ${reference.unstructured}`;
          detailsAdded = true;
        }
        // Add a fallback if no structured data was found at all
        if (!detailsAdded) {
          html += `Unstructured or incomplete reference data. Key: ${reference.key || "N/A"}`;
        }

        html += "</li>";
      });
      html += "</ul>";
      referencesContent.innerHTML = html;
      referencesSection.classList.remove("hidden"); // Make section visible
    } else {
      referencesSection.classList.add("hidden"); // Hide section if no references
    }
  }

  function displayFunders(funders) {
    // Get section element inside the function
    const fundersSection = document.getElementById("fundersSection");
    if (!fundersSection) {
      console.error("displayFunders: Could not find #fundersSection");
      return;
    }
    const fundersContent = fundersSection.querySelector(".expandable-content");
    const icon = fundersSection.querySelector(".expand-icon");

    if (!fundersContent || !icon) {
      console.error(
        "displayFunders: Could not find .expandable-content or .expand-icon within #fundersSection",
      );
      fundersSection.classList.add("hidden");
      return;
    }

    fundersContent.innerHTML = ""; // Clear previous content
    fundersSection.classList.remove("expanded"); // Reset expansion state
    fundersContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    if (funders && Array.isArray(funders) && funders.length > 0) {
      let html = "<ul>";
      funders.forEach((funder) => {
        html += "<li>";
        let detailsAdded = false;
        if (funder.name) {
          html += `<strong>Name:</strong> ${funder.name}`;
          detailsAdded = true;
        }
        if (
          funder.award &&
          Array.isArray(funder.award) &&
          funder.award.length > 0
        ) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Awards:</strong> ${funder.award.join(", ")}`;
          detailsAdded = true;
        }
        if (funder.DOI) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Funder DOI:</strong> <a href="https://doi.org/${funder.DOI}" target="_blank">${funder.DOI}</a>`;
          detailsAdded = true;
        }
        // Add a fallback if no details found
        if (!detailsAdded) {
          html += "Funder information incomplete.";
        }
        html += "</li>";
      });
      html += "</ul>";
      fundersContent.innerHTML = html;
      fundersSection.classList.remove("hidden"); // Make section visible
    } else {
      fundersSection.classList.add("hidden"); // Hide section if no funders
    }
  }

  function displayLicenses(licenses) {
    // Get section element inside the function
    const licensesSection = document.getElementById("licensesSection");
    if (!licensesSection) {
      console.error("displayLicenses: Could not find #licensesSection");
      return;
    }
    const licensesContent = licensesSection.querySelector(
      ".expandable-content",
    );
    const icon = licensesSection.querySelector(".expand-icon");

    if (!licensesContent || !icon) {
      console.error(
        "displayLicenses: Could not find .expandable-content or .expand-icon within #licensesSection",
      );
      licensesSection.classList.add("hidden");
      return;
    }

    licensesContent.innerHTML = ""; // Clear previous content
    licensesSection.classList.remove("expanded"); // Reset expansion state
    licensesContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    if (licenses && Array.isArray(licenses) && licenses.length > 0) {
      let html = "<ul>";
      licenses.forEach((license) => {
        html += "<li>";
        let detailsAdded = false;
        if (license.URL) {
          html += `<strong>URL:</strong> <a href="${license.URL}" target="_blank">${license.URL}</a>`;
          detailsAdded = true;
        }
        if (license.start && license.start["date-parts"]) {
          // Handle date parts array
          const dateStr = license.start["date-parts"][0].join("-");
          if (detailsAdded) html += "<br>";
          html += `<strong>Start Date:</strong> ${new Date(dateStr).toLocaleDateString()}`;
          detailsAdded = true;
        } else if (license.start && license.start["date-time"]) {
          // Handle date-time string
          if (detailsAdded) html += "<br>";
          html += `<strong>Start Date:</strong> ${new Date(license.start["date-time"]).toLocaleDateString()}`;
          detailsAdded = true;
        }
        if (license["delay-in-days"] !== undefined) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Embargo (days):</strong> ${license["delay-in-days"]}`;
          detailsAdded = true;
        }
        if (license["content-version"]) {
          if (detailsAdded) html += "<br>";
          html += `<strong>Content Version:</strong> ${license["content-version"]}`;
          detailsAdded = true;
        }
        // Add a fallback if no details found
        if (!detailsAdded) {
          html += "License information incomplete.";
        }
        html += "</li>";
      });
      html += "</ul>";
      licensesContent.innerHTML = html;
      licensesSection.classList.remove("hidden"); // Make section visible
    } else {
      licensesSection.classList.add("hidden"); // Hide section if no licenses
    }
  }

  function displayLinks(links, resource) {
    // Get section element inside the function
    const linksSection = document.getElementById("linksSection");
    if (!linksSection) {
      console.error("displayLinks: Could not find #linksSection");
      return;
    }
    const linksContent = linksSection.querySelector(".expandable-content");
    const icon = linksSection.querySelector(".expand-icon");

    if (!linksContent || !icon) {
      console.error(
        "displayLinks: Could not find .expandable-content or .expand-icon within #linksSection",
      );
      linksSection.classList.add("hidden");
      return;
    }

    linksContent.innerHTML = ""; // Clear previous content
    linksSection.classList.remove("expanded"); // Reset expansion state
    linksContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    let html = "<ul>";
    let linksFound = false;

    // Add primary resource link if available
    if (resource && resource.primary && resource.primary.URL) {
      html += `<li><strong>Primary Resource:</strong> <a href="${resource.primary.URL}" target="_blank">${resource.primary.URL}</a></li>`;
      linksFound = true;
    }

    // Add other links if available
    if (links && Array.isArray(links) && links.length > 0) {
      links.forEach((link) => {
        if (link.URL) {
          html += "<li>";
          html += `<strong>URL:</strong> <a href="${link.URL}" target="_blank">${link.URL}</a>`;
          if (link["content-type"]) {
            html += `<br><strong>Content Type:</strong> ${link["content-type"]}`;
          }
          if (link["content-version"]) {
            html += `<br><strong>Content Version:</strong> ${link["content-version"]}`;
          }
          if (link["intended-application"]) {
            html += `<br><strong>Intended Application:</strong> ${link["intended-application"]}`;
          }
          html += "</li>";
          linksFound = true;
        }
      });
    }

    html += "</ul>";

    if (linksFound) {
      linksContent.innerHTML = html;
      linksSection.classList.remove("hidden"); // Make section visible
    } else {
      linksSection.classList.add("hidden"); // Hide section if no links found
    }
  }

  function displayUpdates(updateTo, updatedBy) {
    // Get section element inside the function
    const updatesSection = document.getElementById("updatesSection");
    if (!updatesSection) {
      console.error("displayUpdates: Could not find #updatesSection");
      return;
    }
    const updatesContent = updatesSection.querySelector(".expandable-content");
    const icon = updatesSection.querySelector(".expand-icon");

    if (!updatesContent || !icon) {
      console.error(
        "displayUpdates: Could not find .expandable-content or .expand-icon within #updatesSection",
      );
      updatesSection.classList.add("hidden");
      return;
    }

    updatesContent.innerHTML = ""; // Clear previous content
    updatesSection.classList.remove("expanded"); // Reset expansion state
    updatesContent.style.display = "none"; // Ensure content is hidden initially
    icon.textContent = "+"; // Reset icon

    let html = "";
    let updatesFound = false;

    if (updateTo && Array.isArray(updateTo) && updateTo.length > 0) {
      html += "<strong>Updates To:</strong><ul>";
      updateTo.forEach((update) => {
        if (update.DOI) {
          html += `<li><a href="https://doi.org/${update.DOI}" target="_blank">${update.DOI}</a> (Type: ${update.type || "N/A"}, Label: ${update.label || "N/A"}, Updated: ${update.updated?.["date-time"] ? new Date(update.updated["date-time"]).toLocaleDateString() : "N/A"})</li>`;
          updatesFound = true;
        }
      });
      html += "</ul>";
    }

    if (updatedBy && Array.isArray(updatedBy) && updatedBy.length > 0) {
      if (updatesFound) {
        html += "<br>"; // Add a break if both sections exist
      }
      html += "<strong>Updated By:</strong><ul>";
      updatedBy.forEach((update) => {
        if (update.DOI) {
          html += `<li><a href="https://doi.org/${update.DOI}" target="_blank">${update.DOI}</a> (Type: ${update.type || "N/A"}, Label: ${update.label || "N/A"}, Updated: ${update.updated?.["date-time"] ? new Date(update.updated["date-time"]).toLocaleDateString() : "N/A"})</li>`;
          updatesFound = true;
        }
      });
      html += "</ul>";
    }

    if (updatesFound) {
      updatesContent.innerHTML = html;
      updatesSection.classList.remove("hidden"); // Make section visible
    } else {
      updatesSection.classList.add("hidden"); // Hide section if no updates found
    }
  }
  // --- Util Functions ---

  function displayRawJson(data) {
    // Uses global rawJsonPre
    rawJsonPre.textContent = JSON.stringify(data, null, 2);
    // rawOutput.classList.remove('hidden'); // Keep commented unless needed
  }

  function displayError(message) {
    // Uses global error elements
    errorMessage.textContent = message;
    errorSection.classList.remove("hidden");
  }

  function clearOutput() {
    // Clear core metadata
    if (coreMetadataContainer) {
      coreMetadataContainer.innerHTML = "";
    }
    // Clear raw JSON
    rawJsonPre.textContent = "";
    // Hide main areas
    outputArea.classList.add("hidden");
    rawOutput.classList.add("hidden");

    // Hide and collapse expandable sections by ID
    const sectionIds = [
      "authorsSection",
      "referencesSection",
      "fundersSection",
      "licensesSection",
      "linksSection",
      "updatesSection",
    ];

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        section.classList.add("hidden");
        section.classList.remove("expanded");
        const content = section.querySelector(".expandable-content");
        if (content) {
          content.style.display = "none";
          content.innerHTML = ""; // Also clear content
        }
        const icon = section.querySelector(".expand-icon");
        if (icon) {
          icon.textContent = "+";
        }
      }
    });
  }

  function hideError() {
    // Uses global error elements
    errorSection.classList.add("hidden");
    errorMessage.textContent = "";
  }

  function showOutput() {
    // Uses global outputArea
    outputArea.classList.remove("hidden");
  }

  function showLoading() {
    // Uses global extractButton
    extractButton.textContent = "Loading...";
    extractButton.disabled = true;
  }

  function hideLoading() {
    // Uses global extractButton
    extractButton.textContent = "Extract Metadata";
    extractButton.disabled = false;
  }

  // Function to toggle expandable sections (receives the element)
  function toggleExpandable(sectionElement) {
    // No changes needed here, it already receives the element
    const content = sectionElement.querySelector(".expandable-content");
    const icon = sectionElement.querySelector(".expand-icon");

    // Check if elements exist before using them
    if (!content || !icon) {
      console.error(
        "Could not find content or icon for section:",
        sectionElement.id,
      );
      return;
    }

    if (sectionElement.classList.contains("expanded")) {
      content.style.display = "none";
      sectionElement.classList.remove("expanded");
      icon.textContent = "+";
    } else {
      content.style.display = "block";
      sectionElement.classList.add("expanded");
      icon.textContent = "-";
    }
  }
}); // End DOMContentLoaded
