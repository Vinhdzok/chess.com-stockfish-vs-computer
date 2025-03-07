from stockfish import Stockfish
from typing import List
from config import properties
import chess

stockfish = Stockfish("C:/Chess Engines/Stockfish 17/stockfish.exe", parameters={"Threads": properties.threads, "Hash": properties.hash})

def think(moves: List[str]) -> str:
    board = chess.Board()
    
    # Convert SAN (e4, Nf3, etc.) to UCI (e2e4, g1f3, etc.)
    try:
        uci_moves = [board.push_san(move) or board.peek().uci() for move in moves]
    except ValueError as e:
        return str(e)  # Handle invalid moves

    stockfish.set_position(uci_moves)  # Set all moves at once
    best_move = stockfish.get_best_move_time(properties.milliseconds)

    return best_move if best_move else "No move found"
