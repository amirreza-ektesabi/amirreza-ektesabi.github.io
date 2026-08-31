(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyToggleLabel(theme) {
    if (!toggle) return;
    // Button shows the theme it will switch TO.
    toggle.textContent = theme === "dark" ? "[light]" : "[dark]";
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    applyToggleLabel(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* localStorage unavailable; theme just won't persist */
    }
  }

  // Sync the toggle label with whatever the inline bootstrap script set
  // before this file loaded.
  applyToggleLabel(currentTheme());

  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }
})();

(function () {
  "use strict";

  var CELL_SIZE = 34; // px, used to compute how many columns fit the column width
  var MAX_ROWS = 12;
  var MINE_DENSITY = 0.16;
  var LONG_PRESS_MS = 500;
  var AVATAR_SRC = "image.png";

  var playToggle = document.getElementById("play-toggle");
  var section = document.getElementById("minesweeper");
  var boardEl = document.getElementById("ms-board");
  var statusEl = document.getElementById("ms-status");
  var replayEl = document.getElementById("ms-replay");
  var avatarEl = document.querySelector(".avatar");

  if (!playToggle || !section || !boardEl || !statusEl || !replayEl || !avatarEl) return;

  var cols = 0;
  var rows = 0;
  var mineTotal = 0;
  var cells = []; // flat array of cell state objects
  var cellEls = []; // flat array of DOM elements, same indexing
  var firstClickDone = false;
  var gameOver = false;
  var revealedCount = 0;
  var flaggedCount = 0;
  var initialized = false;

  function index(r, c) {
    return r * cols + c;
  }

  function neighbors(r, c) {
    var result = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr;
        var nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          result.push({ r: nr, c: nc });
        }
      }
    }
    return result;
  }

  function updateStatus() {
    statusEl.className = "ms-status";
    statusEl.textContent = "mines: " + (mineTotal - flaggedCount);
  }

  function setEndStatus(text, kind) {
    statusEl.className = "ms-status" + (kind ? " " + kind : "");
    statusEl.textContent = text;
  }

  function buildBoard() {
    var containerWidth = boardEl.clientWidth || boardEl.parentElement.clientWidth;
    cols = Math.max(6, Math.floor(containerWidth / CELL_SIZE));
    // Fewer rows on narrow screens so cells stay big instead of shrinking
    rows = Math.max(8, Math.min(MAX_ROWS, Math.round(cols * 0.7)));
    mineTotal = Math.round(cols * rows * MINE_DENSITY);

    cells = [];
    cellEls = [];
    firstClickDone = false;
    gameOver = false;
    revealedCount = 0;
    flaggedCount = 0;

    boardEl.innerHTML = "";
    boardEl.classList.remove("win");
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        cells.push({
          mine: false,
          adjacent: 0,
          revealed: false,
          flagged: false
        });

        var cellEl = document.createElement("div");
        cellEl.className = "ms-cell hidden-cell";
        cellEl.dataset.r = r;
        cellEl.dataset.c = c;
        attachCellEvents(cellEl, r, c);
        boardEl.appendChild(cellEl);
        cellEls.push(cellEl);
      }
    }

    updateStatus();
  }

  function placeMines(safeR, safeC) {
    var safeZone = {};
    safeZone[index(safeR, safeC)] = true;
    neighbors(safeR, safeC).forEach(function (n) {
      safeZone[index(n.r, n.c)] = true;
    });

    var placed = 0;
    while (placed < mineTotal) {
      var idx = Math.floor(Math.random() * cells.length);
      if (safeZone[idx] || cells[idx].mine) continue;
      cells[idx].mine = true;
      placed++;
    }

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = cells[index(r, c)];
        if (cell.mine) continue;
        var count = 0;
        neighbors(r, c).forEach(function (n) {
          if (cells[index(n.r, n.c)].mine) count++;
        });
        cell.adjacent = count;
      }
    }
  }

  function renderCell(r, c) {
    var idx = index(r, c);
    var cell = cells[idx];
    var el = cellEls[idx];

    el.className = "ms-cell";

    if (cell.flagged && !cell.revealed) {
      el.classList.add("flag");
      el.textContent = "\u2691";
      return;
    }

    if (!cell.revealed) {
      el.classList.add("hidden-cell");
      el.textContent = "";
      return;
    }

    if (cell.mine) {
      el.classList.add("mine");
      if (cell.exploded) el.classList.add("exploded");
      var img = document.createElement("img");
      img.src = AVATAR_SRC;
      img.alt = "";
      el.textContent = "";
      el.appendChild(img);
      return;
    }

    el.textContent = cell.adjacent > 0 ? String(cell.adjacent) : "";
    if (cell.adjacent > 0) el.classList.add("n" + cell.adjacent);
  }

  function reveal(r, c) {
    var idx = index(r, c);
    var cell = cells[idx];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    revealedCount++;
    renderCell(r, c);

    if (cell.adjacent === 0 && !cell.mine) {
      neighbors(r, c).forEach(function (n) {
        var nCell = cells[index(n.r, n.c)];
        if (!nCell.revealed && !nCell.flagged) reveal(n.r, n.c);
      });
    }
  }

  function revealAllMines() {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = cells[index(r, c)];
        if (cell.mine) {
          cell.revealed = true;
          renderCell(r, c);
        }
      }
    }
  }

  function checkWin() {
    var nonMineCells = cols * rows - mineTotal;
    if (revealedCount === nonMineCells) {
      gameOver = true;
      boardEl.classList.add("win");
      revealAllMines();
      setEndStatus("--- You Win ---", "win");
    }
  }

  function handleReveal(r, c) {
    if (gameOver) return;
    var idx = index(r, c);
    var cell = cells[idx];
    if (cell.flagged || cell.revealed) return;

    if (!firstClickDone) {
      placeMines(r, c);
      firstClickDone = true;
    }

    if (cell.mine) {
      cell.exploded = true;
      cell.revealed = true;
      gameOver = true;
      renderCell(r, c);
      revealAllMines();
      setEndStatus("--- Game Over ---", "lose");
      return;
    }

    reveal(r, c);
    checkWin();
    if (!gameOver) updateStatus();
  }

  // Classic chord: clicking a revealed number whose adjacent flags match its
  // value reveals the remaining hidden neighbors. A wrong flag (flag on a
  // non-mine) means a mine stays hidden and gets revealed -> game over.
  function handleChord(r, c) {
    if (gameOver) return;
    var cell = cells[index(r, c)];
    if (!cell.revealed || cell.adjacent === 0) return;

    var flagged = 0;
    neighbors(r, c).forEach(function (n) {
      if (cells[index(n.r, n.c)].flagged) flagged++;
    });
    if (flagged !== cell.adjacent) return;

    var toReveal = [];
    neighbors(r, c).forEach(function (n) {
      var nCell = cells[index(n.r, n.c)];
      if (!nCell.flagged && !nCell.revealed) toReveal.push(n);
    });

    for (var i = 0; i < toReveal.length; i++) {
      var n = toReveal[i];
      var nCell = cells[index(n.r, n.c)];
      if (nCell.mine) {
        nCell.exploded = true;
        nCell.revealed = true;
        gameOver = true;
        renderCell(n.r, n.c);
        revealAllMines();
        setEndStatus("--- Game Over ---", "lose");
        return;
      }
      reveal(n.r, n.c);
    }

    if (!gameOver) {
      checkWin();
      if (!gameOver) updateStatus();
    }
  }

  function handleFlag(r, c) {
    if (gameOver) return;
    var idx = index(r, c);
    var cell = cells[idx];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    flaggedCount += cell.flagged ? 1 : -1;
    renderCell(r, c);
    updateStatus();
  }

  function attachCellEvents(cellEl, r, c) {
    var pressTimer = null;
    var longPressFired = false;

    cellEl.addEventListener("click", function () {
      if (longPressFired) {
        longPressFired = false;
        return;
      }
      var cell = cells[index(r, c)];
      if (cell.revealed) {
        handleChord(r, c);
        return;
      }
      handleReveal(r, c);
    });

    cellEl.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      handleFlag(r, c);
    });

    // Hold to flag, works on desktop too (left button held for LONG_PRESS_MS)
    cellEl.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      longPressFired = false;
      pressTimer = setTimeout(function () {
        longPressFired = true;
        handleFlag(r, c);
      }, LONG_PRESS_MS);
    });

    cellEl.addEventListener("mouseup", function () {
      clearTimeout(pressTimer);
    });

    cellEl.addEventListener("mouseleave", function () {
      clearTimeout(pressTimer);
    });

    cellEl.addEventListener("touchstart", function () {
      longPressFired = false;
      pressTimer = setTimeout(function () {
        longPressFired = true;
        handleFlag(r, c);
      }, LONG_PRESS_MS);
    }, { passive: true });

    cellEl.addEventListener("touchend", function () {
      clearTimeout(pressTimer);
    });

    cellEl.addEventListener("touchmove", function () {
      clearTimeout(pressTimer);
      longPressFired = false;
    });
  }

  function startGame() {
    buildBoard();
    initialized = true;
  }

  playToggle.addEventListener("click", function () {
    var isHidden = section.hasAttribute("hidden");
    if (isHidden) {
      section.removeAttribute("hidden");
      avatarEl.classList.add("ms-shrunk");
      playToggle.textContent = "[close]";
      // Rebuild so the board is sized against its visible width
      startGame();
    } else {
      section.setAttribute("hidden", "");
      avatarEl.classList.remove("ms-shrunk");
      playToggle.textContent = "[play]";
    }
  });

  // Keep cell size constant: rebuild (and restart) when the column count
  // would change after a resize.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (!initialized || section.hasAttribute("hidden")) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var containerWidth = boardEl.clientWidth || boardEl.parentElement.clientWidth;
      var newCols = Math.max(6, Math.floor(containerWidth / CELL_SIZE));
      if (newCols !== cols) startGame();
    }, 150);
  });

  replayEl.addEventListener("click", function (e) {
    e.preventDefault();
    startGame();
  });
})();