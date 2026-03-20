(function (app) {
  app.bindClicks = function () {
    document.body.addEventListener('click', function (e) {
      let t = e.target.closest('[data-action="full-reset"]');
      if (t) {
        e.preventDefault();
        app.fullReset();
        return;
      }
      t = e.target.closest('[data-goto]');
      if (t) {
        e.preventDefault();
        const id = t.getAttribute('data-goto');
        if (t.getAttribute('data-init') === 'game') app.initGameFromMenu();
        app.showScreen(id);
        return;
      }
      t = e.target.closest('[data-close="role"]');
      if (t && document.getElementById('role-screen').classList.contains('active')) {
        e.preventDefault();
        app.closeRole();
        return;
      }
      t = e.target.closest('.card-flip');
      if (t && t.id && t.id.indexOf('card-') === 0) {
        e.preventDefault();
        const i = parseInt(t.id.replace('card-', ''), 10);
        if (!isNaN(i)) app.showRole(i);
        return;
      }
      t = e.target.closest('[data-action]');
      if (t) {
        const action = t.getAttribute('data-action');
        e.preventDefault();
        if (action === 'toggle-timer') app.toggleTimer();
        else if (action === 'toggle-music') app.musicToggleMainButton();
        else if (action === 'music-pick-cancel') app.hideMusicSlotModal();
        else if (action === 'music-pick-slot') {
          const slot = t.getAttribute('data-slot');
          if (slot) app.musicStartSlot(slot);
        } else if (action === 'music-empty-cancel') app.hideMusicEmptyModal();
        else if (action === 'music-add-slot') {
          const slot = t.getAttribute('data-slot');
          const inp = document.getElementById(slot === '2' ? 'music-files-slot-2' : 'music-files-slot-1');
          if (inp) inp.click();
        } else if (action === 'music-toggle-item-panel') {
          const sid = t.getAttribute('data-slot');
          const iid = t.getAttribute('data-item-id');
          if (sid && iid && app.toggleMusicItemExpanded) app.toggleMusicItemExpanded(sid, iid);
        } else if (action === 'music-remove-item') {
          const sid = t.getAttribute('data-slot');
          const iid = t.getAttribute('data-item-id');
          if (sid && iid) {
            const key = sid === '2' ? '2' : '1';
            if (app.musicSettingsExpandedId && app.musicSettingsExpandedId[key] === iid) {
              app.musicSettingsExpandedId[key] = '';
            }
            app.musicRemoveItem(sid, iid).then(function () {
              if (app.renderMusicSettings) app.renderMusicSettings();
            });
          }
        } else if (action === 'reset-timer') {
          const sec = t.getAttribute('data-seconds');
          if (sec) app.resetTimer(parseInt(sec, 10));
        } else if (action === 'clear-voting') app.clearVoting();
        else if (action === 'foul') {
          const id = t.getAttribute('data-player-id');
          if (id) app.addFoul(parseInt(id, 10));
        } else if (action === 'vote') {
          const id = t.getAttribute('data-player-id');
          if (id) app.addToVote(parseInt(id, 10));
        }
        return;
      }
    });

    document.body.addEventListener(
      'touchend',
      function (e) {
        const t = e.target.closest('[data-close="role"]');
        if (t && document.getElementById('role-screen').classList.contains('active')) {
          e.preventDefault();
          app.closeRole();
        }
      },
      { passive: false }
    );

    function bindMusicFileInputs() {
      function addFromSettings(slot, inputEl) {
        if (!inputEl.files || !inputEl.files.length) return;
        app.musicAddFilesToSlot(slot, inputEl.files).then(function (added) {
          var key = String(slot) === '2' ? '2' : '1';
          if (added && added.length && app.musicSettingsExpandedId) {
            app.musicSettingsExpandedId[key] = added[added.length - 1].id;
          }
          if (app.renderMusicSettings) app.renderMusicSettings();
        });
        inputEl.value = '';
      }
      var f1 = document.getElementById('music-files-slot-1');
      var f2 = document.getElementById('music-files-slot-2');
      var fe = document.getElementById('music-files-empty');
      if (f1)
        f1.addEventListener('change', function () {
          addFromSettings(1, f1);
        });
      if (f2)
        f2.addEventListener('change', function () {
          addFromSettings(2, f2);
        });
      if (fe)
        fe.addEventListener('change', function () {
          var wrap = document.getElementById('modal-music-empty');
          var slot = wrap && wrap.dataset.slot ? wrap.dataset.slot : '1';
          app.musicOnEmptyFilesSelected(slot, fe.files);
          fe.value = '';
        });
    }
    bindMusicFileInputs();

    document.body.addEventListener('input', function (e) {
      var el = e.target;
      if (!el || !el.getAttribute || el.getAttribute('data-music-field') !== 'volume') return;
      app.applyMusicFieldChange(el);
    });
    document.body.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var field = el.getAttribute('data-music-field');
      if (field === 'offset') {
        app.applyMusicFieldChange(el);
        return;
      }
      if (field === 'enabled') {
        var li = el.closest('[data-music-item-id]');
        if (!li) return;
        var settings = document.getElementById('settings-screen');
        if (!settings || !settings.classList.contains('active')) return;
        var id = li.getAttribute('data-music-item-id');
        var slot = li.getAttribute('data-music-slot');
        if (!id || !slot) return;
        app.musicUpdateItem(slot, id, { enabled: el.checked });
        if (app.renderMusicSettings) app.renderMusicSettings();
      }
    });
  };
})(window.MafiaApp);
