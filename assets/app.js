(() => {
  'use strict';
  const storage = {
    get(key, fallback = null) { try { return JSON.parse(localStorage.getItem('one-line:' + key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('one-line:' + key, JSON.stringify(value)); } catch {} }
  };
  const themeButton = document.querySelector('[data-theme-toggle]');
  const syncThemeButton = () => {
    if (!themeButton) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.querySelector('[data-theme-label]').textContent = dark ? '日讀' : '夜讀';
    themeButton.setAttribute('aria-label', dark ? '切換淺色閱讀' : '切換深色閱讀');
  };
  syncThemeButton();
  themeButton?.addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('theme', document.documentElement.dataset.theme);
    syncThemeButton();
  });
  const initialFont = Math.max(17, Math.min(25, Number(storage.get('font', 20)) || 20));
  document.documentElement.style.setProperty('--font-size', initialFont + 'px');
  document.querySelectorAll('[data-font]').forEach(button => button.addEventListener('click', () => {
    const value = Math.max(17, Math.min(25, Number(storage.get('font', 20)) + Number(button.dataset.font)));
    storage.set('font', value);
    document.documentElement.style.setProperty('--font-size', value + 'px');
  }));

  const current = document.body.dataset.episode;
  const story = document.querySelector('.story');
  const progress = document.querySelector('.progress');
  let raf = false;
  if (current && story) {
    const saved = storage.get('progress:' + current);
    if (saved && saved.ratio > .03 && saved.ratio < .96) {
      const toast = document.querySelector('[data-resume-toast]');
      toast.hidden = false;
      toast.querySelector('[data-resume]').addEventListener('click', () => {
        const top = story.getBoundingClientRect().top + scrollY;
        window.scrollTo({ top: top + saved.ratio * Math.max(0, story.offsetHeight - innerHeight + 90) - 70, behavior: 'smooth' });
        toast.hidden = true;
      });
      toast.querySelector('[data-dismiss]').addEventListener('click', () => { toast.hidden = true; });
    }
    const updateProgress = () => {
      raf = false;
      const top = story.getBoundingClientRect().top + scrollY;
      const ratio = Math.max(0, Math.min(1, (scrollY + 80 - top) / Math.max(1, story.offsetHeight - innerHeight + 90)));
      if (progress) progress.style.width = (ratio * 100) + '%';
      if (scrollY > top - 100) {
        storage.set('progress:' + current, { ratio, at: Date.now() });
        storage.set('last', { slug: current, title: document.body.dataset.title, url: location.pathname });
      }
    };
    addEventListener('scroll', () => { if (!raf) { raf = true; requestAnimationFrame(updateProgress); } }, { passive: true });
    updateProgress();
    const finish = document.querySelector('[data-mark-read]');
    const setReadLabel = () => {
      const read = storage.get('read:' + current, false);
      finish.textContent = read ? '✓ 已讀完這封信' : '我讀完這封信了';
      finish.setAttribute('aria-pressed', String(read));
    };
    setReadLabel();
    finish.addEventListener('click', () => { storage.set('read:' + current, !storage.get('read:' + current, false)); setReadLabel(); });
  } else {
    const last = storage.get('last');
    const resume = document.querySelector('[data-continue]');
    const base = document.querySelector('meta[name="site-base-path"]')?.content || '/';
    const row = last && document.querySelector('[data-episode-row="' + String(last.slug).replace(/[^a-z0-9-]/g, '') + '"]');
    const expected = last && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(last.slug) ? base + 'letters/' + last.slug + '/' : null;
    if (last && resume && row && row.getAttribute('href') === expected) {
      resume.href = expected;
      resume.querySelector('[data-start-label]').textContent = '繼續讀・' + last.title;
    }
    document.querySelectorAll('[data-episode-row]').forEach(row => {
      if (storage.get('read:' + row.dataset.episodeRow, false)) {
        const label = row.querySelector('.new-label');
        if (label) label.textContent = '已讀';
      }
    });
  }

  const treasure = document.querySelector('[data-treasure]');
  treasure?.addEventListener('click', () => {
    const note = document.querySelector('[data-treasure-note]');
    if (!note?.hidden) return;
    const link = document.createElement('a');
    link.href = 'https://ortho099.github.io/story-quest/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '打開寶箱 ↗';
    note.append('你搵到喇。十年嘅故事，收埋喺呢度。', link);
    note.hidden = false;
  });

  const rainButton = document.querySelector('[data-rain]');
  let audio, noise, gain, playing = false;
  rainButton?.addEventListener('click', async () => {
    try {
      if (!audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('unsupported');
        audio = new AudioContext();
        const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) { const white = Math.random() * 2 - 1; last = (last + white * .04) / 1.04; data[i] = last * 3.5; }
        noise = audio.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2200;
        gain = audio.createGain(); gain.gain.value = 0;
        noise.connect(filter).connect(gain).connect(audio.destination); noise.start();
      }
      await audio.resume();
      playing = !playing;
      gain.gain.cancelScheduledValues(audio.currentTime);
      gain.gain.setTargetAtTime(playing ? .16 : 0, audio.currentTime, .4);
      rainButton.setAttribute('aria-pressed', String(playing));
      rainButton.querySelector('[data-rain-label]').textContent = playing ? '雨聲開' : '雨聲關';
    } catch {
      rainButton.querySelector('[data-rain-label]').textContent = '暫未支援';
      rainButton.disabled = true;
    }
  });
})();
