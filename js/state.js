window.MafiaApp = window.MafiaApp || {};

(function (app) {
  app.STORAGE_KEY = 'mafia_host_state';

  app.roles = ['Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Шериф', 'Мафия', 'Мафия', 'Дон'];
  app.players = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    fouls: 0,
    outReason: null,
  }));
  app.votingOrder = [];
  app.voteSession = null;
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
        voteSession: app.voteSession,
        revealedIndices: app.revealedIndices,
        timeLeft: app.timeLeft,
      };
      localStorage.setItem(app.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  };

  app.loadState = function () {
    try {
      const raw = localStorage.getItem(app.STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.roles && Array.isArray(data.roles)) app.roles = data.roles;
      if (data.players && Array.isArray(data.players)) {
        app.players = data.players;
        for (var pi = 0; pi < app.players.length; pi++) {
          if (!Object.prototype.hasOwnProperty.call(app.players[pi], 'outReason')) {
            app.players[pi].outReason = null;
          }
          if (app.players[pi].outReason === 'removed') {
            app.players[pi].outReason = 'disqual';
          }
        }
      }
      if (data.votingOrder && Array.isArray(data.votingOrder)) {
        app.votingOrder = data.votingOrder;
        app.votingOrder = app.votingOrder.filter(function (vid) {
          var pl = app.players.find(function (x) {
            return x.id === vid;
          });
          return pl && !pl.outReason;
        });
      }
      if (data.voteSession && typeof data.voteSession === 'object') {
        app.voteSession = data.voteSession;
        var vs = app.voteSession;
        if (
          vs &&
          vs.phase === 'counting' &&
          vs.tieRevote &&
          Array.isArray(vs.candidateIds) &&
          vs.candidateIds.length
        ) {
          app.votingOrder = vs.candidateIds.slice();
        }
      }
      if (data.revealedIndices && Array.isArray(data.revealedIndices)) app.revealedIndices = data.revealedIndices;
      if (typeof data.timeLeft === 'number') app.timeLeft = data.timeLeft;
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
    app.players = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      fouls: 0,
      outReason: null,
    }));
    app.votingOrder = [];
    app.voteSession = null;
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
