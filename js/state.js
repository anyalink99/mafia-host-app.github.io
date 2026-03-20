window.MafiaApp = window.MafiaApp || {};

(function (app) {
  app.STORAGE_KEY = 'mafia_host_state';

  app.roles = ['Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Шериф', 'Мафия', 'Мафия', 'Дон'];
  app.players = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, fouls: 0 }));
  app.votingOrder = [];
  app.revealedIndices = [];
  app.timerInterval = null;
  app.timeLeft = 60;
  app.canCloseRole = false;

  app.saveState = function () {
    try {
      const payload = {
        roles: app.roles,
        players: app.players,
        votingOrder: app.votingOrder,
        revealedIndices: app.revealedIndices,
        timeLeft: app.timeLeft,
      };
      if (typeof app.fontBaseSize === 'number') payload.fontBaseSize = app.fontBaseSize;
      payload.btnFontVersion = 2;
      if (typeof app.timerDigitsSize === 'number') payload.timerDigitsSize = app.timerDigitsSize;
      if (typeof app.timerButtonsSize === 'number') payload.timerButtonsSize = app.timerButtonsSize;
      localStorage.setItem(app.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  };

  app.loadState = function () {
    try {
      const raw = localStorage.getItem(app.STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.roles && Array.isArray(data.roles)) app.roles = data.roles;
      if (data.players && Array.isArray(data.players)) app.players = data.players;
      if (data.votingOrder && Array.isArray(data.votingOrder)) app.votingOrder = data.votingOrder;
      if (data.revealedIndices && Array.isArray(data.revealedIndices)) app.revealedIndices = data.revealedIndices;
      if (typeof data.timeLeft === 'number') app.timeLeft = data.timeLeft;
      if (typeof data.fontBaseSize === 'number') {
        var maxFit = typeof app.PLAYER_BTN_FIT_MAX_PX === 'number' ? app.PLAYER_BTN_FIT_MAX_PX : 29;
        var minFit = typeof app.PLAYER_BTN_FIT_MIN_PX === 'number' ? app.PLAYER_BTN_FIT_MIN_PX : 10;
        if (!data.btnFontVersion || data.btnFontVersion < 2) {
          app.fontBaseSize = Math.min(maxFit, Math.max(minFit, Math.round(data.fontBaseSize * 1.2)));
        } else {
          app.fontBaseSize = data.fontBaseSize;
        }
      }
      if (typeof data.timerDigitsSize === 'number') {
        var minDig = typeof app.MIN_TIMER_DIGITS_PX === 'number' ? app.MIN_TIMER_DIGITS_PX : 44;
        app.timerDigitsSize = Math.max(data.timerDigitsSize, minDig);
      }
      if (typeof data.timerButtonsSize === 'number') {
        var minBtn = typeof app.MIN_TIMER_BUTTONS_PX === 'number' ? app.MIN_TIMER_BUTTONS_PX : 14;
        app.timerButtonsSize = Math.max(data.timerButtonsSize, minBtn);
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  app.fullReset = function () {
    try {
      localStorage.removeItem(app.STORAGE_KEY);
    } catch (e) {}
    app.roles = ['Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Шериф', 'Мафия', 'Мафия', 'Дон'];
    app.players = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, fouls: 0 }));
    app.votingOrder = [];
    app.revealedIndices = [];
    app.timeLeft = 60;
    if (app.timerInterval) clearInterval(app.timerInterval);
    app.timerInterval = null;
    app.showScreen('menu-screen');
    app.updateResetButtonVisibility();
  };

  app.hasSavedState = function () {
    try {
      return localStorage.getItem(app.STORAGE_KEY) !== null;
    } catch (e) {
      return false;
    }
  };

  app.updateResetButtonVisibility = function () {
    const btn = document.getElementById('btn-reset');
    if (!btn) return;
    const visible = app.hasSavedState();
    btn.style.visibility = visible ? 'visible' : 'hidden';
    btn.style.opacity = visible ? '1' : '0';
    btn.style.pointerEvents = visible ? 'auto' : 'none';
  };
})(window.MafiaApp);
