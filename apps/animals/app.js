/* ==========================================
   どうぶつかぞえ - app.js
   ========================================== */

// ===== 動物データ =====
const ANIMALS = [
  { name: 'ネコ',     emoji: '🐱', color: '#FF6B9D', bg: '#FFE5EF' },
  { name: 'イヌ',     emoji: '🐶', color: '#FF8C42', bg: '#FFF0E5' },
  { name: 'ハムスター', emoji: '🐹', color: '#D97706', bg: '#FFFBE5' },
  { name: 'ゾウ',     emoji: '🐘', color: '#A855F7', bg: '#F5E5FF' },
  { name: 'キリン',   emoji: '🦒', color: '#0D9488', bg: '#E5FFFD' },
];

// ===== 状態 =====
const State = {
  mode:       'add',   // 'add' | 'sub'
  answerType: '4',     // '4'   | 'input'
  level:      10,      // 10    | 20
  count:      5,       // 5     | 10
  questions:  [],
  current:    0,
  score:      0,
  numpadVal:  '',
  results:    [],      // [{ correct, formula }]
  answered:   false,
};

// ===== スクリーン切替 =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

// ===== セットアップ トグル =====
function selectOpt(key, value, btn) {
  State[key] = (key === 'level' || key === 'count') ? parseInt(value) : value;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === value);
  });
}

// ===== 音声 =====
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; u.rate = 0.85; u.pitch = 1.2;
  const v = typeof SpeechUtil !== 'undefined' ? SpeechUtil.getVoice() : null;
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// ===== 問題生成 =====
function pickAnimal(exclude) {
  const pool = exclude ? ANIMALS.filter(a => a !== exclude) : ANIMALS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeQuestion() {
  const max = State.level;

  if (State.mode === 'add') {
    const answer = Math.floor(Math.random() * (max - 1)) + 2;  // 2..max
    const a      = Math.floor(Math.random() * (answer - 1)) + 1;
    const b      = answer - a;
    const a1     = pickAnimal(null);
    const a2     = pickAnimal(a1);
    return {
      type: 'add', a, b, answer, animal1: a1, animal2: a2,
      formula:      `${a1.emoji} ${a} ＋ ${a2.emoji} ${b} ＝ ${answer}`,
      questionText: `${a1.name}が ${a}ひき、${a2.name}が ${b}ひきいます。\nあわせて なんひきですか？`,
      speechText:   `${a1.name}が${a}ひき、${a2.name}が${b}ひき。あわせて なんひきですか？`,
    };
  } else {
    const total   = Math.floor(Math.random() * (max - 1)) + 2;  // 2..max
    const removed = Math.floor(Math.random() * (total - 1)) + 1;
    const answer  = total - removed;
    const a1      = pickAnimal(null);
    return {
      type: 'sub', a: total, b: removed, answer, animal1: a1,
      formula:      `${a1.emoji} ${total} ー ${removed} ＝ ${answer}`,
      questionText: `${a1.name}が ${total}ひきいます。\n${removed}ひきかえりました。のこりは なんひきですか？`,
      speechText:   `${a1.name}が${total}ひき。${removed}ひきかえりました。のこりはなんひきですか？`,
    };
  }
}

function generateQuestions() {
  const qs = [];
  for (let i = 0; i < State.count; i++) qs.push(makeQuestion());
  return qs;
}

// ===== ゲーム開始 =====
function startGame() {
  State.questions = generateQuestions();
  State.current   = 0;
  State.score     = 0;
  State.results   = [];
  State.numpadVal = '';
  State.answered  = false;

  document.getElementById('q-total').textContent = State.count;
  Fireworks.stop();
  showScreen('game');
  loadQuestion();
}

// ===== 問題読み込み =====
function loadQuestion() {
  State.answered = false;
  const q = State.questions[State.current];

  document.getElementById('q-current').textContent  = State.current + 1;
  document.getElementById('q-score').textContent    = State.score;

  const pct = (State.current / State.count) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';

  document.getElementById('game-question-text').textContent = q.questionText;
  renderAnimalDisplay(q);

  const is4 = State.answerType === '4';
  document.getElementById('area-4choice').style.display = is4  ? 'block' : 'none';
  document.getElementById('area-input').style.display   = !is4 ? 'flex'  : 'none';

  if (is4) {
    renderChoices(q);
  } else {
    State.numpadVal = '';
    document.getElementById('numpad-display').textContent = '？';
  }

  document.getElementById('answer-overlay').style.display = 'none';
  speak(q.speechText);
}

// ===== 動物表示 =====
function renderAnimalDisplay(q) {
  const c = document.getElementById('game-animal-display');
  c.innerHTML = '';

  if (q.type === 'add') {
    c.appendChild(makeAnimalGroup(q.animal1, q.a));
    c.appendChild(makeOpEl('＋'));
    c.appendChild(makeAnimalGroup(q.animal2, q.b));
    c.appendChild(makeOpEl('＝'));
  } else {
    c.appendChild(makeSubGroup(q.animal1, q.a, q.b));
    c.appendChild(makeOpEl('＝'));
  }
  c.appendChild(makeQMark());
}

function makeAnimalGroup(animal, count) {
  const div = document.createElement('div');
  div.className = 'animal-group';
  div.style.setProperty('--ac', animal.color);
  div.style.setProperty('--ab', animal.bg);

  const lbl = document.createElement('div');
  lbl.className = 'ag-label';
  lbl.textContent = animal.name;

  const grid = document.createElement('div');
  grid.className = 'ag-emoji-grid' + (count > 10 ? ' small' : count > 5 ? ' medium' : '');

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'ag-emoji';
    s.textContent = animal.emoji;
    grid.appendChild(s);
  }

  const cnt = document.createElement('div');
  cnt.className = 'ag-count';
  cnt.textContent = count + 'ひき';

  div.appendChild(lbl);
  div.appendChild(grid);
  div.appendChild(cnt);
  return div;
}

