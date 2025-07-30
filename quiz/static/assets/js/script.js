// Fetch questions from Django API
async function fetchQuestionsFromAPI(department) {
  try {
    const response = await fetch(`/api/questions/?department=${encodeURIComponent(department)}&num_dept=5&num_gen=5`);
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      throw new Error('API response not ok');
    }
    const data = await response.json();
    if (!data.questions) {
      console.error('API response missing questions:', data);
      throw new Error('API response missing questions');
    }
    // Remove the answer field in production for security!
    return data.questions.map(q => ({
      question: q.text,
      options: q.options,
      answer: q.answer // Remove this if you want to hide answers on frontend
    }));
  } catch (err) {
    console.error('Error fetching questions from API:', err);
    throw err;
  }
}

// Save quiz result to Django API
async function saveQuizResultToAPI(result) {
  const response = await fetch('/api/save_result/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  });
  return await response.json();
}

/* DOM Elements */
const elements = {
  homePage: document.getElementById("home-page"),
  quizPage: document.getElementById("quiz-page"),
  leaderboardPage: document.getElementById("leaderboard-page"),
  competitionPage: document.getElementById("competition-page"),
  contactPage: document.getElementById("contact-page"),
  
  quizBox: document.getElementById("quiz-box"),
  resultBox: document.getElementById("result-box"),
  questionEl: document.getElementById("question"),
  optionsEl: document.getElementById("options"),
  nextBtn: document.getElementById("next-btn"),
  timeDisplay: document.getElementById("time"),
  startMessage: document.getElementById("start-message"),
  timerEl: document.getElementById("timer"),
  summary: document.getElementById("summary"),
  correctCount: document.getElementById("correct-count"),
  wrongCount: document.getElementById("wrong-count"),
  percentage: document.getElementById("percentage"),
  
  userForm: document.getElementById("user-form"),
  nameInput: document.getElementById("name"),
  matricInput: document.getElementById("matric"),
  fieldInput: document.getElementById("field"),
  userInfo: document.getElementById("user-info"),
  greeting: document.getElementById("greeting"),
  
  tickSound: document.getElementById("tick-sound"),
  correctSound: document.getElementById("correct-sound"),
  wrongSound: document.getElementById("wrong-sound"),
  timeWarningSound: document.getElementById("time-warning-sound"),
  timeUpSound: document.getElementById("time-up-sound"),
  
  navLinks: document.querySelectorAll(".nav-link"),
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  
  progressbar: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  
  leaderboard: document.getElementById("leaderboard"),
  leaderboardList: document.getElementById("leaderboard-list"),
  pastScores: document.getElementById("past-scores"),
  
  startCompetitionBtn: document.getElementById("start-competition"),
  startQuizBtn: document.getElementById("start-quiz-btn"),
  contactForm: document.getElementById("contact-form"),
  footer: document.querySelector("footer"),
  questionCategory: document.getElementById("question-category")
};

/* Quiz state */
const quizState = {
  currentQuestions: [],
  currentIndex: 0,
  score: 0,
  wrong: 0,
  timeLeft: 120,
  timerInterval: null,
  selected: false,
  username: "",
  darkMode: false,
  pastResults: JSON.parse(localStorage.getItem("pastResults")) || [],
  isCompetition: false
};

/* Initialize the application */
document.addEventListener('DOMContentLoaded', () => {
  // validateQuestionIntegrity();
  setupEventListeners();
  loadPastScores();
  checkDarkModePreference();
  
  // Only show the home page initially
  showHomePage();

  /* Debugging helper */
  window.debugQuizState = () => {
    console.log("Current Quiz State:", quizState);
    console.log("Current Question:", quizState.currentQuestions[quizState.currentIndex]);
  };
});
/* Verification functions */

// No longer needed: verifyQuestionCounts and validateQuestionIntegrity

/* Page Navigation Functions */
function showHomePage() {
  hideAllPages();
  console.log('homepage on')
  elements.homePage.classList.remove("hidden");
  updateActiveNav("home");
}

function showQuizPage() {
  hideAllPages();
  console.log('quizpage on')
  elements.quizPage.classList.remove("hidden");
  updateActiveNav("quiz");
}

function showLeaderboardPage() {
  hideAllPages();
  elements.leaderboardPage.classList.remove("hidden");
  updateActiveNav("leaderboard");
}

function showCompetitionPage() {
  hideAllPages();
  elements.competitionPage.classList.remove("hidden");
  updateActiveNav("competition");
}

function showContactPage() {
  hideAllPages();
  elements.contactPage.classList.remove("hidden");
  updateActiveNav("contact");
}

function hideAllPages() {
  //elements.homePage.classList.add("hidden");
  elements.quizPage.classList.add("hidden");
  elements.leaderboardPage.classList.add("hidden");
  elements.competitionPage.classList.add("hidden");
  elements.contactPage.classList.add("hidden");
}

function updateActiveNav(pageId) {
  elements.navLinks.forEach(link => {
    if (link.dataset.page === pageId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}


/* Event Listeners Setup - FULL CORRECTED VERSION */
function setupEventListeners() {
  // 1. NAVIGATION LINKS - Fixed implementation
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      console.log(`Navigation clicked: ${this.dataset.page}`); // Debug log
      
      // Remove active class from all links
      navLinks.forEach(navLink => navLink.classList.remove('active'));
      // Add active to clicked link
      this.classList.add('active');
      
      // Hide all pages first
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });
      
      // Show selected page
      const pageId = `${this.dataset.page}-page`;
      const pageElement = document.getElementById(pageId);
      if (pageElement) {
        pageElement.classList.add('active');
        console.log(`Showing page: ${pageId}`); // Debug log
      } else {
        console.error(`Page element not found: ${pageId}`);
      }
    });
  });

  // 2. DARK MODE TOGGLE
  elements.darkModeToggle?.addEventListener("click", toggleDarkMode);

  // 3. QUIZ FORM SUBMISSION - Prevent default and trigger quiz start
  elements.userForm?.addEventListener("submit", function(e) {
    e.preventDefault();
    elements.startQuizBtn.click();
    return false;
  });

  // 4. QUIZ NEXT BUTTON
  elements.nextBtn?.addEventListener("click", function() {
    if (!quizState.selected) {
      alert("Please select an option before proceeding.");
      return;
    }
    quizState.currentIndex++;
    if (quizState.currentIndex < quizState.currentQuestions.length) {
      updateDisplay();
      quizState.selected = false;
    } else {
      endQuiz();
    }
  });

  // 5. QUIZ OPTIONS CLICK
  elements.optionsEl?.addEventListener("click", function(e) {
    if (e.target.tagName !== "BUTTON" || quizState.selected) return;
    handleOptionClick(e.target);
  });

  // 6. COMPETITION BUTTON
  elements.startCompetitionBtn?.addEventListener("click", function() {
    startCompetition();
  });

  // 7. START QUIZ BUTTON
  if (elements.startQuizBtn) {
    elements.startQuizBtn.addEventListener("click", async () => {
      const name = elements.nameInput.value.trim();
      const matric = elements.matricInput.value.trim().toUpperCase();
      const field = elements.fieldInput.value;

      if (!name || !matric || !field) {
        alert("Please fill in all fields.");
        return;
      }

      quizState.username = name;
      quizState.matric = matric;
      quizState.field = field;

      // Set the department/category name in the quiz header
      if (elements.questionCategory) {
        elements.questionCategory.textContent = field;
      }

      // Fetch questions from backend
      try {
        const questions = await fetchQuestionsFromAPI(field);
        console.log('Fetched questions:', questions);
        if (!questions.length) {
          // Show user-friendly message in the quiz box
          elements.quizBox.classList.remove("hidden");
          elements.resultBox.classList.add("hidden");
          elements.questionEl.textContent = "No questions available for this department. Please contact your department admin.";
          elements.optionsEl.innerHTML = "";
          elements.nextBtn.style.display = "none";
          elements.progressText.textContent = "";
          elements.progressbar.style.width = "0%";
          elements.timeDisplay.textContent = "";
          return;
        }
        quizState.currentQuestions = shuffleArray(questions);
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.wrong = 0;
        quizState.timeLeft = 120;
        quizState.selected = false;

        updateDisplay();
        startTimer();
        showQuizPage();

        elements.greeting.textContent = `Welcome, ${name}! Good luck.`;
      } catch (err) {
        alert("Failed to load questions from server.");
        console.error('Quiz start error:', err);
      }
    });
  }



  // 8. CONTACT FORM
  elements.contactForm?.addEventListener("submit", function(e) {
    e.preventDefault();
    alert("Thank you for your message!");
    this.reset();
  });

  // 9. WINDOW RESIZE
  window.addEventListener("resize", adjustLayout);

  // 10. VIEW LEADERBOARD BUTTON (if exists)
  document.getElementById('view-leaderboard')?.addEventListener("click", function() {
    showLeaderboardPage();
  });
}

