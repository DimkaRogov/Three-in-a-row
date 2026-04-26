document.addEventListener('DOMContentLoaded', () => {
  const BOARD_SIZE = 6;
  const BEST_SCORE_KEY = 'tree-in-a-row:bestScore:v1';

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
  const API_TIMEOUT_MS = 60_000;

  const SWAP_ANIMATION_MS = 280;
  const SWAP_PAUSE_MS = 120;
  const INVALID_SWAP_PAUSE_MS = 70;
  const MATCH_CLEAR_MS = 540;
  const LAND_MS = 320;
  const HINT_HIGHLIGHT_MS = 1600;
  const CELL_CLASS_NAMES = ['cell-1', 'cell-2', 'cell-3', 'cell-4', 'cell-5'];
  const CELL_LABELS = ['фишка 1', 'фишка 2', 'фишка 3', 'фишка 4', 'фишка 5'];

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  let board = [];
  let score = 0;
  let selectedCell = null;
  let focusedCellPosition = { row: 0, col: 0 };
  let boardLocked = false;
  let gameOver = false;
  let pendingRetryAction = null;
  let apiLoading = false;
  let currentHint = null;
  let hintTimeoutId = null;

  const boardEl = document.querySelector('.board');
  const scoreEl = document.querySelector('.score');
  const bestScoreEl = document.getElementById('best-score-value');
  const hintBtn = document.getElementById('hint-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const apiStatusEl = document.getElementById('api-status');
  const apiStatusMessageEl = document.getElementById('api-status-message');
  const apiRetryBtn = document.getElementById('api-retry-btn');
  const stageEl = document.querySelector('.stage');
  const gameOverModal = document.getElementById('game-over-modal');
  const gameOverTitleEl = document.getElementById('game-over-title');
  const gameOverScoreEl = document.getElementById('game-over-score');
  const gameOverNewGameBtn = document.getElementById('game-over-new-game');
  const allCells = Array.from(boardEl.querySelectorAll('.cell'));
  const defaultGameOverTitle = gameOverTitleEl?.textContent || 'Игра окончена';

  let bestScore = readStoredBestScore();
  let currentGameHasNewRecord = false;
  if (bestScoreEl) {
    bestScoreEl.textContent = String(bestScore);
  }

  const cells = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE));
  allCells.forEach((cell) => {
    const row = Number(cell.getAttribute('data-row'));
    const col = Number(cell.getAttribute('data-col'));
    cells[row][col] = cell;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-rowindex', String(row + 1));
    cell.setAttribute('aria-colindex', String(col + 1));
    cell.setAttribute('aria-selected', 'false');
    cell.setAttribute('aria-label', getCellAriaLabel(row, col, null));
    cell.tabIndex = row === focusedCellPosition.row && col === focusedCellPosition.col ? 0 : -1;
  });

  const cellKey = (row, col) => `${row}:${col}`;

  function getCellAriaLabel(row, col, value) {
    const position = `Строка ${row + 1}, столбец ${col + 1}`;
    if (value >= 1 && value <= CELL_LABELS.length) {
      return `${position}, ${CELL_LABELS[value - 1]}`;
    }
    return `${position}, пустая клетка`;
  }

  function getCellPosition(cell) {
    return {
      row: Number(cell.getAttribute('data-row')),
      col: Number(cell.getAttribute('data-col')),
    };
  }

  function setFocusedCell(row, col, options = {}) {
    const nextRow = Math.max(0, Math.min(BOARD_SIZE - 1, row));
    const nextCol = Math.max(0, Math.min(BOARD_SIZE - 1, col));
    focusedCellPosition = { row: nextRow, col: nextCol };

    allCells.forEach((cell) => {
      const pos = getCellPosition(cell);
      cell.tabIndex = pos.row === nextRow && pos.col === nextCol ? 0 : -1;
    });

    if (options.focus) {
      cells[nextRow]?.[nextCol]?.focus({ preventScroll: true });
    }
  }

  function setSelectedCell(cell) {
    if (selectedCell && selectedCell !== cell) {
      selectedCell.classList.remove('selected');
      selectedCell.setAttribute('aria-selected', 'false');
    }

    selectedCell = cell;
    if (selectedCell) {
      selectedCell.classList.add('selected');
      selectedCell.setAttribute('aria-selected', 'true');
    }
  }

  function clearSelectedCell() {
    setSelectedCell(null);
  }

  function isPositionInRange(row, col) {
    return (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      row < BOARD_SIZE &&
      col >= 0 &&
      col < BOARD_SIZE
    );
  }

  function isValidHint(hint) {
    if (hint === null || typeof hint !== 'object') {
      return false;
    }

    const { row1, col1, row2, col2 } = hint;
    return (
      isPositionInRange(row1, col1) &&
      isPositionInRange(row2, col2) &&
      Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
    );
  }

  function clearHintHighlight() {
    if (hintTimeoutId !== null) {
      window.clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }

    allCells.forEach((cell) => cell.classList.remove('cell-hint'));
  }

  function updateHintButtonState() {
    if (!hintBtn) {
      return;
    }

    hintBtn.disabled =
      apiLoading || boardLocked || gameOver || !isBoardReady() || currentHint === null;
  }

  function setHintFromServer(hint) {
    clearHintHighlight();
    currentHint = isValidHint(hint) ? hint : null;
    updateHintButtonState();
  }

  function showHint() {
    if (apiLoading || boardLocked || gameOver || !currentHint) {
      return;
    }

    clearSelectedCell();
    clearHintHighlight();

    const hintedCells = [
      cells[currentHint.row1]?.[currentHint.col1],
      cells[currentHint.row2]?.[currentHint.col2],
    ].filter(Boolean);

    hintedCells.forEach((cell) => cell.classList.add('cell-hint'));
    hintTimeoutId = window.setTimeout(clearHintHighlight, HINT_HIGHLIGHT_MS);
  }

  function createApiTimeoutError() {
    const error = new Error(`API request exceeded ${API_TIMEOUT_MS}ms`);
    error.name = 'ApiTimeoutError';
    return error;
  }

  function isApiTimeoutError(error) {
    return error instanceof Error && error.name === 'ApiTimeoutError';
  }

  async function fetchApi(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, API_TIMEOUT_MS);

    try {
      return await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw createApiTimeoutError();
      }
      throw err;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function isBoardReady() {
    return (
      Array.isArray(board) &&
      board.length === BOARD_SIZE &&
      board.every((row) => Array.isArray(row) && row.length === BOARD_SIZE)
    );
  }

  function setApiStatus(message, options = {}) {
    const { type = 'info', retryAction = null } = options;
    pendingRetryAction = retryAction;

    if (!apiStatusEl || !apiStatusMessageEl) {
      return;
    }

    apiStatusMessageEl.textContent = message;
    apiStatusEl.hidden = message === '';
    apiStatusEl.classList.toggle('api-status--error', type === 'error');

    if (apiRetryBtn) {
      apiRetryBtn.hidden = !retryAction;
    }
  }

  function clearApiStatus() {
    pendingRetryAction = null;

    if (!apiStatusEl || !apiStatusMessageEl) {
      return;
    }

    apiStatusMessageEl.textContent = '';
    apiStatusEl.hidden = true;
    apiStatusEl.classList.remove('api-status--error');

    if (apiRetryBtn) {
      apiRetryBtn.hidden = true;
    }
  }

  function setApiLoading(isLoading, message = '') {
    apiLoading = isLoading;
    boardEl.classList.toggle('is-loading', isLoading);

    if (newGameBtn) {
      newGameBtn.disabled = isLoading;
    }
    if (gameOverNewGameBtn) {
      gameOverNewGameBtn.disabled = isLoading;
    }
    if (apiRetryBtn) {
      apiRetryBtn.disabled = isLoading;
    }
    updateHintButtonState();

    if (isLoading && message) {
      setApiStatus(message);
    }
  }

  function showApiError(message, retryAction = null) {
    setApiStatus(message, { type: 'error', retryAction });
  }

  function shouldReduceMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  function getCellByPosition(pos) {
    return cells[pos.row]?.[pos.col] ?? null;
  }

  function resetSwapCell(cell) {
    cell.classList.remove('is-swapping');
    cell.style.removeProperty('--swap-x');
    cell.style.removeProperty('--swap-y');
  }

  function commitAnimatedBoard(nextBoard, movingCells) {
    boardEl.classList.add('is-swap-committing');
    renderBoard(nextBoard);
    movingCells.forEach(resetSwapCell);
    void boardEl.offsetWidth;
    boardEl.classList.remove('is-swap-committing');
  }

  async function animateSwapToBoard(nextBoard, move) {
    const first = move ? getCellByPosition({ row: move.row1, col: move.col1 }) : null;
    const second = move ? getCellByPosition({ row: move.row2, col: move.col2 }) : null;

    if (!first || !second || shouldReduceMotion()) {
      board = nextBoard;
      renderBoard(board);
      await delay(shouldReduceMotion() ? 0 : SWAP_PAUSE_MS);
      return;
    }

    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();

    first.style.setProperty('--swap-x', `${secondRect.left - firstRect.left}px`);
    first.style.setProperty('--swap-y', `${secondRect.top - firstRect.top}px`);
    second.style.setProperty('--swap-x', `${firstRect.left - secondRect.left}px`);
    second.style.setProperty('--swap-y', `${firstRect.top - secondRect.top}px`);

    await nextFrame();
    first.classList.add('is-swapping');
    second.classList.add('is-swapping');

    await delay(SWAP_ANIMATION_MS);

    board = nextBoard;
    commitAnimatedBoard(board, [first, second]);
  }

  function getAffectedLandingCells(matched) {
    const lowestMatchedRowByCol = new Map();

    for (const pos of matched) {
      const { row, col } = pos;
      const previousRow = lowestMatchedRowByCol.get(col);
      if (previousRow === undefined || row > previousRow) {
        lowestMatchedRowByCol.set(col, row);
      }
    }

    const affectedCells = new Set();
    for (const [col, lowestRow] of lowestMatchedRowByCol) {
      for (let row = 0; row <= lowestRow; row += 1) {
        affectedCells.add(cellKey(row, col));
      }
    }

    return affectedCells;
  }

  function renderBoard(currentBoard, options = {}) {
    const { landingCells = new Set() } = options;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = cells[row][col];
        const value = currentBoard[row][col];
        cell.classList.remove(...CELL_CLASS_NAMES, 'selected', 'matched', 'cell-land', 'cell-hint');
        if (value >= 1 && value <= CELL_CLASS_NAMES.length) {
          cell.classList.add(`cell-${value}`);
        }
        if (landingCells.has(cellKey(row, col)) && value >= 1 && value <= CELL_CLASS_NAMES.length) {
          cell.classList.add('cell-land');
        }
        if (selectedCell === cell) {
          cell.classList.add('selected');
        }
        cell.setAttribute('aria-label', getCellAriaLabel(row, col, value));
        cell.setAttribute('aria-selected', selectedCell === cell ? 'true' : 'false');
      }
    }
  }

  function readStoredBestScore() {
    try {
      const storedScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
      return Number.isFinite(storedScore) && storedScore > 0 ? storedScore : 0;
    } catch (_err) {
      return 0;
    }
  }

  function persistBestScore(value) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch (_err) {
      // Private browsing or blocked storage: keep the record for this session only.
    }
  }

  function updateBestScore(currentScore) {
    const nextScore = Number(currentScore) || 0;
    if (nextScore <= bestScore) {
      return false;
    }

    bestScore = nextScore;
    currentGameHasNewRecord = true;
    persistBestScore(bestScore);

    if (bestScoreEl) {
      bestScoreEl.textContent = String(bestScore);
      const bestScoreBlock = bestScoreEl.parentElement;
      if (bestScoreBlock) {
        bestScoreBlock.classList.remove('is-new-record');
        void bestScoreBlock.offsetWidth;
        bestScoreBlock.classList.add('is-new-record');
      }
    }

    return true;
  }

  async function playMoveAnimation(data, move) {
    const { board: finalBoard, score: finalScore, animation, reverted } = data;
    clearHintHighlight();

    if (!animation || !Array.isArray(animation.rounds) || animation.rounds.length === 0) {
      if (reverted && animation?.boardAfterSwap) {
        await animateSwapToBoard(animation.boardAfterSwap, move);
        await delay(INVALID_SWAP_PAUSE_MS);
        await animateSwapToBoard(finalBoard, move);
      } else if (animation?.boardAfterSwap) {
        await animateSwapToBoard(animation.boardAfterSwap, move);
      }

      board = finalBoard;
      setScoreFromServer(finalScore);
      renderBoard(board);
      applyGameOverState(Boolean(data.gameOver), finalScore);
      setHintFromServer(data.hint);
      return;
    }

    const { boardAfterSwap, rounds } = animation;

    await animateSwapToBoard(boardAfterSwap, move);
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
      renderBoard(round.boardAfter, { landingCells: getAffectedLandingCells(round.matched) });
      await delay(LAND_MS);
      allCells.forEach((cell) => cell.classList.remove('cell-land'));
    }

    board = finalBoard;
    setScoreFromServer(finalScore);
    renderBoard(board);
    applyGameOverState(Boolean(data.gameOver), finalScore);
    setHintFromServer(data.hint);
  }

  function showComboBadge(n) {
    if (!stageEl) {
      return;
    }

    const badge = document.createElement('div');
    badge.className = 'combo-badge';
    badge.textContent = `Combo x${n}!`;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-atomic', 'true');
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
    updateBestScore(score);
  }

  function applyBoardData(data, options = {}) {
    const { resetRecord = false } = options;
    board = data.board;
    const nextScore = data.score ?? 0;

    if (resetRecord) {
      currentGameHasNewRecord = false;
      clearSelectedCell();
      setFocusedCell(0, 0);
    }

    setScoreFromServer(nextScore);
    renderBoard(board);
    applyGameOverState(Boolean(data.gameOver), nextScore);
    setHintFromServer(data.hint);
  }

  function showNewGameError(error) {
    if (API_BASE === '' && !['localhost', '127.0.0.1', ''].includes(location.hostname)) {
      showApiError(
        'Нет URL API. Для GitHub Pages задайте секрет BACKEND_API_BASE = адрес бэкенда на Render, затем пересоберите Pages (см. README).',
      );
      return;
    }

    if (isApiTimeoutError(error)) {
      showApiError(
        'Сервер не ответил за 60 секунд. На Render Free это бывает после простоя. Нажмите «Повторить», чтобы загрузить поле ещё раз.',
        fetchBoard,
      );
      return;
    }

    showApiError(
      'Не удалось загрузить поле. Проверьте, что бэкенд на Render запущен и CORS/URL верны: ' + API_BASE,
    );
  }

  function showMoveError(error) {
    if (isApiTimeoutError(error)) {
      showApiError(
        'Сервер не ответил за 60 секунд. Нажмите «Повторить», чтобы обновить поле с сервера.',
        refreshBoard,
      );
      return;
    }

    showApiError('Ошибка хода. Проверьте сервер.');
  }

  function showGameOverModal(finalScore) {
    if (!gameOverModal) {
      return;
    }

    const isNewRecord = updateBestScore(finalScore) || currentGameHasNewRecord;
    if (gameOverTitleEl) {
      gameOverTitleEl.textContent = isNewRecord
        ? `Новый рекорд! ${defaultGameOverTitle}`
        : defaultGameOverTitle;
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
      updateHintButtonState();
      showGameOverModal(finalScore);
      return;
    }

    hideGameOverModal();
    updateHintButtonState();
  }

  async function fetchBoard() {
    boardLocked = true;
    clearSelectedCell();
    clearHintHighlight();
    setApiLoading(true, 'Загружаем поле...');

    try {
      const response = await fetchApi('/api/new-game', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      applyBoardData(data, { resetRecord: true });
      clearApiStatus();
    } catch (err) {
      showNewGameError(err);
    } finally {
      setApiLoading(false);
      boardLocked = gameOver || !isBoardReady();
      updateHintButtonState();
    }
  }

  async function refreshBoard() {
    boardLocked = true;
    clearHintHighlight();
    setApiLoading(true, 'Обновляем поле...');

    try {
      const response = await fetchApi('/api/board');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      applyBoardData(data);
      clearApiStatus();
    } catch (err) {
      if (isApiTimeoutError(err)) {
        showApiError(
          'Сервер снова не ответил за 60 секунд. Нажмите «Повторить», чтобы попробовать обновить поле ещё раз.',
          refreshBoard,
        );
      } else {
        showApiError('Не удалось обновить поле. Проверьте соединение с сервером.');
      }
    } finally {
      setApiLoading(false);
      boardLocked = gameOver || !isBoardReady();
      updateHintButtonState();
    }
  }

  async function startNewGame(options = {}) {
    if (boardLocked && !gameOver && isBoardReady()) {
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
    const { row: row1, col: col1 } = getCellPosition(cell1);
    const { row: row2, col: col2 } = getCellPosition(cell2);
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }

  async function handleClick(cell) {
    if (boardLocked) {
      return;
    }

    clearHintHighlight();

    if (!selectedCell) {
      setSelectedCell(cell);
      return;
    }

    if (selectedCell === cell) {
      clearSelectedCell();
      return;
    }

    const first = selectedCell;
    const second = cell;

    if (!isAdjacent(first, second)) {
      clearSelectedCell();
      return;
    }

    const { row: row1, col: col1 } = getCellPosition(first);
    const { row: row2, col: col2 } = getCellPosition(second);

    clearSelectedCell();

    boardLocked = true;
    setApiLoading(true, 'Отправляем ход...');

    try {
      const response = await fetchApi('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row1, col1, row2, col2 }),
      });
      if (response.status === 409) {
        clearApiStatus();
        applyGameOverState(true, score);
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setApiLoading(false);
      clearApiStatus();
      await playMoveAnimation(data, { row1, col1, row2, col2 });
    } catch (err) {
      showMoveError(err);
    } finally {
      setApiLoading(false);
      boardLocked = gameOver || !isBoardReady();
      updateHintButtonState();
    }
  }

  function moveKeyboardFocus(deltaRow, deltaCol) {
    setFocusedCell(focusedCellPosition.row + deltaRow, focusedCellPosition.col + deltaCol, {
      focus: true,
    });
  }

  function handleCellKeyDown(event, cell) {
    const keyActions = {
      ArrowUp: [-1, 0],
      ArrowRight: [0, 1],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
    };

    if (keyActions[event.key]) {
      event.preventDefault();
      const [deltaRow, deltaCol] = keyActions[event.key];
      moveKeyboardFocus(deltaRow, deltaCol);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      handleClick(cell);
    }
  }

  fetchBoard();

  newGameBtn?.addEventListener('click', () => {
    startNewGame({ requireConfirmation: true });
  });

  hintBtn?.addEventListener('click', showHint);

  gameOverNewGameBtn?.addEventListener('click', () => {
    startNewGame();
  });

  apiRetryBtn?.addEventListener('click', () => {
    const retryAction = pendingRetryAction;
    if (!retryAction) {
      return;
    }

    pendingRetryAction = null;
    void retryAction();
  });

  allCells.forEach((cell) => {
    cell.addEventListener('click', () => {
      const { row, col } = getCellPosition(cell);
      setFocusedCell(row, col, { focus: true });
      handleClick(cell);
    });
    cell.addEventListener('focus', () => {
      const { row, col } = getCellPosition(cell);
      setFocusedCell(row, col);
    });
    cell.addEventListener('keydown', (event) => {
      handleCellKeyDown(event, cell);
    });
  });
});
