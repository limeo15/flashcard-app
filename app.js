// App State
let currentMode = null;
let currentIndex = 0;
let flashcards = [];
let uploadedFiles = []; // Store info about uploaded files
let learnedCards = new Set();
let cardStats = { easy: 0, good: 0, hard: 0, again: 0 };

// LaTeX Rendering Functions
function renderLatex(element) {
    if (!element || typeof renderMathInElement !== 'function') return;
    
    try {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            errorColor: '#f87171'
        });
    } catch (e) {
        console.warn('LaTeX rendering error:', e);
    }
}

function renderAllLatex() {
    // Render LaTeX in question and answer elements
    renderLatex(questionText);
    renderLatex(answerText);
}

// DOM Elements
const uploadSection = document.getElementById('upload-section');
const modeSelection = document.getElementById('mode-selection');
const flashcardContainer = document.getElementById('flashcard-container');
const completionScreen = document.getElementById('completion-screen');
const flashcard = document.getElementById('flashcard');
const flashcardInner = document.getElementById('flashcard-inner');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const currentCardEl = document.getElementById('current-card');
const totalCardsEl = document.getElementById('total-cards');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressCount = document.getElementById('progress-count');
const remainingCount = document.getElementById('remaining-count');
const confidenceButtons = document.getElementById('confidence-buttons');
const flipHint = document.getElementById('flip-hint');
const quizInputContainer = document.getElementById('quiz-input-container');
const userAnswerInput = document.getElementById('user-answer');
const themeToggle = document.getElementById('theme-toggle');

// File upload elements
const csvFileInput = document.getElementById('csv-file');
const filesList = document.getElementById('files-list');
const filesItems = document.getElementById('files-items');
const totalCardsCount = document.getElementById('total-cards-count');
const clearFilesBtn = document.getElementById('clear-files');
const startLearningBtn = document.getElementById('start-learning');

// Mode cards
const modeCards = document.querySelectorAll('.mode-card');
// Navigation buttons
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const backBtn = document.getElementById('back-btn');
const backToUploadBtn = document.getElementById('back-to-upload');
const restartBtn = document.getElementById('restart-btn');
const checkAnswerBtn = document.getElementById('check-answer');

// Initialize
function init() {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Event Listeners
    themeToggle.addEventListener('click', toggleTheme);
    csvFileInput.addEventListener('change', handleFileUpload);
    clearFilesBtn.addEventListener('click', clearFiles);
    startLearningBtn.addEventListener('click', showModeSelection);
    
    modeCards.forEach(card => {
        card.addEventListener('click', () => startMode(card.dataset.mode));
    });
    
    flashcard.addEventListener('click', flipCard);
    prevBtn.addEventListener('click', prevCard);
    nextBtn.addEventListener('click', nextCard);
    shuffleBtn.addEventListener('click', shuffleCards);
    backBtn.addEventListener('click', goBack);
    backToUploadBtn.addEventListener('click', goToUpload);
    restartBtn.addEventListener('click', restart);
    checkAnswerBtn.addEventListener('click', checkQuizAnswer);
    
    // Confidence buttons
    document.querySelectorAll('.confidence-buttons .btn').forEach(btn => {
        btn.addEventListener('click', () => rateCard(btn.dataset.confidence));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Handle CSV file upload (multiple files)
function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    let filesProcessed = 0;
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const cards = parseCSVContent(content);
            
            if (cards.length > 0) {
                // Add file to uploaded files list
                uploadedFiles.push({
                    name: file.name,
                    cards: cards,
                    count: cards.length
                });
                
                // Add cards to flashcards array
                flashcards = flashcards.concat(cards);
            }
            
            filesProcessed++;
            
            // Update UI when all files processed
            if (filesProcessed === files.length) {
                updateFilesList();
            }
        };
        reader.readAsText(file);
    });
}

