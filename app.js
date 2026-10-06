const categories = [
  { id: 'ones', label: '1 แต้ม', face: 1 },
  { id: 'twos', label: '2 แต้ม', face: 2 },
  { id: 'threes', label: '3 แต้ม', face: 3 },
  { id: 'fours', label: '4 แต้ม', face: 4 },
  { id: 'fives', label: '5 แต้ม', face: 5 },
  { id: 'sixes', label: '6 แต้ม', face: 6 },
  { id: 'three-kind', label: '3x', badge: '3X' },
  { id: 'four-kind', label: '4x', badge: '4X' },
  { id: 'full-house', label: 'FH', badge: 'FH' },
  { id: 'small-straight', label: 'SM', badge: 'SM' },
  { id: 'large-straight', label: 'LG', badge: 'LG' },
  { id: 'five-kind', label: '5x', badge: '5X' },
  { id: 'chance', label: 'CH', badge: 'CH' },
];

const pipColors = ['', '#ed382e', '#f39a00', '#078cde', '#68c900', '#a900df', '#00bfb5'];
const pipPositions = {
  1: [3],
  2: [1, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 4, 5, 7, 8],
};
const upperIds = new Set(['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']);
const faceCategory = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };
const elements = {
  setupPanel: document.querySelector('#setup-panel'),
  setupForm: document.querySelector('#setup-form'),
  gamePanel: document.querySelector('#game-panel'),
  newGame: document.querySelector('#new-game'),
  turnHeading: document.querySelector('#turn-heading'),
  turnHint: document.querySelector('#turn-hint'),
  rollCount: document.querySelector('#roll-count'),
  rollButton: document.querySelector('#roll-button'),
  diceTray: document.querySelector('#dice-tray'),
  lockHint: document.querySelector('#lock-hint'),
  scoreSummary: document.querySelector('#score-summary'),
  scoreBoard: document.querySelector('#score-board'),
  scoreMessage: document.querySelector('#score-message'),
  winnerOverlay: document.querySelector('#winner-overlay'),
  winnerTitle: document.querySelector('#winner-title'),
  winnerDetail: document.querySelector('#winner-detail'),
};

let players = [];
let activePlayer = 0;
let dice = [];
let rolls = 0;
let gameStarted = false;
let isRolling = false;
let rollingInterval;
let rollingTimeout;

function createPlayer(name) {
  return { name, scores: Object.create(null), fiveKindBonus: 0 };
}

function startGame(event) {
  event.preventDefault();
  const firstName = document.querySelector('#player-one-name').value.trim();
  const secondName = document.querySelector('#player-two-name').value.trim();
  if (!firstName || !secondName) return;
  players = [createPlayer(firstName), createPlayer(secondName)];
  activePlayer = 0;
  dice = [];
  rolls = 0;
  isRolling = false;
  gameStarted = true;
  elements.setupPanel.classList.add('hidden');
  elements.gamePanel.classList.remove('hidden');
  elements.newGame.classList.remove('hidden');
  render();
}

