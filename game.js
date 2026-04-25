document.addEventListener('DOMContentLoaded', () => {
  const BOARD_SIZE = 6;
  function resolveApiBase() {
    const raw = window.__API_BASE__;
    if (typeof raw === 'string' && raw.trim() !== '') {
      let b = raw.trim();
      if (b.endsWith('/')) {
        b = b.slice(0, -1);
      }
      return b;
    }
    const h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '') {
      return 'http://localhost:3000';
    }
    return '';
  }
  const API_BASE = resolveApiBase();

  const SWAP_PAUSE_MS = 200;
  const MATCH_CLEAR_MS = 540;
  const LAND_MS = 320;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let board = [];
  let score = 0;
  let selectedCell = null;
  let boardLocked = false;
  let gameOver = false;

  const boardEl = document.querySelector('.board');
  const scoreEl = document.querySelector('.score');
  const newGameBtn = document.getElementById('new-game-btn');
  const stageEl = document.querySelector('.stage');
  const gameOverModal = document.getElementById('game-over-modal');
  const gameOverScoreEl = document.getElementById('game-over-score');
  const gameOverNewGameBtn = document.getElementById('game-over-new-game');
  const allCells = Array.from(boardEl.querySelectorAll('.cell'));

  const cells = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE));
  allCells.forEach((cell) => {
    const row = Number(cell.getAttribute('data-row'));
    const col = Number(cell.getAttribute('data-col'));
    cells[row][col] = cell;
  });

  function renderBoard(currentBoard, options = {}) {
    const { landing = false } = options;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = cells[row][col];
        const value = currentBoard[row][col];
        cell.classList.remove('cell-1', 'cell-2', 'cell-3', 'selected', 'matched', 'cell-land');
        if (value >= 1 && value <= 3) {
          cell.classList.add(`cell-${value}`);
        }
        if (landing && value >= 1 && value <= 3) {
          cell.classList.add('cell-land');
        }
      }
    }
  }

  async function playMoveAnimation(data) {
    const { board: finalBoard, score: finalScore, animation, reverted } = data;

    if (!animation || !Array.isArray(animation.rounds) || animation.rounds.length === 0) {
      if (reverted && animation?.boardAfterSwap) {
        board = animation.boardAfterSwap;
        renderBoard(board);
        await delay(SWAP_PAUSE_MS);
      }

      board = finalBoard;
      setScoreFromServer(finalScore);
      renderBoard(board);
      applyGameOverState(Boolean(data.gameOver), finalScore);
      return;
    }

    const { boardAfterSwap, rounds } = animation;

    board = boardAfterSwap;
    renderBoard(board);
    await delay(SWAP_PAUSE_MS);

    for (let i = 0; i < rounds.length; i += 1) {
      const round = rounds[i];
      const boardBefore = i === 0 ? boardAfterSwap : rounds[i - 1].boardAfter;

      renderBoard(boardBefore);

      for (const pos of round.matched) {
        const { row, col } = pos;
        const cell = cells[row]?.[col];
        if (cell) {
          cell.classList.add('matched');
        }
      }

      if (round.multiplier >= 2) {
        showComboBadge(round.multiplier);
      }

      await delay(MATCH_CLEAR_MS);

      board = round.boardAfter;
      renderBoard(round.boardAfter, { landing: true });
      await delay(LAND_MS);
      allCells.forEach((cell) => cell.classList.remove('cell-land'));
    }

    board = finalBoard;
    setScoreFromServer(finalScore);
    renderBoard(board);
    applyGameOverState(Boolean(data.gameOver), finalScore);
  }

  function showComboBadge(n) {
    if (!stageEl) {
      return;
    }

    const badge = document.createElement('div');
    badge.className = 'combo-badge';
    badge.textContent = `Combo x${n}!`;
    stageEl.appendChild(badge);
    badge.addEventListener(
      'animationend',
      () => {
        badge.remove();
      },
      { once: true },
    );
  }

  function setScoreFromServer(total) {
    score = total;
    scoreEl.textContent = `Счёт: ${score}`;
  }

  function showGameOverModal(finalScore) {
    if (!gameOverModal) {
      return;
    }

    if (gameOverScoreEl) {
      gameOverScoreEl.textContent = String(finalScore);
    }

    gameOverModal.hidden = false;
    gameOverModal.classList.add('is-open');
    gameOverNewGameBtn?.focus();
  }

  function hideGameOverModal() {
    if (!gameOverModal) {
      return;
    }

    gameOverModal.classList.remove('is-open');
    gameOverModal.hidden = true;
  }

  function applyGameOverState(isGameOver, finalScore) {
    gameOver = isGameOver;

    if (gameOver) {
      boardLocked = true;
      showGameOverModal(finalScore);
      return;
    }

    hideGameOverModal();
  }

  async function fetchBoard() {
    boardLocked = true;
    try {
      const response = await fetch(`${API_BASE}/api/new-game`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      board = data.board;
      const nextScore = data.score ?? 0;
      setScoreFromServer(nextScore);
      renderBoard(board);
      applyGameOverState(Boolean(data.gameOver), nextScore);
    } catch (_err) {
      if (API_BASE === '' && !['localhost', '127.0.0.1', ''].includes(location.hostname)) {
        scoreEl.textContent =
          'Нет URL API. Для GitHub Pages задайте секрет BACKEND_API_BASE = адрес бэкенда на Render, затем пересоберите Pages (см. README).';
      } else {
        scoreEl.textContent =
          'Не удалось загрузить поле. Проверьте, что бэкенд на Render запущен и CORS/URL верны: ' + API_BASE;
      }
    } finally {
      boardLocked = gameOver;
    }
  }

  async function startNewGame(options = {}) {
    if (boardLocked && !gameOver) {
      return;
    }

    const { requireConfirmation = false } = options;
    if (
      requireConfirmation &&
      score > 0 &&
      !confirm('Начать новую игру? Текущий счёт будет сброшен.')
    ) {
      return;
    }

    await fetchBoard();
  }

  function isAdjacent(cell1, cell2) {
    const row1 = Number(cell1.getAttribute('data-row'));
    const col1 = Number(cell1.getAttribute('data-col'));
    const row2 = Number(cell2.getAttribute('data-row'));
    const col2 = Number(cell2.getAttribute('data-col'));
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }

  async function handleClick(cell) {
    if (boardLocked) {
      return;
    }

    if (!selectedCell) {
      selectedCell = cell;
      cell.classList.add('selected');
      return;
    }

    if (selectedCell === cell) {
      selectedCell.classList.remove('selected');
      selectedCell = null;
      return;
    }

    const first = selectedCell;
    const second = cell;

    if (!isAdjacent(first, second)) {
      first.classList.remove('selected');
      selectedCell = null;
      return;
    }

    const row1 = Number(first.getAttribute('data-row'));
    const col1 = Number(first.getAttribute('data-col'));
    const row2 = Number(second.getAttribute('data-row'));
    const col2 = Number(second.getAttribute('data-col'));

    first.classList.remove('selected');
    selectedCell = null;

    boardLocked = true;
    try {
      const response = await fetch(`${API_BASE}/api/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row1, col1, row2, col2 }),
      });
      if (response.status === 409) {
        applyGameOverState(true, score);
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      await playMoveAnimation(data);
    } catch (_err) {
      scoreEl.textContent = 'Ошибка хода. Проверьте сервер.';
    } finally {
      boardLocked = gameOver;
    }
  }

  fetchBoard();

  newGameBtn?.addEventListener('click', () => {
    startNewGame({ requireConfirmation: true });
  });

  gameOverNewGameBtn?.addEventListener('click', () => {
    startNewGame();
  });

  allCells.forEach((cell) => {
    cell.addEventListener('click', () => {
      handleClick(cell);
    });
  });
});