function makeSubGroup(animal, total, leaving) {
  const div = document.createElement('div');
  div.className = 'animal-group';
  div.style.setProperty('--ac', animal.color);
  div.style.setProperty('--ab', animal.bg);

  const lbl = document.createElement('div');
  lbl.className = 'ag-label';
  lbl.textContent = `${animal.name} ${total}ひき`;

  const grid = document.createElement('div');
  grid.className = 'ag-emoji-grid' + (total > 10 ? ' small' : total > 5 ? ' medium' : '');

  const staying = total - leaving;
  for (let i = 0; i < total; i++) {
    const s = document.createElement('span');
    s.className = 'ag-emoji' + (i >= staying ? ' leaving' : '');
    s.textContent = animal.emoji;
    grid.appendChild(s);
  }

  const note = document.createElement('div');
  note.className = 'ag-leaving-note';
  note.textContent = `${animal.emoji} ${leaving}ひき かえった 👋`;

  div.appendChild(lbl);
  div.appendChild(grid);
  div.appendChild(note);
  return div;
}

function makeOpEl(t) {
  const d = document.createElement('div');
  d.className = 'ag-operator';
  d.textContent = t;
  return d;
}

function makeQMark() {
  const d = document.createElement('div');
  d.className = 'ag-question-mark';
  d.textContent = '？';
  return d;
}

// ===== 4択ボタン =====
function renderChoices(q) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';

  const correct = q.answer;
  const max = State.level + 5;
  const wrongs = new Set();

  let attempts = 0;
  while (wrongs.size < 3 && attempts < 200) {
    attempts++;
    const offset = Math.floor(Math.random() * 8) - 4;
    const w = correct + (offset === 0 ? 1 : offset);
    if (w > 0 && w <= max && w !== correct) wrongs.add(w);
  }

  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  choices.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = val;
    btn.onclick = () => checkAnswer(val, btn);
    grid.appendChild(btn);
  });
}

