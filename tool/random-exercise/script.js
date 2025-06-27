// --- DOM Elements ---
const categoryFilter = document.getElementById("categoryFilter");
const targetFilter = document.getElementById("targetFilter");
const nameSearch = document.getElementById("nameSearch");
const pickExerciseBtn = document.getElementById("pickExerciseBtn");
const prevExerciseBtn = document.getElementById("prevExerciseBtn");
const exerciseNameEl = document.getElementById("exerciseName");
const exerciseCategoryEl = document.getElementById("exerciseCategory");
const exerciseTargetEl = document.getElementById("exerciseTarget");
const exerciseRepsTimeEl = document.getElementById("exerciseRepsTime");
const instructionListEl = document.getElementById("instructionList");
const noExerciseMessage = document.querySelector(".no-exercise-message");
const cardContentWrapper = document.querySelector(".card-content-wrapper");

// New DOM Elements for Workout Plan
const singleExerciseMode = document.getElementById("singleExerciseMode");
const workoutPlanMode = document.getElementById("workoutPlanMode");
const togglePlanModeBtn = document.getElementById("togglePlanModeBtn");
const addSectionBtn = document.getElementById("addSectionBtn");
const planSectionsContainer = document.getElementById("planSectionsContainer");
const generatePlanBtn = document.getElementById("generatePlanBtn");
const generatedPlanDisplay = document.getElementById("generatedPlanDisplay");

// --- State Variables ---
let exercises = []; // Will be populated asynchronously
let currentFilteredExercises = [];
let exerciseHistory = [];
let historyIndex = -1; // -1 means we are at the latest picked exercise
let lastPickedIndex = -1; // To prevent picking the exact same exercise consecutively

// New State Variables for Workout Plan
let workoutPlanConfiguration = []; // Stores user-defined sections
let generatedWorkoutPlan = []; // Stores the actual exercises picked for the plan
let isWorkoutPlanMode = false; // Tracks current UI mode
let currentSectionId = 0; // Simple ID generator for sections for unique keys

// --- Utility Functions ---

/**
 * Extracts unique values for a given key from the exercises array.
 * Handles comma-separated values by splitting and trimming.
 * @param {string} key - The key to extract values from (e.g., 'category', 'target').
 * @returns {string[]} An array of unique, sorted values.
 */
function getUniqueValues(key) {
  const values = new Set();
  exercises.forEach((ex) => {
    if (ex[key]) {
      // Handle comma-separated strings for 'target'
      if (key === "target" || key === "category") {
        ex[key].split(",").forEach((val) => values.add(val.trim()));
      } else {
        values.add(ex[key].trim());
      }
    }
  });
  return Array.from(values).sort();
}

/**
 * Populates the category and target filter dropdowns for single exercise mode.
 */
function populateFilters() {
  const categories = getUniqueValues("category");
  const targets = getUniqueValues("target");

  function addOptions(selectElement, values) {
    selectElement.innerHTML = '<option value="">All</option>'; // Add 'All' option
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectElement.appendChild(option);
    });
  }

  addOptions(categoryFilter, categories);
  addOptions(targetFilter, targets);
}

/**
 * Applies filters based on selected categories, targets, and search input.
 * Updates `currentFilteredExercises` and then picks an exercise.
 */
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  const selectedTarget = targetFilter.value;
  const searchTerm = nameSearch.value.toLowerCase().trim();

  currentFilteredExercises = exercises.filter((ex) => {
    const matchesCategory =
      !selectedCategory ||
      ex.category
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(selectedCategory.toLowerCase());
    const matchesTarget =
      !selectedTarget ||
      ex.target.toLowerCase().includes(selectedTarget.toLowerCase());
    const matchesSearch =
      !searchTerm || ex.name.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesTarget && matchesSearch;
  });

  // Reset history when filters change
  exerciseHistory = [];
  historyIndex = -1;
  updateNavigationButtons();
  pickExercise(true); // Pick a new exercise after filters applied
}