// Parse CSV content and return cards array
function parseCSVContent(content) {
    const cards = [];
    const lines = content.split(/\r?\n/);
    
    for (let line of lines) {
        if (!line.trim()) continue;
        
        // Parse CSV line, handling quoted values
        const matches = line.match(/("(?:[^"]|"")*"|[^,]*),("(?:[^"]|"")*"|[^,]*)/);
        
        if (matches && matches.length >= 3) {
            let question = matches[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            let answer = matches[2].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            
            if (question && answer) {
                cards.push({ question, answer });
            }
        }
    }
    
    return cards;
}

// Update files list UI
function updateFilesList() {
    if (uploadedFiles.length === 0) {
        filesList.style.display = 'none';
        return;
    }
    
    filesList.style.display = 'block';
    filesItems.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <div class="file-item-info">
                <span class="file-item-name">${file.name}</span>
                <span class="file-item-count">${file.count} cards</span>
            </div>
            <button class="file-item-remove" data-index="${index}" title="Remove file">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        filesItems.appendChild(li);
    });
    
    // Add remove button listeners
    document.querySelectorAll('.file-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            removeFile(index);
        });
    });
    
    totalCardsCount.textContent = flashcards.length;
}

// Remove a single file
function removeFile(index) {
    const removedFile = uploadedFiles[index];
    
    // Remove cards from this file
    const cardsToRemove = removedFile.cards;
    flashcards = flashcards.filter(card => !cardsToRemove.includes(card));
    
    // Remove from uploaded files
    uploadedFiles.splice(index, 1);
    
    updateFilesList();
}

// Clear all files
function clearFiles() {
    uploadedFiles = [];
    flashcards = [];
    csvFileInput.value = '';
    updateFilesList();
}

// Show mode selection
function showModeSelection() {
    if (flashcards.length === 0) return;
    
    uploadSection.style.display = 'none';
    modeSelection.style.display = 'block';
    totalCardsEl.textContent = flashcards.length;
    remainingCount.textContent = flashcards.length;
}

// Start learning mode
function startMode(mode) {
    currentMode = mode;
    currentIndex = 0;
    learnedCards.clear();
    cardStats = { easy: 0, good: 0, hard: 0, again: 0 };
    
    if (mode === 'random') {
        shuffleArray(flashcards);
    }
    
    modeSelection.style.display = 'none';
    flashcardContainer.style.display = 'flex';
    completionScreen.style.display = 'none';
    uploadSection.style.display = 'none';
    
    // Show/hide quiz input
    if (mode === 'quiz') {
        quizInputContainer.style.display = 'block';
        flipHint.style.display = 'none';
    } else {
        quizInputContainer.style.display = 'none';
        flipHint.style.display = 'block';
    }
    
    updateCard();
    updateProgress();
}

// Flip card
function flipCard() {
    if (currentMode === 'quiz' && !flashcard.classList.contains('flipped')) {
        return; // In quiz mode, must check answer first
    }
    flashcard.classList.toggle('flipped');
    
    if (flashcard.classList.contains('flipped')) {
        confidenceButtons.style.display = 'grid';
        flipHint.style.display = 'none';
    } else {
        confidenceButtons.style.display = 'none';
        if (currentMode !== 'quiz') {
            flipHint.style.display = 'block';
        }
    }
}

// Update displayed card
function updateCard() {
    if (currentIndex >= flashcards.length) {
        showCompletion();
        return;
    }
    
    const card = flashcards[currentIndex];
    questionText.textContent = card.question;
    answerText.textContent = card.answer;
    currentCardEl.textContent = currentIndex + 1;
    
    // Render LaTeX formulas after setting text content
    setTimeout(() => {
        renderAllLatex();
    }, 10);
    
    // Reset card state
    flashcard.classList.remove('flipped');
    confidenceButtons.style.display = 'none';
    
    if (currentMode === 'quiz') {
        flipHint.style.display = 'none';
        quizInputContainer.style.display = 'block';
        userAnswerInput.value = '';
        userAnswerInput.focus();
    } else {
        flipHint.style.display = 'block';
        quizInputContainer.style.display = 'none';
    }
    
    // Update navigation buttons
    prevBtn.disabled = currentIndex === 0;
}

// Navigate to previous card
function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCard();
    }
}

// Navigate to next card
function nextCard() {
    if (currentIndex < flashcards.length - 1) {
        currentIndex++;
        updateCard();
    }
}