function rollDice() {
  if (!gameStarted || rolls >= 3 || isRolling) return;
  if (!rolls) dice = Array.from({ length: 5 }, () => ({ value: randomDie(), locked: false }));
  else {
    dice.sort((first, second) => Number(second.locked) - Number(first.locked));
    dice = dice.map((die) => die.locked ? die : { value: randomDie(), locked: false });
  }
  rolls += 1;
  isRolling = true;
  elements.scoreMessage.textContent = '';
  render();
  window.clearInterval(rollingInterval);
  window.clearTimeout(rollingTimeout);
  rollingInterval = window.setInterval(() => {
    elements.diceTray.querySelectorAll('.die').forEach((die) => {
      if (!die.classList.contains('locked')) setDieFace(die, randomDie());
    });
  }, 85);
  rollingTimeout = window.setTimeout(() => {
    window.clearInterval(rollingInterval);
    isRolling = false;
    renderDice();
    renderRows();
  }, 1300);
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function toggleLock(index) {
  if (!rolls || rolls >= 3 || isRolling) return;
  dice[index].locked = !dice[index].locked;
  renderDice();
}

function scoreFor(categoryId, values) {
  const counts = Array(7).fill(0);
  values.forEach((value) => { counts[value] += 1; });
  const total = values.reduce((sum, value) => sum + value, 0);

  if (faceCategory[categoryId]) return counts[faceCategory[categoryId]] * faceCategory[categoryId];
  if (categoryId === 'chance') return total;
  if (categoryId === 'three-kind') return counts.some((count) => count >= 3) ? total : 0;
  if (categoryId === 'four-kind') return counts.some((count) => count >= 4) ? total : 0;
  if (categoryId === 'full-house') {
    const groups = counts.filter((count) => count > 0).sort((a, b) => a - b);
    return groups.length === 2 && groups[0] === 2 && groups[1] === 3 ? 25 : 0;
  }
  if (categoryId === 'small-straight') return hasRun(values, 4) ? 30 : 0;
  if (categoryId === 'large-straight') return hasRun(values, 5) ? 40 : 0;
  if (categoryId === 'five-kind') return counts.some((count) => count === 5) ? 50 : 0;
  return 0;
}

function hasRun(values, length) {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  let run = 1;
  for (let index = 1; index < distinct.length; index += 1) {
    run = distinct[index] === distinct[index - 1] + 1 ? run + 1 : 1;
    if (run >= length) return true;
  }
  return false;
}

function saveScore(categoryId) {
  const player = players[activePlayer];
  if (rolls === 0 || isRolling || Object.hasOwn(player.scores, categoryId)) return;

  const fiveOfAKind = dice.every((die) => die.value === dice[0].value);
  let bonusMessage = '';
  if (fiveOfAKind && player.scores['five-kind'] > 0) {
    player.fiveKindBonus += 100;
    bonusMessage = ' ได้โบนัส 5x ซ้ำ +100 คะแนนอัตโนมัติ';
  }

  player.scores[categoryId] = scoreFor(categoryId, dice.map((die) => die.value));
  const scoredName = player.name;
  const allComplete = players.every((candidate) => categories.every((category) => Object.hasOwn(candidate.scores, category.id)));

  if (allComplete) {
    render();
    showWinner();
    return;
  }

  activePlayer = 1 - activePlayer;
  rolls = 0;
  dice = [];
  render();
  elements.scoreMessage.textContent = `${scoredName} บันทึกคะแนนแล้ว${bonusMessage}`;
}

function upperTotal(player) {
  return categories.reduce((sum, category) => sum + (upperIds.has(category.id) ? (player.scores[category.id] || 0) : 0), 0);
}

function playerTotal(player) {
  const categoryTotal = categories.reduce((sum, category) => sum + (player.scores[category.id] || 0), 0);
  return categoryTotal + (upperTotal(player) >= 63 ? 35 : 0) + player.fiveKindBonus;
}

function sideTotal(player, side) {
  const categoryTotal = categories.reduce((sum, category) => {
    const isUpper = upperIds.has(category.id);
    return isUpper === (side === 'upper') ? sum + (player.scores[category.id] || 0) : sum;
  }, 0);
  if (side === 'upper') return categoryTotal + (categoryTotal >= 63 ? 35 : 0);
  return categoryTotal + player.fiveKindBonus;
}

function makeDie(value, index, interactive) {
  const die = document.createElement(interactive ? 'button' : 'span');
  const isLocked = interactive && dice[index].locked;
  die.className = `die${isLocked ? ' locked' : ''}${interactive && isRolling && !isLocked ? ' rolling' : ''}`;
  if (interactive && isRolling && !isLocked) {
    const unlockedToRight = dice.slice(index + 1).filter((candidate) => !candidate.locked).length;
    die.style.setProperty('--roll-delay', `${unlockedToRight * 55}ms`);
  }
  if (interactive) {
    die.type = 'button';
    die.setAttribute('aria-label', `ลูกเต๋าที่ ${index + 1} ได้ ${value}${dice[index].locked ? ' ล็อกอยู่' : ' ยังไม่ล็อก'}`);
    die.setAttribute('aria-pressed', String(dice[index].locked));
    die.addEventListener('click', () => toggleLock(index));
  }
  if (interactive) {
    setDieFace(die, value);
  } else {
    pipPositions[value].forEach((position) => {
      const pip = document.createElement('span');
      pip.className = `pip pip-${position}`;
      die.append(pip);
    });
  }
  return die;
}

function setDieFace(die, value) {
  die.style.setProperty('--pip-color', pipColors[value]);
  die.replaceChildren();
  pipPositions[value].forEach((position) => {
    const pip = document.createElement('span');
    pip.className = `pip pip-${position}`;
    die.append(pip);
  });
}

function renderDice() {
  elements.diceTray.replaceChildren();
  dice.forEach((die, index) => elements.diceTray.append(makeDie(die.value, index, true)));
  elements.rollCount.textContent = `ทอย ${rolls} / 3`;
  elements.rollButton.disabled = rolls >= 3 || !gameStarted || isRolling;
  elements.lockHint.textContent = !rolls
    ? 'กดทอยเพื่อเริ่มตานี้'
    : rolls >= 3
      ? 'ทอยครบแล้ว เลือกช่องคะแนนเพื่อบันทึก'
      : 'แตะลูกเต๋าเพื่อล็อกหน้าที่ต้องการก่อนทอยซ้ำ';
}

function createScoreTable(tableCategories, side) {
  const table = document.createElement('table');
  table.className = 'score-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const categoryHeading = document.createElement('th');
  categoryHeading.scope = 'col';
  categoryHeading.textContent = side === 'upper' ? 'แต้ม' : 'หมวด';
  headerRow.append(categoryHeading);

  players.forEach((player, playerIndex) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.className = playerIndex === 0 ? 'player-one-heading' : 'player-two-heading';
    heading.classList.toggle('active-player', playerIndex === activePlayer);
    const name = document.createElement('span');
    name.className = 'player-heading-name';
    name.textContent = player.name;
    const sideScore = document.createElement('span');
    sideScore.className = 'player-side-score';
    sideScore.textContent = sideTotal(player, side);
    heading.append(name, sideScore);
    headerRow.append(heading);
  });
  head.append(headerRow);
  table.append(head);
  const body = document.createElement('tbody');

  tableCategories.forEach((category) => {
    const row = document.createElement('tr');
    const categoryCell = document.createElement('td');
    const categoryContent = document.createElement('div');
    categoryContent.className = 'category-cell';
    if (category.face) {
      categoryContent.append(makeDie(category.face, 0, false));
      categoryContent.lastElementChild.className = 'category-die';
    } else {
      const badge = document.createElement('span');
      badge.className = 'category-badge';
      badge.textContent = category.badge;
      categoryContent.append(badge);
    }
    const label = document.createElement('span');
    label.innerHTML = '<span class="category-name"></span>';
    label.querySelector('.category-name').textContent = category.label;
    categoryContent.append(label);
    categoryCell.append(categoryContent);
    row.append(categoryCell);

    players.forEach((player, playerIndex) => {
      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'score-button';
      const isFilled = Object.hasOwn(player.scores, category.id);
      if (isFilled) {
        button.textContent = player.scores[category.id];
        button.classList.add('filled');
        button.setAttribute('aria-label', `${player.name}: ${category.label} ${player.scores[category.id]} คะแนน`);
      } else {
        button.textContent = '—';
        button.setAttribute('aria-label', `${player.name}: ${category.label} ยังไม่ลงคะแนน`);
        if (gameStarted && playerIndex === activePlayer && rolls > 0 && !isRolling) {
          const previewScore = scoreFor(category.id, dice.map((die) => die.value));
          button.textContent = previewScore;
          button.classList.add('available', 'current-player');
          button.classList.add('preview-score');
          button.setAttribute('aria-label', `บันทึก ${category.label} ให้ ${player.name}: ${previewScore} คะแนน`);
          button.addEventListener('click', () => saveScore(category.id));
        }
      }
      button.disabled = !(gameStarted && playerIndex === activePlayer && rolls > 0 && !isRolling && !isFilled);
      cell.append(button);
      row.append(cell);
    });
    body.append(row);
  });
  table.append(body);

  const foot = document.createElement('tfoot');
  const bonusRow = document.createElement('tr');
  const bonusLabel = document.createElement('th');
  bonusLabel.scope = 'row';
  bonusLabel.textContent = side === 'upper' ? 'โบนัส' : '5x โบนัส';
  bonusRow.append(bonusLabel);
  players.forEach((player, playerIndex) => {
    const cell = document.createElement('td');
    cell.className = playerIndex === 0 ? 'total-one' : 'total-two';
    cell.textContent = side === 'upper'
      ? (upperTotal(player) >= 63 ? '+35' : '0')
      : (player.fiveKindBonus ? `+${player.fiveKindBonus}` : '0');
    bonusRow.append(cell);
  });
  foot.append(bonusRow);
  table.append(foot);
  return table;
}

