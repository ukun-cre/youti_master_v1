# CLAUDE.md — ようちえん まなびランド

AI assistant guide for the `youti_master_v1` repository.

---

## Project Overview

**ようちえん まなびランド** ("Kindergarten Learning Land") is a Japanese-language Progressive Web App (PWA) for preschoolers aged 4–6. It consists of a hub portal and 6 independent mini-learning apps, all written in pure vanilla JavaScript — no build tools, no frameworks, no dependencies.

Target platform: mobile web (Chrome/Safari on iOS/Android), also works on desktop.

---

## Repository Structure

```
youti_master_v1/
├── index.html          # Main hub portal
├── hub.js              # Hub animation and greeting logic
├── style.css           # Hub styling
├── sw.js               # Service Worker (network-first caching, cache: manabiland-v4)
├── manifest.json       # PWA manifest (name, icons, theme colors)
├── common/
│   ├── speech.js       # Shared Japanese voice synthesis utility (SpeechUtil)
│   └── back-to-hub.css # Fixed back-button styling shared by all apps
└── apps/
    ├── kanji/          # 漢字れんしゅう — Kanji flash cards (grade 1 & 2)
    ├── math/           # たしざん・ひきざん — Addition/subtraction up to 20
    ├── juucombo/       # 10のなかよし — Number pairs summing to 10
    ├── no5/            # どっちかな? — Hiragana discrimination quiz
    ├── clock/          # とけいをよもう — Clock reading (8 difficulty levels)
    └── animals/        # どうぶつかぞえ — Animal counting problems
```

Each app is fully self-contained:
```
apps/<name>/
├── index.html   # UI (screens defined as .screen divs)
├── app.js       # All game logic, data, and state
└── style.css    # App-specific styles
```

---

## Architecture Patterns

### 1. Screen/View Management

All apps use CSS class toggling for multi-screen navigation (no routing library):

```javascript
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}
```

Typical screen names: `menu`, `setup`, `game`, `result`, `settings`, `records`.

### 2. State Object

Apps maintain a flat `State` object (or `app.state`) reset between sessions:

```javascript
const State = {
  grade: 1,           // grade level (kanji app)
  questionCount: 7,   // questions per round
  answered: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  results: [],        // [{ kanji, reading, correct }]
  learnedKanji: new Set(),
};
```

### 3. Persistent Storage

All apps use a thin `Store` wrapper around `localStorage`:

```javascript
const Store = {
  KEY: 'manabiland-kanji-v1',
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  load() { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); },
};
```

Use versioned keys (e.g. `manabiland-kanji-v1`) so format changes don't break saved data silently.

### 4. SVG Illustration Generation (Kanji App)

Kanji illustrations are generated programmatically with helper functions:

```javascript
function bg(c)          { return `<rect width="100" height="100" fill="${c}"/>`; }
function em(e,x,y,s)    { return `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" dominant-baseline="central">${e}</text>`; }
function lbl(t,c='#555'){ return `<text x="50" y="88" font-size="10" fill="${c}" text-anchor="middle">${t}</text>`; }
function svgWrap(bgC, body) {
  return `data:image/svg+xml,<svg xmlns="..." viewBox="0 0 100 100">${bg(bgC)}${body}</svg>`;
}
```

When adding a new kanji, provide a thematic background color and 2–3 relevant emoji.

### 5. Speech Synthesis

Use the shared `SpeechUtil` singleton from `common/speech.js`:

```javascript
function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.85;
  u.pitch = 1.2;
  const v = SpeechUtil.getVoice(); // selects best Japanese voice automatically
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
```

Voice priority order in `SpeechUtil`: Google 日本語 → Microsoft Nanami/Haruka/Ayumi → macOS O-Ren/Kyoko. Always call `window.speechSynthesis.cancel()` before speaking to avoid queuing.

### 6. Question Deck Management (Kanji App)

The kanji app uses a `DeckManager` that implements spaced-repetition-like behaviour:

```javascript
DeckManager = {
  init(pool)     { /* shuffle pool into deck */ },
  draw()         { /* returns next question */ },
  markWrong(item){ /* re-queues item for retry */ },
};
```

Wrong answers are re-inserted a few positions ahead so they are practiced again in the same session.

### 7. Gamification Elements

- **Combo tracking**: Consecutive correct answers increment `State.combo`; hitting 3+ triggers `Confetti.burst()` (kanji app)
- **Stars**: Clock app awards 0–3 stars per session based on accuracy
- **Records screen**: Shows personal bests via `Store.load()`

---

## Data Conventions

### Kanji Data Format

Grade-1 data (`KANJI_DATA`) and grade-2 data (`KANJI_DATA_2`) use different structures:

**Grade 1** (`KANJI_DATA`) — object array, full SVG illustration:
```javascript
{
  kanji: '山',
  reading: 'やま',
  illust: svgWrap('#E8F5E9', `${em('🏔️','50','45','48')}`),
  speech: 'やま。山という漢字を覚えましょう！',
  questionSpeech: 'やまという漢字はどれかな？',
}
```

**Grade 2** (`KANJI_DATA_2`) — compact tuple array, emoji only:
```javascript
['引', 'ひく', '🧲']
// [kanji, reading, emoji]
```

**Official kanji counts:**
- Grade 1: **80 字** (文部科学省 学習指導要領)
- Grade 2: **158 字** (verified count; commonly cited as 160 but consistent references show 158)

Never add grade-2 kanji to `KANJI_DATA` (grade-1 array). The `Store` and `DeckManager` use these as separate pools.

### Emoji Selection Rules

- Prefer emoji from **Emoji 12.0 (2019) or earlier** for broadest device compatibility
- Avoid **Emoji 13.0+ additions** (e.g. 🪝 🪨) — these fail on older iOS/Android
- Avoid **ZWJ sequences** (family/couple emoji built from multiple code points like 👨‍👩‍👧) — use simple single-codepoint family emoji like 👪 instead
- Check compatibility: if `[...emoji].length > 2`, it is likely a ZWJ/multi-codepoint sequence

### Grade-2 Kanji Tuple Format

When adding grade-2 entries, ensure the emoji is:
1. A single code point (or simple VS16 variant) — not a ZWJ sequence
2. From Emoji 12.0 or earlier
3. Conceptually relevant for a preschooler/elementary student

---

## App-by-App Notes

### apps/kanji — 漢字れんしゅう

- **1,042 lines** — the most complex app
- Grade selection on menu screen (学年1 / 学年2 toggle)
- `DeckManager` shuffles the kanji pool; wrong answers are recycled
- `Confetti.burst()` fires on combo ≥ 3 (canvas-based particle system)
- Records screen aggregates: total correct, learned kanji set, max combo
- Settings: sound toggle, question count (5/7/10)

### apps/math — たしざん・ひきざん

- Addition and subtraction, numbers up to 20
- Uses `AudioContext` for simple sound effects (no audio files)
- Visual aid: SVG snack items (apple 🍎, cookie 🍪, candy 🍬) counted on screen

### apps/juucombo — 10のなかよし

- Teaches the 9 number pairs that sum to 10 (1+9, 2+8, … 9+1)
- Dot visualization: filled circles + empty circles = 10
- 4-choice multiple-choice interface
- Simplest app (249 lines) — good reference for minimal app pattern

### apps/no5 — どっちかな?

- Hiragana discrimination (e.g. おう vs おお, long vowel confusion)
- 100+ question pairs embedded in app.js
- Binary A/B choice buttons

### apps/clock — とけいをよもう

- 8 difficulty levels (Lv1–Lv8): read time → AM/PM → elapsed minutes
- Clock face drawn with SVG, hands positioned with trigonometry
- Separate input fields for hour and minute
- Star rating on result screen

### apps/animals — どうぶつかぞえ

- 5 animals: ネコ, イヌ, ハムスター, ゾウ, キリン
- Arithmetic problems using animal counts as operands
- Scrollable animal illustration area
- Recently received major UX improvements (see git log)

---

## Common CSS Conventions

- CSS variables defined on `:root` for the color palette: `--pink`, `--blue`, `--green`, `--purple`, `--orange`, `--yellow`
- Bright pastel backgrounds, rounded corners (`border-radius: 16px–24px`)
- Large touch targets (min 48×48px buttons)
- Transitions on interactive elements: `transition: all 0.2s ease`
- Active/press state: `transform: scale(0.95)` or `translateY(2px)`
- `back-to-hub.css` provides the fixed `← もどる` button (z-index 9999, top-left)

---

## Service Worker & Caching

`sw.js` uses a **network-first** strategy:
1. Try to fetch from network
2. On failure, serve from cache (`manabiland-v4`)

When adding new files, update the `urlsToCache` array in `sw.js`. When making breaking changes, increment the cache version (e.g. `manabiland-v5`) so stale caches are invalidated.

---

## Development Workflow

### No Build Step

This is pure static HTML/CSS/JS. To work on it:
1. Serve files with any HTTP server (e.g. `python3 -m http.server 8080`)
2. Open `http://localhost:8080` in a browser
3. Edit files directly — refresh to see changes
4. Service Worker may cache aggressively; use DevTools → Application → Service Workers → "Update on reload" during development

