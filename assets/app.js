(() => {
  'use strict';
  const storage = {
    get(key, fallback = null) { try { return JSON.parse(localStorage.getItem('one-line:' + key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('one-line:' + key, JSON.stringify(value)); } catch {} }
  };
  const language = ['yue','zh-Hant','en'].includes(document.body.dataset.language) ? document.body.dataset.language : 'yue';
  const copy = language === 'en' ? {
    day:'Day',night:'Night',lightAria:'Switch to light reading',darkAria:'Switch to dark reading',read:'✓ Finished this letter',unread:'I have finished this letter',rainOn:'Pause rain',rainOff:'Play rain',rainError:'Retry rain',found:'You found it. Ten years of stories are tucked away here.',open:'Open the treasure ↗'
  } : {
    day:'日讀',night:'夜讀',lightAria:'切換淺色閱讀',darkAria:'切換深色閱讀',read:'✓ 已讀完這封信',unread:'我讀完這封信了',rainOn:'暫停雨聲',rainOff:'播放雨聲',rainError:'再試雨聲',found:language==='zh-Hant'?'你找到了。十年的故事，藏在這裡。':'你搵到喇。十年嘅故事，收埋喺呢度。',open:'打開寶箱 ↗'
  };
  if(document.body.dataset.episode)storage.set('language',language);
  const storedLanguage=storage.get('language','yue');
  const preferred=['yue','zh-Hant','en'].includes(storedLanguage)?storedLanguage:'yue';
  const suffix={yue:'','zh-Hant':'zh-hant/',en:'en/'};
  const siteBase=document.querySelector('meta[name="site-base-path"]')?.content || '/';
  const viewBadge = document.querySelector('[data-view-count]');
  if (viewBadge) {
    const showViews = async () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', showViews);
      try {
        const optedOut = navigator.globalPrivacyControl || navigator.doNotTrack === '1';
        const response = await fetch(viewBadge.dataset.viewCount, {
          method: optedOut ? 'GET' : 'POST',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          keepalive: true,
        });
        if (!response.ok) return;
        const { total } = await response.json();
        if (!Number.isSafeInteger(total) || total < 0) return;
        const gold = Math.floor(total / 1000);
        const regular = Math.floor((total % 1000) / 100);
        const marks = total < 100 ? String([1, 10, 50].filter(minimum => total >= minimum).length) : '4';
        const stamps = document.createDocumentFragment();
        for (let index = 0; index < Math.max(1, gold + regular); index++) {
          const stamp = document.createElement('span');
          stamp.className = index < gold ? 'view-stamp view-stamp--gold' : 'view-stamp';
          stamp.dataset.marks = marks;
          stamps.append(stamp);
        }
        viewBadge.replaceChildren(stamps);
        viewBadge.hidden = false;
      } catch {
        // Keep the badge hidden when the counter is unavailable.
      }
    };
    document.addEventListener('visibilitychange', showViews);
    void showViews();
  }
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
  const audioPlayers = document.querySelectorAll('[data-local-audio]');
  audioPlayers.forEach(player => player.addEventListener('play', () => {
    audioPlayers.forEach(other => { if (other !== player) other.pause(); });
  }));
  const playlist = document.querySelector('[data-playlist]');
  if (playlist) {
    const tracks = Array.from(document.querySelectorAll('[data-playlist-src]'), row => row.dataset);
    const player = playlist.querySelector('audio');
    const start = playlist.querySelector('[data-playlist-start]');
    const next = playlist.querySelector('[data-playlist-next]');
    const status = playlist.querySelector('[data-playlist-status]');
    let queue = [], current, selection = 0;

    const playNext = async () => {
      if (!queue.length) {
        queue = tracks.slice();
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        if (queue.length > 1 && queue[0] === current) [queue[0], queue[1]] = [queue[1], queue[0]];
      }
      current = queue.shift();
      const attempt = ++selection;
      status.textContent = '載入中 · ' + current.playlistTitle;
      player.hidden = false;
      player.src = current.playlistSrc;
      next.disabled = false;
      try {
        await player.play();
        if (selection === attempt) status.textContent = '播放中 · ' + current.playlistTitle;
      } catch (error) {
        if (selection === attempt) {
          status.textContent = error.name === 'NotAllowedError'
            ? '請撳播放器 ▶ 繼續 · ' + current.playlistTitle
            : '呢首暫時播唔到，可以試下一首。';
        }
      }
    };
    start.addEventListener('click', () => { queue = []; return playNext(); });
    next.addEventListener('click', playNext);
    player.addEventListener('ended', playNext);
    player.addEventListener('playing', () => {
      if (current) status.textContent = '播放中 · ' + current.playlistTitle;
    });
    player.addEventListener('error', () => {
      if (current) status.textContent = '呢首暫時播唔到，可以試下一首。';
    });
    playlist.hidden = tracks.length === 0;
  }
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
  if (rainButton) {
    const label = rainButton.querySelector('[data-rain-label]');
    let rain;
    const updateRain = playing => {
      rainButton.setAttribute('aria-pressed', String(playing));
      label.textContent = playing ? copy.rainOn : copy.rainOff;
    };
    const rainError = () => {
      updateRain(false);
      label.textContent = copy.rainError;
    };
    rainButton.addEventListener('click', async () => {
      if (!rain) {
        rain = new Audio();
        rain.preload = 'none';
        rain.loop = true;
        rain.src = rainButton.dataset.rainSrc;
        rain.onplaying = () => updateRain(true);
        rain.onpause = () => updateRain(false);
        rain.onerror = rainError;
      }
      if (!rain.paused) {
        rain.pause();
        updateRain(false);
        return;
      }
      try {
        if (rain.error) rain.load();
        await rain.play();
        updateRain(!rain.paused);
      } catch (error) {
        if (error.name !== 'AbortError') rainError();
      }
    });
  }
})();
