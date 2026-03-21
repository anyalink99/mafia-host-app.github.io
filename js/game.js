(function (app) {
  app.getActivePlayerCount = function () {
    var c = 0;
    for (var ai = 0; ai < app.players.length; ai++) {
      if (!app.players[ai].outReason) c++;
    }
    return c;
  };

  app.hidePlayerActionsModal = function () {
    var m = document.getElementById('modal-player-actions');
    if (m) app.modalSetOpen(m, false);
  };

  app.showPlayerActionsModal = function (id) {
    var p = app.players.find(function (x) {
      return x.id === id;
    });
    if (!p) return;
    var m = document.getElementById('modal-player-actions');
    if (!m) return;
    var title = document.getElementById('modal-player-actions-title');
    var foulBtn = m.querySelector('[data-action="player-modal-foul"]');
    var voteBtn = m.querySelector('[data-action="player-modal-vote"]');
    if (title) title.textContent = 'Игрок №' + id;
    var inQueue = app.votingOrder.indexOf(id) !== -1;
    var out = !!p.outReason;
    if (foulBtn) {
      foulBtn.disabled = out;
      foulBtn.className =
        'w-full py-3 rounded border font-semibold text-sm uppercase tracking-wider transition-colors ' +
        (out
          ? 'border-mafia-border bg-mafia-coal text-mafia-cream/30 cursor-not-allowed'
          : 'border-mafia-border bg-mafia-card hover:bg-mafia-border text-mafia-cream cursor-pointer');
    }
    var canVote = !out && !inQueue;
    if (voteBtn) {
      voteBtn.disabled = !canVote;
      voteBtn.textContent = inQueue ? 'В очереди' : 'Выставить';
      voteBtn.className =
        'w-full py-3 rounded border-2 font-semibold text-sm uppercase tracking-wider transition-colors ' +
        (canVote
          ? 'border-mafia-gold/60 bg-mafia-blood/30 hover:bg-mafia-blood/45 text-mafia-gold cursor-pointer'
          : 'border-mafia-border bg-mafia-coal text-mafia-cream/35 cursor-not-allowed');
    }
    var elims = m.querySelectorAll('[data-action="player-modal-elim"]');
    var elimOn =
      'modal-player-elim-btn w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded border ring-2 ring-mafia-gold bg-mafia-blood/45 border-mafia-gold text-mafia-gold transition-colors cursor-pointer';
    var elimOff =
      'modal-player-elim-btn w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded border border-mafia-border bg-mafia-card text-mafia-cream/80 hover:border-mafia-gold/45 transition-colors cursor-pointer';
    for (var ei = 0; ei < elims.length; ei++) {
      var er = elims[ei].getAttribute('data-elim');
      elims[ei].className = p.outReason === er ? elimOn : elimOff;
    }
    m.dataset.playerId = String(id);
    app.modalSetOpen(m, true);
  };

  app.togglePlayerElimination = function (id, reason) {
    var p = app.players.find(function (x) {
      return x.id === id;
    });
    if (!p) return;
    if (p.outReason === reason) {
      p.outReason = null;
      if (reason === 'disqual') {
        p.fouls = 0;
      }
    } else {
      p.outReason = reason;
      var vix = app.votingOrder.indexOf(id);
      if (vix !== -1) {
        app.votingOrder.splice(vix, 1);
        app.updateVotingUI();
      }
    }
    var vs = app.voteSession;
    if (vs && vs.phase === 'counting') {
      vs.poolTotal = app.getActivePlayerCount();
    }
    app.renderPlayers();
    var voteScr = document.getElementById('vote-screen');
    if (voteScr && voteScr.classList.contains('active') && app.renderVoteScreen) {
      app.renderVoteScreen();
    }
    app.saveState();
  };

  app.renderPlayers = function () {
    var list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    app.players.forEach(function (p) {
      var out = !!p.outReason;
      var inVoteQueue = app.votingOrder.indexOf(p.id) !== -1;
      var row = document.createElement('div');
      row.className =
        'player-cell flex h-full min-h-0 min-w-0 flex-col rounded-lg border border-mafia-border bg-mafia-coal shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' +
        (out ? ' opacity-[0.55]' : '');
      var statusHtml;
      if (p.outReason) {
        statusHtml =
          '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-mafia-blood/50 bg-mafia-blood/10 text-mafia-blood" aria-hidden="true"><svg class="pointer-events-none h-[18px] w-[18px]"><use href="#icon-elim-' +
          p.outReason +
          '"/></svg></div>';
      } else if (inVoteQueue) {
        statusHtml =
          '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-mafia-gold/70 bg-mafia-blood/15 text-mafia-gold" title="Выставлен" aria-label="Выставлен"><svg class="pointer-events-none h-[18px] w-[18px]"><use href="#icon-nominated"/></svg></div>';
      } else {
        statusHtml =
          '<div class="invisible flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-transparent" aria-hidden="true"></div>';
      }
      var foulClassDefault =
        'font-display text-base font-semibold leading-none tabular-nums sm:text-lg ' +
        (p.fouls >= 3 ? 'text-mafia-blood' : 'text-mafia-cream/95');
      var foulClassCompact =
        'font-display text-sm font-semibold leading-none tabular-nums sm:text-base ' +
        (p.fouls >= 3 ? 'text-mafia-blood' : 'text-mafia-cream/95');
      row.innerHTML =
        '<button type="button" class="player-slot flex h-full min-h-0 w-full min-w-0 flex-col justify-center px-2 pt-2 pb-2 text-center outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mafia-gold/45 sm:px-2.5 sm:pt-2.5 sm:pb-2.5" data-action="player-slot-open" data-player-id="' +
        p.id +
        '">' +
        '<div class="player-slot__default flex w-full min-h-0 flex-col gap-2 sm:gap-2.5">' +
        '<div class="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1">' +
        '<div class="flex min-w-0 justify-end">' +
        statusHtml +
        '</div>' +
        '<span class="font-display text-3xl font-bold leading-none tracking-wide text-mafia-gold tabular-nums sm:text-4xl">№' +
        p.id +
        '</span>' +
        '<div class="min-w-0" aria-hidden="true"></div></div>' +
        '<div class="flex min-h-0 w-full shrink-0 items-baseline justify-center gap-2 rounded border border-mafia-border/35 bg-black/25 px-2 py-1">' +
        '<span class="text-[9px] font-medium uppercase tracking-[0.16em] text-mafia-gold/55 sm:text-[10px]">Фолы</span>' +
        '<span class="' +
        foulClassDefault +
        '">' +
        p.fouls +
        '</span></div></div>' +
        '<div class="player-slot__compact w-full min-h-0 flex-1 justify-between gap-2">' +
        '<div class="flex min-w-0 min-h-0 flex-1 items-center gap-1.5">' +
        statusHtml +
        '<span class="font-display text-3xl font-bold leading-none tracking-wide text-mafia-gold tabular-nums sm:text-4xl">№' +
        p.id +
        '</span>' +
        '</div>' +
        '<div class="player-slot__foul-pill player-slot__foul-pill--compact flex shrink-0 items-center justify-center gap-2 rounded border border-mafia-border/35 bg-black/25 px-2 py-1">' +
        '<span class="' +
        foulClassCompact +
        '">Ф: ' +
        p.fouls +
        '</span></div></div></button>';
      list.appendChild(row);
    });
  };

  app.addFoul = function (id) {
    const p = app.players.find(function (x) {
      return x.id === id;
    });
    if (!p || p.outReason) return;
    p.fouls++;
    if (p.fouls >= 4) {
      p.fouls = 4;
      p.outReason = 'disqual';
      var vix = app.votingOrder.indexOf(id);
      if (vix !== -1) {
        app.votingOrder.splice(vix, 1);
        app.updateVotingUI();
      }
      var vs = app.voteSession;
      if (vs && vs.phase === 'counting') {
        vs.poolTotal = app.getActivePlayerCount();
      }
    }
    app.renderPlayers();
    var voteScr = document.getElementById('vote-screen');
    if (voteScr && voteScr.classList.contains('active') && app.renderVoteScreen) {
      app.renderVoteScreen();
    }
    app.saveState();
  };

  app.addToVote = function (id) {
    var pl = app.players.find(function (x) {
      return x.id === id;
    });
    if (pl && pl.outReason) return;
    if (app.votingOrder.indexOf(id) === -1) {
      app.votingOrder.push(id);
      app.updateVotingUI();
      app.renderPlayers();
      app.saveState();
    }
  };

  app.updateVotingUI = function () {
    const el = document.getElementById('voting-order');
    if (el) el.textContent = app.votingOrder.length ? app.votingOrder.join(' → ') : '—';
    const go = document.getElementById('btn-go-voting');
    if (go) {
      const ok = app.votingOrder.length >= 2;
      const revote =
        app.voteSession &&
        app.voteSession.phase === 'counting' &&
        app.voteSession.tieRevote;
      go.textContent = revote ? 'Переголосование' : 'Голосование';
      go.disabled = !ok;
      if (ok) {
        go.className =
          'w-full py-2.5 bg-mafia-blood hover:bg-mafia-bloodLight border-2 border-mafia-gold text-mafia-gold font-semibold rounded text-sm uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98]';
      } else {
        go.className =
          'w-full py-2.5 bg-mafia-blood/50 border border-mafia-gold/40 text-mafia-gold/50 font-semibold rounded text-sm uppercase tracking-wider cursor-not-allowed transition-all';
      }
    }
  };

  app.arraysEqual = function (a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  app.startVoteSessionFromQueue = function () {
    var q = app.votingOrder;
    app.voteSession = {
      phase: 'counting',
      poolTotal: app.getActivePlayerCount(),
      candidateIds: q.slice(),
      votes: q.map(function () {
        return null;
      }),
      baseVotingOrder: q.slice(),
      tieRevote: false,
    };
    app.saveState();
  };

  app.prepareVoteScreen = function () {
    var s0 = app.voteSession;
    if (s0 && s0.phase === 'done' && s0.winnerId != null) {
      app.finalizeVoteHang([s0.winnerId]);
      return;
    }
    if (s0 && s0.phase === 'raiseAll') return;
    if (app.votingOrder.length < 2) {
      app.showScreen('game-screen');
      return;
    }
    var s = app.voteSession;
    if (s && s.phase === 'counting') {
      if (s.tieRevote) return;
      if (app.arraysEqual(s.baseVotingOrder, app.votingOrder)) return;
    }
    app.startVoteSessionFromQueue();
  };

  app.voteAvailableForIndex = function (session, index) {
    var used = 0;
    for (var j = 0; j < session.votes.length; j++) {
      if (j === index) continue;
      var v = session.votes[j];
      if (v !== null && v !== undefined) used += v;
    }
    return Math.max(0, session.poolTotal - used);
  };

  app.finalizeVoteHang = function (ids) {
    for (var hi = 0; hi < ids.length; hi++) {
      var p = app.players.find(function (x) {
        return x.id === ids[hi];
      });
      if (p) p.outReason = 'hang';
    }
    app.votingOrder = [];
    app.voteSession = null;
    app.updateVotingUI();
    app.renderPlayers();
    app.saveState();
    app.showScreen('game-screen');
  };

  app.applyRaiseAllPick = function (value) {
    var s = app.voteSession;
    if (!s || s.phase !== 'raiseAll') return;
    var n = s.poolTotal;
    if (value < 0 || value > n) return;
    var majority = value > n / 2;
    if (majority) {
      app.finalizeVoteHang(s.raiseCandidateIds);
    } else {
      app.votingOrder = [];
      app.voteSession = null;
      app.updateVotingUI();
      app.saveState();
      app.showScreen('game-screen');
    }
  };

  app.tryFinalizeVoteRound = function () {
    var s = app.voteSession;
    if (!s || s.phase !== 'counting') return;
    for (var i = 0; i < s.votes.length; i++) {
      if (s.votes[i] === null || s.votes[i] === undefined) return;
    }
    var maxV = -1;
    for (var k = 0; k < s.votes.length; k++) {
      if (s.votes[k] > maxV) maxV = s.votes[k];
    }
    var tied = [];
    for (var t = 0; t < s.candidateIds.length; t++) {
      if (s.votes[t] === maxV) tied.push(s.candidateIds[t]);
    }
    if (tied.length >= 2) {
      if (!s.tieRevote) {
        s.candidateIds = tied;
        s.votes = tied.map(function () {
          return null;
        });
        s.tieRevote = true;
        app.saveState();
        app.showScreen('game-screen');
        app.resetTimer(30);
        return;
      }
      app.voteSession = {
        phase: 'raiseAll',
        poolTotal: s.poolTotal,
        raiseCandidateIds: tied.slice(),
      };
      app.saveState();
      return;
    }
    app.finalizeVoteHang([tied[0]]);
  };

  app.hideVoteCountModal = function () {
    var m = document.getElementById('modal-vote-count');
    if (m) app.modalSetOpen(m, false);
    app._voteModalIndex = null;
    app._voteModalOpenedAt = 0;
  };

  app.showVoteCountModal = function (candidateIndex) {
    var s = app.voteSession;
    if (!s || s.phase !== 'counting') return;
    var rem = app.voteAvailableForIndex(s, candidateIndex);
    var cap = Math.min(10, rem);
    var id = s.candidateIds[candidateIndex];
    var title = document.getElementById('modal-vote-count-title');
    var sub = document.getElementById('modal-vote-count-sub');
    var grid = document.getElementById('modal-vote-count-grid');
    if (!grid) return;
    if (title) title.textContent = 'Голосов за №' + id;
    if (sub) sub.textContent = '';
    grid.innerHTML = '';
    for (var n = 0; n <= cap; n++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-action', 'vote-count-pick');
      b.setAttribute('data-value', String(n));
      b.className =
        'py-3 rounded border border-mafia-border bg-mafia-card hover:bg-mafia-blood/30 text-mafia-cream font-semibold tabular-nums cursor-pointer transition-colors';
      b.textContent = String(n);
      grid.appendChild(b);
    }
    app._voteModalIndex = candidateIndex;
    var m = document.getElementById('modal-vote-count');
    if (!m) return;
    var vs = document.getElementById('vote-screen');
    if (!vs || !vs.classList.contains('active')) return;
    var sess = app.voteSession;
    if (!sess || sess.phase !== 'counting') return;
    app._voteModalOpenedAt = Date.now();
    app.modalSetOpen(m, true);
  };

  app.applyVoteCountPick = function (value) {
    var idx = app._voteModalIndex;
    app.hideVoteCountModal();
    if (idx === null || idx === undefined) return;
    var s = app.voteSession;
    if (!s || s.phase !== 'counting') return;
    var rem = app.voteAvailableForIndex(s, idx);
    var cap = Math.min(10, rem);
    if (value < 0 || value > cap) return;
    s.votes[idx] = value;
    app.saveState();
    app.tryFinalizeVoteRound();
    app.renderVoteScreen();
  };

  app.renderVoteScreen = function () {
    var wrap = document.getElementById('vote-candidates');
    var banner = document.getElementById('vote-revote-banner');
    var hint = document.getElementById('vote-pool-hint');
    if (!wrap) return;

    var s = app.voteSession;
    if (!s) {
      wrap.innerHTML = '';
      app.updateVotingUI();
      return;
    }

    if (s.phase === 'done' && s.winnerId != null) {
      app.finalizeVoteHang([s.winnerId]);
      return;
    }

    if (s.phase === 'raiseAll') {
      if (banner) {
        banner.classList.remove('hidden');
        banner.textContent = 'Голосование за поднятие всех';
      }
      if (hint) hint.textContent = '';
      wrap.innerHTML = '';
      var cap = s.poolTotal;
      for (var r = 0; r <= cap; r++) {
        var rb = document.createElement('button');
        rb.type = 'button';
        rb.setAttribute('data-action', 'raise-all-pick');
        rb.setAttribute('data-value', String(r));
        rb.className =
          'py-3 min-w-[3.25rem] px-3 rounded border border-mafia-border bg-mafia-card hover:bg-mafia-blood/30 text-mafia-cream font-semibold tabular-nums cursor-pointer transition-colors';
        rb.textContent = String(r);
        wrap.appendChild(rb);
      }
      app.updateVotingUI();
      return;
    }

    if (banner) {
      if (s.tieRevote) {
        banner.classList.remove('hidden');
        banner.textContent = 'Переголосование между игроками:';
      } else {
        banner.classList.add('hidden');
      }
    }

    if (hint) {
      hint.textContent = '';
    }

    wrap.innerHTML = '';
    for (var i = 0; i < s.candidateIds.length; i++) {
      var pid = s.candidateIds[i];
      var assigned = s.votes[i];
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.setAttribute('data-action', 'vote-open-count');
      tile.setAttribute('data-candidate-index', String(i));
      tile.className =
        'vote-candidate-tile flex flex-col items-center justify-center min-w-[4.5rem] sm:min-w-[5.5rem] px-4 py-4 rounded-lg border-2 border-mafia-gold/50 bg-mafia-coal hover:border-mafia-gold hover:bg-mafia-blood/20 transition-colors cursor-pointer active:scale-[0.98]';
      var num = document.createElement('span');
      num.className = 'font-display font-bold text-4xl sm:text-5xl text-mafia-gold tabular-nums leading-none';
      num.textContent = String(pid);
      var sub = document.createElement('span');
      sub.className = 'mt-2 text-xs text-mafia-cream/70 text-center max-w-[6rem]';
      sub.textContent =
        'Голосов: ' + (assigned !== null && assigned !== undefined ? assigned : 0);
      tile.appendChild(num);
      tile.appendChild(sub);
      wrap.appendChild(tile);
    }
    app.updateVotingUI();
  };

  app.clearVoting = function () {
    app.votingOrder = [];
    app.voteSession = null;
    app.updateVotingUI();
    app.renderPlayers();
    app.saveState();
  };

  app.syncTimerAppearance = function () {
    const el = document.getElementById('timer');
    if (!el) return;
    const urgent = app.timeLeft <= 10;
    el.classList.toggle('text-mafia-gold', !urgent);
    el.classList.toggle('text-mafia-blood', urgent);
  };

  var TIMER_BTN_BASE =
    'px-5 py-3 font-semibold rounded uppercase text-sm tracking-wider cursor-pointer transition-[background-color,border-color,box-shadow,transform,color] duration-[118ms] ease-out';
  function applyTimerButtonState(running) {
    var btn = document.getElementById('start-btn');
    if (!btn) return;
    btn.textContent = running ? 'Пауза' : 'Старт';
    btn.setAttribute('aria-pressed', running ? 'true' : 'false');
    btn.className =
      TIMER_BTN_BASE +
      (running
        ? ' bg-red-900 hover:bg-red-800 border border-red-700 text-white'
        : ' bg-green-800 hover:bg-green-700 border border-green-600 text-white');
  }

  app.toggleTimer = function () {
    const btn = document.getElementById('start-btn');
    if (!btn) return;
    if (app.timerInterval) {
      clearInterval(app.timerInterval);
      app.timerInterval = null;
      applyTimerButtonState(false);
      app.syncTimerAppearance();
    } else {
      applyTimerButtonState(true);
      app.timerInterval = setInterval(function () {
        if (app.timeLeft > 0) {
          app.timeLeft--;
          const te = document.getElementById('timer');
          if (te) te.textContent = app.timeLeft;
          app.syncTimerAppearance();
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
    app.syncTimerAppearance();
    applyTimerButtonState(false);
    app.saveState();
  };
})(window.MafiaApp);
