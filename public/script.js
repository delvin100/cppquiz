// Determine BASE_URL based on environment
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://cpp-quiz-backend.onrender.com'; // Replace with your actual Render URL after deployment

let token = localStorage.getItem('token') || '';
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let currentLevel = '';

// Sound Effects (using publicly hosted URLs)
const correctSound = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
const wrongSound = new Audio('https://www.soundjay.com/buttons/beep-02.mp3');
const quizEndSound = new Audio('https://www.soundjay.com/buttons/beep-03.mp3');

// Signup
async function signup() {
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  const errorDiv = document.getElementById('signup-error');
  errorDiv.textContent = '';

  try {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('token', token);
      errorDiv.textContent = 'Signup successful!';
      setTimeout(() => window.location.reload(), 1000);
    } else {
      errorDiv.textContent = data.msg || 'Signup failed';
    }
  } catch (err) {
    errorDiv.textContent = 'Network error - server might be down';
  }
}

// Login
async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = '';

  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('token', token);
      errorDiv.textContent = 'Login successful!';
      setTimeout(() => window.location.reload(), 1000);
    } else {
      errorDiv.textContent = data.msg || 'Login failed';
    }
  } catch (err) {
    errorDiv.textContent = 'Network error - server might be down';
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  token = '';
  window.location.reload();
}

// Check if Logged In
if (token) {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  showDashboard();
}

// Show Main Menu
function showMain() {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('level-select').classList.remove('hidden');
  document.getElementById('quiz-container').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('certificate').classList.add('hidden');
  document.getElementById('leaderboard').classList.add('hidden');
  clearInterval(timerInterval);
}

// Show Dashboard
async function showDashboard() {
  document.getElementById('level-select').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('quiz-container').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('certificate').classList.add('hidden');
  document.getElementById('leaderboard').classList.add('hidden');

  try {
    const res = await fetch(`${BASE_URL}/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();

    document.getElementById('user-name').textContent = user.username;
    document.getElementById('total-quizzes').textContent = user.scores.length;
    const avgScore = user.scores.length ? (user.scores.reduce((sum, s) => sum + s.score, 0) / user.scores.length).toFixed(2) : 0;
    document.getElementById('avg-score').textContent = avgScore;

    // Level Progress
    const scoresByLevel = { easy: 0, medium: 0, hard: 0 };
    user.scores.forEach(s => scoresByLevel[s.level] += s.score);
    document.getElementById('easy-progress').style.width = `${Math.min((scoresByLevel.easy / 10) * 100, 100)}%`;
    document.getElementById('medium-progress').style.width = `${Math.min((scoresByLevel.medium / 20) * 100, 100)}%`;
    document.getElementById('hard-progress').style.width = `${Math.min((scoresByLevel.hard / 30) * 100, 100)}%`;

    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';
    user.scores.forEach(s => {
      const div = document.createElement('div');
      div.className = 'score-item';
      div.textContent = `${s.level} - ${s.score} points (${new Date(s.date).toLocaleDateString()})`;
      scoreList.appendChild(div);
    });
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// Show Leaderboard
async function showLeaderboard() {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('leaderboard').classList.remove('hidden');

  try {
    const res = await fetch(`${BASE_URL}/leaderboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const leaderboard = await res.json();

    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    leaderboard.forEach((entry, index) => {
      const div = document.createElement('div');
      div.className = 'leaderboard-item';
      div.textContent = `${index + 1}. ${entry.username} - ${entry.totalScore} points`;
      leaderboardList.appendChild(div);
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
  }
}

// Start Quiz
document.querySelectorAll('.level-btn[data-level]').forEach(btn => {
  btn.addEventListener('click', async () => {
    currentLevel = btn.dataset.level;
    currentQuiz = await fetchQuiz(currentLevel);
    currentQuestionIndex = 0;
    score = 0;
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    loadQuestion();
  });
});

// Fetch Quiz Data
async function fetchQuiz(level) {
  const res = await fetch(`${BASE_URL}/quiz/${level}`);
  return await res.json();
}

// Load Question
function loadQuestion() {
  const question = currentQuiz[currentQuestionIndex];
  document.getElementById('question').textContent = question.question;
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  question.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => checkAnswer(opt, question.correctAnswer, question.points));
    optionsDiv.appendChild(btn);
  });

  document.getElementById('progress').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.length}`;
  const progressPercent = ((currentQuestionIndex + 1) / currentQuiz.length) * 100;
  document.getElementById('progress-fill').style.width = `${progressPercent}%`;
  document.getElementById('next-btn').disabled = true;

  startQuestionTimer();
}

// Check Answer
function checkAnswer(selected, correct, points) {
  clearInterval(timerInterval);
  const buttons = document.querySelectorAll('#options button');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add('correct');
    if (btn.textContent === selected && selected !== correct) btn.classList.add('wrong');
  });

  if (selected === correct) {
    score += points;
    correctSound.play();
  } else {
    wrongSound.play();
  }
  document.getElementById('score').textContent = `Score: ${score}`;
  document.getElementById('next-btn').disabled = false;
}

// Next Question
document.getElementById('next-btn').addEventListener('click', () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuiz.length) {
    loadQuestion();
  } else {
    endQuiz();
  }
});

// Start Question Timer (10 seconds per question)
function startQuestionTimer() {
  let timeLeft = 10;
  document.getElementById('timer').textContent = `Time: ${timeLeft}s`;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      checkAnswer(null, currentQuiz[currentQuestionIndex].correctAnswer, 0); // Auto-fail if time runs out
    }
  }, 1000);
}

// End Quiz
async function endQuiz() {
  clearInterval(timerInterval);
  quizEndSound.play();
  document.getElementById('quiz-container').classList.add('hidden');
  const resultDiv = document.getElementById('result');
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = `Quiz Over! Your score: ${score}<br>
    <button class="level-btn" onclick="submitScore()">Submit Score</button>
    <button class="level-btn" onclick="generateCertificate()">Get Certificate</button>
    <button class="back-btn" onclick="showMain()">Back</button>`;

  await fetch(`${BASE_URL}/submit-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ level: currentLevel, score })
  });
}

