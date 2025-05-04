// Game state
let gameState = null;
let playerId = null;
let playerName = null;
let currentPuzzle = null;
let gameInterval = null;

// DOM elements
const registrationState = document.getElementById('registration');
const matchmakingState = document.getElementById('matchmaking');
const gameStateEl = document.getElementById('game');
const resultsState = document.getElementById('results');
const playerNameInput = document.getElementById('player-name-input');
const registerBtn = document.getElementById('register-btn');
const cancelMatchmakingBtn = document.getElementById('cancel-matchmaking');
const submitBtn = document.getElementById('submit-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const playerNameEl = document.getElementById('player-name');
const playerStatsEl = document.getElementById('player-stats');
const questionEl = document.getElementById('question');
const answerEl = document.getElementById('answer');
const timerBar = document.querySelector('.timer-bar');
const leaderboardList = document.getElementById('leaderboard-list');
const errorMessage = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading-indicator');

// Initialize game
async function initializeGame() {
    try {
        showLoading('Initializing game...');
        
        // Connect to local game client
        const wallet = await window.lineraClient.connect();
        playerId = wallet.owner;
        
        hideLoading();
        showWelcomeScreen();
    } catch (error) {
        showError(error.message);
        hideLoading();
    }
}

// Start game
async function startGame() {
    try {
        playerName = playerNameInput.value.trim();
        if (!playerName) {
            showError('Please enter your name');
            return;
        }

        showLoading('Joining game...');
        
        // Register player
        const playerStats = await window.lineraClient.call('register_player', playerId, playerName);
        
        // Update player info display
        playerNameEl.textContent = playerName;
        playerStatsEl.textContent = `Wins: ${playerStats.wins} | Losses: ${playerStats.losses}`;
        
        // Join matchmaking
        gameState = await window.lineraClient.call('join_matchmaking', playerId);
        
        if (gameState) {
            hideWelcomeScreen();
            showGameScreen();
            startGameLoop();
        } else {
            showError('No opponent found. Please try again later.');
        }
        
        hideLoading();
    } catch (error) {
        showError(error.message);
        hideLoading();
    }
}

// Game loop
function startGameLoop() {
    updateGameState();
    gameInterval = setInterval(updateGameState, 1000);
}

// Update game state
async function updateGameState() {
    try {
        if (!gameState) return;
        
        const updatedState = await window.lineraClient.call('get_game_state', playerId);
        if (!updatedState) {
            clearInterval(gameInterval);
            showWelcomeScreen();
            return;
        }
        
        gameState = updatedState;
        updateUI();
    } catch (error) {
        console.error('Error updating game state:', error);
    }
}

// Submit answer
async function submitAnswer() {
    try {
        const answer = answerEl.value.trim();
        if (!answer) return;
        
        showLoading('Submitting answer...');
        
        // Submit answer
        gameState = await window.lineraClient.call('submit_answer', playerId, gameState.game_id, answer);
        
        // Clear input
        answerEl.value = '';
        
        // Update UI
        updateUI();
        
        hideLoading();
    } catch (error) {
        showError(error.message);
        hideLoading();
    }
}

// Update UI
function updateUI() {
    if (!gameState) return;
    
    // Update puzzle display
    const puzzle = window.lineraClient.puzzles[gameState.current_puzzle];
    questionEl.textContent = puzzle.question;
    
    // Update score
    const isPlayer1 = playerId === gameState.player1;
    const playerScore = isPlayer1 ? gameState.player1_score : gameState.player2_score;
    const opponentScore = isPlayer1 ? gameState.player2_score : gameState.player1_score;
    
    // Update player names and scores
    document.getElementById('player1-name').textContent = isPlayer1 ? 'You' : 'Opponent';
    document.getElementById('player2-name').textContent = isPlayer1 ? 'Opponent' : 'You';
    document.getElementById('player1-score').textContent = isPlayer1 ? playerScore : opponentScore;
    document.getElementById('player2-score').textContent = isPlayer1 ? opponentScore : playerScore;
    
    // Update puzzle info
    document.getElementById('puzzle-number').textContent = `Puzzle ${gameState.current_puzzle + 1}/10`;
    document.getElementById('puzzle-difficulty').textContent = `Difficulty: ${getDifficultyText(puzzle.difficulty)}`;
    
    // Update player stats
    const player = window.lineraClient.players.get(playerId);
    if (player) {
        playerStatsEl.textContent = `Wins: ${player.wins} | Losses: ${player.losses}`;
    }
    
    // Update leaderboard
    updateLeaderboard();
}

// Get difficulty text
function getDifficultyText(difficulty) {
    const difficulties = ['Easy', 'Medium', 'Hard', 'Very Hard', 'Expert'];
    return difficulties[difficulty - 1] || 'Unknown';
}

// Update leaderboard
async function updateLeaderboard() {
    try {
        const leaderboard = await window.lineraClient.call('get_leaderboard');
        leaderboardList.innerHTML = leaderboard
            .map((player, index) => `
                <div class="leaderboard-item">
                    <span>${index + 1}. ${player.name}</span>
                    <span>${player.wins}W ${player.losses}L</span>
                </div>
            `)
            .join('');
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// UI helpers
function showWelcomeScreen() {
    registrationState.classList.remove('hidden');
    matchmakingState.classList.add('hidden');
    gameStateEl.classList.add('hidden');
    resultsState.classList.add('hidden');
}

function hideWelcomeScreen() {
    registrationState.classList.add('hidden');
}

function showGameScreen() {
    gameStateEl.classList.remove('hidden');
}

function showLoading(message) {
    if (loadingIndicator) {
        loadingIndicator.textContent = message;
        loadingIndicator.style.display = 'block';
    }
}

function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
    }
}

// Event listeners
registerBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', submitAnswer);
answerEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

// Start the game
initializeGame();
updateLeaderboard();