// Shuffle cards
function shuffleCards() {
    shuffleArray(flashcards);
    currentIndex = 0;
    updateCard();
    
    // Visual feedback
    shuffleBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        shuffleBtn.style.transform = '';
    }, 150);
}

// Rate card (confidence)
function rateCard(confidence) {
    cardStats[confidence]++;
    
    if (confidence !== 'again') {
        learnedCards.add(currentIndex);
    }
    
    updateProgress();
    
    // Move to next card
    currentIndex++;
    updateCard();
}

// Check quiz answer
function checkQuizAnswer() {
    const userAnswer = userAnswerInput.value.trim().toLowerCase();
    const correctAnswer = flashcards[currentIndex].answer.toLowerCase();
    
    // Simple similarity check
    const similarity = calculateSimilarity(userAnswer, correctAnswer);
    
    flashcard.classList.add('flipped');
    confidenceButtons.style.display = 'grid';
    quizInputContainer.style.display = 'none';
    
    // Highlight based on similarity
    if (similarity > 0.7) {
        answerText.style.color = '#10b981'; // Green for good match
    } else if (similarity > 0.4) {
        answerText.style.color = '#f59e0b'; // Yellow for partial match
    } else {
        answerText.style.color = '#ef4444'; // Red for poor match
    }
    
    // Reset color after moving to next card
    setTimeout(() => {
        answerText.style.color = '';
    }, 2000);
}

// Calculate string similarity (simple version)
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    words1.forEach(word => {
        if (words2.some(w => w.includes(word) || word.includes(w))) {
            matches++;
        }
    });
    
    return matches / Math.max(words1.length, words2.length);
}

// Update progress
function updateProgress() {
    const learned = learnedCards.size;
    const total = flashcards.length;
    const percentage = Math.round((learned / total) * 100);
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    progressCount.textContent = learned;
    remainingCount.textContent = total - learned;
}

// Show completion screen
function showCompletion() {
    flashcardContainer.style.display = 'none';
    completionScreen.style.display = 'block';
    
    document.getElementById('easy-count').textContent = cardStats.easy;
    document.getElementById('good-count').textContent = cardStats.good;
    document.getElementById('hard-count').textContent = cardStats.hard;
}

// Go back to mode selection
function goBack() {
    flashcardContainer.style.display = 'none';
    completionScreen.style.display = 'none';
    modeSelection.style.display = 'block';
    uploadSection.style.display = 'none';
    
    // Reset
    currentMode = null;
    currentIndex = 0;
    learnedCards.clear();
    cardStats = { easy: 0, good: 0, hard: 0, again: 0 };
    updateProgress();
}

// Go back to upload
function goToUpload() {
    flashcardContainer.style.display = 'none';
    completionScreen.style.display = 'none';
    modeSelection.style.display = 'none';
    uploadSection.style.display = 'flex';
    
    // Reset
    currentMode = null;
    currentIndex = 0;
    flashcards = [];
    uploadedFiles = [];
    learnedCards.clear();
    cardStats = { easy: 0, good: 0, hard: 0, again: 0 };
    csvFileInput.value = '';
    updateFilesList();
    updateProgress();
}

// Restart
function restart() {
    goBack();
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Keyboard shortcuts
function handleKeyboard(e) {
    if (!currentMode) return;
    
    // Ignore if typing in textarea
    if (e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && e.ctrlKey) {
            checkQuizAnswer();
        }
        return;
    }
    
    switch(e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            flipCard();
            break;
        case 'ArrowLeft':
            prevCard();
            break;
        case 'ArrowRight':
            if (flashcard.classList.contains('flipped')) {
                rateCard('good');
            } else {
                nextCard();
            }
            break;
        case '1':
            if (flashcard.classList.contains('flipped')) rateCard('again');
            break;
        case '2':
            if (flashcard.classList.contains('flipped')) rateCard('hard');
            break;
        case '3':
            if (flashcard.classList.contains('flipped')) rateCard('good');
            break;
        case '4':
            if (flashcard.classList.contains('flipped')) rateCard('easy');
            break;
        case 'Escape':
            goBack();
            break;
    }
}

// Start the app
init();
