const boardElement = document.getElementById('board');
const komadaiSenteElement = document.getElementById('komadai-sente');
const komadaiGoteElement = document.getElementById('komadai-gote');
const messageElement = document.getElementById('message');

// 駒の種類と表示名のマッピング
const PIECES_MAP = {
    'fu': { name: '歩', promoted: '+fu', simple: '歩' },
    'ky': { name: '香', promoted: '+ky', simple: '香' },
    'ke': { name: '桂', promoted: '+ke', simple: '桂' },
    'gi': { name: '銀', promoted: '+gi', simple: '銀' },
    'ka': { name: '角', promoted: '+ka', simple: '角' },
    'hi': { name: '飛', promoted: '+hi', simple: '飛' },
    'ki': { name: '金', promoted: null, simple: '金' },
    'ou': { name: '王', promoted: null, simple: '王' },
    '+fu': { name: 'と', promoted: null, simple: 'と' },
    '+ky': { name: '成香', promoted: null, simple: '成香' },
    '+ke': { name: '成桂', promoted: null, simple: '成桂' },
    '+gi': { name: '成銀', promoted: null, simple: '成銀' },
    '+ka': { name: '馬', promoted: null, simple: '馬' },
    '+hi': { name: '龍', promoted: null, simple: '龍' }
};

let board = [];
let senteKomadai = {}; // 持ち駒を種類ごとにカウント
let goteKomadai = {};
let turn = 'sente'; // 'sente' (先手) or 'gote' (後手)
let selectedPiece = null; // { x, y } or { komadai: true, piece: piece_code_base }
let isAITurn = false;

// 初期盤面の設定 (s_ = 先手, g_ = 後手)
const initialBoard = [
    ['g_ky', 'g_ke', 'g_gi', 'g_ki', 'g_ou', 'g_ki', 'g_gi', 'g_ke', 'g_ky'],
    [null, 'g_hi', null, null, null, null, null, 'g_ka', null],
    ['g_fu', 'g_fu', 'g_fu', 'g_fu', 'g_fu', 'g_fu', 'g_fu', 'g_fu', 'g_fu'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['s_fu', 's_fu', 's_fu', 's_fu', 's_fu', 's_fu', 's_fu', 's_fu', 's_fu'],
    [null, 's_ka', null, null, null, null, null, 's_hi', null],
    ['s_ky', 's_ke', 's_gi', 's_ki', 's_ou', 's_ki', 's_gi', 's_ke', 's_ky']
];

function initGame() {
    board = initialBoard.map(row => row.slice());
    senteKomadai = {}; 
    goteKomadai = {};
    turn = 'sente';
    selectedPiece = null;
    isAITurn = false;
    renderBoard();
    updateMessage();
}

// --- UI 描画関数 ---

function renderBoard() {
    boardElement.innerHTML = '';
    komadaiSenteElement.innerHTML = '';
    komadaiGoteElement.innerHTML = '';

    // ボードの描画 (上から下へ、右から左へ)
    for (let y = 0; y < 9; y++) {
        for (let x = 8; x >= 0; x--) {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            const pieceCode = board[y][x];

            if (pieceCode) {
                const owner = pieceCode[0] === 's' ? 'sente' : 'gote';
                const baseType = pieceCode.substring(2).replace('+', ''); 

                const pieceDiv = document.createElement('div');
                pieceDiv.className = `piece ${owner}`;
                pieceDiv.textContent = PIECES_MAP[pieceCode.substring(2)]?.name || PIECES_MAP[baseType]?.name;
                
                cellDiv.appendChild(pieceDiv);
            }
            
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;
            cellDiv.addEventListener('click', () => handleCellClick(x, y));
            boardElement.appendChild(cellDiv);
        }
    }

    // 持ち駒の描画とクリックイベント設定
    renderKomadai(senteKomadai, komadaiSenteElement, 'sente');
    renderKomadai(goteKomadai, komadaiGoteElement, 'gote');

    // 選択された駒と移動可能マスをハイライト
    if (selectedPiece && !selectedPiece.komadai) {
        document.querySelector(`.cell[data-x='${selectedPiece.x}'][data-y='${selectedPiece.y}']`).classList.add('selected');
        const possibleMoves = getPossibleMoves(selectedPiece.x, selectedPiece.y, turn);
        possibleMoves.forEach(([x, y]) => {
            document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`).classList.add('possible-move');
        });
    } else if (selectedPiece && selectedPiece.komadai) {
        // 持ち駒が選択されている場合の処理（打てるマスをハイライト）
        const possibleDrops = getPossibleDropMoves(selectedPiece.piece, turn);
        possibleDrops.forEach(([x, y]) => {
            document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`).classList.add('possible-move');
        });
    }

    // AIのターン開始
    if (turn === 'gote' && !isAITurn) {
        isAITurn = true;
        setTimeout(aiMove, 1000);
    }
}