// ===== 答えチェック =====
function checkAnswer(selected, btnEl) {
  if (State.answered) return;
  State.answered = true;

  const q       = State.questions[State.current];
  const correct = q.answer;
  const isOK    = selected === correct;

  // ボタン無効化
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b !== btnEl) b.style.opacity = '0.45';
  });

  if (isOK) {
    State.score++;
    if (btnEl) btnEl.classList.add('correct');
    Fireworks.fire(4, false);
  } else {
    if (btnEl) btnEl.classList.add('wrong');
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (parseInt(b.textContent) === correct) b.classList.add('correct');
    });
  }

  State.results.push({ correct: isOK, formula: q.formula });
  setTimeout(() => showAnswerResult(isOK, q), 420);
}

// ===== 数字入力 =====
function numpadPress(n) {
  if (State.answered) return;
  if (State.numpadVal.length >= 2) return;
  State.numpadVal += n;
  document.getElementById('numpad-display').textContent = State.numpadVal;
}

function numpadDelete() {
  if (State.answered) return;
  State.numpadVal = State.numpadVal.slice(0, -1);
  document.getElementById('numpad-display').textContent = State.numpadVal || '？';
}

function numpadConfirm() {
  if (State.answered || !State.numpadVal) return;
  checkAnswer(parseInt(State.numpadVal), null);
}

// ===== 正解/不正解オーバーレイ =====
function showAnswerResult(isOK, q) {
  const overlay = document.getElementById('answer-overlay');
  const mark    = document.getElementById('answer-mark');
  const formula = document.getElementById('answer-formula');

  mark.textContent = isOK ? '○' : '✕';
  mark.className   = 'answer-mark ' + (isOK ? 'correct' : 'wrong');
  formula.textContent = q.formula;

  overlay.style.display = 'flex';

  const readFormula = q.formula
    .replace('＋', 'たす')
    .replace('ー', 'ひく')
    .replace('＝', 'は');
  speak(isOK ? 'せいかい！' + readFormula : 'ざんねん。' + readFormula);
}

// ===== 次の問題 =====
function nextQuestion() {
  State.current++;
  if (State.current >= State.count) {
    showFinalResult();
  } else {
    loadQuestion();
  }
}

// ===== やめる確認 =====
function confirmQuit() {
  if (confirm('やめますか？')) {
    Fireworks.stop();
    showScreen('menu');
  }
}

