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

// New template related elements
let workoutPlanTemplateSelect;
let saveTemplateBtn;
let loadTemplateBtn;
let deleteTemplateBtn;

let exercises = [];
let currentFilteredExercises = [];
let exerciseHistory = [];
let historyIndex = -1;
let lastPickedIndex = -1;

let workoutPlanConfiguration = [];
let generatedWorkoutPlan = [];
let isWorkoutPlanMode = false;
// currentSectionId now represents the NEXT available ID for a new section
let currentSectionId = 0;

// Global array to store workout plan templates
// For persistence, this could be loaded from and saved to localStorage
let workoutPlanTemplates = [];

/**
 * Stores templates to localStorage.
 */
function saveTemplatesToLocalStorage() {
  try {
    localStorage.setItem(
      "workoutPlanTemplates",
      JSON.stringify(workoutPlanTemplates),
    );
  } catch (e) {
    console.error("Error saving templates to localStorage:", e);
  }
}

/**
 * Loads templates from localStorage.
 */
function loadTemplatesFromLocalStorage() {
  try {
    const storedTemplates = localStorage.getItem("workoutPlanTemplates");
    if (storedTemplates) {
      workoutPlanTemplates = JSON.parse(storedTemplates);
    } else {
      // Add some default templates if none are found in localStorage
      addDefaultTemplates();
    }
  } catch (e) {
    console.error("Error loading templates from localStorage:", e);
    // Fallback to default templates if localStorage read fails
    addDefaultTemplates();
  }
}

/**
 * Adds initial default templates if localStorage is empty.
 */