function renderKomadai(komadai, element, owner) {
    element.innerHTML = '';
    for (const type in komadai) {
        if (komadai[type] > 0) {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = `komadai-piece piece ${owner}`;
            pieceDiv.textContent = `${PIECES_MAP[type].simple}${komadai[type] > 1 ? komadai[type] : ''}`;
            pieceDiv.dataset.pieceType = type;
            if (turn === owner) {
                pieceDiv.addEventListener('click', () => handleKomadaiClick(type));
            }
            if (selectedPiece && selectedPiece.komadai && selectedPiece.piece === type) {
                pieceDiv.classList.add('selected');
            }
            element.appendChild(pieceDiv);
        }
    }
}

function updateMessage() {
    messageElement.textContent = `現在のターン: ${turn === 'sente' ? '先手' : '後手'}`;
}

// --- イベントハンドラ ---

function handleKomadaiClick(pieceType) {
    if (isAITurn || turn !== 'sente') return;

    if (selectedPiece && selectedPiece.komadai && selectedPiece.piece === pieceType) {
        selectedPiece = null; // 選択解除
    } else {
        selectedPiece = { komadai: true, piece: pieceType }; // 持ち駒を選択
    }
    renderBoard();
}

function handleCellClick(x, y) {
    if (isAITurn || turn !== 'sente') return;

    const pieceCode = board[y][x];
    const isPlayersPiece = pieceCode && pieceCode[0] === 's';

    if (selectedPiece && selectedPiece.komadai) {
        // 持ち駒を打つ
        const possibleDrops = getPossibleDropMoves(selectedPiece.piece, turn);
        if (possibleDrops.some(([px, py]) => px === x && py === y)) {
            dropPiece(selectedPiece.piece, x, y);
        } else {
            selectedPiece = null;
            renderBoard();
        }
    } else if (selectedPiece && !selectedPiece.komadai) {
        // 盤上の駒を移動
        const possibleMoves = getPossibleMoves(selectedPiece.x, selectedPiece.y, turn);
        if (possibleMoves.some(([px, py]) => px === x && py === y)) {
            promptForPromotion(selectedPiece.x, selectedPiece.y, x, y);
        } else if (isPlayersPiece) {
            // 他の自駒を選択
            selectedPiece = { x, y };
            renderBoard();
        } else {
            // 選択解除
            selectedPiece = null;
            renderBoard();
        }
    } else if (isPlayersPiece) {
        // 駒の選択
        selectedPiece = { x, y };
        renderBoard();
    }
}

// --- 駒の操作ロジック ---

function dropPiece(pieceType, x, y) {
    const owner = turn[0]; // 's' or 'g'
    const komadai = owner === 's' ? senteKomadai : goteKomadai;

    if (komadai[pieceType] > 0) {
        board[y][x] = `${owner}_${pieceType}`;
        komadai[pieceType]--;
        
        selectedPiece = null;
        switchTurn();
    }
}

// 行き所のない駒の判定（次の手で動けなくなる場合に強制的に成る）
const isForcePromoteToAvoidDeadEnd = (pieceType, toY, owner) => {
    // 歩、香車が最終段
    if (pieceType === 'fu' && ((owner === 's' && toY === 0) || (owner === 'g' && toY === 8))) return true;
    if (pieceType === 'ky' && ((owner === 's' && toY === 0) || (owner === 'g' && toY === 8))) return true;
    // 桂馬が最終2段
    if (pieceType === 'ke' && ((owner === 's' && toY <= 1) || (owner === 'g' && toY >= 7))) return true;
    return false;
};

