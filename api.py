from flask import Flask, jsonify, request
from flask_cors import CORS
from engine import think

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["POST"])
def send_move():
    try:
        data = request.get_json()
        if "moves" not in data or not isinstance(data["moves"], list):
            return jsonify({"error": "Invalid input"}), 400

        best_move = think(data["moves"])
        return jsonify({"best_move": best_move})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()
