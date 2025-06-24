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

// --- State Variables ---
let exercises = []; // Will be populated asynchronously
let currentFilteredExercises = [];
let exerciseHistory = [];
let historyIndex = -1; // -1 means we are at the latest picked exercise
let lastPickedIndex = -1; // To prevent picking the exact same exercise consecutively

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
      if (key === "target") {
        ex[key].split(",").forEach((val) => values.add(val.trim()));
      } else {
        values.add(ex[key].trim());
      }
    }
  });
  return Array.from(values).sort();
}

/**
 * Populates the category and target filter dropdowns.
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
      !selectedCategory || ex.category === selectedCategory;
    const matchesTarget = !selectedTarget || ex.target.includes(selectedTarget); // Use includes for targets
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
    populateFilters();
    applyFilters(); // Apply filters initially to populate currentFilteredExercises
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
  }
}

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", init);

// Expose functions to global scope for HTML onclick attributes
window.pickExercise = pickExercise;
window.previousExercise = previousExercise;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
