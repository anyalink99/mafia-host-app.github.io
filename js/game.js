(function (app) {
  app.MIN_TIMER_DIGITS_PX = 44;
  app.MIN_TIMER_BUTTONS_PX = 14;
  app.PLAYER_BTN_FIT_MIN_PX = 10;
  app.PLAYER_BTN_FIT_MAX_PX = 29;
  app.PLAYER_BTN_MIN_READABLE_PX = 14;

  function fitButtonText(el) {
    if (!el) return null;

    el.style.whiteSpace = 'nowrap';
    el.style.overflow = 'visible';

    const minSize = typeof app.PLAYER_BTN_FIT_MIN_PX === 'number' ? app.PLAYER_BTN_FIT_MIN_PX : 10;
    const maxSize = typeof app.PLAYER_BTN_FIT_MAX_PX === 'number' ? app.PLAYER_BTN_FIT_MAX_PX : 29;
    const paddingLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const paddingRight = parseFloat(getComputedStyle(el).paddingRight) || 0;
    let maxWidth = 0;
    if (el.clientWidth > 0) {
      maxWidth = Math.max(0, el.clientWidth - paddingLeft - paddingRight);
    }
    if (!maxWidth) {
      const container = el.parentElement;
      if (!container) return maxSize;
      const row = container.parentElement;
      const rowWidth = row ? row.getBoundingClientRect().width : 0;
      const spaceForNumberAndGap = 36;
      const containerMeasured = container.getBoundingClientRect().width;
      const containerFromRow = rowWidth > 10 ? rowWidth - spaceForNumberAndGap : 0;
      const containerWidth = Math.max(containerMeasured, containerFromRow);
      const gap = 4;
      maxWidth = Math.max(0, (containerWidth - gap) / 2 - paddingLeft - paddingRight);
    }
    if (!maxWidth) return minSize;

    let size = maxSize;
    el.style.fontSize = size + 'px';

    while (size > minSize && el.scrollWidth > maxWidth) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }

    while (size < maxSize && el.scrollWidth <= maxWidth) {
      size += 0.5;
      el.style.fontSize = size + 'px';
    }
    if (el.scrollWidth > maxWidth) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }

    const minReadable =
      typeof app.PLAYER_BTN_MIN_READABLE_PX === 'number' ? app.PLAYER_BTN_MIN_READABLE_PX : 14;
    const parentW = el.parentElement ? el.parentElement.getBoundingClientRect().width : 0;
    if (parentW > 90 && size < minReadable) size = minReadable;
    el.style.fontSize = size + 'px';
    return size;
  }

  app.renderPlayers = function () {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    app.players.forEach(function (p) {
      const row = document.createElement('div');
      row.className =
        'flex flex-col h-full bg-mafia-coal border border-mafia-border rounded px-2 py-1.5';
      const inQueue = app.votingOrder.indexOf(p.id) !== -1;
      const voteClass = inQueue
        ? 'px-2 py-1 bg-mafia-coal border border-mafia-border rounded text-[10px] text-mafia-cream/40 cursor-not-allowed opacity-70 uppercase'
        : 'px-2 py-1 bg-mafia-gold hover:bg-mafia-goldLight text-mafia-black font-semibold rounded text-[10px] uppercase cursor-pointer';
      row.innerHTML =
        '<span class="font-display font-semibold text-mafia-gold text-xs text-center block flex-shrink-0" data-role="player-number">№' +
        p.id +
        '</span><div class="flex-1 min-h-0"></div><div class="flex justify-end gap-1 min-w-0 flex-shrink-0"><button type="button" data-action="foul" data-player-id="' +
        p.id +
        '" class="flex-1 min-w-0 px-2 bg-mafia-card hover:bg-mafia-border border border-mafia-border rounded text-[10px] text-mafia-cream/90 cursor-pointer transition-transform active:scale-95 whitespace-nowrap">Фол:' +
        p.fouls +
        '</button><button type="button" data-action="vote" data-player-id="' +
        p.id +
        '" class="flex-1 min-w-0 ' +
        voteClass +
        ' whitespace-nowrap' +
        (inQueue ? ' disabled' : '') +
        '">Выставить</button></div>';

      list.appendChild(row);
    });

    function abbreviateVoteButtonsIfOverflow(listEl) {
      var rows = listEl.children;
      for (var i = 0; i < rows.length; i++) {
        var voteBtn = rows[i].querySelector('button[data-action="vote"]');
        if (voteBtn && voteBtn.scrollWidth > voteBtn.clientWidth) voteBtn.textContent = 'Выст.';
      }
    }

    function applyFontSizesToRows(listEl) {
      if (typeof app.fontBaseSize !== 'number') return;
      var rows = listEl.children;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var foulBtn = row.querySelector('button[data-action="foul"]');
        var voteBtn = row.querySelector('button[data-action="vote"]');
        var numEl = row.querySelector('[data-role="player-number"]');
        if (foulBtn) foulBtn.style.fontSize = app.fontBaseSize + 'px';
        if (voteBtn) voteBtn.style.fontSize = app.fontBaseSize + 'px';
        if (numEl) numEl.style.fontSize = (app.fontBaseSize * 2) + 'px';
      }
      abbreviateVoteButtonsIfOverflow(listEl);
    }

    applyFontSizesToRows(list);
    syncTimerFont();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(function () {
          runFitAndSync();
        }, 0);
      });
    });

    function rowButtonsStillOverflow(listEl) {
      var rows = listEl.children;
      for (var i = 0; i < rows.length; i++) {
        var foulBtn = rows[i].querySelector('button[data-action="foul"]');
        var voteBtn = rows[i].querySelector('button[data-action="vote"]');
        if (foulBtn && foulBtn.scrollWidth > foulBtn.clientWidth) return true;
        if (voteBtn && voteBtn.scrollWidth > voteBtn.clientWidth) return true;
      }
      return false;
    }

    function runFitAndSync() {
      var list = document.getElementById('players-list');
      if (!list) return;
      var rows = list.children;
      var baseSize;
      if (typeof app.fontBaseSize === 'number') {
        abbreviateVoteButtonsIfOverflow(list);
        if (rowButtonsStillOverflow(list)) {
          delete app.fontBaseSize;
          runFitAndSync();
          return;
        }
      } else {
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          var foulBtn = row.querySelector('button[data-action="foul"]');
          var voteBtn = row.querySelector('button[data-action="vote"]');
          var numEl = row.querySelector('[data-role="player-number"]');
          var foulSize = fitButtonText(foulBtn);
          var voteSize = fitButtonText(voteBtn);
          if (voteBtn && voteBtn.scrollWidth > voteBtn.clientWidth) {
            voteBtn.textContent = 'Выст.';
            voteSize = fitButtonText(voteBtn);
          }
          baseSize =
            Math.min(
              foulSize || Number.POSITIVE_INFINITY,
              voteSize || Number.POSITIVE_INFINITY
            ) || 14;
          if (foulBtn) foulBtn.style.fontSize = baseSize + 'px';
          if (voteBtn) voteBtn.style.fontSize = baseSize + 'px';
          if (numEl) numEl.style.fontSize = (baseSize * 2) + 'px';
        }
        app.fontBaseSize = baseSize;
      }
      syncTimerFont();
      app.saveState();
    }

    app.refitPlayerFonts = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(runFitAndSync, 80);
        });
      });
    };

    function syncTimerFont() {
      const timerEl = document.getElementById('timer');
      if (timerEl) {
        if (typeof app.timerDigitsSize === 'number') {
          app.timerDigitsSize = Math.max(app.timerDigitsSize, app.MIN_TIMER_DIGITS_PX);
          timerEl.style.fontSize = app.timerDigitsSize + 'px';
          timerEl.dataset.sized = '1';
        } else if (!timerEl.dataset.sized) {
          var base = parseFloat(window.getComputedStyle(timerEl).fontSize) || 24;
          app.timerDigitsSize = Math.max(base * 1.5, app.MIN_TIMER_DIGITS_PX);
          timerEl.style.fontSize = app.timerDigitsSize + 'px';
          timerEl.dataset.sized = '1';
        }
      }
      const startBtn = document.getElementById('start-btn');
      const reset60 = document.querySelector(
        'button[data-action="reset-timer"][data-seconds="60"]'
      );
      const reset30 = document.querySelector(
        'button[data-action="reset-timer"][data-seconds="30"]'
      );
      var btnSizePx;
      if (typeof app.timerButtonsSize === 'number') {
        app.timerButtonsSize = Math.max(app.timerButtonsSize, app.MIN_TIMER_BUTTONS_PX);
        btnSizePx = app.timerButtonsSize + 'px';
      } else {
        const sampleNum = document.querySelector(
          '#players-list [data-role="player-number"]'
        );
        if (sampleNum) {
          const size = parseFloat(window.getComputedStyle(sampleNum).fontSize);
          app.timerButtonsSize = Math.max(size / 1.5, app.MIN_TIMER_BUTTONS_PX);
          btnSizePx = app.timerButtonsSize + 'px';
        }
      }
      if (btnSizePx) {
        if (startBtn) startBtn.style.fontSize = btnSizePx;
        if (reset60) reset60.style.fontSize = btnSizePx;
        if (reset30) reset30.style.fontSize = btnSizePx;
      }
    }
  };

  app.addFoul = function (id) {
    const p = app.players.find(function (x) {
      return x.id === id;
    });
    if (!p) return;
    p.fouls++;
    if (p.fouls >= 4) p.fouls = 0;
    var list = document.getElementById('players-list');
    if (list) {
      var foulBtn = list.querySelector('button[data-action="foul"][data-player-id="' + id + '"]');
      if (foulBtn) foulBtn.textContent = 'Фол:' + p.fouls;
    } else {
      app.renderPlayers();
    }
    app.saveState();
  };

  app.addToVote = function (id) {
    if (app.votingOrder.indexOf(id) === -1) {
      app.votingOrder.push(id);
      app.updateVotingUI();
      var list = document.getElementById('players-list');
      if (list) {
        var voteBtn = list.querySelector('button[data-action="vote"][data-player-id="' + id + '"]');
        if (voteBtn) {
          voteBtn.disabled = true;
          voteBtn.className = 'flex-1 min-w-0 px-2 py-1 bg-mafia-coal border border-mafia-border rounded text-[10px] text-mafia-cream/40 cursor-not-allowed opacity-70 uppercase whitespace-nowrap';
          if (typeof app.fontBaseSize === 'number') voteBtn.style.fontSize = app.fontBaseSize + 'px';
        }
      } else {
        app.renderPlayers();
      }
      app.saveState();
    }
  };

  app.updateVotingUI = function () {
    const el = document.getElementById('voting-order');
    if (el) el.textContent = app.votingOrder.length ? app.votingOrder.join(' → ') : '—';
  };

  app.clearVoting = function () {
    app.votingOrder = [];
    app.updateVotingUI();
    var list = document.getElementById('players-list');
    if (list) {
      var voteBtns = list.querySelectorAll('button[data-action="vote"]');
      var normalClass = 'flex-1 min-w-0 px-2 py-1 bg-mafia-gold hover:bg-mafia-goldLight text-mafia-black font-semibold rounded text-[10px] uppercase cursor-pointer whitespace-nowrap';
      var basePx = typeof app.fontBaseSize === 'number' ? app.fontBaseSize + 'px' : '';
      for (var i = 0; i < voteBtns.length; i++) {
        voteBtns[i].disabled = false;
        voteBtns[i].className = normalClass;
        voteBtns[i].textContent = 'Выставить';
        if (basePx) voteBtns[i].style.fontSize = basePx;
      }
      if (typeof app.fontBaseSize === 'number') {
        for (var j = 0; j < voteBtns.length; j++) {
          if (voteBtns[j].scrollWidth > voteBtns[j].clientWidth) voteBtns[j].textContent = 'Выст.';
        }
      }
    } else {
      app.renderPlayers();
    }
    app.saveState();
  };

  app.toggleTimer = function () {
    const btn = document.getElementById('start-btn');
    if (!btn) return;
    if (app.timerInterval) {
      clearInterval(app.timerInterval);
      app.timerInterval = null;
      btn.innerText = 'Старт';
      btn.className =
        'px-4 py-2 bg-green-800 hover:bg-green-700 border border-green-600 text-white font-semibold rounded uppercase text-xs tracking-wider cursor-pointer';
    } else {
      btn.innerText = 'Пауза';
      btn.className =
        'px-4 py-2 bg-red-900 hover:bg-red-800 border border-red-700 text-white font-semibold rounded uppercase text-xs tracking-wider cursor-pointer';
      app.timerInterval = setInterval(function () {
        if (app.timeLeft > 0) {
          app.timeLeft--;
          const te = document.getElementById('timer');
          if (te) te.textContent = app.timeLeft;
          app.saveState();
        } else {
          app.toggleTimer();
        }
      }, 1000);
    }
  };

  app.resetTimer = function (seconds) {
    if (app.timerInterval) clearInterval(app.timerInterval);
    app.timerInterval = null;
    app.timeLeft = seconds;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = app.timeLeft;
    const btn = document.getElementById('start-btn');
    if (btn) {
      btn.innerText = 'Старт';
      btn.className =
        'px-4 py-2 bg-green-800 hover:bg-green-700 border border-green-600 text-white font-semibold rounded uppercase text-xs tracking-wider cursor-pointer';
    }
    app.saveState();
  };
})(window.MafiaApp);
