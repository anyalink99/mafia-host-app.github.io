(function (app) {
  /** База 200ms / 1.7 ≈ 118ms — синхронно с .modal-overlay в styles.css */
  var MODAL_MS = 118;

  /** Плавное открытие/закрытие модалок (класс .modal-overlay + data-open на корне). */
  function blurFocusInside(el) {
    var ae = document.activeElement;
    if (ae && el.contains(ae) && typeof ae.blur === 'function') ae.blur();
  }

  app.modalSetOpen = function (el, open) {
    if (!el) return;
    if (open) {
      /* Сбрасываем отложенное закрытие: иначе timeout/transitionend от прошлого hide закрывают уже открытую модалку */
      el._modalGen = (el._modalGen || 0) + 1;
      if (el._modalTransEnd) {
        el.removeEventListener('transitionend', el._modalTransEnd);
        el._modalTransEnd = null;
      }
      if (el._modalCloseTimer) {
        clearTimeout(el._modalCloseTimer);
        el._modalCloseTimer = null;
      }
      el.classList.remove('hidden');
      el.setAttribute('aria-hidden', 'false');
      void el.offsetWidth;
      /* data-open сразу после reflow: иначе hide до rAF попадает в ветку «без data-open» и мгновенно ставит hidden */
      el.setAttribute('data-open', '');
    } else {
      if (!el.hasAttribute('data-open') && el.classList.contains('hidden')) return;
      blurFocusInside(el);
      if (!el.hasAttribute('data-open')) {
        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');
        return;
      }
      el._modalGen = (el._modalGen || 0) + 1;
      var closeGen = el._modalGen;
      el.removeAttribute('data-open');
      var done = function (ev) {
        if (el._modalGen !== closeGen) return;
        if (ev.target !== el || ev.propertyName !== 'opacity') return;
        if (el.hasAttribute('data-open')) return;
        el.removeEventListener('transitionend', done);
        if (el._modalTransEnd === done) el._modalTransEnd = null;
        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');
      };
      el._modalTransEnd = done;
      el.addEventListener('transitionend', done);
      if (el._modalCloseTimer) clearTimeout(el._modalCloseTimer);
      el._modalCloseTimer = setTimeout(function () {
        el._modalCloseTimer = null;
        if (el._modalGen !== closeGen) return;
        if (el.hasAttribute('data-open')) return;
        el.removeEventListener('transitionend', done);
        if (el._modalTransEnd === done) el._modalTransEnd = null;
        if (!el.classList.contains('hidden')) {
          el.classList.add('hidden');
          el.setAttribute('aria-hidden', 'true');
        }
      }, MODAL_MS + 40);
    }
  };

  app.showScreen = function (screenId) {
    if (screenId !== 'vote-screen' && app.hideVoteCountModal) app.hideVoteCountModal();
    if (screenId !== 'game-screen' && app.hidePlayerActionsModal) app.hidePlayerActionsModal();
    if (screenId !== 'summary-screen' && app.hideSummaryPlayerModal) app.hideSummaryPlayerModal();
    if (screenId !== 'summary-screen' && app.hideSummaryLogModal) app.hideSummaryLogModal();
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
    /* Иначе фокус остаётся на «Голосование»/«Переголосование» (скрытый game-screen) — Chrome ломает aria-hidden и возможны ложные активации */
    if (screenId === 'vote-screen') {
      var gs = document.getElementById('game-screen');
      var ae = document.activeElement;
      if (ae && gs && gs.contains(ae) && typeof ae.blur === 'function') ae.blur();
    }
    if (screenId === 'menu-screen' && app.updateResetButtonVisibility) app.updateResetButtonVisibility();
    if (screenId === 'setup-screen') app.initCards(app.revealedIndices.length > 0);
    if (screenId === 'game-screen') {
      app.renderPlayers();
      const timerEl = document.getElementById('timer');
      if (timerEl) timerEl.textContent = app.timeLeft;
      if (app.syncTimerAppearance) app.syncTimerAppearance();
      app.updateVotingUI();
    }
    if (screenId === 'vote-screen' && app.prepareVoteScreen) app.prepareVoteScreen();
    if (screenId === 'vote-screen' && app.renderVoteScreen) app.renderVoteScreen();
    if (screenId === 'summary-screen' && app.renderSummary) app.renderSummary();
    if (screenId === 'settings-screen' && app.renderMusicSettings) app.renderMusicSettings();
    if (screenId === 'summary-screen' && app.renderSummary) app.renderSummary();
  };

  app.initGameFromMenu = function () {
    app.renderPlayers();
    app.resetTimer(app.timeLeft);
    app.updateVotingUI();
  };

  app.getAvailableCount = function () {
    return app.roles.length;
  };
})(window.MafiaApp);
