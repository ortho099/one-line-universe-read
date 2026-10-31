(() => {
  'use strict';
  const storage = {
    get(key, fallback = null) { try { return JSON.parse(localStorage.getItem('one-line:' + key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('one-line:' + key, JSON.stringify(value)); } catch {} }
  };
  const language = ['yue','zh-Hant','en'].includes(document.body.dataset.language) ? document.body.dataset.language : 'yue';
  const copy = language === 'en' ? {
    day:'Day',night:'Night',lightAria:'Switch to light reading',darkAria:'Switch to dark reading',read:'✓ Finished this letter',unread:'I have finished this letter',rainOn:'Rain on',rainOff:'Rain off',unsupported:'Not supported',found:'You found it. Ten years of stories are tucked away here.',open:'Open the treasure ↗'
  } : {
    day:'日讀',night:'夜讀',lightAria:'切換淺色閱讀',darkAria:'切換深色閱讀',read:'✓ 已讀完這封信',unread:'我讀完這封信了',rainOn:'雨聲開',rainOff:'雨聲關',unsupported:'暫未支援',found:language==='zh-Hant'?'你找到了。十年的故事，藏在這裡。':'你搵到喇。十年嘅故事，收埋喺呢度。',open:'打開寶箱 ↗'
  };
  if(document.body.dataset.episode)storage.set('language',language);
  const storedLanguage=storage.get('language','yue');
  const preferred=['yue','zh-Hant','en'].includes(storedLanguage)?storedLanguage:'yue';
  const suffix={yue:'','zh-Hant':'zh-hant/',en:'en/'};
  const siteBase=document.querySelector('meta[name="site-base-path"]')?.content || '/';
  document.querySelectorAll('[data-language-target]').forEach(link=>{
    if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(link.dataset.languageTarget))link.setAttribute('href',siteBase+'letters/'+link.dataset.languageTarget+'/'+suffix[preferred]);
  });
  const themeButton = document.querySelector('[data-theme-toggle]');
  const syncThemeButton = () => {
    if (!themeButton) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.querySelector('[data-theme-label]').textContent = dark ? copy.day : copy.night;
    themeButton.setAttribute('aria-label', dark ? copy.lightAria : copy.darkAria);
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
    const progressKey='progress:'+current+(language==='yue'?'':':'+language);
    const saved = storage.get(progressKey);
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
        storage.set(progressKey, { ratio, at: Date.now() });
        storage.set('last', { slug: current, title: document.body.dataset.title, url: location.pathname, language });
      }
    };
    addEventListener('scroll', () => { if (!raf) { raf = true; requestAnimationFrame(updateProgress); } }, { passive: true });
    updateProgress();
    const finish = document.querySelector('[data-mark-read]');
    const setReadLabel = () => {
      const read = storage.get('read:' + current, false);
      finish.textContent = read ? copy.read : copy.unread;
      finish.setAttribute('aria-pressed', String(read));
    };
    setReadLabel();
    finish.addEventListener('click', () => { storage.set('read:' + current, !storage.get('read:' + current, false)); setReadLabel(); });
  } else {
    const last = storage.get('last');
    const resume = document.querySelector('[data-continue]');
    const base = document.querySelector('meta[name="site-base-path"]')?.content || '/';
    const row = last && document.querySelector('[data-episode-row="' + String(last.slug).replace(/[^a-z0-9-]/g, '') + '"]');
    const expected = last && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(last.slug) ? base + 'letters/' + last.slug + '/'+suffix[preferred] : null;
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
    link.textContent = copy.open;
    note.append(copy.found, link);
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
      rainButton.querySelector('[data-rain-label]').textContent = playing ? copy.rainOn : copy.rainOff;
    } catch {
      rainButton.querySelector('[data-rain-label]').textContent = copy.unsupported;
      rainButton.disabled = true;
    }
  });
})();
