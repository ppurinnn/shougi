const boardElement = document.getElementById('board');
const komadaiSenteElement = document.getElementById('komadai-sente');
const komadaiGoteElement = document.getElementById('komadai-gote');
const messageElement = document.getElementById('message');

const PIECES = {
    'fu': { name: '歩', promoted: 'と' },
    'ky': { name: '香', promoted: '成香' },
    'ke': { name: '桂', promoted: '成桂' },
    'gi': { name: '銀', promoted: '成銀' },
    'ka': { name: '角', promoted: '馬' },
    'hi': { name: '飛', promoted: '龍' },
    'ki': { name: '金', promoted: null },
    'ou': { name: '王', promoted: null }
};

let board = [];
let senteKomadai = [];
let goteKomadai = [];
let turn = 'sente'; // 'sente' (先手) or 'gote' (後手)
let selectedPiece = null;
let isAITurn = false;

// 初期盤面の設定
const initialBoard = [
    ['ky', 'ke', 'gi', 'ki', 'ou', 'ki', 'gi', 'ke', 'ky'],
    [null, 'hi', null, null, null, null, null, 'ka', null],
    ['fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu', 'fu'],
    [null, 'ka', null, null, null, null, null, 'hi', null],
    ['ky', 'ke', 'gi', 'ki', 'ou', 'ki', 'gi', 'ke', 'ky']
];

function initGame() {
    board = initialBoard.map(row => row.slice());
    senteKomadai = [];
    goteKomadai = [];
    turn = 'sente';
    selectedPiece = null;
    isAITurn = false;

    renderBoard();
    updateMessage();
}

function renderBoard() {
    boardElement.innerHTML = '';
    komadaiSenteElement.innerHTML = '';
    komadaiGoteElement.innerHTML = '';

    // ボードの描画
    for (let y = 0; y < 9; y++) {
        for (let x = 8; x >= 0; x--) {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            const piece = board[y][x];

            if (piece) {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = `piece ${y < 3 ? 'gote' : 'sente'}`;
                pieceDiv.textContent = PIECES[piece.replace('+', '')].name;
                cellDiv.appendChild(pieceDiv);
            }
            
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;
            cellDiv.addEventListener('click', () => handleCellClick(x, y));
            boardElement.appendChild(cellDiv);
        }
    }

    // 持ち駒の描画
    // ... (今回は省略) ...

    // 選択された駒と移動可能マスをハイライト
    if (selectedPiece) {
        document.querySelector(`.cell[data-x='${selectedPiece.x}'][data-y='${selectedPiece.y}']`).classList.add('selected');
        const possibleMoves = getPossibleMoves(selectedPiece.x, selectedPiece.y, turn);
        possibleMoves.forEach(([x, y]) => {
            document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`).classList.add('possible-move');
        });
    }

    // AIのターン処理
    if (turn === 'gote' && isAITurn) {
        setTimeout(aiMove, 1000);
    }
}

function updateMessage() {
    messageElement.textContent = `現在のターン: ${turn === 'sente' ? '先手' : '後手'}`;
}

function handleCellClick(x, y) {
    if (isAITurn) return;

    if (selectedPiece) {
        const possibleMoves = getPossibleMoves(selectedPiece.x, selectedPiece.y, turn);
        if (possibleMoves.some(([px, py]) => px === x && py === y)) {
            // 移動可能なマスをクリック
            movePiece(selectedPiece.x, selectedPiece.y, x, y);
        } else {
            // 他の駒を選択または選択解除
            selectedPiece = (board[y][x] && ((y < 3 && turn === 'gote') || (y >= 6 && turn === 'sente'))) ? { x, y } : null;
            renderBoard();
        }
    } else {
        // 駒の選択
        if (board[y][x] && ((y < 3 && turn === 'gote') || (y >= 6 && turn === 'sente'))) {
            selectedPiece = { x, y };
            renderBoard();
        }
    }
}

function movePiece(fromX, fromY, toX, toY) {
    const piece = board[fromY][fromX];
    const capturedPiece = board[toY][toX];

    // 駒の移動
    board[toY][toX] = piece;
    board[fromY][fromX] = null;

    // 駒の昇格 (今回は簡略化)
    if (piece === 'fu' && ((turn === 'sente' && toY <= 2) || (turn === 'gote' && toY >= 6))) {
        board[toY][toX] = PIECES[piece].promoted;
    }

    // 駒の獲得
    if (capturedPiece) {
        // ... (今回は簡略化) ...
    }

    // ターン交代
    selectedPiece = null;
    turn = turn === 'sente' ? 'gote' : 'sente';
    updateMessage();
    renderBoard();
    
    // AIのターン開始
    if (turn === 'gote') {
        isAITurn = true;
        renderBoard();
    }
}

// --- AIのロジック（非常に単純なランダムAI） ---
function aiMove() {
    const possibleMoves = getAllPossibleMoves(turn);
    if (possibleMoves.length === 0) {
        alert('AIに有効な手はありません。');
        return;
    }

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const { fromX, fromY, toX, toY } = possibleMoves[randomIndex];

    movePiece(fromX, fromY, toX, toY);
    isAITurn = false;
}

function getAllPossibleMoves(player) {
    const allMoves = [];
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (piece) {
                // プレイヤーの駒かどうかを判定（暫定的なロジック）
                const isPlayersPiece = (player === 'sente' && y >= 6) || (player === 'gote' && y < 3);
                if (isPlayersPiece) {
                    const possibleMoves = getPossibleMoves(x, y, player);
                    possibleMoves.forEach(([toX, toY]) => {
                        allMoves.push({ fromX: x, fromY: y, toX, toY });
                    });
                }
            }
        }
    }
    return allMoves;
}

// --- 駒の移動可能マスを計算するロジック（簡略版） ---
function getPossibleMoves(x, y, player) {
    const moves = [];
    const piece = board[y][x].replace('+', '');
    const direction = player === 'sente' ? -1 : 1; // 先手は上向き、後手は下向き

    // 歩
    if (piece === 'fu') {
        const newY = y + direction;
        if (newY >= 0 && newY < 9 && !board[newY][x]) {
            moves.push([x, newY]);
        }
    }

    // 飛
    if (piece === 'hi' || piece === 'ryu') {
        // ... 直線移動のロジック ...
        // ... (今回は省略) ...
    }

    // 王
    if (piece === 'ou') {
        const kingMoves = [
            [x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y],
            [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]
        ];
        kingMoves.forEach(([nx, ny]) => {
            if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && !board[ny][nx]) {
                moves.push([nx, ny]);
            }
        });
    }

    // ... その他の駒のロジック ...
    // ... (今回は省略) ...

    return moves;
}

// ゲーム開始
initGame();