### Testing

There is **no automated test suite**. Verification is manual:
- Open each app and complete a round
- Check localStorage in DevTools to confirm persistence
- Test speech synthesis with a real device or browser with Japanese voice installed
- Test on mobile screen sizes (360×640 minimum)

### Git Conventions

- Commit messages are in English
- Branch names follow the pattern `claude/description-SessionId`
- PRs are merged via GitHub; recent merges visible in `git log`
- Each logical change gets its own commit; don't batch unrelated fixes

---

## Key Pitfalls to Avoid

1. **Do not add 2nd-grade kanji to `KANJI_DATA`** (grade-1 array). They must go in `KANJI_DATA_2`. Mixing them caused the "learned kanji count exceeds 80" bug.

2. **Do not use Emoji 13.0+ in data arrays.** Check the codepoint — anything above U+1F9FF risks not rendering on older devices. Use `[...emoji].length` to detect multi-codepoint sequences.

3. **Do not use ZWJ emoji sequences** for kanji/content emoji. Use simple single-codepoint alternatives (e.g. `👪` instead of `👨‍👩‍👧`).

4. **Always call `speechSynthesis.cancel()` before speaking** to prevent utterance queuing, which confuses young users.

5. **Keep apps fully self-contained.** Each app in `apps/<name>/` should work independently. Don't add cross-app state or shared data files (other than `common/`).

6. **Versioned localStorage keys.** If you change the saved-data format, bump the `Store.KEY` version string to avoid parse errors on upgrade.

7. **No `innerHTML` with user-controlled content.** All content in this app is developer-defined (no user input that feeds into HTML), but maintain this hygiene if adding any dynamic content.

---

## Adding a New App

1. Create `apps/<name>/index.html`, `app.js`, `style.css`
2. Follow the screen/state/store patterns above
3. Link `common/back-to-hub.css` in the HTML
4. Add a card entry in `index.html` (hub) with matching gradient and emoji icon
5. Add the app's files to `sw.js` → `urlsToCache` array
6. Test offline functionality by disabling network in DevTools

---

## Adding Kanji to Grade-2 Data

Grade-2 entries go in `KANJI_DATA_2` as compact tuples inside the IIFE:

```javascript
['漢字', 'よみ', '🎯'],  // [kanji, reading, emoji]
```

Rules:
- Emoji must be Emoji 12.0 or older, single code point
- Verify the kanji is in the official grade-2 list before adding
- Keep alphabetical/stroke-count ordering where possible for maintainability
- Total must reach the verified grade-2 count (currently 158; add only confirmed official kanji)
