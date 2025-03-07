// ==UserScript==
// @name         Stockfish vs Bot
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Improved chess.com bot with error handling and visual feedback
// @author       Imnotapro (optimized)
// @match        https://www.chess.com/play/computer
// @match        https://www.chess.com/game/live/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const API_URL = 'http://127.0.0.1:5000';
    const STATUS = {
        IDLE: 'IDLE',
        RUNNING: 'RUNNING',
        ERROR: 'ERROR'
    };

    // State
    let botState = {
        status: STATUS.IDLE,
        lastError: null,
        observer: null,
        moved: false,  // This is the key toggle that worked in your original code
        retryCount: 0,
        maxRetries: 3
    };

    // Add CSS styles
    GM_addStyle(`
        .chess-bot-interface {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            background-color: rgba(0, 0, 0, 0.8);
            border-radius: 8px;
            padding: 10px;
            color: white;
            min-width: 200px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .bot-status {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-idle { background-color: #ffcc00; }
        .status-running { background-color: #33cc33; }
        .status-error { background-color: #ff3333; }
        .bot-controls button {
            padding: 8px 12px;
            margin-right: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        .start-button {
            background-color: #4CAF50;
            color: white;
        }
        .stop-button {
            background-color: #f44336;
            color: white;
        }
        .error-message {
            color: #ff6666;
            font-size: 12px;
            margin-top: 8px;
            max-height: 60px;
            overflow-y: auto;
            display: none;
        }
        .show-error {
            display: block;
        }
    `);

    // Create UI
    function createInterface() {
        const container = document.createElement('div');
        container.className = 'chess-bot-interface';

        const statusBar = document.createElement('div');
        statusBar.className = 'bot-status';

        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator status-idle';
        statusIndicator.id = 'bot-indicator';

        const statusText = document.createElement('span');
        statusText.textContent = 'Bot: Idle';
        statusText.id = 'bot-status-text';

        statusBar.appendChild(statusIndicator);
        statusBar.appendChild(statusText);

        const controls = document.createElement('div');
        controls.className = 'bot-controls';

        const startButton = document.createElement('button');
        startButton.className = 'start-button';
        startButton.textContent = 'Start Bot';
        startButton.id = 'start-bot';

        const stopButton = document.createElement('button');
        stopButton.className = 'stop-button';
        stopButton.textContent = 'Stop Bot';
        stopButton.id = 'stop-bot';
        stopButton.style.display = 'none';

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.id = 'error-message';

        controls.appendChild(startButton);
        controls.appendChild(stopButton);

        container.appendChild(statusBar);
        container.appendChild(controls);
        container.appendChild(errorMessage);

        document.body.appendChild(container);

        // Add event listeners
        startButton.addEventListener('click', startBot);
        stopButton.addEventListener('click', stopBot);
    }

    // Update UI based on state
    function updateUI() {
        const indicator = document.getElementById('bot-indicator');
        const statusText = document.getElementById('bot-status-text');
        const startButton = document.getElementById('start-bot');
        const stopButton = document.getElementById('stop-bot');
        const errorMessage = document.getElementById('error-message');

        if (!indicator || !statusText || !startButton || !stopButton || !errorMessage) {
            console.error("UI elements not found");
            return;
        }

        // Update status indicator
        indicator.className = 'status-indicator';
        if (botState.status === STATUS.IDLE) {
            indicator.classList.add('status-idle');
            statusText.textContent = 'Bot: Idle';
            startButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
        } else if (botState.status === STATUS.RUNNING) {
            indicator.classList.add('status-running');
            statusText.textContent = 'Bot: Running';
            startButton.style.display = 'none';
            stopButton.style.display = 'inline-block';
        } else if (botState.status === STATUS.ERROR) {
            indicator.classList.add('status-error');
            statusText.textContent = 'Bot: Error';
            startButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
        }

        // Update error message
        if (botState.lastError) {
            errorMessage.textContent = `Error: ${botState.lastError}`;
            errorMessage.classList.add('show-error');
        } else {
            errorMessage.classList.remove('show-error');
        }
    }

    // Get chess.com helper input element
    function getHelperInput() {
        return document.getElementById('ccHelper-input');
    }

    // Get current moves from the board
    function getCurrentMoves() {
        let moves = [];
        let sidebarMoves = document.getElementsByClassName("main-line-ply");

        for (let move of sidebarMoves) {
            try {
                if (move.querySelector('.icon-font-chess') &&
                    move.querySelector('.icon-font-chess').getAttribute('data-figurine')) {
                    moves.push(
                        move.querySelector('.icon-font-chess').getAttribute('data-figurine') +
                        move.innerText.trim()
                    );
                } else {
                    moves.push(move.innerText.trim());
                }
            } catch (e) {
                console.error("Error parsing move:", e);
            }
        }
        return moves;
    }

    // Make a move using the engine's recommendation
    function makeMove(moves) {
        botState.retryCount = 0;
        sendMovesToEngine(moves);
    }

    // Send moves to API
    function sendMovesToEngine(moves) {
        if (botState.status !== STATUS.RUNNING) return;

        const helperInput = getHelperInput();
        if (!helperInput) {
            setError("Helper input not found");
            return;
        }

        fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({moves: moves})
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Clear any previous errors
            botState.lastError = null;
            updateUI();

            // Handle both old and new API response formats
            const bestMove = typeof data.best_move === 'object' ?
                           (data.best_move.uci || data.best_move) :
                           data.best_move;

            // Make the move
            helperInput.value = bestMove;
            helperInput.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 13}));
        })
        .catch(err => {
            // Retry logic
            if (botState.retryCount < botState.maxRetries) {
                botState.retryCount++;
                setTimeout(() => sendMovesToEngine(moves), 1000);
            } else {
                setError(`Failed to get move: ${err.message}`);
            }
        });
    }

    function setError(message) {
        botState.status = STATUS.ERROR;
        botState.lastError = message;
        updateUI();
        console.error(`Chess Bot Error: ${message}`);
    }

    // Initial move (similar to your original 'start' function)
    function initialMove() {
        let moves = getCurrentMoves();
        makeMove(moves);
    }

    // Main run function (similar to your original 'run' function)
    function startObserving() {
        const moveList = document.querySelector(".play-controller-moveList")?.firstChild;
        if (!moveList) {
            throw new Error("Move list not found");
        }

        // Create mutation observer with original toggle logic
        botState.observer = new MutationObserver(() => {
            // Check if game is over
            if (document.getElementsByClassName('game-result').length !== 0) {
                stopBot();
                return;
            }

            // Toggle moved state - THIS IS THE CRITICAL PART FROM YOUR ORIGINAL CODE
            botState.moved = !botState.moved;

            // Only process when moved is false (every other mutation)
            if (botState.moved) return;

            // Get current moves and make move
            const moves = getCurrentMoves();
            makeMove(moves);
        });

        // Start observing
        botState.observer.observe(moveList, { childList: true, subtree: true });
    }

    // Start the bot
    function startBot() {
        // Reset state
        botState.status = STATUS.RUNNING;
        botState.lastError = null;
        botState.moved = false;
        updateUI();

        try {
            initialMove();  // Make initial move if needed
            startObserving();  // Start watching board for changes
        } catch (err) {
            setError(`Failed to start bot: ${err.message}`);
        }
    }

    // Stop the bot
    function stopBot() {
        if (botState.observer) {
            botState.observer.disconnect();
            botState.observer = null;
        }
        botState.status = STATUS.IDLE;
        updateUI();
    }

    // Initialize when document is ready
    function initialize() {
        if (document.body) {
            createInterface();
        } else {
            setTimeout(initialize, 100);
        }
    }

    // Start initialization
    initialize();
})();