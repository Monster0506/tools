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

const singleExerciseMode = document.getElementById("singleExerciseMode");
const workoutPlanMode = document.getElementById("workoutPlanMode");

const singleExerciseTab = document.getElementById("singleExerciseTab");
const workoutPlanTab = document.getElementById("workoutPlanTab");

const addSectionBtn = document.getElementById("addSectionBtn");
const planSectionsContainer = document.getElementById("planSectionsContainer");
const generatePlanBtn = document.getElementById("generatePlanBtn");
const generatedPlanDisplay = document.getElementById("generatedPlanDisplay");

let exercises = [];
let currentFilteredExercises = [];
let exerciseHistory = [];
let historyIndex = -1;
let lastPickedIndex = -1;

let workoutPlanConfiguration = [];
let generatedWorkoutPlan = [];
let isWorkoutPlanMode = false;
let currentSectionId = 0;

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
    selectElement.innerHTML = '<option value="">All</option>';
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

  exerciseHistory = [];
  historyIndex = -1;
  updateNavigationButtons();
  pickExercise(true);
}

/**
 * Resets all filters to their default 'All' state and clears the search term.
 */
function resetFilters() {
  categoryFilter.value = "";
  targetFilter.value = "";
  nameSearch.value = "";
  applyFilters();
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
      cardContentWrapper.style.display = "block";
    } else {
      exerciseNameEl.textContent = "No Exercise Selected";
      exerciseCategoryEl.textContent = "—";
      exerciseTargetEl.textContent = "—";
      exerciseRepsTimeEl.textContent = "—";
      instructionListEl.innerHTML = "";
      cardContentWrapper.style.display = "none";
      noExerciseMessage.style.display = "block";
    }

    cardContentWrapper.classList.remove("fading-out");
  }, 200);
}

/**
 * Picks a random exercise from the `currentFilteredExercises` array.
 * Manages history and prevents immediate repetition.
 * @param {boolean} forceNew - If true, forces picking a new exercise without using history.
 */
function pickExercise(forceNew = false) {
  if (currentFilteredExercises.length === 0) {
    updateExerciseCard(null);
    updateNavigationButtons();
    return;
  }

  let exerciseToDisplay;

  if (forceNew || historyIndex === exerciseHistory.length - 1) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * currentFilteredExercises.length);
    } while (
      currentFilteredExercises.length > 1 &&
      randomIndex === lastPickedIndex
    );

    exerciseToDisplay = currentFilteredExercises[randomIndex];
    lastPickedIndex = randomIndex;

    exerciseHistory = exerciseHistory.slice(0, historyIndex + 1);
    exerciseHistory.push(exerciseToDisplay);
    historyIndex = exerciseHistory.length - 1;
  } else {
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

  if (historyIndex < exerciseHistory.length - 1) {
    pickExerciseBtn.innerHTML = `<i class="fas fa-arrow-right"></i> Next Exercise`;
  } else {
    pickExerciseBtn.innerHTML = `<i class="fas fa-random"></i> Pick Random Exercise`;
  }
}

/**
 * Toggles between the single exercise generator and the workout plan builder.
 * @param {boolean} enablePlanMode - True to show plan mode, false to show single exercise mode.
 */