/**
 * Resets all filters to their default 'All' state and clears the search term.
 */
function resetFilters() {
  categoryFilter.value = "";
  targetFilter.value = "";
  nameSearch.value = "";
  applyFilters(); // Re-apply filters to show all exercises
}

/**
 * Updates the UI with the given exercise data.
 * Includes a simple fade transition for content.
 * @param {Object} exercise - The exercise object to display.
 */
function updateExerciseCard(exercise) {
  cardContentWrapper.classList.add("fading-out");
  noExerciseMessage.style.display = "none";

  setTimeout(() => {
    if (exercise) {
      exerciseNameEl.textContent = exercise.name;
      exerciseCategoryEl.textContent = exercise.category;
      exerciseTargetEl.textContent = exercise.target;
      exerciseRepsTimeEl.textContent = exercise.reps;

      instructionListEl.innerHTML = "";
      exercise.instructions.forEach((step) => {
        const li = document.createElement("li");
        li.textContent = step;
        instructionListEl.appendChild(li);
      });
      cardContentWrapper.style.display = "block"; // Show content wrapper
    } else {
      // No exercise found based on filters
      exerciseNameEl.textContent = "No Exercise Selected";
      exerciseCategoryEl.textContent = "—";
      exerciseTargetEl.textContent = "—";
      exerciseRepsTimeEl.textContent = "—";
      instructionListEl.innerHTML = "";
      cardContentWrapper.style.display = "none"; // Hide content wrapper
      noExerciseMessage.style.display = "block"; // Show no exercise message
    }

    cardContentWrapper.classList.remove("fading-out");
  }, 200); // Duration of fading-out animation
}

/**
 * Picks a random exercise from the `currentFilteredExercises` array.
 * Manages history and prevents immediate repetition.
 * @param {boolean} forceNew - If true, forces picking a new exercise without using history.
 */
function pickExercise(forceNew = false) {
  if (currentFilteredExercises.length === 0) {
    updateExerciseCard(null); // Show 'no exercises' message
    updateNavigationButtons();
    return;
  }

  let exerciseToDisplay;

  if (forceNew || historyIndex === exerciseHistory.length - 1) {
    // Pick a new random exercise
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * currentFilteredExercises.length);
    } while (
      currentFilteredExercises.length > 1 &&
      randomIndex === lastPickedIndex
    ); // Avoid picking the same consecutive exercise if possible

    exerciseToDisplay = currentFilteredExercises[randomIndex];
    lastPickedIndex = randomIndex;

    // Add to history and trim future history if needed
    exerciseHistory = exerciseHistory.slice(0, historyIndex + 1);
    exerciseHistory.push(exerciseToDisplay);
    historyIndex = exerciseHistory.length - 1;
  } else {
    // Navigate forward in history
    historyIndex++;
    exerciseToDisplay = exerciseHistory[historyIndex];
  }

  updateExerciseCard(exerciseToDisplay);
  updateNavigationButtons();
}

/**
 * Navigates to the previous exercise in the history.
 */
function previousExercise() {
  if (historyIndex > 0) {
    historyIndex--;
    const exerciseToDisplay = exerciseHistory[historyIndex];
    updateExerciseCard(exerciseToDisplay);
    updateNavigationButtons();
  }
}

/**
 * Updates the disabled state of the navigation buttons.
 */
function updateNavigationButtons() {
  prevExerciseBtn.disabled = historyIndex <= 0;
  pickExerciseBtn.disabled = currentFilteredExercises.length === 0;

  // If we are viewing a historical exercise, the "Pick Random" button
  // should act as a "Next" button until we catch up to the end of history.
  // Otherwise, it picks a new random one.
  if (historyIndex < exerciseHistory.length - 1) {
    pickExerciseBtn.textContent = "Next Exercise";
  } else {
    pickExerciseBtn.textContent = "Pick Random Exercise";
  }
}

// --- Workout Plan Functions ---

