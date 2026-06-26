// ══════════════════════════════════════════════════════════════════════════
//  MOVE MEMBER — Modal 3 étapes (Phase 2)
//  openMoveMember → moveMemberStep2 → moveMemberStep3 → execMoveMember
// ══════════════════════════════════════════════════════════════════════════

// État global du modal move
let _moveState = { memberId: null, memberName: null, memberUid: null, legs: null, targetId: null, targetSide: null, preview: null };

// ── Étape 1 : Choix des jambes ────────────────────────────────────────────
async function openMoveMember(memberId, memberName, memberUid) {
  _moveState = { memberId, memberName, memberUid, legs: null, targetId: null, targetSide: null, preview: null };
  const legsLabels = { both: 'Les deux jambes', left: 'Jambe gauche', right: 'Jambe droite', none: 'Seul (sans jambes)' };
  const legsIcons  = { both: 'fa-code-branch text-indigo-400', left: 'fa-arrow-left text-blue-400', right: 'fa-arrow-right text-green-400', none: 'fa-user text-gray-400' };
  const legsSub    = { both: 'Gauche + Droite', left: 'Droite reste chez ancienne upline', right: 'Gauche reste chez ancienne upline', none: 'Aucune jambe déplacée' };
  const legsBorder = { both: 'indigo', left: 'blue', right: 'green', none: 'gray' };

  showModal(
    '<div class="p-6 space-y-5 max-w-md mx-auto">' +
    '<div class="flex items-center gap-3 mb-2">' +
      '<div class="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">' +
        '<i class="fas fa-arrows-up-down-left-right text-indigo-400"></i>' +
      '</div>' +
      '<div>' +
        '<h3 class="font-bold text-lg text-white">Déplacement de membre</h3>' +
        '<div class="text-xs text-gray-400">Étape 1 / 3 — Choisir les jambes</div>' +
      '</div>' +
    '</div>' +
    '<div class="bg-dark-800 rounded-xl p-4 border border-dark-500">' +
      '<div class="text-xs text-gray-400 mb-1">Membre à déplacer</div>' +
      '<div class="flex items-center gap-2">' +
        '<span class="font-semibold text-white">' + memberName + '</span>' +
        '<span class="text-gold-400 font-mono text-xs">' + memberUid + '</span>' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<div class="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Quelles jambes emporter ?</div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        ['both','left','right','none'].map(function(v) {
          return '<button onclick="selectLegs(\'' + v + '\')" id="legs-' + v + '"' +
            ' class="legs-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-' + legsBorder[v] + '-500 hover:bg-' + legsBorder[v] + '-900/20 transition text-center">' +
            '<i class="fas ' + legsIcons[v] + ' text-2xl"></i>' +
            '<span class="font-semibold text-sm text-white">' + legsLabels[v] + '</span>' +
            '<span class="text-xs text-gray-500">' + legsSub[v] + '</span>' +
            '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-200 leading-relaxed">' +
      '<i class="fas fa-info-circle mr-1 text-indigo-400"></i>' +
      'Les jambes <strong>non emportées</strong> remontent chez l\'ancienne upline. Les filleuls directs hors branche déplacée sont rattachés au root.' +
    '</div>' +
    '<div class="flex gap-3">' +
      '<button onclick="closeModal()" class="flex-1 bg-dark-700 text-gray-300 border border-dark-500 font-medium px-4 py-2.5 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>' +
      '<button id="legs-next-btn" onclick="moveMemberStep2()" disabled' +
        ' class="flex-1 bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-500 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">' +
        'Suivant <i class="fas fa-arrow-right ml-1"></i>' +
      '</button>' +
    '</div>' +
    '</div>'
  );
}