function toggleWorkoutPlanMode(enablePlanMode) {
  isWorkoutPlanMode = enablePlanMode;

  if (isWorkoutPlanMode) {
    singleExerciseTab.classList.remove("active");
    workoutPlanTab.classList.add("active");
    singleExerciseMode.classList.add("hidden");
    workoutPlanMode.classList.remove("hidden");
    renderWorkoutPlanConfiguration();
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message initial-message">
        Define sections above and click "Generate Workout Plan" to create
        your customized workout!
      </div>
    `;

    generatedWorkoutPlan = [];
  } else {
    workoutPlanTab.classList.remove("active");
    singleExerciseTab.classList.add("active");
    singleExerciseMode.classList.remove("hidden");
    workoutPlanMode.classList.add("hidden");

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
    numExercises: 1,
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
  planSectionsContainer.innerHTML = "";

  const categories = getUniqueValues("category");
  const targets = getUniqueValues("target");

  workoutPlanConfiguration.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "plan-section";
    sectionDiv.id = `plan-section-${section.id}`;

    const titleGroup = document.createElement("div");
    titleGroup.className = "plan-section-input-group";
    titleGroup.innerHTML = `
      <label for="title-${section.id}">Section Title:</label>
      <input type="text" id="title-${section.id}"
             value="${section.title}" placeholder="e.g., Warm-up, Strength"
             oninput="updateWorkoutPlanSection('${section.id}', 'title', this.value)">
    `;
    sectionDiv.appendChild(titleGroup);

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

    const numExercisesGroup = document.createElement("div");
    numExercisesGroup.className = "plan-section-input-group";
    numExercisesGroup.innerHTML = `
      <label for="numExercises-${section.id}"># Exercises:</label>
      <input type="number" id="numExercises-${section.id}"
             value="${section.numExercises}" min="1"
             oninput="updateWorkoutPlanSection('${section.id}', 'numExercises', this.value)">
    `;
    sectionDiv.appendChild(numExercisesGroup);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-section-button";

    removeButton.innerHTML = `<i class="fas fa-times"></i>`;
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
  const usedExerciseNames = new Set();

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
        break;
      }

      const randomIndex = Math.floor(
        Math.random() * exercisesForPicking.length,
      );
      const chosenExercise = exercisesForPicking[randomIndex];

      sectionResult.exercises.push(chosenExercise);
      usedExerciseNames.add(chosenExercise.name);
      sectionResult.numExercisesFound++;

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
  generatedPlanDisplay.innerHTML = "";

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
        warningMessage.textContent = `Only found ${section.numExercisesFound} of ${section.numExercises} requested exercises for this section.`;
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
      const noExMessage = document.createElement("p");
      noExMessage.textContent = "No exercises were generated for this section.";
      noExMessage.className = "no-exercise-message";
      sectionDiv.appendChild(noExMessage);
    }

    generatedPlanDisplay.appendChild(sectionDiv);
  });
}

/**
 * Initializes the application by fetching exercise data and setting up filters.
 */
async function init() {
  try {
    const response = await fetch("/tool/random-exercise/exercises.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    exercises = await response.json();
    console.log(exercises.length);
    populateFilters();
    applyFilters();

    singleExerciseTab.addEventListener("click", () =>
      toggleWorkoutPlanMode(false),
    );
    workoutPlanTab.addEventListener("click", () => toggleWorkoutPlanMode(true));

    toggleWorkoutPlanMode(false);

    addWorkoutPlanSection();
  } catch (error) {
    console.error("Could not fetch exercises:", error);

    document.getElementById("exerciseName").textContent =
      "Error loading exercises.";
    document.getElementById("exerciseCategory").textContent = "—";
    document.getElementById("exerciseTarget").textContent = "—";
    document.getElementById("exerciseRepsTime").textContent = "—";
    instructionListEl.innerHTML = "";
    noExerciseMessage.style.display = "block";
    noExerciseMessage.textContent =
      "Failed to load exercises. Please try again later.";
    pickExerciseBtn.disabled = true;
    prevExerciseBtn.disabled = true;

    singleExerciseTab.disabled = true;
    workoutPlanTab.disabled = true;
    addSectionBtn.disabled = true;
    generatePlanBtn.disabled = true;
    workoutPlanMode.querySelector("h2").textContent = "Error loading data.";
  }
}

document.addEventListener("DOMContentLoaded", init);

window.pickExercise = pickExercise;
window.previousExercise = previousExercise;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.addWorkoutPlanSection = addWorkoutPlanSection;
window.removeWorkoutPlanSection = removeWorkoutPlanSection;
window.updateWorkoutPlanSection = updateWorkoutPlanSection;
window.generateWorkoutPlan = generateWorkoutPlan;
