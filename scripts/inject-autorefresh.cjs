#!/usr/bin/env node
/**
 * inject-autorefresh.cjs
 *
 * 1. Bouton "Rafraîchir" header → window.location.reload()
 * 2. Système _refreshCurrentPage() + polling toutes les 60s
 * 3. Refresh automatique après chaque action décisive
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'public', 'static', 'admin-app.js');
let src = fs.readFileSync(TARGET, 'utf8');

let injections = 0;
let failures = 0;

function inject(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.warn(`⚠️  [${label}] Marqueur introuvable (skipped)`);
    failures++;
    return false;
  }
  src = src.replace(oldStr, newStr);
  console.log(`✅ [${label}]`);
  injections++;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Système refresh central + polling — injecté après showAdminPage
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'Système _refreshCurrentPage + polling 60s',
  `return n[e]?Promise.resolve(n[e](t)):(t.innerHTML='<p class="text-gray-400">Page en construction</p>',Promise.resolve())}`,
  `return n[e]?Promise.resolve(n[e](t)):(t.innerHTML='<p class="text-gray-400">Page en construction</p>',Promise.resolve())}
// ── Auto-refresh système ─────────────────────────────────────────────────
function _currentPage(){var a=document.querySelector('.admin-nav-btn.active');return a?a.dataset.page:'dashboard';}
async function _refreshCurrentPage(){try{await showAdminPage(_currentPage());}catch(e){}try{loadAdminBadges();}catch(e){}}
var _lastPollStats=null;
async function _pollBackend(){try{var r=await apiAdmin('GET','/dashboard');var s=r.stats;setBadge('admin-ht-badge',s.holdingTankCount);setBadge('admin-act-badge',s.pendingOrders);setBadge('admin-wd-badge',s.pendingWithdrawals);setBadge('admin-kyc-badge',s.pendingKYC);setBadge('admin-support-badge',s.openTickets||0);var hi=document.getElementById('admin-header-info');if(hi)hi.textContent=s.totalMembers+' membres · '+s.activeAMI+' AMI actifs · BV Queue: '+(s.pendingBVQueue||0);if(_lastPollStats){var changed=s.pendingOrders!==_lastPollStats.pendingOrders||s.pendingWithdrawals!==_lastPollStats.pendingWithdrawals||s.pendingKYC!==_lastPollStats.pendingKYC||s.holdingTankCount!==_lastPollStats.holdingTankCount||s.pendingBVQueue!==_lastPollStats.pendingBVQueue||s.totalMembers!==_lastPollStats.totalMembers;if(changed){var pg=_currentPage();var livePages=['dashboard','members','activations','withdrawals','kyc','holding-tank','commissions','wallets','bv'];if(livePages.indexOf(pg)!==-1)await showAdminPage(pg);}}_lastPollStats=s;}catch(e){}}
setTimeout(function(){_pollBackend();setInterval(_pollBackend,60000);},5000);
// ─────────────────────────────────────────────────────────────────────────`
);

// ─────────────────────────────────────────────────────────────────────────────
// B. Câbler le bouton rafraîchir header dans initAdminApp
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'Bouton header rafraîchir → window.location.reload()',
  `showAdminPage("dashboard");
  loadAdminBadges().catch(()=>{});
}`,
  `showAdminPage("dashboard");
  loadAdminBadges().catch(()=>{});
  var _hRefBtn=document.getElementById('admin-header-refresh');if(_hRefBtn)_hRefBtn.onclick=function(){window.location.reload();};
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// C. Activations : validateOrder / rejectOrder / validateLicense / rejectLicense
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'validateOrder → refresh activations',
  `}finally{await showAdminPage("activations"),loadAdminBadges()}}async function rejectOrder`,
  `}finally{await showAdminPage("activations");loadAdminBadges();}}async function rejectOrder`
);

inject(
  'rejectOrder → refresh activations',
  `}finally{await showAdminPage("activations"),loadAdminBadges()}}async function validateLicense`,
  `}finally{await showAdminPage("activations");loadAdminBadges();}}async function validateLicense`
);

inject(
  'validateLicense → refresh activations',
  `}finally{await showAdminPage("activations"),loadAdminBadges()}}async function rejectLicense`,
  `}finally{await showAdminPage("activations");loadAdminBadges();}}async function rejectLicense`
);

// ─────────────────────────────────────────────────────────────────────────────
// D. KYC simple : approveKYC / rejectKYC
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'approveKYC → refresh kyc',
  `showToast("KYC approuvé !")}catch(e){showToast(e.error||"Erreur","error")}finally{await showAdminPage("kyc"),loadAdminBadges()}}`,
  `showToast("KYC approuvé !");_refreshCurrentPage();}catch(e){showToast(e.error||"Erreur","error")}}`
);

inject(
  'rejectKYC → refresh kyc',
  `showToast("KYC rejeté")}catch(e){showToast(e.error||"Erreur","error")}finally{await showAdminPage("kyc")}}`,
  `showToast("KYC rejeté");_refreshCurrentPage();}catch(e){showToast(e.error||"Erreur","error")}}`
);

// ─────────────────────────────────────────────────────────────────────────────
// E. KYC avancé : approve dossier, reject dossier, assign, doc accept/reject
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'KYC approve dossier → refresh',
  `showToast('✅ Dossier approuvé — Niveau KYC mis à jour !', 'success');`,
  `showToast('✅ Dossier approuvé — Niveau KYC mis à jour !', 'success');_refreshCurrentPage();`
);

inject(
  'KYC reject dossier → refresh',
  `showToast('Dossier rejeté — le membre peut soumettre à nouveau');`,
  `showToast('Dossier rejeté — le membre peut soumettre à nouveau');_refreshCurrentPage();`
);

inject(
  'KYC assign dossier → refresh',
  `showToast('Dossier assigné — en cours de révision');`,
  `showToast('Dossier assigné — en cours de révision');_refreshCurrentPage();`
);

inject(
  'KYC doc accept/reject → refresh',
  `showToast(status === 'accepted' ? 'Document accepté ✓' : 'Document rejeté');`,
  `showToast(status === 'accepted' ? 'Document accepté ✓' : 'Document rejeté');_refreshCurrentPage();`
);

inject(
  'KYC alerte résolue → refresh',
  `showToast('Alerte résolue');`,
  `showToast('Alerte résolue');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// F. Activations liste (commandes en liste) : annulation + rollback + confirm + rejet
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'cancelOrder (liste) → refresh',
  `showToast(res.message||'Commande annulée — le membre peut relancer un achat.','success');\n    loadAdminBadges();`,
  `showToast(res.message||'Commande annulée — le membre peut relancer un achat.','success');\n    loadAdminBadges();_refreshCurrentPage();`
);

inject(
  'rollbackOrder (liste) → refresh',
  `showToast('Rollback effectué — BV annulés, commissions négatives créées','success');\n    \n    loadAdminBadges();`,
  `showToast('Rollback effectué — BV annulés, commissions négatives créées','success');\n    _refreshCurrentPage();loadAdminBadges();`
);

inject(
  'confirmOrder (liste) → refresh',
  `showToast('Commande confirmée','success');\n    loadAdminBadges();`,
  `showToast('Commande confirmée','success');\n    loadAdminBadges();_refreshCurrentPage();`
);

inject(
  'rejectOrderListe → refresh',
  `showToast('Commande rejetée — rollback effectué','success');\n    loadAdminBadges();`,
  `showToast('Commande rejetée — rollback effectué','success');\n    loadAdminBadges();_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// G. Recharges
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'recharge confirmée → refresh',
  `showToast('Recharge confirmée','success');`,
  `showToast('Recharge confirmée','success');_refreshCurrentPage();`
);

inject(
  'recharge rejetée → refresh',
  `showToast('Recharge rejetée','success');`,
  `showToast('Recharge rejetée','success');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// H. Support tickets
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'ticket résolu → refresh',
  `showToast('Ticket résolu avec succès');`,
  `showToast('Ticket résolu avec succès');_refreshCurrentPage();`
);

inject(
  'ticket fermé → refresh',
  `showToast('Ticket fermé');`,
  `showToast('Ticket fermé');_refreshCurrentPage();`
);

inject(
  'ticket statut → refresh',
  `showToast('Statut mis à jour');`,
  `showToast('Statut mis à jour');_refreshCurrentPage();`
);

inject(
  'ticket priorité → refresh',
  `showToast('Priorité mise à jour');`,
  `showToast('Priorité mise à jour');_refreshCurrentPage();`
);

inject(
  'tag ajouté → refresh',
  `showToast('Tag ajouté');`,
  `showToast('Tag ajouté');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// I. Admins : créer / supprimer
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'admin créé → refresh',
  `showToast('Admin créé avec succès');`,
  `showToast('Admin créé avec succès');_refreshCurrentPage();`
);

inject(
  'admin supprimé → refresh',
  `showToast('Admin supprimé');`,
  `showToast('Admin supprimé');_refreshCurrentPage();`
);

inject(
  'admin info maj → refresh',
  `showToast('Informations mises à jour');`,
  `showToast('Informations mises à jour');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// J. Payment gateway
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'fournisseur créé → refresh',
  `showToast('Fournisseur créé','success');`,
  `showToast('Fournisseur créé','success');_refreshCurrentPage();`
);

inject(
  'fournisseur maj → refresh',
  `showToast('Fournisseur mis à jour','success');`,
  `showToast('Fournisseur mis à jour','success');_refreshCurrentPage();`
);

inject(
  'fournisseur supprimé → refresh',
  `showToast('Fournisseur supprimé','success');`,
  `showToast('Fournisseur supprimé','success');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// K. BV Reset manuel → badge + refresh
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'BV Reset manuel → loadAdminBadges',
  `showToast('BV mensuels remis à zéro avec succès');`,
  `showToast('BV mensuels remis à zéro avec succès');loadAdminBadges();`
);

// ─────────────────────────────────────────────────────────────────────────────
// L. Rôles équipe
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'rôle créé → refresh',
  `showToast('Rôle "' + label + '" créé — configurez ses permissions ci-dessous');`,
  `showToast('Rôle "' + label + '" créé — configurez ses permissions ci-dessous');_refreshCurrentPage();`
);

inject(
  'rôle modifié → refresh',
  `showToast('Rôle modifié');`,
  `showToast('Rôle modifié');_refreshCurrentPage();`
);

inject(
  'rôle supprimé → refresh',
  `showToast('Rôle supprimé');`,
  `showToast('Rôle supprimé');_refreshCurrentPage();`
);

inject(
  'rôle attribué/retiré → refresh',
  `showToast(action === 'add' ? 'Rôle attribué' : 'Rôle retiré');`,
  `showToast(action === 'add' ? 'Rôle attribué' : 'Rôle retiré');_refreshCurrentPage();`
);

// ─────────────────────────────────────────────────────────────────────────────
// M. Corrections IA admin
// ─────────────────────────────────────────────────────────────────────────────
inject(
  'corrections IA appliquées → refresh',
  `if (res.success) showToast('Corrections appliquées avec succès', 'success');`,
  `if (res.success){showToast('Corrections appliquées avec succès', 'success');_refreshCurrentPage();}`
);

// ─────────────────────────────────────────────────────────────────────────────
// N. Résumé
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(TARGET, src, 'utf8');
console.log('\n─────────────────────────────────────────');
console.log(`📊 ${injections} injections réussies, ${failures} marqueurs non trouvés (skipped)`);
console.log(`   Taille : ${(src.length / 1024).toFixed(1)} KB`);
