// ==UserScript==
// @name         Stockfish vs Bot
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Press button to run stockfish engine
// @author       Imnotapro
// @match        https://www.chess.com/play/computer
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    function addButton() {
        let button = document.createElement("button");
        button.innerText = "Run Chess Bot";
        button.style.position = "fixed";
        button.style.top = "10px";
        button.style.right = "10px";
        button.style.zIndex = "10000";
        button.style.padding = "10px 15px";
        button.style.backgroundColor = "#ff5733";
        button.style.color = "white";
        button.style.border = "none";
        button.style.cursor = "pointer";
        button.style.fontSize = "14px";
        button.style.borderRadius = "5px";

        document.body.appendChild(button);
        button.addEventListener('click', main);
    }

    function waitForBody() {
        if (document.body) {
            addButton();
        } else {
            setTimeout(waitForBody, 100);
        }
    }

    waitForBody();

    function main() {
        let cchelper = document.getElementById('ccHelper-input');
        let moved = false;
        function start() {
            let moves = []
            let sidebar_moves = document.getElementsByClassName("main-line-ply");
            for (let move of sidebar_moves) {
                if (move.querySelector('.icon-font-chess').getAttribute('data-figurine')) {
                    moves.push(move.querySelector('.icon-font-chess').getAttribute('data-figurine') + move.innerText.trim());
                }
                else moves.push(move.innerText);
            }
            fetch('http://127.0.0.1:5000', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({moves: moves})
            }).then(response => response.json())
                .then(data => {
                cchelper.value = data.best_move;
                cchelper.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 13}));
            })
            moved = false;
        }

        function run() {
            let move_list = document.getElementsByClassName("play-controller-moveList")[0].firstChild;
            let mut = new MutationObserver(() => {
                if (document.getElementsByClassName('game-result').length != 0) return;
                moved = !moved;
                if (moved) return;
                let moves = []
                let sidebar_moves = document.getElementsByClassName("main-line-ply");
                for (let move of sidebar_moves) {
                    if (move.querySelector('.icon-font-chess').getAttribute('data-figurine')) {
                        moves.push(move.querySelector('.icon-font-chess').getAttribute('data-figurine') + move.innerText.trim());
                    }
                    else moves.push(move.innerText.trim());
                }
                fetch('http://127.0.0.1:5000', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({moves: moves})
                }).then(response => response.json())
                    .then(data => {
                    cchelper.value = data.best_move;
                    cchelper.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 13}));
                });
            });
            mut.observe(move_list, { childList: true, subtree: true });
        }

        start(); run();
    }
})();