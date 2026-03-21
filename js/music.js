(function (app) {
  var BASE_VOLUME = 0.85;
  var currentObjectUrl = null;
  var currentSlot = null;

  function getAudio() {
    return document.getElementById('bg-music');
  }

  function revokeCurrentUrl() {
    if (currentObjectUrl) {
      try {
        if (currentObjectUrl.indexOf('blob:') === 0) URL.revokeObjectURL(currentObjectUrl);
      } catch (e) {}
      currentObjectUrl = null;
    }
  }

  function setMusicButtonPlaying(playing) {
    var btn = document.getElementById('btn-music');
    if (!btn) return;
    if (playing) {
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.remove('bg-mafia-card', 'border-mafia-border', 'text-mafia-cream');
      btn.classList.add('bg-mafia-blood/40', 'border-mafia-gold/60', 'text-mafia-gold');
    } else {
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.add('bg-mafia-card', 'border-mafia-border', 'text-mafia-cream');
      btn.classList.remove('bg-mafia-blood/40', 'border-mafia-gold/60', 'text-mafia-gold');
    }
  }

  app.isMusicPlaying = function () {
    var a = getAudio();
    return !!(a && !a.paused && a.currentTime > 0);
  };

  app.stopMusic = function () {
    var a = getAudio();
    revokeCurrentUrl();
    currentSlot = null;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    setMusicButtonPlaying(false);
  };

  function applyVolume(a, item) {
    var mul = item && typeof item.volumeMul === 'number' ? item.volumeMul : 1;
    var v = BASE_VOLUME * mul;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    a.volume = v;
  }

  function playItem(slot, item) {
    var a = getAudio();
    if (!a || !item) return Promise.resolve(false);

    return app.musicResolvePlaySource(item).then(function (resolved) {
      if (!resolved || !resolved.url) return false;

      app.stopMusic();
      currentObjectUrl = resolved.url;
      currentSlot = String(slot) === '2' ? '2' : '1';

      a.src = resolved.url;
      a.playsInline = true;
      applyVolume(a, item);

      return new Promise(function (resolve) {
        var settled = false;
        var fallbackTimer = null;
        function fail() {
          if (settled) return;
          settled = true;
          a.removeEventListener('loadedmetadata', onReady);
          a.removeEventListener('canplay', onReady);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          revokeCurrentUrl();
          currentSlot = null;
          setMusicButtonPlaying(false);
          resolve(false);
        }
        function onReady() {
          if (settled) return;
          settled = true;
          a.removeEventListener('loadedmetadata', onReady);
          a.removeEventListener('canplay', onReady);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          var dur = a.duration;
          var off = typeof item.offsetSec === 'number' ? item.offsetSec : 0;
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            if (off >= dur - 0.05) off = Math.max(0, dur - 0.05);
            a.currentTime = off;
          } else {
            a.currentTime = off;
          }
          var p = a.play();
          if (p && typeof p.then === 'function') {
            p.then(function () {
              setMusicButtonPlaying(true);
              resolve(true);
            }).catch(function () {
              revokeCurrentUrl();
              currentSlot = null;
              setMusicButtonPlaying(false);
              resolve(false);
            });
          } else {
            setMusicButtonPlaying(true);
            resolve(true);
          }
        }
        fallbackTimer = setTimeout(onReady, 4000);
        a.addEventListener('loadedmetadata', onReady);
        a.addEventListener('canplay', onReady);
        a.addEventListener('error', fail, { once: true });
        a.load();
      });
    });
  }

  function pickRandomItem(slot) {
    var items = app.getMusicSlotItems(slot).filter(function (it) {
      return it && it.enabled !== false;
    });
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  function showEl(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    if (app.modalSetOpen) app.modalSetOpen(el, show);
    else {
      el.classList.toggle('hidden', !show);
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }

  app.showMusicSlotModal = function () {
    showEl('modal-music-slot', true);
  };

  app.hideMusicSlotModal = function () {
    showEl('modal-music-slot', false);
  };

  app.showMusicEmptyModal = function (slot) {
    var wrap = document.getElementById('modal-music-empty');
    if (wrap) wrap.dataset.slot = String(slot);
    showEl('modal-music-empty', true);
  };

  app.hideMusicEmptyModal = function () {
    showEl('modal-music-empty', false);
  };

  app.musicToggleMainButton = function () {
    if (app.isMusicPlaying()) {
      app.stopMusic();
      return;
    }
    app.showMusicSlotModal();
  };

  app.musicStartSlot = function (slot) {
    app.hideMusicSlotModal();
    var item = pickRandomItem(slot);
    if (!item) {
      app.showMusicEmptyModal(slot);
      return;
    }
    playItem(slot, item).then(function (ok) {
      if (!ok) app.showMusicEmptyModal(slot);
    });
  };

  app.musicOnEmptyFilesSelected = function (slot, fileList) {
    if (!fileList || !fileList.length) return;
    app.musicAddFilesToSlot(slot, fileList).then(function () {
      app.hideMusicEmptyModal();
      var item = pickRandomItem(slot);
      if (item) playItem(slot, item);
    });
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  app.musicSettingsExpandedId = { '1': '', '2': '' };

  app.getMusicExpandedItemId = function (slot) {
    var k = String(slot) === '2' ? '2' : '1';
    return app.musicSettingsExpandedId[k] || '';
  };

  app.toggleMusicItemExpanded = function (slot, itemId) {
    var k = String(slot) === '2' ? '2' : '1';
    if (app.musicSettingsExpandedId[k] === itemId) app.musicSettingsExpandedId[k] = '';
    else app.musicSettingsExpandedId[k] = itemId;
    app.renderMusicSettings();
  };

  app.setMusicExpandedToItem = function (slot, itemId) {
    var k = String(slot) === '2' ? '2' : '1';
    app.musicSettingsExpandedId[k] = itemId || '';
    app.renderMusicSettings();
  };

  app.renderMusicSettings = function () {
    var c1 = document.getElementById('music-list-slot-1');
    var c2 = document.getElementById('music-list-slot-2');
    if (c1) c1.innerHTML = app.buildMusicSlotListHtml('1');
    if (c2) c2.innerHTML = app.buildMusicSlotListHtml('2');
  };

  app.buildMusicSlotListHtml = function (slot) {
    var items = app.getMusicSlotItems(slot);
    if (!items.length) {
      return '<p class="text-mafia-cream/50 text-sm py-2">Нет треков — добавьте файлы.</p>';
    }
    var expandedId = app.getMusicExpandedItemId(slot);
    var html = '<ul class="space-y-2">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var isOpen = expandedId === it.id;
      var offPool = it.enabled === false;
      var srcLabel =
        it.source && it.source.type === 'idb' ? 'с устройства' : '';
      var chevron = isOpen ? '▼' : '▶';
      html +=
        '<li class="bg-mafia-black/40 border border-mafia-border rounded overflow-hidden text-left' +
        (offPool ? ' opacity-60' : '') +
        '" data-music-item-id="' +
        escapeHtml(it.id) +
        '" data-music-slot="' +
        escapeHtml(slot) +
        '">' +
        '<button type="button" data-action="music-toggle-item-panel" data-slot="' +
        escapeHtml(slot) +
        '" data-item-id="' +
        escapeHtml(it.id) +
        '" class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-mafia-card/50 transition-colors cursor-pointer">' +
        '<span class="text-mafia-gold/70 text-xs w-4 flex-shrink-0" aria-hidden="true">' +
        chevron +
        '</span>' +
        '<span class="text-mafia-gold/90 text-sm font-medium truncate flex-1 min-w-0" title="' +
        escapeHtml(it.name) +
        '">' +
        escapeHtml(it.name) +
        '</span>' +
        (offPool
          ? '<span class="text-mafia-cream/45 text-xs flex-shrink-0 uppercase tracking-wider">выкл.</span>'
          : '') +
        (srcLabel
          ? '<span class="text-mafia-cream/40 text-xs flex-shrink-0">' + escapeHtml(srcLabel) + '</span>'
          : '') +
        '</button>' +
        '<div class="music-item-settings px-3 pb-3 pt-0 border-t border-mafia-border/40' +
        (isOpen ? '' : ' hidden') +
        '">' +
        '<label class="flex items-center gap-2 cursor-pointer text-xs text-mafia-cream/70 pt-3 select-none">' +
        '<input type="checkbox" data-music-field="enabled" class="rounded border-mafia-border bg-mafia-coal text-mafia-gold focus:ring-mafia-gold/40" ' +
        (offPool ? '' : 'checked') +
        '>' +
        '<span>Участвует в случайном выборе</span>' +
        '</label>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">' +
        '<label class="block text-xs text-mafia-cream/60 uppercase tracking-wider">Секунда старта' +
        '<input type="number" min="0" step="0.1" data-music-field="offset" value="' +
        (typeof it.offsetSec === 'number' ? it.offsetSec : 0) +
        '" class="mt-1 w-full px-2 py-1.5 bg-mafia-coal border border-mafia-border rounded text-mafia-cream text-sm">' +
        '</label>' +
        '<label class="block text-xs text-mafia-cream/60 uppercase tracking-wider">Громкость ×' +
        '<input type="range" min="0.25" max="2" step="0.05" data-music-field="volume" value="' +
        (typeof it.volumeMul === 'number' ? it.volumeMul : 1) +
        '" class="mt-2 w-full accent-mafia-gold">' +
        '</label>' +
        '</div>' +
        '<div class="flex justify-between items-center mt-2">' +
        '<span class="text-mafia-cream/50 text-xs tabular-nums" data-music-vol-label>×' +
        (typeof it.volumeMul === 'number' ? it.volumeMul : 1).toFixed(2) +
        '</span>' +
        (it.source && it.source.type === 'bundled'
          ? ''
          : '<button type="button" data-action="music-remove-item" data-slot="' +
            escapeHtml(slot) +
            '" data-item-id="' +
            escapeHtml(it.id) +
            '" class="text-red-400/90 hover:text-red-300 text-xs uppercase tracking-wider cursor-pointer">Удалить</button>') +
        '</div>' +
        '</div>' +
        '</li>';
    }
    html += '</ul>';
    return html;
  };

  app.applyMusicFieldChange = function (el) {
    if (!el || !el.getAttribute) return;
    var field = el.getAttribute('data-music-field');
    if (!field) return;
    var li = el.closest('[data-music-item-id]');
    if (!li) return;
    var settings = document.getElementById('settings-screen');
    if (!settings || !settings.classList.contains('active')) return;
    var id = li.getAttribute('data-music-item-id');
    var slot = li.getAttribute('data-music-slot');
    if (!id || !slot) return;
    if (field === 'offset') {
      var off = parseFloat(el.value);
      if (isNaN(off)) off = 0;
      app.musicUpdateItem(slot, id, { offsetSec: off });
    } else if (field === 'volume') {
      var v = parseFloat(el.value);
      if (isNaN(v)) v = 1;
      app.musicUpdateItem(slot, id, { volumeMul: v });
      var label = li.querySelector('[data-music-vol-label]');
      if (label) label.textContent = '×' + v.toFixed(2);
    }
  };

  app.initMusic = function () {
    var a = getAudio();
    if (a) {
      a.addEventListener('ended', function () {
        app.stopMusic();
      });
    }
    setMusicButtonPlaying(false);
  };
})(window.MafiaApp);