function addDefaultTemplates() {
  if (workoutPlanTemplates.length === 0) {
    // 1. Full Body Beginner Template (Retained as requested)
    workoutPlanTemplates.push({
      name: "Full Body Beginner",
      configuration: [
        {
          id: "section-1",
          title: "Warm-up",
          category: "Warm-up",
          target: "",
          numExercises: 2,
        },
        {
          id: "section-2",
          title: "Strength Drills",
          category: "Strength",
          target: "",
          numExercises: 3,
        },
        {
          id: "section-3",
          title: "Core Stability",
          category: "Core",
          target: "",
          numExercises: 1,
        },
        {
          id: "section-4",
          title: "Cool-down & Stretch",
          category: "Stretching",
          target: "",
          numExercises: 2,
        },
      ],
      lastSectionId: 4,
    });

    // 2. Abs Focus Template (New)
    workoutPlanTemplates.push({
      name: "Abs Focus",
      configuration: [
        {
          id: "section-1",
          title: "Core Warm-up",
          category: "Warm-up",
          target: "Core",
          numExercises: 1,
        },
        {
          id: "section-2",
          title: "Upper & Lower Abs",
          category: "Core",
          target: "Abs",
          numExercises: 2,
        },
        {
          id: "section-3",
          title: "Obliques & Rotation",
          category: "Core",
          target: "Obliques",
          numExercises: 2,
        },
        {
          id: "section-4",
          title: "Anti-Movement Core",
          category: "Core",
          target: "Core Stability",
          numExercises: 1,
        },
        {
          id: "section-5",
          title: "Core Stretch",
          category: "Stretching",
          target: "Core",
          numExercises: 1,
        },
      ],
      lastSectionId: 5,
    });

    // 3. Cardio & Agility Template (New)
    workoutPlanTemplates.push({
      name: "Cardio & Agility",
      configuration: [
        {
          id: "section-1",
          title: "Dynamic Warm-up",
          category: "Warm-up",
          target: "",
          numExercises: 2,
        },
        {
          id: "section-2",
          title: "High-Intensity Cardio",
          category: "Cardio",
          target: "Cardiovascular",
          numExercises: 2,
        },
        {
          id: "section-3",
          title: "Explosive Power",
          category: "Explosive",
          target: "Glutes, Quads",
          numExercises: 2,
        },
        {
          id: "section-4",
          title: "Agility Drills",
          category: "Agility",
          target: "Lateral Movement",
          numExercises: 1,
        },
      ],
      lastSectionId: 4,
    });

    // 4. Mobility & Flow Template (New)
    workoutPlanTemplates.push({
      name: "Mobility & Flow",
      configuration: [
        {
          id: "section-1",
          title: "Joint Prep & Activation",
          category: "Warm-up",
          target: "Mobility",
          numExercises: 2,
        },
        {
          id: "section-2",
          title: "Spine & Core Flow",
          category: "Mobility",
          target: "Spine Mobility, Core Mobility",
          numExercises: 2,
        },
        {
          id: "section-3",
          title: "Hip & Lower Body Mobility",
          category: "Mobility",
          target: "Hips, Hamstrings, Ankles",
          numExercises: 2,
        },
        {
          id: "section-4",
          title: "Shoulder & Upper Back Mobility",
          category: "Mobility",
          target: "Shoulders, Upper Back",
          numExercises: 2,
        },
        {
          id: "section-5",
          title: "Full Body Dynamic Stretch",
          category: "Stretching",
          target: "Any Target",
          numExercises: 1,
        },
      ],
      lastSectionId: 5,
    });

    workoutPlanTemplates.push({
      name: "Full Body Ultimate Workout",
      configuration: [
        {
          id: "section-1",
          title: "Warm-up & Joint Mobility",
          category: "Warm-up",
          target: "Any Target",
          numExercises: 3, // e.g., Inchworm, Arm Circles, Cat-Cow Stretch
        },
        {
          id: "section-2",
          title: "Dynamic Core Activation",
          category: "Core",
          target: "Core Stability",
          numExercises: 2, // e.g., Bird-Dog, Hollow Body Hold
        },
        {
          id: "section-3",
          title: "Lower Body Foundation Strength",
          category: "Lower Body Strength",
          target: "Glutes",
          numExercises: 3, // e.g., Goblet Squat, Dumbbell Romanian Deadlift (RDL), Walking Lunge
        },
        {
          id: "section-4",
          title: "Upper Body Push Power",
          category: "Upper Body Strength",
          target: "Chest",
          numExercises: 3, // e.g., Push-Up, Dumbbell Shoulder Press, Tricep Dips (Bench)
        },
        {
          id: "section-5",
          title: "Upper Body Pull & Posture",
          category: "Upper Body Strength",
          target: "Back",
          numExercises: 2, // e.g., Bent-Over Dumbbell Row, Band Face Pull
        },
        {
          id: "section-6",
          title: "Core Endurance & Anti-Rotation",
          category: "Core",
          target: "Core Stability",
          numExercises: 3, // e.g., Pallof Press, Side Plank, Plank Hip Dips
        },
        {
          id: "section-7",
          title: "Explosive Lower Body & Agility",
          category: "Explosive",
          target: "Explosiveness",
          numExercises: 2, // e.g., Broad Jump, Speed Skaters
        },
        {
          id: "section-8",
          title: "High-Intensity Conditioning Finisher",
          category: "Cardio",
          target: "Cardiovascular",
          numExercises: 2, // e.g., Burpee, Mountain Climbers
        },
        {
          id: "section-9",
          title: "Martial Arts Specific Drill",
          category: "Conditioning",
          target: "Coordination",
          numExercises: 1, // e.g., Shadow Boxing (Light)
        },
        {
          id: "section-10",
          title: "Cool-down & Deep Flexibility",
          category: "Stretching",
          target: "Full Body",
          numExercises: 3, // e.g., World's Greatest Stretch, Dynamic Pigeon Pose (Flow), Lying Windshield Wipers
        },
      ],
      lastSectionId: 10, // The highest section ID used in this template
    });

    // Save defaults to localStorage right after adding them
    saveTemplatesToLocalStorage();
  }
}

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
 * Populates the template dropdown with saved workout plan templates.
 */
function populateTemplateDropdown() {
  addDefaultTemplates();
  if (!workoutPlanTemplateSelect) return; // Exit if element not initialized yet

  workoutPlanTemplateSelect.innerHTML =
    '<option value="">Select a Template...</option>';
  workoutPlanTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.name;
    option.textContent = template.name;
    workoutPlanTemplateSelect.appendChild(option);
  });
  // Initially, no template is selected
  workoutPlanTemplateSelect.value = "";
  updateTemplateButtons(); // Disable load/delete until a template is chosen
}

/**
 * Saves the current workout plan configuration as a new template.
 */
function saveWorkoutPlanTemplate() {
  const templateName = prompt("Enter a name for your workout plan template:");
  if (templateName === null || templateName.trim() === "") {
    alert("Template name cannot be empty.");
    return;
  }

  // Ensure there's something to save
  if (workoutPlanConfiguration.length === 0) {
    alert("There are no sections in your current plan to save.");
    return;
  }

  const trimmedName = templateName.trim();
  const existingIndex = workoutPlanTemplates.findIndex(
    (t) => t.name.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existingIndex !== -1) {
    if (
      !confirm(
        `A template named "${trimmedName}" already exists. Do you want to overwrite it?`,
      )
    ) {
      return;
    }
    // Overwrite: remove the old one first
    workoutPlanTemplates.splice(existingIndex, 1);
  }

  // Deep copy the configuration to prevent direct reference issues
  const configCopy = JSON.parse(JSON.stringify(workoutPlanConfiguration));
  // Find the highest ID among sections in the current configuration
  const maxId = configCopy.reduce((max, section) => {
    const idNum = parseInt(section.id.split("-")[1]);
    return idNum > max ? idNum : max;
  }, 0);

  workoutPlanTemplates.push({
    name: trimmedName,
    configuration: configCopy,
    lastSectionId: maxId, // Store the highest ID used in this template
  });

  saveTemplatesToLocalStorage();
  populateTemplateDropdown();
  alert(`Template "${trimmedName}" saved successfully!`);
}