function selectLegs(value) {
  _moveState.legs = value;
  const colors = { both: 'indigo', left: 'blue', right: 'green', none: 'gray' };
  ['both','left','right','none'].forEach(function(v) {
    const btn = document.getElementById('legs-' + v);
    if (!btn) return;
    const col = colors[v];
    if (v === value) {
      btn.className = 'legs-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-' + col + '-500 bg-' + col + '-900/30 ring-2 ring-' + col + '-400/40 transition text-center';
    } else {
      btn.className = 'legs-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-' + col + '-500 hover:bg-' + col + '-900/20 transition text-center';
    }
  });
  const nextBtn = document.getElementById('legs-next-btn');
  if (nextBtn) nextBtn.disabled = false;
}

// ── Étape 2 : Choix de la cible ───────────────────────────────────────────
async function moveMemberStep2() {
  if (!_moveState.legs) return;
  const legsLabel = { both: 'Les deux jambes', left: 'Jambe gauche', right: 'Jambe droite', none: 'Seul' }[_moveState.legs] || _moveState.legs;

  showModal(
    '<div class="p-6 space-y-5 max-w-md mx-auto">' +
    '<div class="flex items-center gap-3 mb-2">' +
      '<div class="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">' +
        '<i class="fas fa-crosshairs text-indigo-400"></i>' +
      '</div>' +
      '<div>' +
        '<h3 class="font-bold text-lg text-white">Déplacement de membre</h3>' +
        '<div class="text-xs text-gray-400">Étape 2 / 3 — Choisir la cible</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid grid-cols-2 gap-3 text-xs">' +
      '<div class="bg-dark-800 rounded-lg p-3 border border-dark-500">' +
        '<div class="text-gray-400 mb-1">Membre</div>' +
        '<div class="font-semibold text-white">' + _moveState.memberName + '</div>' +
        '<div class="text-gold-400 font-mono">' + _moveState.memberUid + '</div>' +
      '</div>' +
      '<div class="bg-dark-800 rounded-lg p-3 border border-dark-500">' +
        '<div class="text-gray-400 mb-1">Jambes</div>' +
        '<div class="font-semibold text-white">' + legsLabel + '</div>' +
      '</div>' +
    '</div>' +

    '<div>' +
      '<label class="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">' +
        '<i class="fas fa-search mr-1 text-indigo-400"></i>Rechercher le membre cible' +
      '</label>' +
      '<div class="relative">' +
        '<input type="text" id="move-target-search" placeholder="Nom, prénom ou ID unique..."' +
          ' class="w-full bg-dark-800 border border-dark-500 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"' +
          ' oninput="debounceSearchMoveTarget(this.value)">' +
      '</div>' +
      '<div id="move-target-results" class="mt-2 space-y-1.5 max-h-48 overflow-y-auto"></div>' +
    '</div>' +

    '<div id="move-target-selected" class="hidden bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3">' +
      '<div class="text-xs text-indigo-300 mb-2 font-medium">Cible sélectionnée</div>' +
      '<div id="move-target-info" class="text-sm text-white font-semibold"></div>' +
      '<div class="mt-3">' +
        '<div class="text-xs text-gray-400 mb-2">Côté dans l\'arbre binaire :</div>' +
        '<div class="flex gap-3">' +
          '<button onclick="selectTargetSide(\'L\')" id="side-L"' +
            ' class="flex-1 side-btn flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-blue-500 hover:bg-blue-900/20 transition text-sm font-semibold">' +
            '<i class="fas fa-arrow-left text-blue-400"></i><span class="text-blue-300">Gauche</span>' +
          '</button>' +
          '<button onclick="selectTargetSide(\'R\')" id="side-R"' +
            ' class="flex-1 side-btn flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-green-500 hover:bg-green-900/20 transition text-sm font-semibold">' +
            '<span class="text-green-300">Droite</span><i class="fas fa-arrow-right text-green-400"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="flex gap-3">' +
      '<button onclick="openMoveMember(_moveState.memberId, _moveState.memberName, _moveState.memberUid)"' +
        ' class="flex-1 bg-dark-700 text-gray-300 border border-dark-500 font-medium px-4 py-2.5 rounded-xl hover:bg-dark-600 transition text-sm">' +
        '<i class="fas fa-arrow-left mr-1"></i> Retour' +
      '</button>' +
      '<button id="target-next-btn" onclick="moveMemberStep3()" disabled' +
        ' class="flex-1 bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-500 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">' +
        'Prévisualiser <i class="fas fa-eye ml-1"></i>' +
      '</button>' +
    '</div>' +
    '</div>'
  );
  window._moveTargetTimer = null;
}