/**
 * Toggles between the single exercise generator and the workout plan builder.
 * @param {boolean} enablePlanMode - True to show plan mode, false to show single exercise mode.
 */
function toggleWorkoutPlanMode(enablePlanMode) {
  isWorkoutPlanMode = enablePlanMode;

  if (isWorkoutPlanMode) {
    singleExerciseMode.classList.add("hidden");
    workoutPlanMode.classList.remove("hidden");
    togglePlanModeBtn.textContent = "Switch to Single Exercise";
    renderWorkoutPlanConfiguration(); // Render configuration when switching to plan mode
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message initial-message">
        Define sections above and click "Generate Workout Plan" to create
        your customized workout!
      </div>
    `;
    // Clear generated plan display and reset filters if coming from single exercise
    generatedWorkoutPlan = [];
  } else {
    singleExerciseMode.classList.remove("hidden");
    workoutPlanMode.classList.add("hidden");
    togglePlanModeBtn.textContent = "Create Workout Plan";
    // Reset single exercise filters and pick new exercise
    resetFilters();
  }
}

/**
 * Adds a new, empty section to the workout plan configuration.
 */
function addWorkoutPlanSection() {
  currentSectionId++;
  workoutPlanConfiguration.push({
    id: `section-${currentSectionId}`,
    title: "",
    category: "",
    target: "",
    numExercises: 1, // Default to 1 exercise per section
  });
  renderWorkoutPlanConfiguration();
}

/**
 * Removes a section from the workout plan configuration.
 * @param {string} id - The ID of the section to remove.
 */
function removeWorkoutPlanSection(id) {
  workoutPlanConfiguration = workoutPlanConfiguration.filter(
    (section) => section.id !== id,
  );
  renderWorkoutPlanConfiguration();
}

/**
 * Updates a specific field for a section in the workout plan configuration.
 * @param {string} id - The ID of the section to update.
 * @param {string} field - The field to update ('title', 'category', 'target', 'numExercises').
 * @param {string|number} value - The new value for the field.
 */
function updateWorkoutPlanSection(id, field, value) {
  const sectionIndex = workoutPlanConfiguration.findIndex(
    (section) => section.id === id,
  );
  if (sectionIndex !== -1) {
    workoutPlanConfiguration[sectionIndex][field] = value;
    // Ensure numExercises is a positive integer
    if (field === "numExercises") {
      workoutPlanConfiguration[sectionIndex].numExercises = Math.max(
        1,
        parseInt(value) || 1,
      );
    }
  }
}

/**
 * Renders (or re-renders) the HTML for the workout plan configuration interface.
 */
function renderWorkoutPlanConfiguration() {
  planSectionsContainer.innerHTML = ""; // Clear existing sections

  const categories = getUniqueValues("category");
  const targets = getUniqueValues("target");

  workoutPlanConfiguration.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "plan-section";
    sectionDiv.id = `plan-section-${section.id}`;

    // Section Title
    const titleGroup = document.createElement("div");
    titleGroup.className = "plan-section-input-group";
    titleGroup.innerHTML = `
      <label for="title-${section.id}">Section Title:</label>
      <input type="text" id="title-${section.id}"
             value="${section.title}" placeholder="e.g., Warm-up, Strength"
             oninput="updateWorkoutPlanSection('${section.id}', 'title', this.value)">
    `;
    sectionDiv.appendChild(titleGroup);

    // Category Filter
    const categoryGroup = document.createElement("div");
    categoryGroup.className = "plan-section-input-group";
    const categorySelect = document.createElement("select");
    categorySelect.id = `category-${section.id}`;
    categorySelect.onchange = (e) =>
      updateWorkoutPlanSection(section.id, "category", e.target.value);
    categorySelect.innerHTML = '<option value="">Any Category</option>';
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      if (section.category === cat) option.selected = true;
      categorySelect.appendChild(option);
    });
    categoryGroup.appendChild(document.createElement("label")).textContent =
      "Category:";
    categoryGroup.appendChild(categorySelect);
    sectionDiv.appendChild(categoryGroup);

    // Target Filter
    const targetGroup = document.createElement("div");
    targetGroup.className = "plan-section-input-group";
    const targetSelect = document.createElement("select");
    targetSelect.id = `target-${section.id}`;
    targetSelect.onchange = (e) =>
      updateWorkoutPlanSection(section.id, "target", e.target.value);
    targetSelect.innerHTML = '<option value="">Any Target</option>';
    targets.forEach((tgt) => {
      const option = document.createElement("option");
      option.value = tgt;
      option.textContent = tgt;
      if (section.target === tgt) option.selected = true;
      targetSelect.appendChild(option);
    });
    targetGroup.appendChild(document.createElement("label")).textContent =
      "Target:";
    targetGroup.appendChild(targetSelect);
    sectionDiv.appendChild(targetGroup);

    // Number of Exercises
    const numExercisesGroup = document.createElement("div");
    numExercisesGroup.className = "plan-section-input-group";
    numExercisesGroup.innerHTML = `
      <label for="numExercises-${section.id}"># Exercises:</label>
      <input type="number" id="numExercises-${section.id}"
             value="${section.numExercises}" min="1"
             oninput="updateWorkoutPlanSection('${section.id}', 'numExercises', this.value)">
    `;
    sectionDiv.appendChild(numExercisesGroup);

    // Remove Section Button
    const removeButton = document.createElement("button");
    removeButton.className = "remove-section-button";
    removeButton.textContent = "X";
    removeButton.onclick = () => removeWorkoutPlanSection(section.id);
    sectionDiv.appendChild(removeButton);

    planSectionsContainer.appendChild(sectionDiv);
  });
}

/**
 * Generates the full workout plan based on the current configuration.
 */
function generateWorkoutPlan() {
  generatedWorkoutPlan = [];
  const usedExerciseNames = new Set(); // To prevent repeats across the entire plan

  if (workoutPlanConfiguration.length === 0) {
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message">
        Add some sections to your plan first!
      </div>
    `;
    return;
  }

  workoutPlanConfiguration.forEach((sectionConfig) => {
    const sectionResult = {
      ...sectionConfig,
      exercises: [],
      numExercisesFound: 0,
      hasWarning: false,
    };

    const filteredForSection = exercises.filter((ex) => {
      const matchesCategory =
        !sectionConfig.category ||
        ex.category
          .split(",")
          .map((s) => s.trim())
          .includes(sectionConfig.category);
      const matchesTarget =
        !sectionConfig.target ||
        ex.target.toLowerCase().includes(sectionConfig.target.toLowerCase());
      return matchesCategory && matchesTarget;
    });

    let exercisesForPicking = filteredForSection.filter(
      (ex) => !usedExerciseNames.has(ex.name),
    );

    for (let i = 0; i < sectionConfig.numExercises; i++) {
      if (exercisesForPicking.length === 0) {
        sectionResult.hasWarning = true;
        break; // No more unique exercises available for this section
      }

      const randomIndex = Math.floor(
        Math.random() * exercisesForPicking.length,
      );
      const chosenExercise = exercisesForPicking[randomIndex];

      sectionResult.exercises.push(chosenExercise);
      usedExerciseNames.add(chosenExercise.name);
      sectionResult.numExercisesFound++;

      // Remove chosen exercise from exercisesForPicking to prevent re-picking in this section
      exercisesForPicking.splice(randomIndex, 1);
    }
    generatedWorkoutPlan.push(sectionResult);
  });

  renderGeneratedWorkoutPlan();
}