// ===== 最終結果 =====
function showFinalResult() {
  const correct   = State.score;
  const total     = State.count;
  const pct       = correct / total;
  const isPerfect = pct === 1;

  let title, emoji;
  if (isPerfect)    { title = '🎉 ぜんもんせいかい！！！ 🎉'; emoji = '🌈'; }
  else if (pct >= 0.8) { title = '✨ すごい！！'; emoji = '😄'; }
  else if (pct >= 0.5) { title = '👍 よくできました！'; emoji = '😊'; }
  else               { title = '😊 れんしゅうしよう！'; emoji = '💪'; }

  document.getElementById('result-title').textContent    = title;
  document.getElementById('result-emoji-big').textContent = emoji;
  document.getElementById('result-score').textContent    = correct;
  document.getElementById('result-total').textContent    = total;

  const stars = Math.round(pct * 3);
  document.getElementById('result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  const list = document.getElementById('result-list');
  list.innerHTML = State.results.map((r, i) =>
    `<div class="result-item ${r.correct ? 'ok' : 'ng'}">
      <span class="ri-mark">${r.correct ? '○' : '✕'}</span>
      <span class="ri-formula">${r.formula}</span>
    </div>`
  ).join('');

  showScreen('result');

  if (isPerfect) {
    celebratePerfect();
    speak('すばらしい！ぜんもんせいかいです！おめでとう！');
  } else if (pct >= 0.8) {
    Fireworks.fire(6, true);
    speak('すごい！よくできました！おめでとう！');
  } else if (pct >= 0.5) {
    Fireworks.fire(2, false);
    speak('よくできました！またれんしゅうしてね！');
  } else {
    speak('またれんしゅうしてね！');
  }
}

// ===== 全問正解祝福 =====
function celebratePerfect() {
  // 虹表示
  document.getElementById('result-rainbow').style.display = 'block';

  // 花火連発
  let count = 0;
  const iv = setInterval(() => {
    Fireworks.fire(3, true);
    count++;
    if (count >= 10) clearInterval(iv);
  }, 500);

  // 拍手エモジ
  const container  = document.getElementById('result-applause');
  const emojiList  = ['👏', '🎊', '🎉', '⭐', '🌟', '💫', '🌈', '✨', '🎁', '🏆'];
  for (let i = 0; i < 24; i++) {
    setTimeout(() => {
      const span = document.createElement('span');
      span.className  = 'applause-emoji';
      span.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
      span.style.left  = (5 + Math.random() * 90) + '%';
      span.style.setProperty('--dur', (1.8 + Math.random() * 2.2) + 's');
      span.style.fontSize = (22 + Math.random() * 28) + 'px';
      container.appendChild(span);
      setTimeout(() => span.remove(), 5000);
    }, i * 180);
  }
}

// ===========================
// 花火システム
// ===========================
const Fireworks = (() => {
  const canvas = document.getElementById('fireworks-canvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];
  let animId    = null;

  const COLORS = [
    '#FF6B9D', '#FFD700', '#5B8DEF', '#4ECDC4',
    '#A855F7', '#FF8C42', '#FF4757', '#00D2FF',
    '#43E97B', '#F9CA24',
  ];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function burst(x, y, big) {
    const count  = big ? 90 : 55;
    const col1   = COLORS[Math.floor(Math.random() * COLORS.length)];
    const col2   = COLORS[Math.floor(Math.random() * COLORS.length)];
    const spd    = big ? 6 : 3.5;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
      const v     = spd + Math.random() * spd;
      particles.push({
        x, y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        color: Math.random() < 0.5 ? col1 : col2,
        alpha: 1,
        size:  (big ? 4 : 3) + Math.random() * 3,
        decay: 0.013 + Math.random() * 0.012,
        shape: Math.random() < 0.6 ? 'circle' : 'rect',
      });
    }
    // 尾引きパーティクル
    for (let i = 0; i < (big ? 22 : 10); i++) {
      const angle = Math.random() * Math.PI * 2;
      const v     = (big ? 9 : 6) + Math.random() * 5;
      particles.push({
        x, y, px: x, py: y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        color: '#FFFDE7',
        alpha: 1, size: 2.5, decay: 0.025, shape: 'line',
      });
    }
  }

  function launch(big) {
    const x = canvas.width  * (0.12 + Math.random() * 0.76);
    const y = canvas.height * (0.06 + Math.random() * 0.42);
    burst(x, y, big);
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.shape === 'line') { p.px = p.x; p.py = p.y; }
      p.x  += p.vx; p.y  += p.vy;
      p.vy += 0.11;
      p.vx *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) { particles.splice(i, 1); continue; }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.vx * 0.3);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      } else {
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (particles.length > 0) animId = requestAnimationFrame(tick);
    else animId = null;
  }

  function fire(count, big) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => launch(big), i * 240);
    }
    if (!animId) animId = requestAnimationFrame(tick);
  }

  function stop() {
    particles = [];
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();
  return { fire, stop };
})();

// ===== メニュー動物アニメ =====
function initMenuAnimals() {
  const row = document.getElementById('menu-animals');
  ANIMALS.forEach(a => {
    const s = document.createElement('span');
    s.className   = 'menu-animal';
    s.textContent = a.emoji;
    row.appendChild(s);
  });
}

// ===== 初期化 =====
window.onload = () => {
  initMenuAnimals();
  speak('どうぶつを かぞえよう！');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../../sw.js').catch(() => {});
  }
};
