document.addEventListener('DOMContentLoaded', () => {
  // --- Состояние игры ---
  // переменные: счёт, выбранная клетка, блокировка поля во время анимации
  let score = 0;
  let selectedCell = null;
  let boardLocked = false;

  const board = document.querySelector('.board');
  const scoreEl = document.querySelector('.score');

  // сетка 6×6: cells[row][col] — DOM-элемент клетки
  const cells = [];
  const allCells = Array.from(board.querySelectorAll('.cell'));
  for (let r = 0; r < 6; r++) {
    cells[r] = allCells.slice(r * 6, r * 6 + 6);
  }

  // --- Вспомогательные функции ---
  // getType, setType, isAdjacent, getRow, getCol

  /** Тип фишки 1/2/3 по классу cell-1…cell-3 */
  function getType(cell) {
    if (cell.classList.contains('cell-1')) return 1;
    if (cell.classList.contains('cell-2')) return 2;
    if (cell.classList.contains('cell-3')) return 3;
    return null;
  }

  /** Поставить тип фишки только через классы (без innerHTML) */
  function setType(cell, type) {
    cell.classList.remove('cell-1', 'cell-2', 'cell-3');
    cell.classList.add('cell-' + type);
  }

  /** Случайный тип 1…3 */
  function randomType() {
    return Math.floor(Math.random() * 3) + 1;
  }

  /** Соседи только по стороне света (не по диагонали) */
  function isAdjacent(cell1, cell2) {
    const dr = Math.abs(getRow(cell1) - getRow(cell2));
    const dc = Math.abs(getCol(cell1) - getCol(cell2));
    return dr + dc === 1;
  }

  function getRow(cell) {
    return Number(cell.getAttribute('data-row'));
  }

  function getCol(cell) {
    return Number(cell.getAttribute('data-col'));
  }

  function clearSelection() {
    if (selectedCell) {
      selectedCell.classList.remove('selected');
      selectedCell = null;
    }
  }

  // --- Логика игры ---
  // findMatches, removeMatches, updateScore

  /** Все клетки в линиях из 3+ одинаковых (ряд и столбец) */
  function findMatches() {
    const matched = new Set();

    // Горизонтали
    for (let r = 0; r < 6; r++) {
      let c = 0;
      while (c < 6) {
        const type = getType(cells[r][c]);
        const start = c;
        c++;
        while (c < 6 && getType(cells[r][c]) === type) {
          c++;
        }
        if (type != null && c - start >= 3) {
          for (let k = start; k < c; k++) {
            matched.add(cells[r][k]);
          }
        }
      }
    }

    // Вертикали
    for (let col = 0; col < 6; col++) {
      let r = 0;
      while (r < 6) {
        const type = getType(cells[r][col]);
        const start = r;
        r++;
        while (r < 6 && getType(cells[r][col]) === type) {
          r++;
        }
        if (type != null && r - start >= 3) {
          for (let k = start; k < r; k++) {
            matched.add(cells[k][col]);
          }
        }
      }
    }

    return Array.from(matched);
  }

  /**
   * Класс matched → пауза 400 мс → случайные новые типы и очки;
   * если снова есть тройки — повторить.
   */
  function removeMatches(cellsToRemove) {
    boardLocked = true;
    const unique = Array.from(new Set(cellsToRemove));

    unique.forEach((cell) => {
      cell.classList.add('matched');
    });

    window.setTimeout(() => {
      unique.forEach((cell) => {
        cell.classList.remove('matched');
        setType(cell, randomType());
      });

      updateScore(unique.length * 10);

      const next = findMatches();
      if (next.length > 0) {
        removeMatches(next);
      } else {
        boardLocked = false;
      }
    }, 400);
  }

  /** Добавить очки и перерисовать строку «Счёт: …» */
  function updateScore(points) {
    score += points;
    scoreEl.textContent = 'Счёт: ' + score;
  }

  // --- Обработчик кликов ---
  // handleClick — выбор, обмен соседей, при наличии троек — removeMatches

  /** Первый клик — выделение; второй — обмен или сброс выделения */
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
      clearSelection();
      return;
    }

    const first = selectedCell;
    const second = cell;

    if (!isAdjacent(first, second)) {
      clearSelection();
      return;
    }

    const typeA = getType(first);
    const typeB = getType(second);
    setType(first, typeB);
    setType(second, typeA);

    clearSelection();

    const matches = findMatches();
    if (matches.length > 0) {
      removeMatches(matches);
    }
  }

  // навесить handleClick на каждую клетку
  allCells.forEach((cell) => {
    cell.addEventListener('click', () => {
      handleClick(cell);
    });
  });
});

