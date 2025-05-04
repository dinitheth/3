// Local game state management
class LocalGameClient {
    constructor() {
        this.games = new Map();
        this.players = new Map();
        this.puzzles = [
            { question: "5 + 7 = ?", answer: "12", difficulty: 1 },
            { question: "8 × 6 = ?", answer: "48", difficulty: 2 },
            { question: "15 - 9 = ?", answer: "6", difficulty: 1 },
            { question: "9 + 10 = ?", answer: "19", difficulty: 1 },
            { question: "7 × 5 = ?", answer: "35", difficulty: 2 },
            { question: "12 × 12 = ?", answer: "144", difficulty: 3 },
            { question: "25 ÷ 5 = ?", answer: "5", difficulty: 2 },
            { question: "3³ = ?", answer: "27", difficulty: 4 },
            { question: "√16 = ?", answer: "4", difficulty: 3 },
            { question: "2⁴ = ?", answer: "16", difficulty: 4 }
        ];
        this.currentGameId = 0;
        this.botPlayers = new Map();
    }

    async connect() {
        // Generate a random player ID
        const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        return { owner: playerId };
    }

    async call(method, ...args) {
        switch (method) {
            case 'register_player':
                return this.registerPlayer(...args);
            case 'join_matchmaking':
                return this.joinMatchmaking(...args);
            case 'get_game_state':
                return this.getGameState(...args);
            case 'submit_answer':
                return this.submitAnswer(...args);
            case 'get_leaderboard':
                return this.getLeaderboard();
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    registerPlayer(playerId, name) {
        if (!this.players.has(playerId)) {
            this.players.set(playerId, {
                owner: playerId,
                name: name,
                score: 0,
                is_available: true,
                wins: 0,
                losses: 0,
                last_active: Date.now()
            });
        }
        return this.players.get(playerId);
    }

    createBotPlayer() {
        const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
        const botNames = ['AI Challenger', 'Math Master', 'Puzzle Bot', 'Quick Thinker', 'Number Ninja'];
        const botName = botNames[Math.floor(Math.random() * botNames.length)];
        
        this.players.set(botId, {
            owner: botId,
            name: botName,
            score: 0,
            is_available: true,
            wins: Math.floor(Math.random() * 10),
            losses: Math.floor(Math.random() * 5),
            last_active: Date.now(),
            is_bot: true
        });
        
        return this.players.get(botId);
    }

    joinMatchmaking(playerId) {
        const player = this.players.get(playerId);
        if (!player) throw new Error('Player not found');

        // Create a bot opponent
        const bot = this.createBotPlayer();
        
        // Create a new game
        const gameId = this.currentGameId++;
        const game = {
            game_id: gameId,
            player1: playerId,
            player2: bot.owner,
            current_puzzle: 0,
            player1_score: 0,
            player2_score: 0,
            is_active: true,
            start_time: Date.now(),
            last_move_time: Date.now(),
            moves: []
        };

        this.games.set(gameId, game);
        
        // Update player availability
        player.is_available = false;
        bot.is_available = false;
        
        return game;
    }

    getGameState(playerId) {
        const game = Array.from(this.games.values())
            .find(g => (g.player1 === playerId || g.player2 === playerId) && g.is_active);
        
        if (game) {
            // Simulate bot's answer after a delay
            const botId = game.player1 === playerId ? game.player2 : game.player1;
            const bot = this.players.get(botId);
            
            if (bot && bot.is_bot && game.moves.length % 2 === 0) {
                setTimeout(() => {
                    const puzzle = this.puzzles[game.current_puzzle];
                    this.submitAnswer(botId, game.game_id, puzzle.answer);
                }, 2000); // Bot answers after 2 seconds
            }
        }
        
        return game || null;
    }

    submitAnswer(playerId, gameId, answer) {
        const game = this.games.get(gameId);
        if (!game || !game.is_active) return;

        const puzzle = this.puzzles[game.current_puzzle];
        const isCorrect = answer === puzzle.answer;

        // Record the move
        game.moves.push({
            player: playerId,
            puzzle_index: game.current_puzzle,
            answer: answer,
            is_correct: isCorrect,
            timestamp: Date.now()
        });

        // Update score
        if (isCorrect) {
            if (playerId === game.player1) {
                game.player1_score++;
            } else {
                game.player2_score++;
            }
        }

        // Move to next puzzle
        game.current_puzzle++;
        game.last_move_time = Date.now();

        // Check if game is over
        if (game.current_puzzle >= this.puzzles.length) {
            game.is_active = false;
            
            // Update player stats
            const player1 = this.players.get(game.player1);
            const player2 = this.players.get(game.player2);
            
            player1.is_available = true;
            player2.is_available = true;
            
            if (game.player1_score > game.player2_score) {
                player1.wins++;
                player2.losses++;
            } else if (game.player2_score > game.player1_score) {
                player2.wins++;
                player1.losses++;
            }
        }

        return game;
    }

    getLeaderboard() {
        return Array.from(this.players.values())
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 10);
    }
}

// Initialize global game client
window.lineraClient = new LocalGameClient(); 