/**
 * Renders the generated workout plan to the display area.
 */
function renderGeneratedWorkoutPlan() {
  generatedPlanDisplay.innerHTML = ""; // Clear previous plan

  if (generatedWorkoutPlan.length === 0) {
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message">
        No exercises generated. Try adjusting your plan configuration!
      </div>
    `;
    return;
  }

  generatedWorkoutPlan.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "plan-section-output";

    const sectionTitle = section.title || "Untitled Section";
    sectionDiv.innerHTML = `<h3>${sectionTitle}</h3>`;

    if (section.hasWarning || section.numExercisesFound === 0) {
      const warningMessage = document.createElement("div");
      warningMessage.className = "section-warning";
      if (section.numExercisesFound === 0) {
        warningMessage.textContent = `No exercises found for this section's criteria.`;
      } else {
        warningMessage.textContent = `Only found ${section.numExercisesFound} of ${section.numExercises} requested exercises.`;
      }
      sectionDiv.appendChild(warningMessage);
    }

    if (section.exercises.length > 0) {
      section.exercises.forEach((exercise) => {
        const exerciseItem = document.createElement("div");
        exerciseItem.className = "exercise-item";
        exerciseItem.innerHTML = `
          <h4>${exercise.name}</h4>
          <p><strong>Category:</strong> ${exercise.category}</p>
          <p><strong>Target:</strong> ${exercise.target}</p>
          <p><strong>Reps / Time:</strong> ${exercise.reps}</p>
          <p class="instructions-header">Instructions:</p>
          <ul>
            ${exercise.instructions.map((step) => `<li>${step}</li>`).join("")}
          </ul>
        `;
        sectionDiv.appendChild(exerciseItem);
      });
    } else if (!section.hasWarning) {
      // This case handles if numExercisesFound is 0 without specific warning set
      const noExMessage = document.createElement("p");
      noExMessage.textContent = "No exercises were generated for this section.";
      noExMessage.className = "no-exercise-message";
      sectionDiv.appendChild(noExMessage);
    }

    generatedPlanDisplay.appendChild(sectionDiv);
  });
}

