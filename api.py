from flask import Flask, jsonify, request
from flask_cors import CORS
from engine import think
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='chess_api.log'
)
logger = logging.getLogger('chess_api')

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["POST"])
def send_move():
    try:
        data = request.get_json()
        if "moves" not in data or not isinstance(data["moves"], list):
            logger.warning(f"Invalid input received: {data}")
            return jsonify({"error": "Invalid input - moves should be a list"}), 400

        # Log incoming request
        logger.info(f"Processing move sequence: {data['moves']}")
        
        # Get best move from engine
        result = think(data["moves"])
        
        # Check if result is an error message
        if isinstance(result, dict) and "error" in result:
            logger.error(f"Engine error: {result['error']}")
            return jsonify(result), 500
            
        logger.info(f"Best move found: {result}")
        return jsonify({"best_move": result})

    except Exception as e:
        logger.exception("Unexpected error in API")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)