// Submit Score and Refresh Dashboard
async function submitScore() {
  await showDashboard();
  document.getElementById('result').classList.add('hidden');
}

// Generate Certificate
async function generateCertificate() {
  document.getElementById('result').classList.add('hidden');
  document.getElementById('certificate').classList.remove('hidden');
  const certContent = document.getElementById('cert-content');
  const userRes = await fetch(`${BASE_URL}/user`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const user = await userRes.json();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  certContent.innerHTML = `
    <div class="cert-border">
      <div class="cert-header">
        <h3>C++ Quiz Master Certificate</h3>
        <div class="cert-seal"></div>
      </div>
      <div class="cert-body">
        <p class="cert-title">Certificate of Achievement</p>
        <p class="cert-awarded">This is to certify that</p>
        <p class="cert-name">${user.username}</p>
        <p class="cert-description">has successfully completed the ${currentLevel} level quiz</p>
        <p class="cert-score">with a score of ${score} / ${currentLevel === 'easy' ? 10 : currentLevel === 'medium' ? 20 : 30}</p>
      </div>
      <div class="cert-footer">
        <p class="cert-date">Awarded on ${formattedDate}</p>
        <div class="cert-signature">
          <div class="signature-line"></div>
          <p>Quiz Master</p>
        </div>
      </div>
    </div>
  `;
}

// Download Certificate
function downloadCertificate() {
  const { jsPDF } = window.jspdf;
  const cert = document.getElementById('cert-content');

  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.position = 'fixed';
  loadingDiv.style.top = '20px';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translateX(-50%)';
  loadingDiv.style.padding = '10px 20px';
  loadingDiv.style.background = '#1e90ff';
  loadingDiv.style.color = '#fff';
  loadingDiv.style.borderRadius = '5px';
  loadingDiv.style.zIndex = '1000';
  loadingDiv.textContent = 'Generating certificate...';
  document.body.appendChild(loadingDiv);

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // PDF dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // Add background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add borders
  pdf.setDrawColor(30, 144, 255); // #1e90ff
  pdf.setLineWidth(0.5);
  pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  
  pdf.setDrawColor(255, 20, 147); // #ff1493
  pdf.setLineWidth(0.5);
  pdf.rect(margin + 2, margin + 2, pageWidth - 2 * (margin + 2), pageHeight - 2 * (margin + 2));

  // Add header
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 144, 255);
  pdf.setFontSize(32);
  pdf.text('C++ Quiz Master Certificate', pageWidth / 2, 40, { align: 'center' });

  // Add content
  pdf.setTextColor(51, 51, 51);
  pdf.setFontSize(24);
  pdf.text('Certificate of Achievement', pageWidth / 2, 70, { align: 'center' });

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This is to certify that', pageWidth / 2, 90, { align: 'center' });

  // Add name
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 144, 255);
  pdf.setFontSize(28);
  const username = document.querySelector('.cert-name').textContent;
  pdf.text(username, pageWidth / 2, 110, { align: 'center' });

  // Add description
  pdf.setTextColor(51, 51, 51);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  const levelText = `has successfully completed the ${currentLevel} level quiz`;
  pdf.text(levelText, pageWidth / 2, 130, { align: 'center' });

  // Add score
  pdf.setTextColor(255, 20, 147);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  const scoreText = `with a score of ${score} / ${currentLevel === 'easy' ? 10 : currentLevel === 'medium' ? 20 : 30}`;
  pdf.text(scoreText, pageWidth / 2, 150, { align: 'center' });

  // Add date and signature
  pdf.setTextColor(102, 102, 102);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(14);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  pdf.text(`Awarded on ${date}`, margin + 20, pageHeight - 30);

  // Add signature
  pdf.setDrawColor(30, 144, 255);
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth - margin - 80, pageHeight - 40, pageWidth - margin - 20, pageHeight - 40);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 51, 51);
  pdf.text('Quiz Master', pageWidth - margin - 70, pageHeight - 30);

  // Add decorative seal
  pdf.setDrawColor(30, 144, 255);
  pdf.circle(pageWidth - margin - 40, 40, 15, 'S');
  pdf.setDrawColor(255, 20, 147);
  pdf.circle(pageWidth - margin - 40, 40, 12, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('C++', pageWidth - margin - 40, 42, { align: 'center' });

  // Save the PDF
  const level = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1);
  const fileName = `${username}_${level}_Certificate_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  // Remove loading indicator
  document.body.removeChild(loadingDiv);
}