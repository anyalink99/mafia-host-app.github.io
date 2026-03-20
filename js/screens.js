(function (app) {
  app.showScreen = function (screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
    if (screenId === 'menu-screen' && app.updateResetButtonVisibility) app.updateResetButtonVisibility();
    if (screenId === 'setup-screen') app.initCards(app.revealedIndices.length > 0);
    if (screenId === 'game-screen') {
      app.renderPlayers();
      const timerEl = document.getElementById('timer');
      if (timerEl) timerEl.textContent = app.timeLeft;
      app.updateVotingUI();
      if (app.refitPlayerFonts) setTimeout(app.refitPlayerFonts, 100);
    }
    if (screenId === 'settings-screen' && app.renderMusicSettings) app.renderMusicSettings();
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