// 【修正された成りの選択ロジック】
function promptForPromotion(fromX, fromY, toX, toY) {
    const pieceCode = board[fromY][fromX];
    const baseType = pieceCode.substring(2).replace('+', '');
    const isPromotable = PIECES_MAP[baseType].promoted;
    
    // 成れない駒はそのまま移動
    if (!isPromotable) {
        movePiece(fromX, fromY, toX, toY, false);
        return;
    }
    
    const owner = turn[0];
    // 成りが可能な領域 (先手なら0～2段, 後手なら6～8段)
    const promotionZone = owner === 's' ? [0, 1, 2] : [6, 7, 8];
    
    // 移動元または移動先が成れる領域に含まれるか
    const movedInPromotionZone = promotionZone.includes(fromY) || promotionZone.includes(toY);
    
    // 強制的に成る必要があるか (行き所のない駒)
    const isForcedPromotion = isForcePromoteToAvoidDeadEnd(baseType, toY, owner);

    if (isForcedPromotion) {
        // 行き所のない駒は強制的に成る（将棋の必須ルール）
        movePiece(fromX, fromY, toX, toY, true);
        return;
    }

    if (movedInPromotionZone) {
        // 敵陣に関わっている場合は、プレイヤーが成るかどうかを選択
        const shouldPromote = confirm(`駒を成りますか？ (はい: 成る, いいえ: 成らない)`);
        movePiece(fromX, fromY, toX, toY, shouldPromote);
    } else {
        // 敵陣に関わらない自陣内での移動は、成ることはできない
        movePiece(fromX, fromY, toX, toY, false);
    }
}

function movePiece(fromX, fromY, toX, toY, promote) {
    const pieceCode = board[fromY][fromX];
    const capturedPieceCode = board[toY][toX];
    const owner = pieceCode[0];
    const opponentOwner = owner === 's' ? 'g' : 's';
    
    // 敵の駒を獲得
    if (capturedPieceCode && capturedPieceCode[0] === opponentOwner) {
        const baseType = capturedPieceCode.substring(2).replace('+', '');
        const komadai = owner === 's' ? senteKomadai : goteKomadai;
        komadai[baseType] = (komadai[baseType] || 0) + 1;
    }

    // 駒の昇格
    let newPieceCode = pieceCode;
    if (promote) {
        const baseType = pieceCode.substring(2).replace('+', '');
        newPieceCode = owner + '_' + PIECES_MAP[baseType].promoted;
    }

    // 駒の移動
    board[toY][toX] = newPieceCode;
    board[fromY][fromX] = null;

    switchTurn();
}

// --- ターン・勝敗判定 ---

function switchTurn() {
    selectedPiece = null;
    
    const winner = turn;
    const loser = turn === 'sente' ? 'gote' : 'sente';

    // 詰み判定 (次の手番のプレイヤーが負けていないかチェック)
    if (isKingMated(loser)) {
        updateMessage();
        const winnerName = winner === 'sente' ? '先手' : '後手';
        alert(` ゲームセット！${loser === 'sente' ? '先手' : '後手'}の王が詰みました。\n${winnerName}の勝利です！`);
        isAITurn = true; // ゲーム終了のためAIの動きを停止
        return;
    }
    
    // ターン交代
    turn = loser;
    updateMessage();
    renderBoard();
}

// --- 王手・詰みロジック ---

