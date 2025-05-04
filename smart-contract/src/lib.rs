use linera_sdk::base::{Owner, ChainId, ApplicationId};
use linera_sdk::contract::{contract, ApplicationCallResult};
use linera_sdk::views::{Register, View, ViewStorage};
use linera_sdk::service::system_api;
use serde::{Deserialize, Serialize};

#[derive(Debug, View, Serialize, Deserialize)]
pub struct MicroMatch {
    #[view]
    pub puzzles: Register<Vec<Puzzle>>,
    #[view]
    pub games: Register<Vec<Game>>,
    #[view]
    pub players: Register<Vec<Player>>,
    #[view]
    pub matchmaking_queue: Register<Vec<Owner>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Puzzle {
    pub question: String,
    pub answer: String,
    pub difficulty: u8, // 1-5 scale
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Player {
    pub owner: Owner,
    pub name: String,
    pub score: u32,
    pub is_available: bool,
    pub chain_id: ChainId,
    pub wins: u32,
    pub losses: u32,
    pub last_active: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Game {
    pub game_id: u64,
    pub player1: Owner,
    pub player2: Owner,
    pub player1_chain: ChainId,
    pub player2_chain: ChainId,
    pub current_puzzle: u32,
    pub player1_score: u32,
    pub player2_score: u32,
    pub is_active: bool,
    pub start_time: u64,
    pub last_move_time: u64,
    pub moves: Vec<GameMove>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct GameMove {
    pub player: Owner,
    pub puzzle_index: u32,
    pub answer: String,
    pub is_correct: bool,
    pub timestamp: u64,
}

#[contract]
impl MicroMatch {
    pub fn initialize(&mut self, owner: Owner) {
        // Initialize with sample puzzles of varying difficulty
        let default_puzzles = vec![
            Puzzle { question: "5 + 7 = ?".to_string(), answer: "12".to_string(), difficulty: 1 },
            Puzzle { question: "8 × 6 = ?".to_string(), answer: "48".to_string(), difficulty: 2 },
            Puzzle { question: "15 - 9 = ?".to_string(), answer: "6".to_string(), difficulty: 1 },
            Puzzle { question: "9 + 10 = ?".to_string(), answer: "19".to_string(), difficulty: 1 },
            Puzzle { question: "7 × 5 = ?".to_string(), answer: "35".to_string(), difficulty: 2 },
            Puzzle { question: "12 × 12 = ?".to_string(), answer: "144".to_string(), difficulty: 3 },
            Puzzle { question: "25 ÷ 5 = ?".to_string(), answer: "5".to_string(), difficulty: 2 },
            Puzzle { question: "3³ = ?".to_string(), answer: "27".to_string(), difficulty: 4 },
            Puzzle { question: "√16 = ?".to_string(), answer: "4".to_string(), difficulty: 3 },
            Puzzle { question: "2⁴ = ?".to_string(), answer: "16".to_string(), difficulty: 4 },
        ];
        self.puzzles.set(default_puzzles);
        self.games.set(Vec::new());
        self.players.set(Vec::new());
        self.matchmaking_queue.set(Vec::new());
    }

    pub fn register_player(&mut self, owner: Owner, name: String) -> ApplicationCallResult {
        let mut players = self.players.get();
        if !players.iter().any(|p| p.owner == owner) {
            let chain_id = system_api::current_chain_id();
            players.push(Player {
                owner: owner.clone(),
                name,
                score: 0,
                is_available: true,
                chain_id,
                wins: 0,
                losses: 0,
                last_active: system_api::current_system_time(),
            });
            self.players.set(players);
        }
        Ok(())
    }

    pub fn join_matchmaking(&mut self, player: Owner) -> ApplicationCallResult {
        let mut queue = self.matchmaking_queue.get();
        if !queue.contains(&player) {
            queue.push(player);
            self.matchmaking_queue.set(queue);
            
            // Try to find a match immediately
            self.try_matchmaking()?;
        }
        Ok(())
    }

    fn try_matchmaking(&mut self) -> ApplicationCallResult {
        let mut queue = self.matchmaking_queue.get();
        let mut players = self.players.get();
        let mut games = self.games.get();
        
        while queue.len() >= 2 {
            let player1 = queue.remove(0);
            let player2 = queue.remove(0);
            
            // Create a new game
            let game = Game {
                game_id: system_api::current_system_time(),
                player1: player1.clone(),
                player2: player2.clone(),
                player1_chain: players.iter().find(|p| p.owner == player1).unwrap().chain_id,
                player2_chain: players.iter().find(|p| p.owner == player2).unwrap().chain_id,
                current_puzzle: 0,
                player1_score: 0,
                player2_score: 0,
                is_active: true,
                start_time: system_api::current_system_time(),
                last_move_time: system_api::current_system_time(),
                moves: Vec::new(),
            };
            
            // Update player availability
            for p in players.iter_mut() {
                if p.owner == player1 || p.owner == player2 {
                    p.is_available = false;
                    p.last_active = system_api::current_system_time();
                }
            }
            
            games.push(game);
        }
        
        self.matchmaking_queue.set(queue);
        self.players.set(players);
        self.games.set(games);
        Ok(())
    }

    pub fn submit_answer(&mut self, player: Owner, game_id: u64, answer: String) -> ApplicationCallResult {
        let mut games = self.games.get();
        if let Some(game) = games.iter_mut().find(|g| g.game_id == game_id) {
            if !game.is_active {
                return Ok(());
            }

            let puzzles = self.puzzles.get();
            if let Some(puzzle) = puzzles.get(game.current_puzzle as usize) {
                let is_correct = answer == puzzle.answer;
                let move_time = system_api::current_system_time();
                
                // Record the move
                game.moves.push(GameMove {
                    player: player.clone(),
                    puzzle_index: game.current_puzzle,
                    answer: answer.clone(),
                    is_correct,
                    timestamp: move_time,
                });

                if is_correct {
                    if player == game.player1 {
                        game.player1_score += 1;
                    } else if player == game.player2 {
                        game.player2_score += 1;
                    }
                }

                game.current_puzzle += 1;
                game.last_move_time = move_time;

                if game.current_puzzle >= puzzles.len() as u32 {
                    game.is_active = false;
                    
                    // Update player stats
                    let mut players = self.players.get();
                    for p in players.iter_mut() {
                        if p.owner == game.player1 || p.owner == game.player2 {
                            p.is_available = true;
                            p.last_active = move_time;
                            if p.owner == game.player1 {
                                if game.player1_score > game.player2_score {
                                    p.wins += 1;
                                } else {
                                    p.losses += 1;
                                }
                            } else if p.owner == game.player2 {
                                if game.player2_score > game.player1_score {
                                    p.wins += 1;
                                } else {
                                    p.losses += 1;
                                }
                            }
                        }
                    }
                    self.players.set(players);
                }
            }
            self.games.set(games);
        }
        Ok(())
    }

    pub fn get_game_state(&self, game_id: u64) -> Option<Game> {
        self.games.get().iter().find(|g| g.game_id == game_id).cloned()
    }

    pub fn get_player_stats(&self, player: Owner) -> Option<Player> {
        self.players.get().iter().find(|p| p.owner == player).cloned()
    }

    pub fn get_available_players(&self) -> Vec<Player> {
        self.players.get().iter()
            .filter(|p| p.is_available)
            .cloned()
            .collect()
    }

    pub fn get_leaderboard(&self) -> Vec<Player> {
        let mut players = self.players.get();
        players.sort_by(|a, b| b.score.cmp(&a.score));
        players
    }
}

linera_sdk::contract::main!(MicroMatch);