function renderScoreSummary() {
  elements.scoreSummary.replaceChildren();
  players.forEach((player, playerIndex) => {
    const card = document.createElement('div');
    card.className = `score-total-card ${playerIndex === 0 ? 'player-one-total' : 'player-two-total'}`;
    card.classList.toggle('active-player', playerIndex === activePlayer);
    card.setAttribute('aria-label', `${player.name} คะแนนรวม ${playerTotal(player)}`);

    const name = document.createElement('span');
    name.className = 'score-total-name';
    name.textContent = player.name;
    const score = document.createElement('strong');
    score.className = 'score-total-value';
    score.textContent = playerTotal(player);
    card.append(name, score);
    elements.scoreSummary.append(card);
  });
}

function renderRows() {
  elements.scoreBoard.replaceChildren();
  const upperCategories = categories.filter((category) => upperIds.has(category.id));
  const lowerCategories = categories.filter((category) => !upperIds.has(category.id));
  const upperSide = document.createElement('section');
  upperSide.className = 'score-half';
  upperSide.setAttribute('aria-label', 'แต้ม 1 ถึง 6');
  upperSide.append(createScoreTable(upperCategories, 'upper'));
  const lowerSide = document.createElement('section');
  lowerSide.className = 'score-half';
  lowerSide.setAttribute('aria-label', 'หมวดคะแนนพิเศษ');
  lowerSide.append(createScoreTable(lowerCategories, 'lower'));
  elements.scoreBoard.append(upperSide, lowerSide);
}

