document.addEventListener('DOMContentLoaded', () => {
  // --- Константы ---
  const BOARD_SIZE = 6;
  const MATCH_ANIMATION_MS = 400;

  // --- Состояние игры ---
  // board хранит текущее состояние поля, score — очки, selectedCell — выбранная DOM-клетка
  let board = [];
  let score = 0;
  let selectedCell = null;
  let boardLocked = false;

  const boardEl = document.querySelector('.board');
  const scoreEl = document.querySelector('.score');
  const allCells = Array.from(boardEl.querySelectorAll('.cell'));

  // Быстрый доступ к DOM-клетке по координатам
  const cells = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE));
  allCells.forEach((cell) => {
    const row = Number(cell.getAttribute('data-row'));
    const col = Number(cell.getAttribute('data-col'));
    cells[row][col] = cell;
  });

  // --- Генерация поля (как в Haskell) ---
  function generateElement() {
    return Math.floor(Math.random() * 3) + 1;
  }

  function generateBoard() {
    while (true) {
      const newBoard = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => generateElement())
      );

      if (findAllTriples(newBoard).length === 0) {
        return newBoard;
      }
    }
  }

  // --- Поиск троек (как в Haskell) ---
  function findHorizontalTriples(currentBoard) {
    const triples = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col <= BOARD_SIZE - 3; col++) {
        const a = currentBoard[row][col];
        const b = currentBoard[row][col + 1];
        const c = currentBoard[row][col + 2];

        if (a === b && b === c) {
          triples.push({ row, colStart: col, colEnd: col + 2 });
        }
      }
    }

    return triples;
  }

  function findVerticalTriples(currentBoard) {
    const triples = [];

    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row <= BOARD_SIZE - 3; row++) {
        const a = currentBoard[row][col];
        const b = currentBoard[row + 1][col];
        const c = currentBoard[row + 2][col];

        if (a === b && b === c) {
          triples.push({ rowStart: row, rowEnd: row + 2, col });
        }
      }
    }

    return triples;
  }

  function findAllTriples(currentBoard) {
    return [...findHorizontalTriples(currentBoard), ...findVerticalTriples(currentBoard)];
  }

  function collectCellsToRemove(currentBoard) {
    const unique = new Set();
    const cellsToRemove = [];

    const horizontals = findHorizontalTriples(currentBoard);
    const verticals = findVerticalTriples(currentBoard);

    horizontals.forEach((triple) => {
      for (let col = triple.colStart; col <= triple.colEnd; col++) {
        const key = `${triple.row}:${col}`;
        if (!unique.has(key)) {
          unique.add(key);
          cellsToRemove.push({ row: triple.row, col });
        }
      }
    });

    verticals.forEach((triple) => {
      for (let row = triple.rowStart; row <= triple.rowEnd; row++) {
        const key = `${row}:${triple.col}`;
        if (!unique.has(key)) {
          unique.add(key);
          cellsToRemove.push({ row, col: triple.col });
        }
      }
    });

    return cellsToRemove;
  }

  // --- Логика игры (как в Haskell) ---
  function calculateScore(currentBoard) {
    return collectCellsToRemove(currentBoard).length * 10;
  }

  function removeAllTriples(currentBoard) {
    const nextBoard = currentBoard.map((row) => [...row]);
    const cellsToRemove = collectCellsToRemove(nextBoard);

    cellsToRemove.forEach(({ row, col }) => {
      nextBoard[row][col] = 0;
    });

    return nextBoard;
  }

  function addNewElements(currentBoard) {
    const emptyCells = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (currentBoard[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) {
      return currentBoard.map((row) => [...row]);
    }

    while (true) {
      const nextBoard = currentBoard.map((row) => [...row]);

      emptyCells.forEach(({ row, col }) => {
        nextBoard[row][col] = generateElement();
      });

      if (findAllTriples(nextBoard).length === 0) {
        return nextBoard;
      }
    }
  }

  // --- Синхронизация с HTML ---
  function renderBoard(currentBoard) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = cells[row][col];
        const value = currentBoard[row][col];
        cell.classList.remove('cell-1', 'cell-2', 'cell-3', 'selected');
        if (value >= 1 && value <= 3) {
          cell.classList.add(`cell-${value}`);
        }
      }
    }
  }

  function updateScore(points) {
    score += points;
    scoreEl.textContent = `Счёт: ${score}`;
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function markMatchedCells(cellsToRemove) {
    cellsToRemove.forEach(({ row, col }) => {
      cells[row][col].classList.add('matched');
    });
  }

  function clearMatchedCells(cellsToRemove) {
    cellsToRemove.forEach(({ row, col }) => {
      cells[row][col].classList.remove('matched');
    });
  }

  async function processBoardAfterMove() {
    boardLocked = true;

    while (findAllTriples(board).length > 0) {
      const cellsToRemove = collectCellsToRemove(board);
      markMatchedCells(cellsToRemove);
      await sleep(MATCH_ANIMATION_MS);
      clearMatchedCells(cellsToRemove);

      const gained = calculateScore(board);
      updateScore(gained);
      board = removeAllTriples(board);
      board = addNewElements(board);

      renderBoard(board);
    }

    boardLocked = false;
  }

  // --- Обработка кликов ---
  function isAdjacent(cell1, cell2) {
    const row1 = Number(cell1.getAttribute('data-row'));
    const col1 = Number(cell1.getAttribute('data-col'));
    const row2 = Number(cell2.getAttribute('data-row'));
    const col2 = Number(cell2.getAttribute('data-col'));
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }

  function handleClick(cell) {
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

    // Вариант Б: обмен соседних фишек всегда выполняется
    const temp = board[row1][col1];
    board[row1][col1] = board[row2][col2];
    board[row2][col2] = temp;

    first.classList.remove('selected');
    selectedCell = null;

    renderBoard(board);
    processBoardAfterMove();
  }

  // Инициализация игры: генерируем поле без троек и рисуем его
  board = generateBoard();
  renderBoard(board);
  updateScore(0);

  // навесить handleClick на каждую клетку
  allCells.forEach((cell) => {
    cell.addEventListener('click', () => handleClick(cell));
  });
});

