(function (app) {
  function parseBonusFloat(raw) {
    if (raw === undefined || raw === null || raw === '') return 0;
    var v = parseFloat(String(raw).replace(',', '.'));
    if (isNaN(v)) return 0;
    return Math.round(v * 10) / 10;
  }

  function roleLabelRu(code) {
    if (code === 'don') return 'Дон';
    if (code === 'sheriff') return 'Шериф';
    if (code === 'mafia') return 'Мафия';
    return 'Мирный';
  }

  function formatCompactVotes(candidateIds, votes) {
    if (!candidateIds || !candidateIds.length) return '';
    var parts = [];
    for (var i = 0; i < candidateIds.length; i++) {
      parts.push('№' + candidateIds[i] + '-' + (votes && votes[i] != null ? votes[i] : '—'));
    }
    return parts.join(', ');
  }

  function voteClusterSegments(cluster) {
    var segs = [];
    for (var i = 0; i < cluster.length; i++) {
      var ev = cluster[i];
      if (ev.type === 'vote_tie') {
        var st = formatCompactVotes(ev.candidateIds, ev.votes);
        if (st) segs.push(st);
        continue;
      }
      if (ev.type === 'vote_hang' && !ev.viaRaiseAll) {
        var sh = formatCompactVotes(ev.candidateIds, ev.votes);
        if (sh) segs.push(sh);
      }
    }
    return segs;
  }

  function voteClusterOutcome(cluster) {
    var last = cluster[cluster.length - 1];
    if (!last) return 'оставили';
    if (last.type === 'vote_no_elimination') return 'оставили';
    if (last.type === 'vote_hang') {
      var ids = last.eliminatedIds || [];
      if (ids.length === 1) return 'казнен ' + ids[0];
      if (ids.length > 1) return 'казнены ' + ids.join(', ');
    }
    return 'оставили';
  }

  function buildVoteBlockLine(round, roundNum) {
    if (round.kind === 'skip') {
      if (round.skipKey === 'lead' && app.getSummarySyntheticFirstDayDisplayText) {
        return app.getSummarySyntheticFirstDayDisplayText();
      }
      if (round.skipKey && round.skipKey !== 'lead' && app.summarySkipLineOverrides) {
        var ovr = app.summarySkipLineOverrides[round.skipKey];
        if (ovr != null && String(ovr).trim() !== '') return String(ovr);
      }
      if (roundNum === 1) {
        return (
          '#1 - никто не был выставлен или был выставлен один игрок, голосование пропущено'
        );
      }
      return '#' + roundNum + ': никто не был выставлен, голосование пропущено';
    }
    if (round.kind === 'single') {
      var ev = round.events[0];
      var pid = ev.playerId;
      var pool = typeof ev.votePoolTotal === 'number' ? ev.votePoolTotal : '';
      return '#' + roundNum + ': №' + pid + '-' + pool + '; казнен ' + pid;
    }
    var cluster = round.events;
    var segs = voteClusterSegments(cluster);
    var out = voteClusterOutcome(cluster);
    var body = segs.length ? segs.join('; ') + '; ' + out : out;
    return '#' + roundNum + ': ' + body;
  }

  function didPlayerWin(playerId, seatIndex) {
    var wt = app.winningTeam;
    if (wt !== 'mafia' && wt !== 'peaceful') return false;
    var code = app.getEffectiveSummaryRoleCode(playerId, seatIndex);
    if (wt === 'mafia') return code === 'mafia' || code === 'don';
    return code === 'peaceful' || code === 'sheriff';
  }

  function formatBonusSigned(raw) {
    var v = parseBonusFloat(raw);
    if (v === 0) return '';
    var s = app.formatBonusForDisplay ? app.formatBonusForDisplay(raw) : String(v);
    if (v > 0) return '+' + s;
    return s;
  }

  function buildHeaderText() {
    var lines = [];
    var host = app.summaryHostName != null ? String(app.summaryHostName).trim() : '';
    lines.push('Ведущий: ' + (host || '—'));

    var n = app.players.length;
    for (var p = 0; p < n; p++) {
      var pl = app.players[p];
      var sid = pl.id;
      var seatIndex = p;
      var nick = pl.nick != null ? String(pl.nick).trim() : '';
      var parts = [];
      if (nick) parts.push(nick);
      var bk = String(sid);
      var bm = app.bestMoveByPlayerId && app.bestMoveByPlayerId[bk];
      if (app.isBestMoveTripleComplete && app.isBestMoveTripleComplete(bm)) {
        var tr = app.parseBestMoveTriple(bm);
        parts.push('ПУ: ' + tr[0] + ', ' + tr[1] + ', ' + tr[2]);
      }
      var bonusRaw = app.bonusPointsByPlayerId && app.bonusPointsByPlayerId[bk];
      var bnum = parseBonusFloat(bonusRaw);
      if (bnum !== 0) {
        parts.push(formatBonusSigned(bonusRaw));
      }
      var note = app.bonusNoteByPlayerId && app.bonusNoteByPlayerId[bk];
      if (note != null && String(note).trim()) {
        parts.push(String(note).trim());
      }
      var rest = parts.length ? parts.join(', ') : '—';
      lines.push('Игрок ' + sid + ': ' + rest);
    }

    var mafiaNums = [];
    var donNum = '';
    var sheriffNum = '';
    for (var q = 0; q < n; q++) {
      var pid = app.players[q].id;
      var code = app.getEffectiveSummaryRoleCode(pid, q);
      if (code === 'mafia') mafiaNums.push(String(pid));
      else if (code === 'don') donNum = String(pid);
      else if (code === 'sheriff') sheriffNum = String(pid);
    }
    lines.push('Мафия: ' + (mafiaNums.length ? mafiaNums.join(', ') : '—'));
    lines.push('Дон: ' + (donNum || '—'));
    lines.push('Шериф: ' + (sheriffNum || '—'));

    var winLine = '—';
    if (app.winningTeam === 'mafia') winLine = 'мафия';
    else if (app.winningTeam === 'peaceful') winLine = 'мирные';
    lines.push('Победа: ' + winLine);

    return lines.join('\n');
  }

  function buildFullExportText() {
    var header = buildHeaderText();
    var rounds = app.inferRoundsForExport(app.gameLog);
    var voteLines = [];
    for (var r = 0; r < rounds.length; r++) {
      voteLines.push(buildVoteBlockLine(rounds[r], r + 1));
    }
    if (!voteLines.length) return header;
    return header + '\n\n' + voteLines.join('\n');
  }

  function csvEscape(cell) {
    var s = cell === undefined || cell === null ? '' : String(cell);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function splitBonusForCsv(raw) {
    var v = parseBonusFloat(raw);
    if (v === 0) return { plus: '', minus: '' };
    if (v > 0) return { plus: app.formatBonusForDisplay(raw), minus: '' };
    return { plus: '', minus: app.formatBonusForDisplay(Math.abs(v)) };
  }

  function buildCsv() {
    var rows = [];
    var host = app.summaryHostName != null ? String(app.summaryHostName).trim() : '';
    rows.push([csvEscape('Ведущий'), csvEscape(host || '—')]);
    var winCell = '—';
    if (app.winningTeam === 'mafia') winCell = 'Мафия';
    else if (app.winningTeam === 'peaceful') winCell = 'Мирные';
    rows.push([csvEscape('Победа'), csvEscape(winCell)]);
    rows.push([]);
    rows.push(['#', 'Игрок', 'Роль', 'ПУ', '+', '-', '∑'].map(csvEscape));

    var n = app.players.length;
    for (var p = 0; p < n; p++) {
      var pl = app.players[p];
      var sid = pl.id;
      var bk = String(sid);
      var nick = pl.nick != null ? String(pl.nick).trim() : '';
      var code = app.getEffectiveSummaryRoleCode(sid, p);
      var roleRu = roleLabelRu(code);
      var bm = app.bestMoveByPlayerId && app.bestMoveByPlayerId[bk];
      var pu = '';
      if (app.isBestMoveTripleComplete && app.isBestMoveTripleComplete(bm)) {
        var tr = app.parseBestMoveTriple(bm);
        pu = tr[0] + ', ' + tr[1] + ', ' + tr[2];
      }
      var braw = app.bonusPointsByPlayerId && app.bonusPointsByPlayerId[bk];
      var split = splitBonusForCsv(braw);
      var bonusVal = parseBonusFloat(braw);
      var sum = bonusVal + (didPlayerWin(sid, p) ? 1 : 0);
      var sumStr = app.formatBonusForDisplay(String(sum));
      rows.push([
        csvEscape(String(sid)),
        csvEscape(nick || '—'),
        csvEscape(roleRu),
        csvEscape(pu),
        csvEscape(split.plus),
        csvEscape(split.minus),
        csvEscape(sumStr),
      ]);
    }

    rows.push([]);
    var rounds = app.inferRoundsForExport(app.gameLog);
    for (var r = 0; r < rounds.length; r++) {
      var rn = r + 1;
      var round = rounds[r];
      rows.push([csvEscape('Голосование #' + rn)]);
      if (round.kind === 'skip') {
        rows.push([csvEscape('—')]);
        rows.push([csvEscape('—')]);
        rows.push([csvEscape('—')]);
        rows.push([csvEscape(buildVoteBlockLine(round, rn))]);
        continue;
      }
      if (round.kind === 'single') {
        var sev = round.events[0];
        var spid = sev.playerId;
        var pool = typeof sev.votePoolTotal === 'number' ? sev.votePoolTotal : '';
        rows.push([csvEscape(String(spid))]);
        rows.push([csvEscape(String(pool))]);
        rows.push([csvEscape('')]);
        rows.push([
          csvEscape('казнен ' + spid + '; Единственный выставленный: yes'),
        ]);
        continue;
      }
      var cluster = round.events;
      if (cluster.length === 1 && cluster[0].type === 'vote_no_elimination') {
        var neOnly = cluster[0];
        rows.push([csvEscape('—')]);
        rows.push([
          csvEscape(
            typeof neOnly.votesCast === 'number' && typeof neOnly.poolTotal === 'number'
              ? neOnly.votesCast + '/' + neOnly.poolTotal
              : '—'
          ),
        ]);
        rows.push([csvEscape('')]);
        rows.push([csvEscape('оставили')]);
        continue;
      }
      var firstTie = null;
      var secondTie = null;
      var lastHang = null;
      for (var i = 0; i < cluster.length; i++) {
        if (cluster[i].type === 'vote_tie') {
          if (!firstTie) firstTie = cluster[i];
          else if (!secondTie) secondTie = cluster[i];
        }
        if (cluster[i].type === 'vote_hang') lastHang = cluster[i];
      }
      var nom = firstTie
        ? (firstTie.candidateIds || []).join(', ')
        : lastHang
          ? (lastHang.candidateIds || []).join(', ')
          : '';
      rows.push([csvEscape(nom || '—')]);

      var v1 = firstTie
        ? formatCompactVotes(firstTie.candidateIds, firstTie.votes)
        : lastHang
          ? formatCompactVotes(lastHang.candidateIds, lastHang.votes)
          : '';
      rows.push([csvEscape(v1 || '—')]);

      var v2 = '';
      if (secondTie) {
        v2 = formatCompactVotes(secondTie.candidateIds, secondTie.votes);
      } else if (firstTie && lastHang && firstTie !== lastHang && !lastHang.viaRaiseAll) {
        v2 = formatCompactVotes(lastHang.candidateIds, lastHang.votes);
      } else if (cluster.length && cluster[cluster.length - 1].type === 'vote_no_elimination') {
        var ne = cluster[cluster.length - 1];
        if (firstTie && !lastHang) {
          v2 =
            typeof ne.votesCast === 'number' && typeof ne.poolTotal === 'number'
              ? ne.votesCast + '/' + ne.poolTotal
              : '';
        }
      }
      rows.push([csvEscape(v2)]);

      rows.push([csvEscape(voteClusterOutcome(cluster))]);
    }

    return rows.map(function (row) {
      return row.join(',');
    }).join('\r\n');
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        copyTextFallback(text);
      });
    }
    copyTextFallback(text);
    return Promise.resolve();
  }

  function copyTextFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-2000px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(ta);
  }

  app.buildGameExportText = function () {
    return buildFullExportText();
  };

  app.buildGameExportCsv = function () {
    return '\ufeff' + buildCsv();
  };

  app.copyGameExportToClipboard = function () {
    return copyTextToClipboard(buildFullExportText()).then(function () {
      if (app.showToast) app.showToast('Скопировано в буфер обмена');
    });
  };

  app.downloadGameExportCsv = function () {
    var csv = app.buildGameExportCsv();
    var now = new Date();
    var pad = function (x) {
      return x < 10 ? '0' + x : String(x);
    };
    var fname =
      'mafia-export-' +
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      '-' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds()) +
      '.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };
})(window.MafiaApp);