// --- Initial Setup ---
/**
 * Initializes the application by fetching exercise data and setting up filters.
 */
async function init() {
  try {
    const response = await fetch("/tool/random-exercise/exercises.json"); // Path corrected
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    exercises = await response.json();
    console.log(exercises.length);
    populateFilters(); // Populate filters for single exercise mode
    applyFilters(); // Apply filters initially to populate currentFilteredExercises

    // Set up event listener for the mode toggle button
    togglePlanModeBtn.addEventListener("click", () =>
      toggleWorkoutPlanMode(!isWorkoutPlanMode),
    );

    // Initial state: show single exercise mode
    toggleWorkoutPlanMode(false);

    // Add one default section to the workout plan builder when starting
    // to give the user a starting point
    addWorkoutPlanSection();
  } catch (error) {
    console.error("Could not fetch exercises:", error);
    // Display an error message to the user or gracefully handle it
    document.getElementById("exerciseName").textContent =
      "Error loading exercises.";
    document.getElementById("exerciseCategory").textContent = "—";
    document.getElementById("exerciseTarget").textContent = "—";
    document.getElementById("exerciseRepsTime").textContent = "—";
    document.getElementById("instructionList").innerHTML = "";
    noExerciseMessage.style.display = "block";
    noExerciseMessage.textContent =
      "Failed to load exercises. Please try again later.";
    pickExerciseBtn.disabled = true;
    prevExerciseBtn.disabled = true;
    togglePlanModeBtn.disabled = true; // Disable if exercises can't load
    addSectionBtn.disabled = true;
    generatePlanBtn.disabled = true;
    workoutPlanMode.querySelector("h2").textContent = "Error loading data.";
  }
}

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", init);

// Expose functions to global scope for HTML onclick attributes
window.pickExercise = pickExercise;
window.previousExercise = previousExercise;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleWorkoutPlanMode = toggleWorkoutPlanMode; // Expose for debugging if needed, but not directly clicked
window.addWorkoutPlanSection = addWorkoutPlanSection;
window.removeWorkoutPlanSection = removeWorkoutPlanSection;
window.updateWorkoutPlanSection = updateWorkoutPlanSection;
window.generateWorkoutPlan = generateWorkoutPlan;
