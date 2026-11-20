(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const SIZE = 6;
  const STORAGE_KEY = "coin-collector-adventure-v2";
  const TOTAL_LEVELS = 20;
  const DIRECTIONS = {
    up: { label: "Atas", icon: "fa-arrow-up", dr: -1, dc: 0 },
    down: { label: "Bawah", icon: "fa-arrow-down", dr: 1, dc: 0 },
    left: { label: "Kiri", icon: "fa-arrow-left", dr: 0, dc: -1 },
    right: { label: "Kanan", icon: "fa-arrow-right", dr: 0, dc: 1 },
  };
  const DIRECTION_ORDER = ["right", "down", "left", "up"];

  const dom = {
    welcomeScreen: $("#welcomeScreen"),
    gameApp: $("#gameApp"),
    headerRight: $("#headerRight"),
    playerNameInput: $("#playerNameInput"),
    startForm: $("#startForm"),
    startButtonText: $("#startButtonText"),
    startError: $("#startError"),
    headerPlayerName: $("#headerPlayerName"),
    headerLevel: $("#headerLevel"),
    headerScore: $("#headerScore"),
    boardLevelLabel: $("#boardLevelLabel"),
    mazeGrid: $("#mazeGrid"),
    coinCount: $("#coinCount"),
    boardCoinCount: $("#boardCoinCount"),
    stepsCount: $("#stepsCount"),
    progressPercent: $("#progressPercent"),
    progressBar: $("#progressBar"),
    coinCheck: $("#coinCheck"),
    treasureCheck: $("#treasureCheck"),
    programList: $("#programList"),
    programEmpty: $("#programEmpty"),
    commandCount: $("#commandCount"),
    undoButton: $("#undoButton"),
    clearProgramButton: $("#clearProgramButton"),
    runButton: $("#runButton"),
    stopButton: $("#stopButton"),
    resetLevelButton: $("#resetLevelButton"),
    changePlayerButton: $("#changePlayerButton"),
    levelGrid: $("#levelGrid"),
    completedLevelCount: $("#completedLevelCount"),
    toast: $("#toast"),
    toastMessage: $("#toastMessage"),
    completionModal: $("#completionModal"),
    completionPlayerName: $("#completionPlayerName"),
    earnedPoints: $("#earnedPoints"),
    completionSteps: $("#completionSteps"),
    completionCoins: $("#completionCoins"),
    nextLevelButton: $("#nextLevelButton"),
    closeCompletionButton: $("#closeCompletionButton"),
    currentYear: $("#currentYear"),
  };

  const state = {
    store: { activeProfileKey: null, profiles: {} },
    profileKey: null,
    profile: null,
    level: 1,
    levelData: null,
    position: { r: 0, c: 0 },
    collected: new Set(),
    steps: 0,
    commands: [],
    isRunning: false,
    stopRequested: false,
    isFinished: false,
  };

  let toastTimer = null;

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { activeProfileKey: null, profiles: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.profiles) {
        return { activeProfileKey: null, profiles: {} };
      }
      return {
        activeProfileKey: parsed.activeProfileKey || null,
        profiles: parsed.profiles,
      };
    } catch (error) {
      console.warn("Saved progress could not be loaded.", error);
      return { activeProfileKey: null, profiles: {} };
    }
  }

  function writeStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
    } catch (error) {
      console.warn("Progress could not be saved on this device.", error);
      showToast(
        "Progres belum dapat disimpan. Periksa pengaturan penyimpanan browser.",
        "warning",
      );
    }
  }

  function profileKeyFromName(name) {
    return name.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
  }

  function createProfile(name) {
    return {
      name,
      score: 0,
      unlockedLevel: 1,
      currentLevel: 1,
      completedLevels: {},
      createdAt: new Date().toISOString(),
    };
  }

  function persistProfile() {
    if (!state.profile || !state.profileKey) return;
    state.store.profiles[state.profileKey] = state.profile;
    state.store.activeProfileKey = state.profileKey;
    writeStore();
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cellIndex(cell) {
    return cell.r * SIZE + cell.c;
  }

  function cellId(cell) {
    return `${cell.r}-${cell.c}`;
  }

  function edgeKey(a, b) {
    const first = cellIndex(a);
    const second = cellIndex(b);
    return first < second ? `${first}|${second}` : `${second}|${first}`;
  }

  function isInside(cell) {
    return cell.r >= 0 && cell.r < SIZE && cell.c >= 0 && cell.c < SIZE;
  }

  function getNeighbor(cell, direction) {
    const movement = DIRECTIONS[direction];
    return { r: cell.r + movement.dr, c: cell.c + movement.dc };
  }

  function addOpenEdge(openEdges, a, b) {
    openEdges.add(edgeKey(a, b));
  }

  function addExtraPassages(openEdges, seed, count) {
    // Tambahkan beberapa jalur alternatif agar level awal lebih mudah,
    // tetapi tetap memiliki tata letak labirin yang berbeda.
    const random = seededRandom(seed ^ 0x9e3779b9);
    const closedEdges = [];

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const cell = { r, c };

        if (c < SIZE - 1) {
          const right = { r, c: c + 1 };
          if (!openEdges.has(edgeKey(cell, right))) {
            closedEdges.push([cell, right]);
          }
        }

        if (r < SIZE - 1) {
          const down = { r: r + 1, c };
          if (!openEdges.has(edgeKey(cell, down))) {
            closedEdges.push([cell, down]);
          }
        }
      }
    }

    // Fisher-Yates shuffle deterministik berdasarkan seed level.
    for (let index = closedEdges.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [closedEdges[index], closedEdges[swapIndex]] = [
        closedEdges[swapIndex],
        closedEdges[index],
      ];
    }

    closedEdges.slice(0, Math.max(0, count)).forEach(([from, to]) => {
      addOpenEdge(openEdges, from, to);
    });

    return openEdges;
  }

  function extraPassageCount(level) {
    // Semakin tinggi level, semakin sedikit jalur alternatif yang dibuka.
    const passagePlan = [
      20,
      17,
      14,
      11, // Level 1-4: pemanasan
      8,
      7,
      6,
      5, // Level 5-8: tantangan dasar
      4,
      4,
      3,
      3,
      2,
      2, // Level 9-14: tantangan menengah
      1,
      1,
      0,
      0,
      0,
      0, // Level 15-20: tantangan lanjutan
    ];

    return passagePlan[level - 1] ?? 0;
  }

  function createMaze(seed) {
    const random = seededRandom(seed);
    const openEdges = new Set();
    const start = { r: 0, c: 0 };
    const visited = new Set([cellId(start)]);
    const stack = [start];

    while (stack.length) {
      const current = stack[stack.length - 1];
      const candidates = ["up", "right", "down", "left"]
        .map((direction) => ({
          direction,
          cell: getNeighbor(current, direction),
        }))
        .filter(
          (item) => isInside(item.cell) && !visited.has(cellId(item.cell)),
        );

      if (!candidates.length) {
        stack.pop();
        continue;
      }

      const chosen = candidates[Math.floor(random() * candidates.length)];
      addOpenEdge(openEdges, current, chosen.cell);
      visited.add(cellId(chosen.cell));
      stack.push(chosen.cell);
    }

    return openEdges;
  }

  function findPath(openEdges) {
    const start = { r: 0, c: 0 };
    const goal = { r: SIZE - 1, c: SIZE - 1 };
    const queue = [start];
    const previous = new Map([[cellId(start), null]]);

    while (queue.length) {
      const current = queue.shift();
      if (cellId(current) === cellId(goal)) break;

      for (const direction of DIRECTION_ORDER) {
        const next = getNeighbor(current, direction);
        if (!isInside(next) || !openEdges.has(edgeKey(current, next))) continue;
        const nextId = cellId(next);
        if (previous.has(nextId)) continue;
        previous.set(nextId, current);
        queue.push(next);
      }
    }

    if (!previous.has(cellId(goal))) return [start, goal];
    const path = [];
    let current = goal;
    while (current) {
      path.unshift(current);
      current = previous.get(cellId(current)) || null;
    }
    return path;
  }

  function chooseCoins(path) {
    const coinIndexes = [
      Math.round((path.length - 1) * 0.24),
      Math.round((path.length - 1) * 0.53),
      Math.round((path.length - 1) * 0.8),
    ].map((index) => Math.max(1, Math.min(path.length - 2, index)));

    const chosen = [];
    for (const index of coinIndexes) {
      let candidate = index;
      while (chosen.includes(candidate) && candidate < path.length - 2)
        candidate += 1;
      while (chosen.includes(candidate) && candidate > 1) candidate -= 1;
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }
    for (
      let index = 1;
      chosen.length < 3 && index < path.length - 1;
      index += 1
    ) {
      if (!chosen.includes(index)) chosen.push(index);
    }
    return chosen
      .slice(0, 3)
      .map((index) => ({ ...path[index], id: cellId(path[index]) }));
  }

  function createLevel(level) {
    // Setiap level memakai seed berbeda sehingga bentuk labirinnya tidak sama.
    const seed = 8147 + level * 7919;
    const openEdges = createMaze(seed);
    addExtraPassages(openEdges, seed + 104729, extraPassageCount(level));
    const shortestPath = findPath(openEdges);
    return {
      number: level,
      openEdges,
      shortestPath,
      coins: chooseCoins(shortestPath),
      start: { r: 0, c: 0 },
      goal: { r: SIZE - 1, c: SIZE - 1 },
    };
  }

  function isOpenBetween(from, to) {
    return isInside(to) && state.levelData.openEdges.has(edgeKey(from, to));
  }

  function setWelcomeState() {
    const activeKey = state.store.activeProfileKey;
    const activeProfile = activeKey ? state.store.profiles[activeKey] : null;
    if (activeProfile && activeProfile.name) {
      dom.playerNameInput.value = activeProfile.name;
      dom.startButtonText.textContent = "Lanjutkan Petualangan";
    } else {
      dom.playerNameInput.value = "";
      dom.startButtonText.textContent = "Mulai Petualangan";
    }
  }

  function startSession(name) {
    const key = profileKeyFromName(name);
    let profile = state.store.profiles[key];
    if (!profile) profile = createProfile(name);
    else profile.name = name;

    state.profileKey = key;
    state.profile = profile;
    state.store.profiles[key] = profile;
    state.store.activeProfileKey = key;
    writeStore();

    dom.welcomeScreen.hidden = true;
    dom.gameApp.hidden = false;
    dom.headerRight.hidden = false;
    state.isRunning = false;
    state.stopRequested = false;

    const savedLevel =
      Number(profile.currentLevel) || Number(profile.unlockedLevel) || 1;
    const selectedLevel = Math.min(
      Math.max(savedLevel, 1),
      Math.min(profile.unlockedLevel || 1, TOTAL_LEVELS),
    );
    loadLevel(selectedLevel);
    updateHeader();
    dom.gameApp.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateHeader() {
    if (!state.profile) return;
    dom.headerPlayerName.textContent = state.profile.name;
    dom.headerLevel.textContent = `${String(state.level).padStart(2, "0")} / ${TOTAL_LEVELS}`;
    dom.headerScore.textContent = Number(
      state.profile.score || 0,
    ).toLocaleString("id-ID");
    dom.completedLevelCount.textContent = `${Object.keys(state.profile.completedLevels || {}).length} / ${TOTAL_LEVELS}`;
  }

  function loadLevel(level) {
    const unlocked = Number(state.profile?.unlockedLevel || 1);
    if (level > unlocked || level < 1 || level > TOTAL_LEVELS) return;

    state.level = level;
    state.levelData = createLevel(level);
    state.position = { ...state.levelData.start };
    state.collected = new Set();
    state.steps = 0;
    state.commands = [];
    state.isFinished = false;
    state.stopRequested = false;
    state.profile.currentLevel = level;
    persistProfile();

    dom.boardLevelLabel.textContent = `LEVEL ${String(level).padStart(2, "0")}`;
    const difficulty =
      level <= 4
        ? "pemanasan"
        : level <= 8
          ? "tantangan dasar"
          : level <= 14
            ? "tantangan menengah"
            : "tantangan lanjutan";
    $("#missionDescription").textContent =
      `Level ${String(level).padStart(2, "0")} · ${difficulty}. Rencanakan rute, kumpulkan ketiga koin, lalu capai peti harta karun.`;
    updateHeader();
    renderBoard();
    renderProgram();
    renderLevelGrid();
    updateMissionProgress();
    setRunningUI(false);
    dom.mazeGrid.setAttribute(
      "aria-label",
      `Peta labirin level ${level}, enam kali enam`,
    );
  }

  function borderColorFor(cell, direction) {
    const neighbor = getNeighbor(cell, direction);
    return isOpenBetween(cell, neighbor) ? "transparent" : "#34476f";
  }

  function renderBoard() {
    if (!state.levelData) return;
    const { coins, goal, start } = state.levelData;
    const coinLookup = new Set(coins.map((coin) => coin.id));
    const cells = [];

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const cell = { r, c };
        const id = cellId(cell);
        const isPlayer = state.position.r === r && state.position.c === c;
        const isGoal = goal.r === r && goal.c === c;
        const isStart = start.r === r && start.c === c;
        const hasCoin = coinLookup.has(id) && !state.collected.has(id);
        const hasPassage = ["up", "right", "down", "left"].some((direction) =>
          isOpenBetween(cell, getNeighbor(cell, direction)),
        );
        const classes = ["maze-cell"];
        if (hasPassage) classes.push("is-open");
        if (isPlayer) classes.push("is-player");
        if (hasCoin) classes.push("is-coin");
        if (isGoal) classes.push("is-goal");
        if (isStart) classes.push("is-start");

        let marker = "";
        if (isPlayer)
          marker =
            '<i class="fa-solid fa-person-hiking" aria-hidden="true"></i>';
        else if (isGoal)
          marker = '<i class="fa-solid fa-box-open" aria-hidden="true"></i>';
        else if (hasCoin)
          marker = '<i class="fa-solid fa-coins" aria-hidden="true"></i>';
        else if (isStart)
          marker = '<i class="fa-solid fa-flag" aria-hidden="true"></i>';

        const cellNumber = cellIndex(cell) + 1;
        const labelParts = [
          `kotak ${cellNumber}`,
          `baris ${r + 1}`,
          `kolom ${c + 1}`,
        ];
        if (isPlayer) labelParts.push("Milo");
        if (hasCoin) labelParts.push("koin");
        if (isGoal) labelParts.push("peti harta karun");
        const style = [
          `border-top-color:${borderColorFor(cell, "up")}`,
          `border-right-color:${borderColorFor(cell, "right")}`,
          `border-bottom-color:${borderColorFor(cell, "down")}`,
          `border-left-color:${borderColorFor(cell, "left")}`,
        ].join(";");

        cells.push(
          `<div class="${classes.join(" ")}" style="${style}" aria-label="${labelParts.join(", ")}">
            <span class="cell-marker">${marker}</span>
            <span class="cell-coordinate" aria-hidden="true">${cellNumber}</span>
          </div>`,
        );
      }
    }

    dom.mazeGrid.innerHTML = cells.join("");
  }

  function updateMissionProgress() {
    const coinTotal = state.collected.size;
    dom.coinCount.textContent = coinTotal;
    dom.boardCoinCount.textContent = `${coinTotal} / 3`;
    dom.stepsCount.textContent = state.steps;

    const optimalSteps = Math.max(1, state.levelData.shortestPath.length - 1);
    const routeProgress = Math.min(
      40,
      Math.round((state.steps / optimalSteps) * 40),
    );
    const coinProgress = Math.round((coinTotal / 3) * 60);
    const completion = state.isFinished
      ? 100
      : Math.min(99, routeProgress + coinProgress);
    dom.progressPercent.textContent = `${completion}%`;
    dom.progressBar.style.width = `${completion}%`;
    dom.coinCheck.classList.toggle("is-done", coinTotal === 3);
    const atGoal =
      state.position.r === state.levelData.goal.r &&
      state.position.c === state.levelData.goal.c;
    dom.treasureCheck.classList.toggle("is-done", atGoal && coinTotal === 3);
  }

  function renderProgram() {
    const count = state.commands.length;
    dom.commandCount.textContent = `${count} blok`;
    dom.undoButton.disabled = count === 0 || state.isRunning;
    dom.clearProgramButton.disabled = count === 0 || state.isRunning;
    dom.runButton.disabled = count === 0 || state.isRunning || state.isFinished;
    dom.programEmpty.hidden = count > 0;

    if (count === 0) {
      dom.programList.innerHTML = "";
      dom.programList.append(dom.programEmpty);
      return;
    }

    dom.programList.innerHTML = state.commands
      .map((command, index) => {
        const isRepeat = command.type === "repeat";
        const direction = isRepeat ? null : DIRECTIONS[command.direction];
        const icon = isRepeat ? "fa-repeat" : direction.icon;
        const label = isRepeat ? `Ulangi ×${command.count}` : direction.label;
        return `<div class="program-block ${isRepeat ? "repeat" : ""}">
          <span class="block-number">${String(index + 1).padStart(2, "0")}</span>
          <i class="fa-solid ${icon}" aria-hidden="true"></i>
          <span>${label}</span>
          <button type="button" class="remove-block" data-remove-index="${index}" aria-label="Hapus blok ${index + 1}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>`;
      })
      .join("");
  }

  function renderLevelGrid() {
    if (!state.profile) return;
    const unlocked = Number(state.profile.unlockedLevel || 1);
    const completed = state.profile.completedLevels || {};
    dom.levelGrid.innerHTML = Array.from(
      { length: TOTAL_LEVELS },
      (_, index) => {
        const level = index + 1;
        const isLocked = level > unlocked;
        const isCurrent = level === state.level;
        const isCompleted = Object.prototype.hasOwnProperty.call(
          completed,
          String(level),
        );
        const classes = ["level-button"];
        if (isCurrent) classes.push("is-current");
        if (isCompleted) classes.push("is-completed");
        const label = isLocked
          ? '<i class="fa-solid fa-lock" aria-hidden="true"></i>'
          : String(level).padStart(2, "0");
        const check =
          isCompleted && !isCurrent
            ? '<i class="fa-solid fa-check level-check" aria-hidden="true"></i>'
            : "";
        return `<button type="button" class="${classes.join(" ")}" data-level="${level}" ${isLocked ? "disabled" : ""} aria-label="Level ${level}${isLocked ? ", terkunci" : ""}" ${isCurrent ? 'aria-current="step"' : ""}>${label}${check}</button>`;
      },
    ).join("");
    dom.completedLevelCount.textContent = `${Object.keys(completed).length} / ${TOTAL_LEVELS}`;
  }

  function setRunningUI(running) {
    state.isRunning = running;
    const controlsLocked = running || state.isFinished;
    $$("[data-direction], [data-repeat]").forEach((button) => {
      button.disabled = controlsLocked;
    });
    dom.resetLevelButton.disabled = running;
    dom.changePlayerButton.disabled = running;
    dom.runButton.hidden = running;
    dom.stopButton.hidden = !running;
    dom.runButton.disabled = controlsLocked || state.commands.length === 0;
    renderProgram();
  }

  function showToast(message, type = "info") {
    window.clearTimeout(toastTimer);
    dom.toastMessage.textContent = message;
    dom.toast.classList.remove("is-success", "is-warning", "show");
    if (type === "success") dom.toast.classList.add("is-success");
    if (type === "warning") dom.toast.classList.add("is-warning");
    requestAnimationFrame(() => dom.toast.classList.add("show"));
    toastTimer = window.setTimeout(
      () => dom.toast.classList.remove("show"),
      2800,
    );
  }

  function addCommand(command) {
    if (state.isRunning || state.isFinished) return;
    state.commands.push(command);
    renderProgram();
    dom.runButton.disabled = false;
  }

  function addRepeat(count) {
    if (state.isRunning || state.isFinished) return;
    const hasPreviousDirection = state.commands.some(
      (command) => command.type === "move",
    );
    if (!hasPreviousDirection) {
      showToast(
        "Tambahkan satu blok arah terlebih dahulu sebelum menggunakan pengulangan.",
        "warning",
      );
      return;
    }
    addCommand({ type: "repeat", count });
  }

  function removeCommand(index) {
    if (state.isRunning || index < 0 || index >= state.commands.length) return;
    state.commands.splice(index, 1);
    renderProgram();
    dom.runButton.disabled = state.commands.length === 0;
  }

  function flattenProgram() {
    const sequence = [];
    let lastDirection = null;
    for (const command of state.commands) {
      if (command.type === "move") {
        sequence.push(command.direction);
        lastDirection = command.direction;
      } else if (command.type === "repeat") {
        if (!lastDirection) return null;
        for (let count = 0; count < command.count; count += 1)
          sequence.push(lastDirection);
      }
    }
    return sequence;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function scrollToBoard() {
    if (!dom.mazeGrid) return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dom.mazeGrid.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });
  }

  async function runProgram() {
    if (state.isRunning || state.isFinished) return;
    if (!state.commands.length) {
      showToast(
        "Susun beberapa blok instruksi sebelum menjalankan program.",
        "warning",
      );
      return;
    }

    const sequence = flattenProgram();
    if (!sequence) {
      showToast(
        "Blok pengulangan membutuhkan instruksi arah sebelumnya.",
        "warning",
      );
      return;
    }

    state.position = { ...state.levelData.start };
    state.collected.clear();
    state.steps = 0;
    state.stopRequested = false;
    renderBoard();
    updateMissionProgress();
    scrollToBoard();
    setRunningUI(true);

    let stoppedByWall = false;
    let reachedGoal = false;

    try {
      for (const direction of sequence) {
        if (state.stopRequested) break;
        await wait(390);
        if (state.stopRequested) break;

        const next = getNeighbor(state.position, direction);
        if (!isInside(next) || !isOpenBetween(state.position, next)) {
          stoppedByWall = true;
          showToast(
            `Milo terhalang! Periksa instruksi ${DIRECTIONS[direction].label} dan susun ulang program.`,
            "warning",
          );
          break;
        }

        state.position = next;
        state.steps += 1;

        const reachedCoin = state.levelData.coins.find(
          (coin) => coin.id === cellId(next),
        );
        if (reachedCoin && !state.collected.has(reachedCoin.id)) {
          state.collected.add(reachedCoin.id);
          showToast(
            `Koin ditemukan! ${state.collected.size} dari 3 koin terkumpul.`,
            "success",
          );
        }

        renderBoard();
        updateMissionProgress();

        if (
          next.r === state.levelData.goal.r &&
          next.c === state.levelData.goal.c
        ) {
          reachedGoal = true;
          if (state.collected.size === 3) completeLevel();
          else
            showToast(
              `Peti harta sudah ditemukan, tetapi masih ada ${3 - state.collected.size} koin yang belum diambil. Perbaiki rute programmu.`,
              "warning",
            );
          break;
        }
      }

      if (state.stopRequested) {
        showToast(
          "Program dihentikan. Kamu bisa mengubah instruksi dan mencoba lagi.",
        );
      } else if (!stoppedByWall && !reachedGoal && !state.isFinished) {
        showToast(
          "Program selesai. Milo belum mencapai peti harta. Tambahkan instruksi lalu coba lagi.",
        );
      }
    } finally {
      setRunningUI(false);
      state.stopRequested = false;
    }
  }

  function completeLevel() {
    if (state.isFinished) return;
    state.isFinished = true;
    const levelKey = String(state.level);
    const isFirstCompletion = !Object.prototype.hasOwnProperty.call(
      state.profile.completedLevels || {},
      levelKey,
    );
    const optimalSteps = Math.max(0, state.levelData.shortestPath.length - 1);
    const extraSteps = Math.max(0, state.steps - optimalSteps);
    const efficiencyBonus = Math.max(0, 100 - extraSteps * 10);
    const pointsEarned = isFirstCompletion ? 150 + 100 + efficiencyBonus : 0;

    state.profile.score = Number(state.profile.score || 0) + pointsEarned;
    state.profile.completedLevels = state.profile.completedLevels || {};
    state.profile.completedLevels[levelKey] = Math.max(
      Number(state.profile.completedLevels[levelKey] || 0),
      pointsEarned,
    );
    state.profile.unlockedLevel = Math.min(
      TOTAL_LEVELS,
      Math.max(Number(state.profile.unlockedLevel || 1), state.level + 1),
    );
    state.profile.currentLevel = Math.min(TOTAL_LEVELS, state.level + 1);
    persistProfile();

    updateHeader();
    updateMissionProgress();
    renderLevelGrid();
    dom.completionPlayerName.textContent = firstName(state.profile.name);
    dom.earnedPoints.textContent = `+${pointsEarned.toLocaleString("id-ID")}`;
    dom.completionSteps.textContent = state.steps;
    dom.completionCoins.textContent = `${state.collected.size} / 3`;
    dom.nextLevelButton.innerHTML =
      state.level < TOTAL_LEVELS
        ? 'Level Berikutnya <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>'
        : 'Petualangan Selesai <i class="fa-solid fa-trophy" aria-hidden="true"></i>';
    if (!isFirstCompletion) {
      $(".completion-description").textContent =
        "Kamu menuntaskan level ini lagi. Coba susun rute yang lebih ringkas untuk melatih logikamu.";
    } else {
      $(".completion-description").textContent =
        "Kamu berhasil mengumpulkan semua koin dan menemukan peti harta karun.";
    }
    dom.completionModal.hidden = false;
    dom.nextLevelButton.focus();
  }

  function firstName(name) {
    return (
      String(name || "Explorer")
        .trim()
        .split(/\s+/)[0] || "Explorer"
    );
  }

  function resetCurrentLevel() {
    if (state.isRunning) return;
    state.position = { ...state.levelData.start };
    state.collected.clear();
    state.steps = 0;
    state.commands = [];
    state.isFinished = false;
    renderBoard();
    renderProgram();
    updateMissionProgress();
    setRunningUI(false);
    showToast("Level diulang. Susun kembali langkah terbaikmu.");
  }

  function switchPlayer() {
    if (state.isRunning) return;
    dom.completionModal.hidden = true;
    dom.gameApp.hidden = true;
    dom.headerRight.hidden = true;
    dom.welcomeScreen.hidden = false;
    dom.playerNameInput.value = "";
    dom.startButtonText.textContent = "Mulai Petualangan";
    dom.startError.hidden = true;
    dom.playerNameInput.focus();
    dom.welcomeScreen.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initializeEventListeners() {
    dom.startForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = dom.playerNameInput.value.trim().replace(/\s+/g, " ");
      if (name.length < 2) {
        dom.startError.textContent =
          "Username minimal terdiri dari 2 karakter.";
        dom.startError.hidden = false;
        dom.playerNameInput.focus();
        return;
      }
      if (name.length > 20) {
        dom.startError.textContent = "Username maksimal 20 karakter.";
        dom.startError.hidden = false;
        return;
      }
      dom.startError.hidden = true;
      startSession(name);
    });

    $$("[data-direction]").forEach((button) => {
      button.addEventListener("click", () =>
        addCommand({ type: "move", direction: button.dataset.direction }),
      );
    });

    $$("[data-repeat]").forEach((button) => {
      button.addEventListener("click", () =>
        addRepeat(Number(button.dataset.repeat)),
      );
    });

    dom.programList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-index]");
      if (removeButton) removeCommand(Number(removeButton.dataset.removeIndex));
    });

    dom.levelGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-level]");
      if (!button || button.disabled) return;
      loadLevel(Number(button.dataset.level));
      showToast(
        `Level ${String(state.level).padStart(2, "0")} siap dimainkan.`,
      );
      dom.gameApp.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    dom.undoButton.addEventListener("click", () => {
      if (state.isRunning || !state.commands.length) return;
      state.commands.pop();
      renderProgram();
      dom.runButton.disabled = state.commands.length === 0;
    });

    dom.clearProgramButton.addEventListener("click", () => {
      if (state.isRunning) return;
      state.commands = [];
      renderProgram();
      dom.runButton.disabled = true;
    });

    dom.runButton.addEventListener("click", runProgram);
    dom.stopButton.addEventListener("click", () => {
      state.stopRequested = true;
    });
    dom.resetLevelButton.addEventListener("click", resetCurrentLevel);
    dom.changePlayerButton.addEventListener("click", switchPlayer);

    dom.nextLevelButton.addEventListener("click", () => {
      dom.completionModal.hidden = true;
      if (state.level < TOTAL_LEVELS) {
        loadLevel(state.level + 1);
      } else {
        loadLevel(TOTAL_LEVELS);
        showToast(
          "Luar biasa! Kamu telah menuntaskan seluruh 20 level.",
          "success",
        );
      }
    });
    dom.closeCompletionButton.addEventListener("click", () => {
      dom.completionModal.hidden = true;
      dom.levelGrid.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    dom.completionModal.addEventListener("click", (event) => {
      if (event.target === dom.completionModal)
        dom.completionModal.hidden = true;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dom.completionModal.hidden)
        dom.completionModal.hidden = true;
    });
  }

  function initialize() {
    state.store = readStore();
    setWelcomeState();
    dom.currentYear.textContent = new Date().getFullYear();
    initializeEventListeners();
    renderProgram();
  }

  initialize();
})();
