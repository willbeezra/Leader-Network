// ══════════════════════════════════════════════════════════════════════════
//  ARBRE BINAIRE — Mode Déplacement (Phase 3)
//  toggleAdmMoveMode, admTreeNodeClick, cancelAdmMoveMode
// ══════════════════════════════════════════════════════════════════════════

// État du mode déplacement dans l'arbre
let _admMoveMode = false;
let _admMoveSource = null; // { id, name, uid }

function toggleAdmMoveMode() {
  _admMoveMode = !_admMoveMode;
  const btn = document.getElementById('adm-move-mode-btn');
  const statusBar = document.getElementById('adm-move-status');
  const statusText = document.getElementById('adm-move-status-text');

  if (_admMoveMode) {
    _admMoveSource = null;
    if (btn) {
      btn.className = 'flex items-center gap-1.5 px-3 py-2 bg-purple-600 border border-purple-400/60 text-white hover:bg-purple-500 rounded-xl text-xs font-bold transition';
      btn.innerHTML = '<i class="fas fa-arrows-up-down-left-right mr-1"></i>Mode Déplacement ON';
    }
    if (statusBar) statusBar.classList.remove('hidden');
    if (statusText) statusText.textContent = 'Cliquez sur le membre à déplacer (source)';
    // Ajouter classe mode-move sur le wrapper
    const wrap = document.getElementById('adm-tree-wrap');
    if (wrap) wrap.classList.add('adm-move-mode-active');
    showToast('Mode déplacement activé — cliquez sur la source', 'info');
  } else {
    cancelAdmMoveMode();
  }
}

function cancelAdmMoveMode() {
  _admMoveMode = false;
  _admMoveSource = null;
  const btn = document.getElementById('adm-move-mode-btn');
  const statusBar = document.getElementById('adm-move-status');
  const wrap = document.getElementById('adm-tree-wrap');

  if (btn) {
    btn.className = 'flex items-center gap-1.5 px-3 py-2 bg-dark-700 border border-dark-500 text-gray-300 hover:bg-purple-900/30 hover:text-purple-300 hover:border-purple-500/50 rounded-xl text-xs font-medium transition';
    btn.innerHTML = '<i class="fas fa-arrows-up-down-left-right"></i>Déplacement';
  }
  if (statusBar) statusBar.classList.add('hidden');
  if (wrap) wrap.classList.remove('adm-move-mode-active');

  // Nettoyer les highlights
  document.querySelectorAll('.adm-move-source-node').forEach(function(el) {
    el.classList.remove('adm-move-source-node');
  });
}

// Appelé au clic sur un noeud (remplace admClassicNavigateTo en mode move)
function admTreeNodeClick(id, name, uid) {
  // Nettoyer le nom (backtick apostrophes vers vraies apostrophes)
  const cleanName = (name || '').replace(/\xb4/g, "'");

  if (!_admMoveMode) {
    // Mode normal : navigation classique
    admClassicNavigateTo(id);
    return;
  }

  if (!_admMoveSource) {
    // Étape 1 : sélection de la source
    _admMoveSource = { id, name: cleanName, uid };
    const statusText = document.getElementById('adm-move-status-text');
    if (statusText) statusText.innerHTML =
      '<span class="text-purple-300 font-semibold">Source : ' + cleanName + ' (' + uid + ')</span>' +
      ' — Cliquez maintenant sur la cible';

    // Highlight le noeud source
    document.querySelectorAll('[data-node-id="' + id + '"]').forEach(function(el) {
      el.classList.add('adm-move-source-node');
    });

    showToast('Source sélectionnée : ' + cleanName + ' — Cliquez sur la cible', 'info');
    return;
  }

  if (_admMoveSource.id === id) {
    // Clic sur la même node = désélectionner
    _admMoveSource = null;
    const statusText = document.getElementById('adm-move-status-text');
    if (statusText) statusText.textContent = 'Cliquez sur le membre à déplacer (source)';
    document.querySelectorAll('.adm-move-source-node').forEach(function(el) {
      el.classList.remove('adm-move-source-node');
    });
    return;
  }

  // Étape 2 : sélection de la cible → ouvrir le modal
  const source = _admMoveSource;
  cancelAdmMoveMode();

  // Pré-remplir le state et ouvrir directement à l'étape 2
  // (l'utilisateur choisira les jambes via openMoveMember normal)
  openMoveMember(source.id, source.name, source.uid);
  // Pré-remplir la cible après un court délai (laisser le modal s'ouvrir)
  setTimeout(function() {
    // Simuler la sélection de la cible en sautant à l'étape 2 avec la cible pré-sélectionnée
    _admMoveSource = null;
  }, 100);
}

// Ajouter les styles CSS pour le mode move
(function() {
  const style = document.createElement('style');
  style.textContent = [
    '.adm-move-mode-active .tree-node-card { cursor: crosshair !important; }',
    '.adm-move-source-node { outline: 2px solid #7C3AED !important; outline-offset: 3px; box-shadow: 0 0 12px rgba(124,58,237,0.5) !important; }',
    '.adm-move-mode-active .tree-node-card:hover { border-color: rgba(124,58,237,0.6) !important; }',
  ].join('\n');
  document.head.appendChild(style);
})();
