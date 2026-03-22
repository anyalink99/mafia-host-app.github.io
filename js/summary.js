(function (app) {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  app.rolesFromDealForSeats = function () {
    if (!app.revealedIndices || app.revealedIndices.length !== app.players.length) return null;
    var n = app.players.length;
    var out = [];
    for (var j = 0; j < n; j++) {
      var ri = app.revealedIndices[j];
      if (ri === undefined || ri === null || !app.roles[ri]) return null;
      out[j] = app.roles[ri];
    }
    return out;
  };

  app.hasFullCardDeal = function () {
    return app.rolesFromDealForSeats() !== null;
  };

  app.getPlayerRoleOverrideKey = function (playerId) {
    return String(playerId);
  };

  app.setPlayerSpecialOverride = function (playerId, value) {
    var key = app.getPlayerRoleOverrideKey(playerId);
    if (!app.playerRoleOverrides || typeof app.playerRoleOverrides !== 'object') app.playerRoleOverrides = {};
    if (value === 'don' || value === 'sheriff') {
      for (var k in app.playerRoleOverrides) {
        if (Object.prototype.hasOwnProperty.call(app.playerRoleOverrides, k) && app.playerRoleOverrides[k] === value) {
          delete app.playerRoleOverrides[k];
        }
      }
      app.playerRoleOverrides[key] = value;
    } else {
      delete app.playerRoleOverrides[key];
    }
    app.saveState();
  };

  app.summaryWinnerChosen = function () {
    return app.winningTeam === 'mafia' || app.winningTeam === 'peaceful';
  };

  app.mapDealRoleToCode = function (r) {
    if (!r) return 'peaceful';
    if (r === 'Шериф') return 'sheriff';
    if (r === 'Дон') return 'don';
    if (r === 'Мафия') return 'mafia';
    return 'peaceful';
  };

  app.getEffectiveSummaryRoleCode = function (playerId, seatIndex) {
    var sid = String(playerId);
    if (app.summaryRoleByPlayerId && app.summaryRoleByPlayerId[sid]) {
      return app.summaryRoleByPlayerId[sid];
    }
    var deal = app.rolesFromDealForSeats();
    if (deal && deal[seatIndex] != null) {
      return app.mapDealRoleToCode(deal[seatIndex]);
    }
    return 'peaceful';
  };

  app.getFirstShotPlayerIdFromLog = function () {
    if (!Array.isArray(app.gameLog)) return null;
    var sorted = app.gameLog.slice().sort(function (a, b) {
      var ta = typeof a.ts === 'number' ? a.ts : 0;
      var tb = typeof b.ts === 'number' ? b.ts : 0;
      return ta - tb;
    });
    for (var i = 0; i < sorted.length; i++) {
      var ev = sorted[i];
      if (ev && ev.type === 'elimination' && ev.reason === 'shot' && typeof ev.playerId === 'number') {
        return ev.playerId;
      }
    }
    return null;
  };

  function parseBonusFloat(raw) {
    if (raw === undefined || raw === null || raw === '') return 0;
    var v = parseFloat(String(raw).replace(',', '.'));
    if (isNaN(v)) return 0;
    return Math.round(v * 10) / 10;
  }

  app.formatBonusForDisplay = function (raw) {
    var v = parseBonusFloat(raw);
    if (v % 1 === 0) return String(Math.round(v));
    return String(v).replace('.', ',');
  };

  app.parseBestMoveTriple = function (stored) {
    if (stored === undefined || stored === null) return ['', '', ''];
    var s = String(stored).trim();
    if (!s) return ['', '', ''];
    var parts = s.split(/[\s,;]+/).filter(function (x) {
      return x !== '';
    });
    if (parts.length >= 3) {
      return [parts[0], parts[1], parts[2]];
    }
    if (/^\d{3}$/.test(s)) {
      return [s[0], s[1], s[2]];
    }
    return ['', '', ''];
  };

  app.isBestMoveTripleComplete = function (stored) {
    var p = app.parseBestMoveTriple(stored);
    for (var i = 0; i < 3; i++) {
      var n = parseInt(String(p[i]).trim(), 10);
      if (isNaN(n) || n < 1 || n > 10) return false;
    }
    return true;
  };

  app.countCompleteBestMoves = function () {
    if (!app.bestMoveByPlayerId || typeof app.bestMoveByPlayerId !== 'object') return 0;
    var c = 0;
    for (var k in app.bestMoveByPlayerId) {
      if (!Object.prototype.hasOwnProperty.call(app.bestMoveByPlayerId, k)) continue;
      if (app.isBestMoveTripleComplete(app.bestMoveByPlayerId[k])) c++;
    }
    return c;
  };

  app.showSummaryBestMoveField = function (playerId) {
    var firstShot = app.getFirstShotPlayerIdFromLog();
    if (firstShot != null) {
      return playerId === firstShot;
    }
    if (app.countCompleteBestMoves() >= 1) {
      var key = String(playerId);
      return app.isBestMoveTripleComplete(app.bestMoveByPlayerId[key]);
    }
    return true;
  };

  app.serializeBestMoveTriple = function (a, b, c) {
    var x = String(a != null ? a : '').trim();
    var y = String(b != null ? b : '').trim();
    var z = String(c != null ? c : '').trim();
    if (!x && !y && !z) return '';
    return [x, y, z].join(',');
  };

  app.applySummaryBonusDelta = function (delta) {
    var inp = document.getElementById('modal-summary-bonus');
    if (!inp || inp.disabled) return;
    var v = parseBonusFloat(inp.value) + delta;
    v = Math.round(v * 10) / 10;
    inp.value = v % 1 === 0 ? String(Math.round(v)) : String(v).replace('.', ',');
  };

  app.formatHistoryItemAuto = function (e) {
    function voteLine(candidateIds, votes) {
      if (!candidateIds || !candidateIds.length) return '';
      var parts = [];
      for (var i = 0; i < candidateIds.length; i++) {
        parts.push('№' + candidateIds[i] + ': ' + (votes && votes[i] != null ? votes[i] : '—'));
      }
      return 'Счёт: ' + parts.join('; ') + '.';
    }
    if (e.type === 'vote_hang') {
      var nums = (e.eliminatedIds || []).join(', №');
      var ra = e.viaRaiseAll ? ' (после поднятия всех)' : '';
      var vlh = voteLine(e.candidateIds, e.votes);
      if (
        e.viaRaiseAll &&
        typeof e.raiseAllVotes === 'number' &&
        typeof e.raiseAllPoolTotal === 'number'
      ) {
        return (
          'Поднятие всех — ' +
          e.raiseAllVotes +
          '/' +
          e.raiseAllPoolTotal +
          ' голосов, большинство набрано, казнены №' +
          nums +
          '.'
        );
      }
      var hangHead = e.tieRevote ? 'Переголосование' : 'Голосование';
      return hangHead + ra + ' — казнены №' + nums + (vlh ? '. ' + vlh : '');
    }
    if (e.type === 'vote_tie') {
      var td = (e.tiedIds || []).join(', №');
      var vlt = voteLine(e.candidateIds, e.votes);
      var tieLabel = e.isRevote ? 'Переголосование' : 'Голосование';
      return tieLabel + ' — ничья между №' + td + (vlt ? '. ' + vlt : '');
    }
    if (e.type === 'vote_raise_all') {
      return '';
    }
    if (e.type === 'vote_no_elimination') {
      if (typeof e.votesCast === 'number' && typeof e.poolTotal === 'number') {
        return (
          'Поднятие всех — ' +
          e.votesCast +
          '/' +
          e.poolTotal +
          ' голосов, большинство не набрано, игроки остаются за столом.'
        );
      }
      return 'Поднятие всех — большинство не набрано, выбывания нет.';
    }
    if (e.type === 'elimination') {
      var lab = { hang: 'казнён (вне голосования)', shot: 'убит', disqual: 'удалён (фолы / дисквалификация)' };
      return 'Игрок №' + e.playerId + ' — ' + (lab[e.reason] || 'выбыл');
    }
    return typeof e === 'object' ? JSON.stringify(e) : String(e);
  };

  app.formatHistoryItem = function (e) {
    if (e && typeof e.textOverride === 'string') {
      return e.textOverride;
    }
    return app.formatHistoryItemAuto(e);
  };

  function summaryRoleCodeToIconId(code) {
    if (code === 'don') return 'icon-don';
    if (code === 'sheriff') return 'icon-sheriff';
    if (code === 'mafia') return 'icon-mafia';
    return 'icon-like';
  }

  function summaryRoleIconWrapClass(code) {
    var isMafiaSide = code === 'mafia' || code === 'don';
    if (isMafiaSide) {
      return 'flex h-9 w-9 shrink-0 items-center justify-center rounded border border-mafia-border bg-mafia-black text-mafia-gold sm:h-10 sm:w-10';
    }
    return 'flex h-9 w-9 shrink-0 items-center justify-center rounded border border-mafia-gold/40 bg-mafia-blood text-mafia-gold sm:h-10 sm:w-10';
  }

  /** Компактнее, чем summaryRoleIconWrapClass — для сетки «Подведение итогов». */
  function summaryRoleGridIconWrapClass(code) {
    var isMafiaSide = code === 'mafia' || code === 'don';
    if (isMafiaSide) {
      return 'flex h-8 w-8 shrink-0 items-center justify-center rounded border border-mafia-border bg-mafia-black text-mafia-gold sm:h-9 sm:w-9';
    }
    return 'flex h-8 w-8 shrink-0 items-center justify-center rounded border border-mafia-gold/40 bg-mafia-blood text-mafia-gold sm:h-9 sm:w-9';
  }

  var SUMMARY_TEAM_UNKNOWN_WRAP =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded border border-mafia-border/80 bg-black/25 text-mafia-gold/90 sm:h-10 sm:w-10';

  var SUMMARY_TEAM_SVG_CLASS = 'h-[1.35rem] w-[1.35rem] pointer-events-none sm:h-6 sm:w-6';

  function summaryWinningTeamIconWrapHtml(iconId) {
    return (
      '<svg class="' +
      SUMMARY_TEAM_SVG_CLASS +
      '" aria-hidden="true"><use href="#' +
      iconId +
      '"/></svg>'
    );
  }

  function renderSummaryWinningTeamRow(teamVal) {
    var row = document.getElementById('summary-winning-team-icons');
    if (!row) return;
    row.innerHTML = '';
    var opts = [
      { value: '', label: 'Не выбрано', mode: 'unknown' },
      { value: 'peaceful', label: 'Победили мирные', mode: 'peaceful' },
      { value: 'mafia', label: 'Победила мафия', mode: 'mafia' },
    ];
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var selected =
        o.value === teamVal || (o.value === '' && teamVal === '');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', selected ? 'true' : 'false');
      b.setAttribute('aria-label', o.label);
      b.dataset.summaryTeam = o.value;
      b.className =
        'flex shrink-0 cursor-pointer items-center justify-center rounded-lg border p-1 outline-none transition-[border-color,background-color,box-shadow,transform] hover:border-mafia-gold/40 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mafia-gold/45 sm:p-1.5 ' +
        (selected
          ? 'border-mafia-gold/65 bg-black/20 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.35)]'
          : 'border-mafia-border bg-mafia-coal/80');
      var wrap = document.createElement('div');
      wrap.setAttribute('aria-hidden', 'true');
      if (o.mode === 'unknown') {
        wrap.className = SUMMARY_TEAM_UNKNOWN_WRAP;
        wrap.innerHTML =
          '<span class="font-display text-xl font-bold leading-none text-mafia-gold/95 sm:text-2xl">?</span>';
      } else if (o.mode === 'peaceful') {
        wrap.className = summaryRoleIconWrapClass('peaceful');
        wrap.innerHTML = summaryWinningTeamIconWrapHtml('icon-peaceful');
      } else {
        wrap.className = summaryRoleIconWrapClass('mafia');
        wrap.innerHTML = summaryWinningTeamIconWrapHtml('icon-mafia');
      }
      b.appendChild(wrap);
      b.onclick = (function (val) {
        return function () {
          app.winningTeam = val === 'mafia' || val === 'peaceful' ? val : null;
          app.saveState();
          app.renderSummary();
        };
      })(o.value);
      row.appendChild(b);
    }
  }

  function renderModalSummaryRoleRadios(selectedCode, enabled) {
    var row = document.getElementById('modal-summary-role-icons');
    if (!row) return;
    row.innerHTML = '';
    var opts = [
      { value: 'peaceful', label: 'Мирный житель' },
      { value: 'mafia', label: 'Мафия' },
      { value: 'don', label: 'Дон' },
      { value: 'sheriff', label: 'Шериф' },
    ];
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var selected = enabled && o.value === selectedCode;
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', selected ? 'true' : 'false');
      b.setAttribute('aria-label', o.label);
      b.dataset.summaryRole = o.value;
      b.disabled = !enabled;
      b.className =
        'flex shrink-0 cursor-pointer items-center justify-center rounded-lg border p-1 outline-none transition-[border-color,background-color,box-shadow,transform] hover:border-mafia-gold/40 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mafia-gold/45 sm:p-1.5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ' +
        (selected
          ? 'border-mafia-gold/65 bg-black/20 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.35)]'
          : 'border-mafia-border bg-mafia-coal/80');
      var wrap = document.createElement('div');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.className = summaryRoleIconWrapClass(o.value);
      wrap.innerHTML = summaryWinningTeamIconWrapHtml(summaryRoleCodeToIconId(o.value));
      b.appendChild(wrap);
      b.onclick = (function (val, en) {
        return function () {
          if (!en) return;
          renderModalSummaryRoleRadios(val, en);
        };
      })(o.value, enabled);
      row.appendChild(b);
    }
  }

  function getModalSummarySelectedRoleCode() {
    var row = document.getElementById('modal-summary-role-icons');
    if (!row) return null;
    var picked = row.querySelector('[role="radio"][aria-checked="true"]');
    return picked && picked.dataset.summaryRole ? picked.dataset.summaryRole : null;
  }

  function sortedLog() {
    if (!Array.isArray(app.gameLog)) return [];
    return app.gameLog.slice().sort(function (a, b) {
      var ta = typeof a.ts === 'number' ? a.ts : 0;
      var tb = typeof b.ts === 'number' ? b.ts : 0;
      if (ta !== tb) return ta - tb;
      return 0;
    });
  }

  app.hideSummaryPlayerModal = function () {
    var m = document.getElementById('modal-summary-player');
    if (m && app.modalSetOpen) app.modalSetOpen(m, false);
  };

  app._summaryLogSortedIndex = null;

  app.hideSummaryLogModal = function () {
    app._summaryLogSortedIndex = null;
    var m = document.getElementById('modal-summary-log');
    if (m && app.modalSetOpen) app.modalSetOpen(m, false);
  };

  app.showSummaryLogModal = function (sortedIndex) {
    var log = sortedLog();
    var entry = log[sortedIndex];
    if (!entry || !app.modalSetOpen) return;
    app._summaryLogSortedIndex = sortedIndex;
    var m = document.getElementById('modal-summary-log');
    var ta = document.getElementById('modal-summary-log-text');
    if (ta) {
      var auto = app.formatHistoryItemAuto(entry);
      ta.value = typeof entry.textOverride === 'string' ? entry.textOverride : auto;
    }
    app.modalSetOpen(m, true);
  };

  app.applySummaryLogModal = function () {
    var ix = app._summaryLogSortedIndex;
    if (ix === null || ix === undefined) return;
    var log = sortedLog();
    var entry = log[ix];
    if (!entry) {
      app.hideSummaryLogModal();
      return;
    }
    var ta = document.getElementById('modal-summary-log-text');
    var val = ta ? ta.value : '';
    var auto = app.formatHistoryItemAuto(entry);
    if (val === auto) {
      delete entry.textOverride;
    } else {
      entry.textOverride = val;
    }
    app.saveState();
    app.hideSummaryLogModal();
    app.renderSummary();
  };

  app.showSummaryPlayerModal = function (playerId) {
    var m = document.getElementById('modal-summary-player');
    if (!m || !app.modalSetOpen) return;
    var p = app.players.find(function (x) {
      return x.id === playerId;
    });
    if (!p) return;
    var seatIndex = app.players.indexOf(p);
    var title = document.getElementById('modal-summary-player-title');
    var nickInp = document.getElementById('modal-summary-nick');
    var bonusInp = document.getElementById('modal-summary-bonus');
    var noteTa = document.getElementById('modal-summary-bonus-note');
    var hint = document.getElementById('modal-summary-locked-hint');
    var unlocked = app.summaryWinnerChosen();
    if (title) title.textContent = 'Игрок №' + playerId;
    if (nickInp) nickInp.value = p.nick != null ? String(p.nick) : '';
    m.dataset.playerId = String(playerId);
    var bk = String(playerId);
    if (!app.bonusPointsByPlayerId || typeof app.bonusPointsByPlayerId !== 'object') app.bonusPointsByPlayerId = {};
    if (!app.bonusNoteByPlayerId || typeof app.bonusNoteByPlayerId !== 'object') app.bonusNoteByPlayerId = {};
    if (!app.summaryRoleByPlayerId || typeof app.summaryRoleByPlayerId !== 'object') app.summaryRoleByPlayerId = {};
    if (!app.bestMoveByPlayerId || typeof app.bestMoveByPlayerId !== 'object') app.bestMoveByPlayerId = {};
    var bmWrap = document.getElementById('modal-summary-bestmove-wrap');
    var bm1 = document.getElementById('modal-summary-bestmove-1');
    var bm2 = document.getElementById('modal-summary-bestmove-2');
    var bm3 = document.getElementById('modal-summary-bestmove-3');
    var showBm = app.showSummaryBestMoveField(playerId);
    if (bmWrap) bmWrap.style.display = showBm ? 'flex' : 'none';
    var triple = app.parseBestMoveTriple(app.bestMoveByPlayerId[bk]);
    if (bm1) bm1.value = triple[0];
    if (bm2) bm2.value = triple[1];
    if (bm3) bm3.value = triple[2];
    if (bm1) bm1.disabled = !showBm;
    if (bm2) bm2.disabled = !showBm;
    if (bm3) bm3.disabled = !showBm;
    var braw = app.bonusPointsByPlayerId[bk];
    var bnum = parseBonusFloat(braw);
    if (bonusInp) {
      bonusInp.value = bnum % 1 === 0 ? String(Math.round(bnum)) : String(bnum).replace('.', ',');
    }
    var deltaBtns = m.querySelectorAll('[data-action="summary-bonus-delta"]');
    for (var db = 0; db < deltaBtns.length; db++) {
      deltaBtns[db].disabled = !unlocked;
    }
    if (noteTa) noteTa.value = app.bonusNoteByPlayerId[bk] != null ? String(app.bonusNoteByPlayerId[bk]) : '';
    var bonusSection = document.getElementById('modal-summary-bonus-section');
    var noteSection = document.getElementById('modal-summary-bonus-note-section');
    if (bonusSection) bonusSection.style.display = unlocked ? '' : 'none';
    if (noteSection) noteSection.style.display = unlocked ? '' : 'none';
    var roleSection = document.getElementById('modal-summary-role-section');
    if (roleSection) roleSection.style.display = unlocked ? '' : 'none';
    if (unlocked) {
      renderModalSummaryRoleRadios(app.getEffectiveSummaryRoleCode(playerId, seatIndex), true);
    } else {
      var roleRow = document.getElementById('modal-summary-role-icons');
      if (roleRow) roleRow.innerHTML = '';
    }
    if (bonusInp) bonusInp.disabled = !unlocked;
    if (noteTa) noteTa.disabled = !unlocked;
    if (hint) hint.style.display = unlocked ? 'none' : '';
    app.modalSetOpen(m, true);
  };

  app.applySummaryPlayerModal = function () {
    var m = document.getElementById('modal-summary-player');
    if (!m) return;
    var pid = parseInt(m.dataset.playerId, 10);
    if (isNaN(pid)) return;
    var pl = app.players.find(function (x) {
      return x.id === pid;
    });
    if (!pl) return;
    var nickInp = document.getElementById('modal-summary-nick');
    if (nickInp) pl.nick = nickInp.value.slice(0, 32);
    var unlocked = app.summaryWinnerChosen();
    var showBm = app.showSummaryBestMoveField(pid);
    var bm1 = document.getElementById('modal-summary-bestmove-1');
    var bm2 = document.getElementById('modal-summary-bestmove-2');
    var bm3 = document.getElementById('modal-summary-bestmove-3');
    var tripleStr =
      showBm && bm1 && bm2 && bm3 ? app.serializeBestMoveTriple(bm1.value, bm2.value, bm3.value) : '';
    if (!app.bestMoveByPlayerId || typeof app.bestMoveByPlayerId !== 'object') app.bestMoveByPlayerId = {};
    if (!unlocked) {
      if (!showBm) {
        app.saveState();
        app.hideSummaryPlayerModal();
        app.renderSummary();
        return;
      }
      if (bm1 && bm2 && bm3) {
        app.bestMoveByPlayerId[String(pid)] = tripleStr;
      }
      app.saveState();
      app.hideSummaryPlayerModal();
      app.renderSummary();
      return;
    }
    if (showBm && bm1 && bm2 && bm3) {
      app.bestMoveByPlayerId[String(pid)] = tripleStr;
    }
    var bonusInp = document.getElementById('modal-summary-bonus');
    var noteTa = document.getElementById('modal-summary-bonus-note');
    var v = bonusInp ? parseBonusFloat(bonusInp.value) : 0;
    if (!app.bonusPointsByPlayerId || typeof app.bonusPointsByPlayerId !== 'object') app.bonusPointsByPlayerId = {};
    if (!app.bonusNoteByPlayerId || typeof app.bonusNoteByPlayerId !== 'object') app.bonusNoteByPlayerId = {};
    if (!app.summaryRoleByPlayerId || typeof app.summaryRoleByPlayerId !== 'object') app.summaryRoleByPlayerId = {};
    app.bonusPointsByPlayerId[String(pid)] = v;
    app.bonusNoteByPlayerId[String(pid)] = noteTa ? noteTa.value : '';
    var roleCode = getModalSummarySelectedRoleCode();
    if (roleCode) {
      app.summaryRoleByPlayerId[String(pid)] = roleCode;
    }
    app.saveState();
    app.hideSummaryPlayerModal();
    app.renderSummary();
  };

  app.renderSummary = function () {
    if (!Array.isArray(app.gameLog)) app.gameLog = [];
    if (!app.bonusPointsByPlayerId || typeof app.bonusPointsByPlayerId !== 'object') app.bonusPointsByPlayerId = {};
    if (!app.bonusNoteByPlayerId || typeof app.bonusNoteByPlayerId !== 'object') app.bonusNoteByPlayerId = {};
    if (!app.summaryRoleByPlayerId || typeof app.summaryRoleByPlayerId !== 'object') app.summaryRoleByPlayerId = {};
    if (!app.bestMoveByPlayerId || typeof app.bestMoveByPlayerId !== 'object') app.bestMoveByPlayerId = {};
    if (app.summaryHostName === undefined || app.summaryHostName === null) app.summaryHostName = '';

    var unlocked = app.summaryWinnerChosen();

    var hostInp = document.getElementById('summary-host-name');
    if (hostInp) {
      var hostStr = String(app.summaryHostName);
      if (document.activeElement !== hostInp) hostInp.value = hostStr;
      hostInp.oninput = function () {
        app.summaryHostName = this.value;
        app.saveState();
      };
    }

    var hist = document.getElementById('summary-history');
    var histEmpty = document.getElementById('summary-history-empty');
    var log = sortedLog();
    if (hist && histEmpty) {
      hist.innerHTML = '';
      var visibleLog = [];
      for (var lix = 0; lix < log.length; lix++) {
        var dt = app.formatHistoryItem(log[lix]);
        if (dt.trim()) visibleLog.push({ entry: log[lix], sortedIndex: lix });
      }
      if (!visibleLog.length) {
        histEmpty.style.display = '';
        hist.style.display = 'none';
      } else {
        histEmpty.style.display = 'none';
        hist.style.display = '';
        for (var vi = 0; vi < visibleLog.length; vi++) {
          var item = visibleLog[vi];
          var li = document.createElement('li');
          li.className = 'pl-0.5';
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-action', 'summary-log-open');
          btn.setAttribute('data-summary-log-index', String(item.sortedIndex));
          var displayText = app.formatHistoryItem(item.entry);
          btn.textContent = displayText;
          btn.title = displayText;
          btn.className =
            'line-clamp-2 w-full max-w-full cursor-pointer rounded border border-transparent bg-transparent py-0.5 text-left text-sm leading-snug text-mafia-cream/85 transition-colors hover:border-mafia-border/40 hover:bg-black/15 hover:text-mafia-cream';
          li.appendChild(btn);
          hist.appendChild(li);
        }
      }
    }

    var grid = document.getElementById('summary-roles-grid');
    if (grid) {
      grid.innerHTML = '';
      var n = app.players.length;
      var rowCount = Math.max(1, Math.ceil(n / 2));
      grid.className =
        'grid h-full min-h-0 min-w-0 grid-flow-col grid-cols-2 gap-1.5 overflow-hidden';
      grid.style.gridTemplateRows = 'repeat(' + rowCount + ', minmax(0, 1fr))';

      for (var p = 0; p < n; p++) {
        var sid = app.players[p].id;
        var pl = app.players[p];
        var nickTrim = pl.nick != null ? String(pl.nick).trim() : '';
        var bk = String(sid);
        var braw = app.bonusPointsByPlayerId[bk];
        var bonusText = app.formatBonusForDisplay(braw);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-action', 'summary-player-open');
        btn.setAttribute('data-player-id', String(sid));
        btn.className =
          'player-cell flex h-full min-h-0 min-w-0 w-full cursor-pointer flex-col justify-center rounded-lg border border-mafia-border bg-mafia-coal px-1.5 pt-1.5 pb-0.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-colors transition-transform hover:border-mafia-gold/35 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mafia-gold/45 sm:px-2 sm:pt-2 sm:pb-1';
        btn.setAttribute(
          'aria-label',
          nickTrim ? 'Игрок №' + sid + ', псевдоним ' + nickTrim : 'Игрок №' + sid
        );

        var topRow = document.createElement('div');
        topRow.className =
          'player-slot__row grid w-full min-h-0 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1';

        var iconWrap = document.createElement('div');
        iconWrap.setAttribute('aria-hidden', 'true');
        if (!unlocked) {
          iconWrap.className =
            'flex h-8 w-8 shrink-0 items-center justify-center rounded border border-mafia-border/80 bg-black/25 text-mafia-gold/90 sm:h-9 sm:w-9';
          iconWrap.innerHTML =
            '<span class="font-display text-lg font-bold leading-none text-mafia-gold/95 sm:text-xl">?</span>';
        } else {
          var code = app.getEffectiveSummaryRoleCode(sid, p);
          var iconId = summaryRoleCodeToIconId(code);
          iconWrap.className = summaryRoleGridIconWrapClass(code);
          iconWrap.innerHTML =
            '<svg class="h-5 w-5 pointer-events-none sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden="true"><use href="#' +
            iconId +
            '"/></svg>';
        }

        var leftCol = document.createElement('div');
        leftCol.className = 'flex min-w-0 justify-start';
        leftCol.appendChild(iconWrap);

        var numSpan = document.createElement('span');
        numSpan.className =
          'font-display text-2xl font-bold leading-none tracking-wide text-mafia-gold tabular-nums sm:text-3xl';
        numSpan.textContent = '№' + sid;

        var bonusInner = document.createElement('span');
        bonusInner.className =
          'font-display text-xs font-semibold leading-none tabular-nums sm:text-sm text-mafia-cream/95';
        bonusInner.textContent = 'Д: ' + bonusText;

        var pillWrap = document.createElement('div');
        pillWrap.className =
          'player-slot__foul-pill flex shrink-0 items-center justify-center rounded border border-mafia-border/35 bg-black/25 px-1.5 py-0.5 sm:px-2 sm:py-1';
        pillWrap.appendChild(bonusInner);

        var rightCol = document.createElement('div');
        rightCol.className = 'flex min-w-0 justify-end';
        rightCol.appendChild(pillWrap);

        topRow.appendChild(leftCol);
        topRow.appendChild(numSpan);
        topRow.appendChild(rightCol);

        var nickRowClass =
          'player-slot-nick mt-0.5 mb-1 min-h-[1.375rem] w-full min-w-0 shrink-0 truncate rounded border border-mafia-border/50 bg-black/30 px-1.5 py-0.5 text-center font-sans text-xs leading-snug sm:min-h-[1.5rem] sm:px-2 sm:py-1 sm:text-sm ' +
          (nickTrim ? 'text-mafia-cream/95' : 'text-mafia-cream/30');
        var nickRow = document.createElement('div');
        nickRow.className = nickRowClass;
        nickRow.setAttribute('role', 'presentation');
        nickRow.innerHTML = nickTrim ? escapeHtml(nickTrim) : 'Псевдоним';

        btn.appendChild(topRow);
        btn.appendChild(nickRow);
        grid.appendChild(btn);
      }
    }

    var teamVal = app.winningTeam === 'mafia' || app.winningTeam === 'peaceful' ? app.winningTeam : '';
    renderSummaryWinningTeamRow(teamVal);
  };
})(window.MafiaApp);
