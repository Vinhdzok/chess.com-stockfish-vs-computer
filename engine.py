from stockfish import Stockfish
from typing import List
import chess
from config import properties
import os

# Initialize Stockfish once with a path that checks for common locations
def get_stockfish_path():
    # Common paths to check
    paths = [
        "C:/Chess Engines/Stockfish 17/stockfish.exe",  # Original path
        "./stockfish",  # Linux/Mac relative path
        "./stockfish.exe",  # Windows relative path
        # Add more common paths if needed
    ]
    
    for path in paths:
        if os.path.exists(path):
            return path
    
    # If no path found, let Stockfish handle the error
    return "stockfish"  # Default to let system find it

# Initialize stockfish engine once
stockfish = Stockfish(get_stockfish_path(), parameters={
    "Threads": properties.threads, 
    "Hash": properties.hash,
    "Skill Level": 20,  # Maximum skill level
    "Contempt": 0,      # Neutral contempt
    "Minimum Thinking Time": 20  # Ensures minimum thinking time
})

def think(moves: List[str]) -> str:
    try:
        # Create a fresh board
        board = chess.Board()
        
        # Track valid UCI moves
        uci_moves = []
        
        # Convert SAN to UCI and validate moves
        for move in moves:
            try:
                board.push_san(move)
                uci_moves.append(board.peek().uci())
            except ValueError as e:
                return f"Invalid move: {move} - {str(e)}"
        
        # Set position and get best move
        stockfish.set_position(uci_moves)
        best_move = stockfish.get_best_move_time(properties.milliseconds)
        
        # Return meaningful response
        if best_move:
            # Convert UCI to SAN for better readability if needed
            board = chess.Board()
            for move in uci_moves:
                board.push_uci(move)
            move_obj = chess.Move.from_uci(best_move)
            san_move = board.san(move_obj)
            
            # Return both formats
            return {"uci": best_move, "san": san_move}
        else:
            return {"error": "No move found"}
            
    except Exception as e:
        return {"error": f"Engine error: {str(e)}"}