/* SUPPORTING FUNCTIONS FOR THE EVENT LISTENERS */

// Improved page navigation functions
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show requested page
  const pageElement = document.getElementById(`${pageId}-page`);
  if (pageElement) {
    pageElement.classList.add('active');
  }
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });
}

// Example of individual page functions
function showHomePage() { showPage('home'); }
function showQuizPage() { showPage('quiz'); }
function showLeaderboardPage() { showPage('leaderboard'); }
function showCompetitionPage() { showPage('competition'); }
function showContactPage() { showPage('contact'); }

// // Initialize the application
// document.addEventListener('DOMContentLoaded', () => {
//   verifyQuestionCounts();
//   validateQuestionIntegrity();
//   setupEventListeners();
//   loadPastScores();
//   checkDarkModePreference();
  
//   // Start with home page
//   showHomePage();
// });

/* Dark Mode */
function toggleDarkMode() {
  quizState.darkMode = !quizState.darkMode;
  if (quizState.darkMode) {
    document.documentElement.classList.add("dark-mode");
    elements.darkModeToggle.textContent = "☀️";
    localStorage.setItem("darkMode", "true");
  } else {
    document.documentElement.classList.remove("dark-mode");
    elements.darkModeToggle.textContent = "🌙";
    localStorage.setItem("darkMode", "false");
  }
}