function render() {
  if (!gameStarted) return;
  elements.turnHeading.textContent = players[activePlayer].name;
  elements.turnHeading.style.color = activePlayer === 0 ? 'var(--yellow)' : 'var(--green)';
  elements.turnHint.textContent = rolls
    ? `ทอยแล้ว ${rolls} ครั้ง · เลือกช่องคะแนนเพื่อจบตา หรือทอยต่อ`
    : 'ทอยลูกเต๋า 5 ลูกได้สูงสุด 3 ครั้ง';
  renderDice();
  renderScoreSummary();
  renderRows();
}

function showWinner() {
  const [first, second] = players;
  const firstTotal = playerTotal(first);
  const secondTotal = playerTotal(second);
  elements.winnerTitle.textContent = firstTotal === secondTotal
    ? 'เสมอกัน!'
    : `${firstTotal > secondTotal ? first.name : second.name} ชนะ!`;
  elements.winnerDetail.textContent = `${first.name} ${firstTotal} คะแนน · ${second.name} ${secondTotal} คะแนน`;
  elements.winnerOverlay.classList.remove('hidden');
}

function resetGame() {
  gameStarted = false;
  players = [];
  dice = [];
  rolls = 0;
  activePlayer = 0;
  isRolling = false;
  window.clearInterval(rollingInterval);
  window.clearTimeout(rollingTimeout);
  elements.winnerOverlay.classList.add('hidden');
  elements.gamePanel.classList.add('hidden');
  elements.newGame.classList.add('hidden');
  elements.setupPanel.classList.remove('hidden');
  elements.setupForm.reset();
  elements.scoreMessage.textContent = '';
}

elements.setupForm.addEventListener('submit', startGame);
elements.rollButton.addEventListener('click', rollDice);
elements.newGame.addEventListener('click', resetGame);
document.querySelector('#play-again').addEventListener('click', resetGame);