/**
 * Loads a selected workout plan template into the current configuration.
 */
function loadWorkoutPlanTemplate() {
  const selectedTemplateName = workoutPlanTemplateSelect.value;

  if (!selectedTemplateName) {
    alert("Please select a template to load.");
    return;
  }

  const templateToLoad = workoutPlanTemplates.find(
    (t) => t.name === selectedTemplateName,
  );

  if (templateToLoad) {
    // Deep copy to ensure no direct reference
    workoutPlanConfiguration = JSON.parse(
      JSON.stringify(templateToLoad.configuration),
    );
    // Update global ID tracker based on loaded template
    // This ensures new sections added after loading continue from the correct ID
    currentSectionId = templateToLoad.lastSectionId + 1;
    renderWorkoutPlanConfiguration(); // Rerender UI based on new config
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message initial-message">
        Template "${selectedTemplateName}" loaded. Click "Generate Workout Plan" to create your customized workout!
      </div>
    `;
    generatedWorkoutPlan = []; // Clear any previously generated plan
    // alert(`Template "${selectedTemplateName}" loaded!`);
  } else {
    alert("Template not found.");
  }
}

/**
 * Deletes a selected workout plan template.
 */
function deleteWorkoutPlanTemplate() {
  const selectedTemplateName = workoutPlanTemplateSelect.value;

  if (!selectedTemplateName) {
    alert("Please select a template to delete.");
    return;
  }

  if (
    confirm(
      `Are you sure you want to delete the template "${selectedTemplateName}"?`,
    )
  ) {
    workoutPlanTemplates = workoutPlanTemplates.filter(
      (t) => t.name !== selectedTemplateName,
    );
    saveTemplatesToLocalStorage();
    populateTemplateDropdown();
    // Clear the current configuration if the deleted template was actively loaded
    // This check is a bit complex as `JSON.stringify` comparison isn't perfect for identical configs
    // A simpler approach: if the config is not empty, clear it to prevent confusion
    if (workoutPlanConfiguration.length > 0) {
      // If the deleted template *might* have been the currently displayed one,
      // or if the user simply deletes *any* template, reset to a clean state.
      workoutPlanConfiguration = [];
      addWorkoutPlanSection(); // Add one default empty section
    }
    renderWorkoutPlanConfiguration(); // Re-render to show potential empty state or single section
    generatedPlanDisplay.innerHTML = `
      <div class="no-exercise-message initial-message">
        Define sections above and click "Generate Workout Plan" to create
        your customized workout!
      </div>
    `;
    alert(`Template "${selectedTemplateName}" deleted.`);
  }
}

/**
 * Updates the disabled state of template load/delete buttons based on dropdown selection.
 */
function updateTemplateButtons() {
  if (workoutPlanTemplateSelect && loadTemplateBtn && deleteTemplateBtn) {
    const isSelected = workoutPlanTemplateSelect.value !== "";
    loadTemplateBtn.disabled = !isSelected;
    deleteTemplateBtn.disabled = !isSelected;
  }
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
      exerciseCategoryEl.textContent = "â€”";
      exerciseTargetEl.textContent = "â€”";
      exerciseRepsTimeEl.textContent = "â€”";
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

    // Ensure we have at least one section if switching to plan mode with an empty config
    if (workoutPlanConfiguration.length === 0) {
      addWorkoutPlanSection();
    } else {
      // If there are sections, just re-render to reflect current state
      renderWorkoutPlanConfiguration();
    }
    populateTemplateDropdown(); // Populate template dropdown when entering plan mode
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
  // Calculate the next ID based on the highest existing ID to ensure uniqueness
  // This is important if sections were deleted or a template was loaded
  const maxExistingId = workoutPlanConfiguration.reduce((max, section) => {
    const idNum = parseInt(section.id.split("-")[1]);
    return idNum > max ? idNum : max;
  }, 0);
  currentSectionId = maxExistingId + 1; // Update global tracker

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
  const usedExerciseNames = new Set(); // To prevent duplicate exercises across the plan

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

    // Filter out exercises already used in this plan for primary picking
    let exercisesForPicking = filteredForSection.filter(
      (ex) => !usedExerciseNames.has(ex.name),
    );

    for (let i = 0; i < sectionConfig.numExercises; i++) {
      let chosenExercise = null;

      if (exercisesForPicking.length > 0) {
        // Try to pick a unique exercise first
        const randomIndex = Math.floor(
          Math.random() * exercisesForPicking.length,
        );
        chosenExercise = exercisesForPicking[randomIndex];
        exercisesForPicking.splice(randomIndex, 1); // Remove from pool for uniqueness within plan
      } else {
        // Fallback: If no unique exercises are left matching criteria,
        // try to pick from *all* filtered exercises for this section,
        // even if they've been used in *other* sections, but still avoid
        // immediate repetition *within this specific section*.
        let fallbackExercises = filteredForSection.filter(
          (ex) =>
            !sectionResult.exercises.some((chosen) => chosen.name === ex.name),
        );
        if (fallbackExercises.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * fallbackExercises.length,
          );
          chosenExercise = fallbackExercises[randomIndex];
        }
      }

      if (chosenExercise) {
        sectionResult.exercises.push(chosenExercise);
        usedExerciseNames.add(chosenExercise.name); // Add to global used names set
        sectionResult.numExercisesFound++;
      } else {
        // No exercises matching criteria at all, or all have been picked.
        sectionResult.hasWarning = true;
        break;
      }
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
        No exercises generated. Try adjusting your plan configuration or filters!
      </div>
    `;
    return;
  }

  generatedWorkoutPlan.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "plan-section-output";

    const sectionTitle = section.title || "Untitled Section";
    sectionDiv.innerHTML = `<h3>${sectionTitle}</h3>`;

    if (
      section.hasWarning ||
      section.numExercisesFound < section.numExercises
    ) {
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
    console.log(`Loaded ${exercises.length} exercises.`);

    // Initialize template-related elements after HTML is loaded
    workoutPlanTemplateSelect = document.getElementById(
      "workoutPlanTemplateSelect",
    );
    saveTemplateBtn = document.getElementById("saveTemplateBtn");
    loadTemplateBtn = document.getElementById("loadTemplateBtn");
    deleteTemplateBtn = document.getElementById("deleteTemplateBtn");

    populateFilters();
    applyFilters();

    singleExerciseTab.addEventListener("click", () =>
      toggleWorkoutPlanMode(false),
    );
    workoutPlanTab.addEventListener("click", () => toggleWorkoutPlanMode(true));

    // Event listeners for template buttons
    if (saveTemplateBtn)
      saveTemplateBtn.addEventListener("click", saveWorkoutPlanTemplate);
    if (loadTemplateBtn)
      loadTemplateBtn.addEventListener("click", loadWorkoutPlanTemplate);
    if (deleteTemplateBtn)
      deleteTemplateBtn.addEventListener("click", deleteWorkoutPlanTemplate);
    if (workoutPlanTemplateSelect)
      workoutPlanTemplateSelect.addEventListener(
        "change",
        updateTemplateButtons,
      );

    loadTemplatesFromLocalStorage(); // Load templates on init
    populateTemplateDropdown(); // Populate dropdown immediately

    // Start in single exercise mode by default
    toggleWorkoutPlanMode(false);
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

    // Disable template buttons too
    if (saveTemplateBtn) saveTemplateBtn.disabled = true;
    if (loadTemplateBtn) loadTemplateBtn.disabled = true;
    if (deleteTemplateBtn) deleteTemplateBtn.disabled = true;
    if (workoutPlanTemplateSelect) workoutPlanTemplateSelect.disabled = true;

    const workoutPlanH2 = workoutPlanMode.querySelector("h2");
    if (workoutPlanH2) workoutPlanH2.textContent = "Error loading data.";
  }
}

document.addEventListener("DOMContentLoaded", init);

// Expose functions to the global scope for HTML event attributes
window.pickExercise = pickExercise;
window.previousExercise = previousExercise;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.addWorkoutPlanSection = addWorkoutPlanSection;
window.removeWorkoutPlanSection = removeWorkoutPlanSection;
window.updateWorkoutPlanSection = updateWorkoutPlanSection;
window.generateWorkoutPlan = generateWorkoutPlan;
// Expose new template functions
window.saveWorkoutPlanTemplate = saveWorkoutPlanTemplate;
window.loadWorkoutPlanTemplate = loadWorkoutPlanTemplate;
window.deleteWorkoutPlanTemplate = deleteWorkoutPlanTemplate;