function checkDarkModePreference() {
  const darkModeStored = localStorage.getItem("darkMode");
  if (darkModeStored === "true") {
    quizState.darkMode = true;
    document.documentElement.classList.add("dark-mode");
    elements.darkModeToggle.textContent = "☀️";
  } else {
    quizState.darkMode = false;
    document.documentElement.classList.remove("dark-mode");
    elements.darkModeToggle.textContent = "🌙";
  }
}

/* User form submit handler */

// handleUserFormSubmit is no longer needed. All quiz start logic is now in the startQuizBtn event listener using the API.

/* Quiz display update */
function updateDisplay() {
  // Show quiz box, hide result box and start message
  elements.quizBox.classList.remove("hidden");
  elements.resultBox.classList.add("hidden");
  elements.startMessage.style.display = "none";

  // Clear previous options
  elements.optionsEl.innerHTML = "";
  elements.timeDisplay.classList.remove("time-warning");
  elements.timeDisplay.textContent = quizState.timeLeft;
  elements.progressText.textContent = `Question ${quizState.currentIndex + 1} of ${quizState.currentQuestions.length}`;

  // Update progress bar
  const progressPercent = ((quizState.currentIndex + 1) / quizState.currentQuestions.length) * 100;
  elements.progressbar.style.width = `${progressPercent}%`;

  const currentQ = quizState.currentQuestions[quizState.currentIndex];
  elements.questionEl.textContent = currentQ.question;

  currentQ.options.forEach(option => {
    const btn = document.createElement("button");
    btn.classList.add("option");
    btn.textContent = option;
    elements.optionsEl.appendChild(btn);
  });

  elements.nextBtn.style.display = "none";

  // Enable options
  Array.from(elements.optionsEl.children).forEach(btn => btn.style.pointerEvents = "auto");
}

/* Handle option click */
function handleOptionClick(selectedBtn) {
  quizState.selected = true;
  const selectedAnswer = selectedBtn.textContent;
  const correctAnswer = quizState.currentQuestions[quizState.currentIndex].answer;

  // Disable all options to prevent multiple selections
  Array.from(elements.optionsEl.children).forEach(btn => btn.style.pointerEvents = "none");

  if (selectedAnswer === correctAnswer) {
    quizState.score++;
    selectedBtn.classList.add("correct");
    playSound(elements.correctSound);
  } else {
    quizState.wrong++;
    selectedBtn.classList.add("wrong");
    playSound(elements.wrongSound);

    // Highlight the correct option
    Array.from(elements.optionsEl.children).forEach(btn => {
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });
  }

  elements.nextBtn.style.display = "inline-block";
}

