document.addEventListener("DOMContentLoaded", () => {
  const doiInput = document.getElementById("doiInput");
  const extractButton = document.getElementById("extractButton");
  const outputArea = document.getElementById("outputArea");
  const metadataOutput = outputArea.querySelector(".metadata-output");
  const coreMetadataContainer = metadataOutput.querySelector(
    ".core-metadata-container",
  );
  const errorSection = document.querySelector(".error-section");
  const errorMessage = errorSection.querySelector(".error-message");

  extractButton.addEventListener("click", handleExtractClick);

  doiInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleExtractClick();
    }
  });

  document.querySelectorAll(".expandable-header").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.closest(".expandable-section");
      if (section) {
        toggleExpandable(section);
      }
    });
  });

  async function handleExtractClick() {
    const doi = doiInput.value.trim();

    clearOutput();
    hideError();
    showLoading();

    if (!doi) {
      displayError("Please enter a DOI.");
      hideLoading();
      return;
    }

    const normalizedDoi = normalizeDoi(doi);
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(normalizedDoi)}`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          displayError(`DOI not found: ${normalizedDoi}`);
        } else if (response.status === 400) {
          displayError(
            `Bad Request: Check the format of the DOI (${normalizedDoi}).`,
          );
        } else {
          displayError(
            `Error fetching data: ${response.status} ${response.statusText}`,
          );
        }
        hideLoading();
        return;
      }

      const data = await response.json();

      if (data.status === "ok" && data.message) {
        displayCoreMetadata(data.message);
        displayAuthors(data.message.author);
        displayReferences(data.message.reference);
        displayFunders(data.message.funder);
        displayLicenses(data.message.license);
        displayLinks(data.message.link, data.message.resource);
        displayUpdates(data.message["update-to"], data.message["updated-by"]);
        displayRawJson(data);

        showOutput();
      } else {
        const errorMessage =
          data.message?.[0]?.message ||
          "Could not retrieve valid metadata for this DOI.";
        displayError(errorMessage);
      }
    } catch (error) {
      console.error("Fetch error:", error);

      if (error instanceof TypeError) {
        displayError(
          "Network error: Could not connect to the CrossRef API. Please check your connection or try again later.",
        );
      } else {
        displayError("An unexpected error occurred while fetching data.");
      }
    } finally {
      hideLoading();
    }
  }

  function normalizeDoi(doi) {
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
      ? metadata["container-title"].join(", ")
      : metadata["container-title"] || "N/A";

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
        ? metadata.issued["date-parts"][0][0]
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
    html += `<p><strong>Page(s):</strong> ${page}</p>`;
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

    coreMetadataContainer.innerHTML = html;
  }

  function displayAuthors(authors) {
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
      authorsSection.classList.add("hidden");
      return;
    }

    authorsContent.innerHTML = "";
    authorsSection.classList.remove("expanded");
    authorsContent.style.display = "none";
    icon.textContent = "+";

    if (authors && Array.isArray(authors) && authors.length > 0) {
      let html = "<ul>";
      authors.forEach((author) => {
        html += "<li>";
        if (author.given && author.family) {
          html += `<strong>Name:</strong> ${author.given} ${author.family}`;
        } else if (author.name) {
          html += `<strong>Name:</strong> ${author.name}`;
        } else {
          html += "<strong>Name:</strong> Unknown Author";
        }

        if (author.ORCID) {
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
      authorsSection.classList.remove("hidden");
    } else {
      authorsSection.classList.add("hidden");
    }
  }

  function displayReferences(references) {
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

    referencesContent.innerHTML = "";
    referencesSection.classList.remove("expanded");
    referencesContent.style.display = "none";
    icon.textContent = "+";

    if (references && Array.isArray(references) && references.length > 0) {
      let html = "<ul>";
      references.forEach((reference) => {
        html += "<li>";
        let detailsAdded = false;

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
          if (detailsAdded) html += "<br>";
          html += `<strong>Details:</strong> ${reference.unstructured}`;
          detailsAdded = true;
        }
        if (!detailsAdded) {
          html += `Unstructured or incomplete reference data. Key: ${reference.key || "N/A"}`;
        }

        html += "</li>";
      });
      html += "</ul>";
      referencesContent.innerHTML = html;
      referencesSection.classList.remove("hidden");
    } else {
      referencesSection.classList.add("hidden");
    }
  }

  function displayFunders(funders) {
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

    fundersContent.innerHTML = "";
    fundersSection.classList.remove("expanded");
    fundersContent.style.display = "none";
    icon.textContent = "+";

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
        if (!detailsAdded) {
          html += "Funder information incomplete.";
        }
        html += "</li>";
      });
      html += "</ul>";
      fundersContent.innerHTML = html;
      fundersSection.classList.remove("hidden");
    } else {
      fundersSection.classList.add("hidden");
    }
  }

  function displayLicenses(licenses) {
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

    licensesContent.innerHTML = "";
    licensesSection.classList.remove("expanded");
    licensesContent.style.display = "none";
    icon.textContent = "+";

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
          const dateStr = license.start["date-parts"][0].join("-");
          if (detailsAdded) html += "<br>";
          html += `<strong>Start Date:</strong> ${new Date(dateStr).toLocaleDateString()}`;
          detailsAdded = true;
        } else if (license.start && license.start["date-time"]) {
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
        if (!detailsAdded) {
          html += "License information incomplete.";
        }
        html += "</li>";
      });
      html += "</ul>";
      licensesContent.innerHTML = html;
      licensesSection.classList.remove("hidden");
    } else {
      licensesSection.classList.add("hidden");
    }
  }

  function displayLinks(links, resource) {
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

    linksContent.innerHTML = "";
    linksSection.classList.remove("expanded");
    linksContent.style.display = "none";
    icon.textContent = "+";

    let html = "<ul>";
    let linksFound = false;

    if (resource && resource.primary && resource.primary.URL) {
      html += `<li><strong>Primary Resource:</strong> <a href="${resource.primary.URL}" target="_blank">${resource.primary.URL}</a></li>`;
      linksFound = true;
    }

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
      linksSection.classList.remove("hidden");
    } else {
      linksSection.classList.add("hidden");
    }
  }

  function displayUpdates(updateTo, updatedBy) {
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

    updatesContent.innerHTML = "";
    updatesSection.classList.remove("expanded");
    updatesContent.style.display = "none";
    icon.textContent = "+";

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
        html += "<br>";
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
      updatesSection.classList.remove("hidden");
    } else {
      updatesSection.classList.add("hidden");
    }
  }

  function displayRawJson(data) {
    const rawOutput = document.getElementById("jsonSection");
    const jsonContent = rawOutput.querySelector(".expandable-content");
    jsonContent.textContent = JSON.stringify(data, null, 2);
    rawOutput.classList.remove("hidden");
  }

  function displayError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove("hidden");
  }

  function clearOutput() {
    if (coreMetadataContainer) {
      coreMetadataContainer.innerHTML = "";
    }
    const rawOutput = document.getElementById("jsonSection");
    const jsonContent = rawOutput.querySelector(".expandable-content");
    jsonContent.textContent = "";
    outputArea.classList.add("hidden");

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
          content.innerHTML = "";
        }
        const icon = section.querySelector(".expand-icon");
        if (icon) {
          icon.textContent = "+";
        }
      }
    });
  }

  function hideError() {
    errorSection.classList.add("hidden");
    errorMessage.textContent = "";
  }

  function showOutput() {
    outputArea.classList.remove("hidden");
  }

  function showLoading() {
    extractButton.textContent = "Loading...";
    extractButton.disabled = true;
  }

  function hideLoading() {
    extractButton.textContent = "Extract Metadata";
    extractButton.disabled = false;
  }

  function toggleExpandable(sectionElement) {
    const content = sectionElement.querySelector(".expandable-content");
    const icon = sectionElement.querySelector(".expand-icon");

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
    }
  }
});