window.debounceSearchMoveTarget = function(val) {
  clearTimeout(window._moveTargetTimer);
  const res = document.getElementById('move-target-results');
  if (val.length < 2) { if (res) res.innerHTML = ''; return; }
  window._moveTargetTimer = setTimeout(function() { searchMoveTarget(val); }, 350);
};

async function searchMoveTarget(query) {
  const container = document.getElementById('move-target-results');
  if (!container) return;
  container.innerHTML = '<div class="text-xs text-gray-500 text-center py-2"><i class="fas fa-spinner fa-spin mr-1"></i>Recherche...</div>';
  try {
    const res = await apiAdmin('GET', '/members?search=' + encodeURIComponent(query) + '&limit=8');
    const members = res.members || res.data || [];
    const filtered = members.filter(function(m) { return m.id !== _moveState.memberId; });
    if (!filtered.length) {
      container.innerHTML = '<div class="text-xs text-gray-500 text-center py-2 italic">Aucun résultat</div>';
      return;
    }
    container.innerHTML = filtered.map(function(m) {
      const gSlot = m.binary_left_id  ? '<span class="text-red-400">G✗</span>'   : '<span class="text-green-400">G✓</span>';
      const dSlot = m.binary_right_id ? '<span class="text-red-400">D✗</span>'   : '<span class="text-green-400">D✓</span>';
      return '<div onclick="selectMoveTarget(\'' + m.id + '\',\'' + (m.first_name||'').replace(/'/g,"\\'") + ' ' + (m.last_name||'').replace(/'/g,"\\'") + '\',\'' + m.unique_id + '\')"' +
        ' class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-500 hover:border-indigo-500 hover:bg-indigo-900/10 cursor-pointer transition">' +
        '<div class="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">' +
          (m.first_name||'?')[0] + (m.last_name||'?')[0] +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="text-sm font-semibold text-white truncate">' + m.first_name + ' ' + m.last_name + '</div>' +
          '<div class="text-xs text-gold-400 font-mono">' + m.unique_id + '</div>' +
        '</div>' +
        '<div class="text-xs flex gap-1 flex-shrink-0">' + gSlot + ' ' + dSlot + '</div>' +
        '</div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="text-xs text-red-400 text-center py-2">' + (e.error || 'Erreur de recherche') + '</div>';
  }
}

function selectMoveTarget(id, name, uid) {
  _moveState.targetId = id;
  _moveState.targetSide = null;
  const infoEl = document.getElementById('move-target-info');
  const selectedEl = document.getElementById('move-target-selected');
  const resultsEl = document.getElementById('move-target-results');
  const searchEl = document.getElementById('move-target-search');
  if (infoEl) infoEl.innerHTML = '<span class="text-white">' + name + '</span> <span class="text-gold-400 font-mono text-xs ml-2">' + uid + '</span>';
  if (selectedEl) selectedEl.classList.remove('hidden');
  if (resultsEl) resultsEl.innerHTML = '';
  if (searchEl) searchEl.value = name + ' (' + uid + ')';
  ['L','R'].forEach(function(s) {
    const btn = document.getElementById('side-' + s);
    if (btn) btn.className = 'flex-1 side-btn flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-' + (s==='L'?'blue':'green') + '-500 hover:bg-' + (s==='L'?'blue':'green') + '-900/20 transition text-sm font-semibold';
  });
  const nextBtn = document.getElementById('target-next-btn');
  if (nextBtn) nextBtn.disabled = true;
}

function selectTargetSide(side) {
  _moveState.targetSide = side;
  ['L','R'].forEach(function(s) {
    const btn = document.getElementById('side-' + s);
    if (!btn) return;
    const col = s === 'L' ? 'blue' : 'green';
    if (s === side) {
      btn.className = 'flex-1 side-btn flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-' + col + '-500 bg-' + col + '-900/30 ring-2 ring-' + col + '-400/40 transition text-sm font-semibold';
    } else {
      btn.className = 'flex-1 side-btn flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dark-500 bg-dark-800 hover:border-' + col + '-500 hover:bg-' + col + '-900/20 transition text-sm font-semibold';
    }
  });
  const nextBtn = document.getElementById('target-next-btn');
  if (nextBtn) nextBtn.disabled = false;
}

// ── Étape 3 : Confirmation avec preview ───────────────────────────────────
async function moveMemberStep3() {
  if (!_moveState.targetId || !_moveState.targetSide) return;
  showModal(
    '<div class="p-6 max-w-md mx-auto">' +
    '<div class="flex items-center gap-3 mb-4">' +
      '<div class="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">' +
        '<i class="fas fa-check-double text-indigo-400"></i>' +
      '</div>' +
      '<div>' +
        '<h3 class="font-bold text-lg text-white">Déplacement de membre</h3>' +
        '<div class="text-xs text-gray-400">Étape 3 / 3 — Confirmation</div>' +
      '</div>' +
    '</div>' +
    '<div id="move-preview-loading" class="flex flex-col items-center py-10 gap-3">' +
      '<div class="loader"></div>' +
      '<div class="text-sm text-gray-400">Calcul de l\'impact en cours...</div>' +
    '</div>' +
    '<div id="move-preview-content" class="hidden space-y-4"></div>' +
    '</div>'
  );
  try {
    const res = await apiAdmin('POST', '/members/' + _moveState.memberId + '/move/preview', {
      legs: _moveState.legs,
      target_member_id: _moveState.targetId,
      target_side: _moveState.targetSide
    });
    _moveState.preview = res;
    renderMovePreview(res);
  } catch(e) {
    const loadEl = document.getElementById('move-preview-loading');
    if (loadEl) loadEl.innerHTML =
      '<div class="text-center py-6">' +
      '<i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>' +
      '<div class="text-red-400 font-semibold">' + (e.error || 'Erreur lors du preview') + '</div>' +
      '<button onclick="moveMemberStep2()" class="mt-4 text-xs text-indigo-400 hover:text-indigo-300">' +
        '<i class="fas fa-arrow-left mr-1"></i> Retour' +
      '</button></div>';
  }
}

function renderMovePreview(data) {
  const loadEl = document.getElementById('move-preview-loading');
  const contentEl = document.getElementById('move-preview-content');
  if (!loadEl || !contentEl) return;
  loadEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  const src = data.source || {};
  const tgt = data.target || {};
  const occupant = data.slot_occupant;
  const legsLabel = { both: 'Gauche + Droite', left: 'Jambe gauche', right: 'Jambe droite', none: 'Aucune' }[_moveState.legs] || _moveState.legs;
  const sideLabel = _moveState.targetSide === 'L' ? '<span class="text-blue-400">← Slot Gauche</span>' : '<span class="text-green-400">Slot Droit →</span>';

  let impactRows = '';
  impactRows += '<div class="flex justify-between"><span class="text-gray-400">Jambes emportées</span><span class="text-white font-semibold">' + legsLabel + '</span></div>';
  impactRows += '<div class="flex justify-between"><span class="text-gray-400">Taille de la branche</span><span class="text-indigo-300 font-semibold">' + (data.branch_size || 1) + ' membre(s)</span></div>';
  if ((data.pending_bv || 0) > 0) {
    impactRows += '<div class="flex justify-between"><span class="text-gray-400">BV holding tank</span><span class="text-orange-300 font-semibold">' + data.pending_bv + ' en attente (rebascule)</span></div>';
  }
  if ((data.legs_staying_behind || []).length > 0) {
    const stayLabels = (data.legs_staying_behind || []).map(function(l) { return l === 'L' ? 'Gauche' : 'Droite'; }).join(', ');
    impactRows += '<div class="flex justify-between items-start"><span class="text-gray-400">Jambe(s) restantes</span><span class="text-yellow-300">' + stayLabels + ' → ancienne upline</span></div>';
  }
  if ((data.sponsor_directs_reparented || 0) > 0) {
    impactRows += '<div class="flex justify-between"><span class="text-gray-400">Filleuls reparentés root</span><span class="text-yellow-300 font-semibold">' + data.sponsor_directs_reparented + ' filleul(s)</span></div>';
  }

  let occupantBlock = '';
  if (occupant) {
    occupantBlock = '<div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-3 text-xs">' +
      '<div class="flex items-center gap-2 mb-1"><i class="fas fa-exclamation-triangle text-orange-400"></i>' +
        '<span class="font-semibold text-orange-300">Slot occupé — intercalation automatique</span></div>' +
      '<div class="text-orange-200 leading-relaxed">Le slot ' + (_moveState.targetSide === 'L' ? 'gauche' : 'droit') +
        ' est occupé par <strong>' + occupant.first_name + ' ' + occupant.last_name + '</strong> (' + occupant.unique_id + '). ' +
        'Ce membre descendra sous ' + (src.name || '?') + '.</div>' +
      '</div>';
  }

  contentEl.innerHTML =
    '<div class="grid grid-cols-2 gap-3 text-xs">' +
      '<div class="bg-dark-800 rounded-xl p-3 border border-dark-500"><div class="text-gray-400 mb-1">Source</div><div class="font-semibold text-white">' + (src.name||'?') + '</div><div class="text-gold-400 font-mono">' + (src.unique_id||'') + '</div></div>' +
      '<div class="bg-dark-800 rounded-xl p-3 border border-dark-500"><div class="text-gray-400 mb-1">Cible</div><div class="font-semibold text-white">' + (tgt.name||'?') + '</div><div class="text-gold-400 font-mono">' + (tgt.unique_id||'') + '</div><div class="text-xs mt-1">' + sideLabel + '</div></div>' +
    '</div>' +
    '<div class="bg-dark-800 rounded-xl p-4 border border-dark-500 space-y-2 text-xs">' +
      '<div class="text-gray-400 font-medium uppercase tracking-wider mb-2">Impact du déplacement</div>' +
      impactRows +
    '</div>' +
    occupantBlock +
    '<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 leading-relaxed">' +
      '<i class="fas fa-shield-exclamation mr-1 text-red-400"></i>' +
      '<strong>Action irréversible.</strong> Les commissions et BV passés ne sont pas affectés. Un snapshot complet sera sauvegardé dans admin_audit_log.' +
    '</div>' +
    '<div class="flex gap-3 pt-1">' +
      '<button onclick="moveMemberStep2()" class="flex-1 bg-dark-700 text-gray-300 border border-dark-500 font-medium px-4 py-2.5 rounded-xl hover:bg-dark-600 transition text-sm">' +
        '<i class="fas fa-arrow-left mr-1"></i> Retour' +
      '</button>' +
      '<button onclick="execMoveMember()" id="exec-move-btn"' +
        ' class="flex-1 bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-red-500 transition text-sm flex items-center justify-center gap-2">' +
        '<i class="fas fa-arrows-up-down-left-right"></i> Confirmer le déplacement' +
      '</button>' +
    '</div>';
}

// ── Exécution finale ──────────────────────────────────────────────────────
async function execMoveMember() {
  const btn = document.getElementById('exec-move-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Déplacement en cours...'; }
  try {
    const res = await apiAdmin('POST', '/members/' + _moveState.memberId + '/move', {
      legs: _moveState.legs,
      target_member_id: _moveState.targetId,
      target_side: _moveState.targetSide,
      confirm: true
    });
    closeModal();
    showToast(res.message || 'Membre déplacé avec succès', 'success');
    const savedId = _moveState.memberId;
    setTimeout(function() { viewMember(savedId); }, 700);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-arrows-up-down-left-right"></i> Confirmer le déplacement'; }
    showToast(e.error || 'Erreur lors du déplacement', 'error');
  }
}