/* Timer */
function startTimer() {
  if (quizState.timerInterval) clearInterval(quizState.timerInterval);

  playSound(elements.tickSound);
  elements.timeDisplay.classList.remove("time-warning");
  elements.timeDisplay.textContent = quizState.timeLeft;

  quizState.timerInterval = setInterval(() => {
    quizState.timeLeft--;
    elements.timeDisplay.textContent = quizState.timeLeft;

    if (quizState.timeLeft === 30) {
      playSound(elements.timeWarningSound);
      elements.timeDisplay.classList.add("time-warning");
    }

    if (quizState.timeLeft <= 0) {
      clearInterval(quizState.timerInterval);
      playSound(elements.timeUpSound);
      setTimeout(() => {
        alert("Time is up!");
        endQuiz();
      }, 500);
    }
  }, 1000);
}

/* End quiz */

async function endQuiz() {
  clearInterval(quizState.timerInterval);

  // Mark user as done
  if (quizState.matric) {
    localStorage.setItem(quizState.matric, "done");
  }

  // Save result to backend
  const percentage = ((quizState.score / quizState.currentQuestions.length) * 100).toFixed(2);
  const result = {
    name: quizState.username,
    matric: quizState.matric,
    field: quizState.field,
    score: quizState.score,
    total: quizState.currentQuestions.length,
    percentage
  };

  try {
    await saveQuizResultToAPI(result);
  } catch (err) {
    // Optionally handle error
  }

  // Save result to past results (local)
  result.date = new Date().toLocaleString();
  quizState.pastResults.push(result);
  localStorage.setItem("pastResults", JSON.stringify(quizState.pastResults));

  // Show results page
  elements.quizBox.classList.add("hidden");
  elements.resultBox.classList.remove("hidden");

  elements.correctCount.textContent = quizState.score;
  elements.wrongCount.textContent = quizState.wrong;
  elements.percentage.textContent = `${percentage}%`;

  elements.summary.textContent = `You scored ${quizState.score} out of ${quizState.currentQuestions.length}.`;

  // Clear user form fields after quiz is finished
  if (elements.userForm) {
    elements.userForm.reset();
  }

  showLeaderboard();
}

/* Show leaderboard */
function showLeaderboard() {
  // Sort by highest percentage
  const sortedResults = [...quizState.pastResults].sort((a, b) => b.percentage - a.percentage);

  elements.leaderboardList.innerHTML = "";
  sortedResults.forEach((res, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${res.name} (${res.matric}) - ${res.field} - Score: ${res.score}/${res.total} (${res.percentage}%) - ${res.date}`;
    elements.leaderboardList.appendChild(li);
  });
}

/* Save user info for past scores */
function saveUserInfo(matric, name) {
  // Just a simple example: could expand to store in localStorage
}

/* Shuffle array utility */
function shuffleArray(arr) {
  let array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* Play sound utility */
function playSound(audioElement) {
  if (!audioElement) return;
  audioElement.currentTime = 0;
  audioElement.play().catch(() => {});
}

/* Adjust layout for responsiveness */
function adjustLayout() {
  // Implement if needed based on window size
}

/* Start competition mode */
function startCompetition() {
  const name = prompt("Enter your full name:");
  const matric = prompt("Enter your matric number:").toUpperCase();

  if (!name || !matric) {
    alert("Name and matric number are required.");
    return;
  }

  // Prevent multiple attempts per week
  const lastAttempt = localStorage.getItem(`competition-${matric}`);
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (lastAttempt && new Date(lastAttempt).getTime() > oneWeekAgo) {
    alert("You have already participated in this week's competition.");
    return;
  }

  // Save timestamp of this attempt
  localStorage.setItem(`competition-${matric}`, new Date().toISOString());

  quizState.username = name;
  quizState.matric = matric;
  quizState.field = "Competition";
  quizState.isCompetition = true;

  // Shuffle and limit to 20 general questions
  const selected = shuffleArray(generalQuestions).slice(0, 5);
  quizState.currentQuestions = selected;
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.wrong = 0;
  quizState.timeLeft = 90; // 90 seconds for competition
  quizState.selected = false;

  elements.greeting.textContent = `Good luck, ${name}!`;

  updateDisplay();
  startTimer();
  showQuizPage();
}

/* Start quiz (for non-competition) */
function startQuiz() {
  alert("Start quiz from user form submission.");
}

/* Load past scores into leaderboard */
function loadPastScores() {
  const storedResults = JSON.parse(localStorage.getItem("pastResults"));
  if (storedResults) {
    quizState.pastResults = storedResults;
    showLeaderboard();
  }
}