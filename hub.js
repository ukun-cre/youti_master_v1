/* ==========================================
   ようちえん まなびランド - hub.js
   ========================================== */
'use strict';

const messages = [
  'どのおべんきょうを するかな？ 🎉',
  'きょうも いっしょに がんばろう！ 💪',
  'どれが すき？ えらんでね！ 🌟',
  'たのしく まなぼう！ ✨',
  'すごいね！ どんどん かしこく なってるよ！ 🎊',
];

document.addEventListener('DOMContentLoaded', () => {
  // ランダムなメッセージを表示
  const textEl = document.getElementById('speechText');
  if (textEl) {
    textEl.textContent = messages[Math.floor(Math.random() * messages.length)];
  }

  // 音声読み上げ（ウェルカムメッセージ）
  if ('speechSynthesis' in window) {
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('ようちえん まなびランドへ ようこそ！ どのおべんきょうを する かな？');
      u.lang = 'ja-JP'; u.rate = 0.85; u.pitch = 1.2;
      window.speechSynthesis.speak(u);
    }, 600);
  }

  // カードのアニメーション（順番に表示）
  const cards = document.querySelectorAll('.app-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 200 + i * 100);
  });
});