function isKingInCheck(player) {
    const kingCode = player[0] + '_ou';
    let kingPos = null;

    // 1. 王の位置を探す
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            if (board[y][x] === kingCode) {
                kingPos = { x, y };
                break;
            }
        }
        if (kingPos) break;
    }
    
    if (!kingPos) return true;

    // 2. 相手のすべての駒から、その王の位置に届くかチェックする
    const opponent = player === 'sente' ? 'gote' : 'sente';
    const opponentOwner = opponent[0];

    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const pieceCode = board[y][x];
            if (pieceCode && pieceCode[0] === opponentOwner) {
                const moves = getPossibleMoves(x, y, opponent, true); 
                if (moves.some(([tx, ty]) => tx === kingPos.x && ty === kingPos.y)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isKingMated(player) {
    if (!isKingInCheck(player)) {
        return false;
    }

    const allMoves = getAllPossibleMoves(player);
    const allDrops = getAllPossibleDropMoves(player); 
    
    if (allMoves.length > 0 || allDrops.length > 0) {
        return false;
    }
    
    return true; 
}

function filterValidMoves(moves, player) {
    const validMoves = [];
    
    for (const move of moves) {
        const tempBoard = board.map(row => row.slice());
        
        // 移動を実行
        const pieceCode = tempBoard[move.fromY][move.fromX];
        tempBoard[move.toY][move.toX] = pieceCode;
        tempBoard[move.fromY][move.fromX] = null;

        const originalBoard = board;
        board = tempBoard;
        
        const isSafe = !isKingInCheck(player);
        
        board = originalBoard;
        
        if (isSafe) {
            validMoves.push(move);
        }
    }
    
    return validMoves;
}

// --- 駒の動き生成ロジック ---

function getAllPossibleMoves(player) {
    const allMoves = [];
    const owner = player[0];
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const pieceCode = board[y][x];
            if (pieceCode && pieceCode[0] === owner) {
                const possibleMoves = getPossibleMoves(x, y, player);
                possibleMoves.forEach(([toX, toY]) => {
                    allMoves.push({ fromX: x, fromY: y, toX, toY });
                });
            }
        }
    }
    return filterValidMoves(allMoves, player);
}

function getAllPossibleDropMoves(player) {
    const drops = [];
    const komadai = player === 'sente' ? senteKomadai : goteKomadai;
    for (const pieceType in komadai) {
        if (komadai[pieceType] > 0) {
            const possibleDrops = getPossibleDropMoves(pieceType, player);
            possibleDrops.forEach(([x, y]) => {
                drops.push({ piece: pieceType, x, y });
            });
        }
    }
    return drops;
}

// 【修正点1】持ち駒は盤上の空いているマス全てに打てる
function getPossibleDropMoves(pieceType, player) {
    const moves = [];
    const owner = player[0];
    
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            if (board[y][x] === null) {
                
                // 行き所のない駒の判定
                if (isForcePromoteToAvoidDeadEnd(pieceType, y, owner)) continue;

                // 二歩の判定 (歩を打つ筋に味方の歩がないか)
                if (pieceType === 'fu') {
                    let isNifu = false;
                    for (let checkY = 0; checkY < 9; checkY++) {
                        if (board[checkY][x] === `${owner}_fu`) {
                            isNifu = true;
                            break;
                        }
                    }
                    if (isNifu) continue; 
                }
                
                moves.push([x, y]);
            }
        }
    }
    return moves;
}

