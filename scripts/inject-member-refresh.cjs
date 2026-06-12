#!/usr/bin/env node
/**
 * inject-member-refresh.cjs
 * Injecte _refreshCurrentPage() après chaque action décisive des fonctions membres :
 * adminMarkFeePaid, adminRenewLicense, adminSuspendLicense,
 * adminSetStatus, adminRecalculateStatus, adminRecalculateAllStatuses,
 * deleteMember, createMemberAdmin (createMember), saveMemberEdit (editMember)
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../public/static/admin-app.js');
let content = fs.readFileSync(FILE, 'utf8');
const original = content;

let successCount = 0;
let skipCount = 0;
let failCount = 0;

function inject(label, oldStr, newStr) {
  if (!oldStr || !newStr) { console.log(`[SKIP] ${label} — chaîne vide`); skipCount++; return; }
  if (content.includes(newStr)) { console.log(`[SKIP] ${label} — déjà injecté`); skipCount++; return; }
  if (!content.includes(oldStr)) { console.log(`[FAIL] ${label} — marqueur introuvable`); failCount++; return; }
  content = content.replace(oldStr, newStr);
  console.log(`[ OK ] ${label}`);
  successCount++;
}

// ─── 1. adminMarkFeePaid ─────────────────────────────────────────────────────
// showToast(" Frais d'administration marqués comme réglés"), puis viewMember ou rien
// Pattern exact: showToast(" Frais d'administration marqués comme réglés")
inject(
  'adminMarkFeePaid — refresh après succès',
  `showToast(" Frais d'administration marqués comme réglés")`,
  `showToast(" Frais d'administration marqués comme réglés");_refreshCurrentPage()`
);

// ─── 2. adminRenewLicense ────────────────────────────────────────────────────
// showToast(` Licence de ${t} renouvelée — expire le ${fmtDate(n.expires_at)
// Le toast se termine par une backtick fermante après fmtDate(...)
// On cherche le pattern complet de la ligne
inject(
  'adminRenewLicense — refresh après succès',
  `showToast(\` Licence de \${t} renouvelée — expire le \${fmtDate(n.expires_at)}\`)`,
  `showToast(\` Licence de \${t} renouvelée — expire le \${fmtDate(n.expires_at)}\`);_refreshCurrentPage()`
);

// ─── 3. adminSuspendLicense ──────────────────────────────────────────────────
inject(
  'adminSuspendLicense — refresh après succès',
  'showToast(`[!] Licence de ${t} suspendue`)',
  'showToast(`[!] Licence de ${t} suspendue`);_refreshCurrentPage()'
);

// ─── 4. adminSetStatus ───────────────────────────────────────────────────────
inject(
  'adminSetStatus — refresh après statut forcé',
  'showToast(`Statut forcé : ${r.new_status}`)',
  'showToast(`Statut forcé : ${r.new_status}`);_refreshCurrentPage()'
);

// ─── 5. adminRecalculateStatus (individuel) ──────────────────────────────────
inject(
  'adminRecalculateStatus — refresh après recalcul individuel',
  'showToast(`Statut recalculé : ${r.new_status}`)',
  'showToast(`Statut recalculé : ${r.new_status}`);_refreshCurrentPage()'
);

// ─── 6. adminRecalculateAllStatuses — 2 cas de succès ────────────────────────
inject(
  'adminRecalculateAllStatuses — refresh si aucune incohérence',
  `showToast(\`Aucune incohérence détectée (\${r.scanned} membre(s) scanné(s))\`)`,
  `showToast(\`Aucune incohérence détectée (\${r.scanned} membre(s) scanné(s))\`);_refreshCurrentPage()`
);

inject(
  'adminRecalculateAllStatuses — refresh si corrections',
  'showToast(`${r.fixed} statut(s) corrigé(s) sur ${r.scanned} scanné(s)`)',
  'showToast(`${r.fixed} statut(s) corrigé(s) sur ${r.scanned} scanné(s)`);_refreshCurrentPage()'
);

// ─── 7. deleteMember ─────────────────────────────────────────────────────────
inject(
  'deleteMember — refresh après suppression',
  'showToast("Membre supprimé")',
  'showToast("Membre supprimé");_refreshCurrentPage()'
);

// ─── 8. createMemberAdmin (bouton Nouveau membre) ────────────────────────────
inject(
  'createMemberAdmin — refresh après création',
  'showToast(`Membre créé : ${e.unique_id}`)',
  'showToast(`Membre créé : ${e.unique_id}`);_refreshCurrentPage()'
);

// ─── 9. saveMemberEdit (édition membre) ──────────────────────────────────────
// Pattern: showToast("✅ Membre mis à jour !"),loadAdminMembers()
// On injecte avant loadAdminMembers (qui existe déjà) pour éviter doublon
inject(
  'saveMemberEdit — refresh après modification',
  'showToast("✅ Membre mis à jour !"),loadAdminMembers()',
  'showToast("✅ Membre mis à jour !"),loadAdminMembers();_refreshCurrentPage()'
);

// ─── Résumé ──────────────────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════`);
console.log(`  Résultat: ${successCount} OK | ${skipCount} SKIP | ${failCount} FAIL`);
console.log(`═══════════════════════════════════════`);

if (content === original) {
  console.log('\n⚠️  Aucune modification effectuée (tout déjà injecté ou marqueurs introuvables)');
} else {
  fs.writeFileSync(FILE, content, 'utf8');
  const diff = content.length - original.length;
  console.log(`\n✅ Fichier mis à jour (+${diff} octets)`);
}

if (failCount > 0) {
  console.log(`\n❌ ${failCount} injection(s) échouée(s) — vérifier les marqueurs ci-dessus`);
  process.exit(1);
}