function getPossibleMoves(x, y, player, isCheckTesting = false) {
    const moves = [];
    const pieceCode = board[y][x];
    if (!pieceCode) return moves;

    const pieceType = pieceCode.substring(2);
    const direction = player === 'sente' ? -1 : 1; 
    const opponentOwner = player === 'sente' ? 'g' : 's';
    
    const isValidTarget = (tx, ty) => {
        if (tx < 0 || tx > 8 || ty < 0 || ty > 8) return false;
        const targetPiece = board[ty][tx];
        
        const myKingCode = player[0] + '_ou'; 
        if (isCheckTesting && targetPiece === myKingCode) {
            return false;
        }

        return !targetPiece || targetPiece[0] === opponentOwner;
    };
    
    const tryMove = (tx, ty) => {
        if (isValidTarget(tx, ty)) {
            moves.push([tx, ty]);
            return true;
        }
        return false;
    };

    const rayMove = (dx, dy) => {
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 8) {
            if (!tryMove(nx, ny)) {
                break;
            }
            if (board[ny][nx] && board[ny][nx][0] === opponentOwner) {
                break;
            }
            nx += dx;
            ny += dy;
        }
    };

    // --- 駒ごとの動き ---
    // (動きのロジック自体は変更なし)

    // 1. 歩 (fu) 
    if (pieceType === 'fu') { tryMove(x, y + direction); }

    // 2. 金 (ki) / と金、成香、成桂、成銀
    if (pieceType === 'ki' || pieceType === '+fu' || pieceType === '+ky' || pieceType === '+ke' || pieceType === '+gi') {
        const goldMoves = [
            [x, y + direction], [x - 1, y + direction], [x + 1, y + direction], 
            [x - 1, y], [x + 1, y], [x, y - direction]
        ];
        goldMoves.forEach(([nx, ny]) => tryMove(nx, ny));
    }
    
    // 3. 王 (ou)
    if (pieceType === 'ou') {
        const kingMoves = [
            [x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y],
            [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]
        ];
        kingMoves.forEach(([nx, ny]) => tryMove(nx, ny));
    }
    
    // 4. 香車 (ky)
    if (pieceType === 'ky') {
        rayMove(0, direction);
    }

    // 5. 桂馬 (ke)
    if (pieceType === 'ke') {
        tryMove(x - 1, y + direction * 2);
        tryMove(x + 1, y + direction * 2);
    }

    // 6. 銀将 (gi)
    if (pieceType === 'gi') {
        const silverMoves = [
            [x, y + direction], [x - 1, y + direction], [x + 1, y + direction],
            [x - 1, y - direction], [x + 1, y - direction]
        ];
        silverMoves.forEach(([nx, ny]) => tryMove(nx, ny));
    }
    
    // 7. 飛車 (hi) / 龍王 (+hi)
    if (pieceType === 'hi') {
        rayMove(0, 1); rayMove(0, -1); rayMove(1, 0); rayMove(-1, 0);
    }
    if (pieceType === '+hi') {
        rayMove(0, 1); rayMove(0, -1); rayMove(1, 0); rayMove(-1, 0);
        tryMove(x + 1, y + 1); tryMove(x - 1, y - 1); tryMove(x + 1, y - 1); tryMove(x - 1, y + 1);
    }
    
    // 8. 角行 (ka) / 龍馬 (+ka)
    if (pieceType === 'ka') {
        rayMove(1, 1); rayMove(-1, -1); rayMove(1, -1); rayMove(-1, 1);
    }
    if (pieceType === '+ka') {
        rayMove(1, 1); rayMove(-1, -1); rayMove(1, -1); rayMove(-1, 1);
        tryMove(x, y + 1); tryMove(x, y - 1); tryMove(x + 1, y); tryMove(x - 1, y);
    }

    return moves;
}

// --- AIのロジック（ランダム） ---

function aiMove() {
    const allMoves = getAllPossibleMoves('gote');
    const allDrops = getAllPossibleDropMoves('gote');
    const moves = [
        ...allMoves.map(m => ({...m, type: 'move'})), 
        ...allDrops.map(d => ({...d, type: 'drop', fromX: -1, fromY: -1}))
    ];
    
    if (moves.length === 0 && isKingInCheck('gote')) {
        isAITurn = false;
        switchTurn();
        return;
    } else if (moves.length === 0) {
        alert('AIは指す手がありません。（パス）');
        isAITurn = false;
        switchTurn();
        return;
    }

    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];

    if (move.type === 'move') {
        const pieceCode = board[move.fromY][move.fromX];
        const baseType = pieceCode.substring(2).replace('+', '');
        const isPromotable = PIECES_MAP[baseType].promoted;
        
        let promote = false;
        if (isPromotable) {
            const owner = 'g';
            const promotionZone = [6, 7, 8]; 
            const movedInPromotionZone = promotionZone.includes(move.fromY) || promotionZone.includes(move.toY);
            
            const isForcedPromotion = isForcePromoteToAvoidDeadEnd(baseType, move.toY, owner);

            if (isForcedPromotion || movedInPromotionZone) {
                // AIは、行き所のない場合または成れるタイミングであれば、常に成る（簡易AIの判断）
                promote = true; 
            }
        }
        
        movePiece(move.fromX, move.fromY, move.toX, move.toY, promote);

    } else if (move.type === 'drop') {
        dropPiece(move.piece, move.x, move.y);
    }
    
    isAITurn = false;
    renderBoard();
}

// ゲーム開始
initGame();
