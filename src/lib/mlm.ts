// ============================================================
// LEADER — Logique métier MLM complète
// CDC v6.0 — Plan de compensation intégral
// Corrections bugs audit : B1 B2 B3 B4 B5 B6 B7
// ============================================================

import type { Bindings, RankName } from '../types/index.js'
import { generateId } from './auth.js'
import { sendEmail } from './mailer.js'

// ── CONSTANTES ────────────────────────────────────────────────

export const RANK_ORDER: RankName[] = [
  'none', 'Administrator', 'Manager', 'Captain', 'Leader',
  'Mentor', 'Superviseur', 'Executive', 'President', 'Director', 'Boss', 'Visionary'
]

export function getRankIndex(rank: string): number {
  return RANK_ORDER.indexOf(rank as RankName)
}

// Noms lisibles des types de commission
export const COMMISSION_TYPES: Record<string, string> = {
  prime_leadership:            'Prime de Leadership',
  bonus_influence:             'Bonus d\'Influence',
  bonus_rayonnement:           'Bonus de Rayonnement',
  valorisation_recommandation: 'Valorisation Recommandation',
  fast_start:                  'Fast Start Bonus',
  credit_croissance:           'Crédit de Croissance',
  reserve_strategique:         'Réserve Stratégique',
}

// ── FUSEAU HORAIRE ILE MAURICE (UTC+4) ───────────────────────
// Toute la logique de paiement journalier utilise l'heure de Maurice.
// Maurice = UTC+4 (pas de changement d'heure, toute l'année)
const MAURITIUS_OFFSET_HOURS = 4

/**
 * Retourne la date du jour à Maurice au format 'YYYY-MM-DD'.
 * Exemple : si UTC = 2026-05-08T22:30, Maurice = 2026-05-09 → retourne '2026-05-09'
 */
export function getMauritiusDateStr(): string {
  const nowUTC = new Date()
  // Décaler de +4h pour obtenir l'heure de Maurice
  const mauritiusMs = nowUTC.getTime() + MAURITIUS_OFFSET_HOURS * 60 * 60 * 1000
  const mauritiusDate = new Date(mauritiusMs)
  return mauritiusDate.toISOString().substring(0, 10)
}

/**
 * Retourne un objet Date correspondant à minuit heure de Maurice (00:00 MUT)
 * exprimé en UTC (= UTC-4 = 20:00 la veille UTC).
 * Utilisé pour les comparaisons de durée.
 */
export function getMauritiusMidnightUTC(): Date {
  const dateStr = getMauritiusDateStr()           // 'YYYY-MM-DD' à Maurice
  // minuit Maurice = 20h00 UTC la veille
  const midnightUTC = new Date(dateStr + 'T00:00:00+04:00')
  return midnightUTC
}

// ── CALCUL RANG ───────────────────────────────────────────────

/**
 * Calcule le rang d'un membre selon :
 * - Licence active obligatoire
 * - Package actif (type Production ou Pinnacle)
 * - BV minimum de la jambe faible (min des deux jambes)
 * - Nombre de directs qualifiés UNIQUES avec le bon package
 * Statut Partenaire (licence seule) → plafonné à Manager
 */
export async function calculateMemberRank(
  db: D1Database,
  memberId: string
): Promise<RankName> {
  const member = await db.prepare(
    `SELECT * FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return 'none'

  // Sans licence → aucun rang
  if (!member.license_active) return 'none'

  // Vérifier le statut membre (Client/Membre = pas de rang)
  if (member.member_status === 'Membre' || member.member_status === 'Client') return 'none'

  // Lire le mode BV global (total à vie vs mensuel) depuis la config
  // CDC : par défaut les rangs sont basés sur le BV TOTAL à vie (irréversible)
  const globalCfg = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = 'bv_rank_global_use_total'`
  ).first() as any
  const globalUseTotal = !globalCfg || globalCfg.value !== 'false'

  // Récupérer les rangs dans l'ordre décroissant
  const ranks = await db.prepare(
    `SELECT * FROM rank_config ORDER BY rank_order DESC`
  ).all()

  // Récupérer les directs dédupliqués avec leur meilleur package validé.
  // Pour chaque rang, le seuil de qualification est lu depuis rank_config :
  // Règle unique de qualification des directs :
  //   price_usd du meilleur package validé >= rank_config.min_monthly_package_value (configurable admin)
  //   Si min_monthly_package_value = 0 → tout package avec bv_value > 0 suffit.
  // Aucun type de package (Pinnacle, Production...) n'intervient dans la logique.
  const directsRaw = await db.prepare(
    `SELECT m.id, m.unique_id, m.member_status, m.license_active,
            MAX(COALESCE(p.price_usd, 0))  as max_price_usd,
            MAX(CASE WHEN p.bv_value > 0 THEN 1 ELSE 0 END) as has_bv_package
     FROM members m
     LEFT JOIN package_orders po ON po.member_id = m.id AND po.status = 'validated'
     LEFT JOIN packages p ON p.id = po.package_id
     WHERE m.sponsor_id = ?
       AND m.member_status IN ('Partenaire','AMI','Membre','Client')
     GROUP BY m.id`
  ).bind(memberId).all()

  const directs = (directsRaw.results as any[]).map(d => ({
    id: d.id,
    max_price_usd: d.max_price_usd ?? 0,
    has_bv_package: d.has_bv_package === 1
  }))

  // Partenaire (licence seule) → plafonné à Manager (rang 2)
  const isPartenaire = member.member_status === 'Partenaire'

  for (const rank of ranks.results as any[]) {
    // Partenaire plafonné à Manager
    if (isPartenaire && rank.rank_order > 2) continue

    // Choisir BV total ou mensuel selon config du rang (avec fallback global)
    // bv_rank_use_total = 1 par défaut → utilise left_bv_total / right_bv_total (CDC)
    const useTotal = rank.bv_rank_use_total !== undefined
      ? rank.bv_rank_use_total === 1
      : globalUseTotal

    const leftBV  = useTotal ? (member.left_bv_total  || 0) : (member.left_bv_monthly  || 0)
    const rightBV = useTotal ? (member.right_bv_total || 0) : (member.right_bv_monthly || 0)
    const minLeg  = Math.min(leftBV, rightBV)

    if (minLeg < rank.min_bv_leg) continue

    // Compter les directs qualifiés selon le seuil de prix du rang.
    // Règle unique : le direct doit avoir un package validé avec price_usd >= min_monthly_package_value.
    // min_monthly_package_value est configurable et modifiable côté admin dans la section Rangs & Primes.
    // Si min_monthly_package_value = 0 (non configuré), tout package avec bv_value > 0 suffit.
    // Aucun type de package (Pinnacle, Production...) n'est utilisé — seul le montant compte.
    const rankPriceThreshold: number = rank.min_monthly_package_value ?? 0
    const qualifiedDirectsCount = directs.filter(d =>
      rankPriceThreshold > 0
        ? d.max_price_usd >= rankPriceThreshold  // seuil configuré admin
        : d.has_bv_package                        // fallback : tout package avec BV
    ).length

    if (qualifiedDirectsCount < rank.min_directs) continue

    return rank.rank_name as RankName
  }

  return 'none'
}

// ── PROPAGATION BV ────────────────────────────────────────────

/**
 * Propage les BV vers le haut dans l'arbre binaire.
 *
 * RÈGLES CDC :
 * - Le membre acheteur NE reçoit PAS de BV sur son propre achat.
 * - Seuls les ANCÊTRES reçoivent le BV, niveau par niveau.
 * - Un ancêtre sans licence active = BV perdu pour lui seul, la remontée CONTINUE.
 * - Si binary_position est NULL pour un nœud → ancêtre ignoré, remontée continue.
 * - Holding Tank : seul l'acheteur peut être en HT (vérifié avant l'appel).
 *   Les ancêtres intermédiaires ne peuvent pas être en HT (ils sont dans l'arbre).
 * - ROOT reçoit toujours le BV (stats globales), sans BVLog.
 * - Après propagation complète : bv_propagated = 1 sur la commande.
 * - Source de vérité : Package.bv_value — jamais recalculé.
 * - Max 100 niveaux de profondeur (sécurité boucle infinie).
 */
export async function propagateBV(
  db: D1Database,
  memberId: string,
  bvAmount: number,
  period: string,
  sourceOrderId?: string
): Promise<void> {
  if (!bvAmount || bvAmount <= 0) {
    console.error(`BV_003 — Valeur BV nulle ou manquante pour membre ${memberId}`)
    return
  }

  // ── ÉTAPE 1 : charger toute la chaîne d'ancêtres en UNE seule requête CTE ──
  // Remplace la boucle while avec 2 requêtes par itération (O(2N) → O(1)).
  // Limite à 100 niveaux (arbre impossiblement profond = bug de données).
  const ancestorRows = await db.prepare(`
    WITH RECURSIVE ancestors(id, binary_parent_id, binary_position, unique_id, license_active, depth) AS (
      -- Point de départ : le membre acheteur lui-même
      SELECT id, binary_parent_id, binary_position, unique_id, license_active, 0
      FROM members WHERE id = ?
      UNION ALL
      -- Remonter vers la racine
      SELECT m.id, m.binary_parent_id, m.binary_position, m.unique_id, m.license_active, a.depth + 1
      FROM members m
      INNER JOIN ancestors a ON m.id = a.binary_parent_id
      WHERE a.depth < 100
    )
    -- On exclut le membre acheteur lui-même (depth=0), on garde ses ancêtres
    SELECT id, binary_parent_id, binary_position, unique_id, license_active, depth
    FROM ancestors
    WHERE depth > 0
    ORDER BY depth ASC
  `).bind(memberId).all()

  const ancestors = ancestorRows.results as any[]
  if (ancestors.length === 0) {
    // Aucun ancêtre — marquer quand même l'order et sortir
    if (sourceOrderId) {
      await db.prepare(
        `UPDATE package_orders SET bv_propagated = 1, updated_at = datetime('now') WHERE id = ? AND bv_propagated = 0`
      ).bind(sourceOrderId).run()
    }
    return
  }

  // ── ÉTAPE 2 : construire les lots d'écritures en mémoire ──────────────────
  // On construit la liste des ancêtres à mettre à jour AVANT d'écrire.
  // Chaque ancêtre "reçoit" via la position de son ENFANT dans la chaîne.
  //
  // Schéma de lecture :
  //   ancestors[0] = parent direct du membre acheteur
  //   ancestors[0].binary_position = position du membre acheteur chez son parent
  //     → "L" : le parent reçoit en left_bv
  //     → "R" : le parent reçoit en right_bv
  //
  // Pour retrouver la position de chaque ancêtre chez son propre parent,
  // on lit binary_position de l'ancêtre courant (= sa position chez son parent).

  // Construire une map id → ancêtre pour lookup rapide
  const ancestorMap = new Map<string, any>()
  for (const a of ancestors) ancestorMap.set(a.id, a)

  // Reconstruire la chaîne parent → position de l'enfant
  // ancestors[i].binary_position = position de l'ancêtre[i] chez ancêtre[i+1]
  // Donc pour mettre à jour l'ancêtre[i+1], on utilise binary_position de [i]

  // Construire la liste des mises à jour :
  // Pour chaque ancêtre (= parent d'un nœud dans la chaîne),
  // la position vient de l'enfant (le nœud en dessous dans la chaîne).
  //
  // La chaîne est : memberId → ancestors[0] → ancestors[1] → ... → ROOT
  // ancestors[0] est le parent du membre, sa position est stockée sur le MEMBRE lui-même.
  // Donc on récupère la position du membre acheteur séparément.

  // Récupérer la position du membre acheteur (pour mettre à jour ancestors[0])
  const buyerRow = await db.prepare(
    `SELECT binary_position FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  const buyerPosition = buyerRow?.binary_position as 'L' | 'R' | null

  // Construire la chaîne de (parentId, positionDeLEnfant) pour chaque ancêtre à mettre à jour
  type AncestorUpdate = {
    id: string
    unique_id: string
    license_active: number
    position: 'L' | 'R'  // position de l'enfant chez ce parent → détermine left ou right_bv
  }

  const updates: AncestorUpdate[] = []

  for (let i = 0; i < ancestors.length; i++) {
    const anc = ancestors[i]
    // La position de l'enfant chez cet ancêtre :
    //   - Pour ancestors[0] : c'est la position du membre acheteur (buyerPosition)
    //   - Pour ancestors[i>0] : c'est la position de ancestors[i-1] chez ancestors[i]
    //     = ancestors[i-1].binary_position
    const childPosition: 'L' | 'R' | null = i === 0
      ? buyerPosition
      : (ancestors[i - 1].binary_position as 'L' | 'R' | null)

    if (!childPosition) continue  // lien incohérent → skip cet ancêtre, continuer (CDC §8)

    updates.push({
      id:             anc.id,
      unique_id:      anc.unique_id,
      license_active: anc.license_active,
      position:       childPosition,
    })

    // ROOT = fin de chaîne (traité ci-dessous, pas de BVLog)
    if (anc.unique_id === 'ROOT') break
  }

  // ── ÉTAPE 3 : écriture batch via D1 batch() ───────────────────────────────
  // D1 batch() envoie toutes les requêtes en un seul round-trip réseau.
  // Diviser en chunks de 50 pour respecter la limite D1 (100 statements/batch).
  const BATCH_SIZE = 50

  const statements: D1PreparedStatement[] = []

  for (const upd of updates) {
    if (upd.unique_id === 'ROOT') {
      // ROOT reçoit toujours, sans condition de licence, sans BVLog
      if (upd.position === 'L') {
        statements.push(db.prepare(
          `UPDATE members SET left_bv_monthly  = left_bv_monthly  + ?, left_bv_total   = left_bv_total   + ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(bvAmount, bvAmount, upd.id))
      } else {
        statements.push(db.prepare(
          `UPDATE members SET right_bv_monthly = right_bv_monthly + ?, right_bv_total  = right_bv_total  + ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(bvAmount, bvAmount, upd.id))
      }
    } else if (upd.license_active) {
      // Ancêtre actif → UPDATE BV + INSERT bv_log + INSERT rank_queue
      if (upd.position === 'L') {
        statements.push(db.prepare(
          `UPDATE members SET left_bv_monthly  = left_bv_monthly  + ?, left_bv_total   = left_bv_total   + ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(bvAmount, bvAmount, upd.id))
      } else {
        statements.push(db.prepare(
          `UPDATE members SET right_bv_monthly = right_bv_monthly + ?, right_bv_total  = right_bv_total  + ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(bvAmount, bvAmount, upd.id))
      }
      statements.push(db.prepare(
        `INSERT INTO bv_logs (id, member_id, source_member_id, bv_amount, bv_type, package_order_id, propagated, period)
         VALUES (?, ?, ?, ?, 'propagated', ?, 1, ?)`
      ).bind(generateId(), upd.id, memberId, bvAmount, sourceOrderId || null, period))

      statements.push(db.prepare(
        `INSERT OR IGNORE INTO rank_queue (id, member_id, trigger_event, status)
         VALUES (?, ?, 'bv_propagation', 'pending')`
      ).bind(generateId(), upd.id))
    }
    // Licence inactive → BV perdu pour cet ancêtre, on continue (CDC §8) — aucune écriture
  }

  // Marquer l'order comme propagé
  if (sourceOrderId) {
    statements.push(db.prepare(
      `UPDATE package_orders SET bv_propagated = 1, updated_at = datetime('now') WHERE id = ? AND bv_propagated = 0`
    ).bind(sourceOrderId))
  }

  // Exécuter en chunks de BATCH_SIZE
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE)
    await db.batch(chunk)
  }
}

/**
 * Enqueue une propagation BV (async via BVQueue)
 */
export async function queueBVPropagation(
  db: D1Database,
  memberId: string,
  packageOrderId: string,
  bvAmount: number,
  period: string
): Promise<void> {
  await db.prepare(
    `INSERT INTO bv_queue (id, member_id, package_order_id, bv_amount, period, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).bind(generateId(), memberId, packageOrderId, bvAmount, period).run()
}

/**
 * Traite la BVQueue — appelé toutes les 5 minutes
 * Max 10 items par cycle, séquentiel pour éviter conflits
 */
export async function processBVQueue(db: D1Database): Promise<{ processed: number; errors: number }> {
  const items = await db.prepare(
    `SELECT * FROM bv_queue WHERE status = 'pending' AND attempts < 3 ORDER BY created_at ASC LIMIT 10`
  ).all()

  let processed = 0
  let errors = 0

  for (const item of items.results as any[]) {
    await db.prepare(
      `UPDATE bv_queue SET status = 'processing', attempts = attempts + 1 WHERE id = ?`
    ).bind(item.id).run()

    try {
      const member = await db.prepare(
        `SELECT in_holding_tank, binary_parent_id FROM members WHERE id = ?`
      ).bind(item.member_id).first() as any

      if (!member || member.in_holding_tank || !member.binary_parent_id) {
        // BV_001 — Remettre en pending si encore en Holding Tank
        await db.prepare(
          `UPDATE bv_queue SET status = 'pending', attempts = MAX(0, attempts - 1), last_error = 'BV_001: Membre en Holding Tank' WHERE id = ?`
        ).bind(item.id).run()
        continue
      }

      // Idempotence — vérifier si déjà propagé via bv_propagated sur la commande
      // C'est la source de vérité la plus fiable (CDC §1 — idempotence)
      if (item.package_order_id) {
        const order = await db.prepare(
          `SELECT bv_propagated FROM package_orders WHERE id = ?`
        ).bind(item.package_order_id).first() as any

        if (order?.bv_propagated) {
          await db.prepare(
            `UPDATE bv_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?`
          ).bind(item.id).run()
          continue
        }
      }

      await propagateBV(db, item.member_id, item.bv_amount, item.period, item.package_order_id)

      await db.prepare(
        `UPDATE bv_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?`
      ).bind(item.id).run()
      processed++
    } catch (err: any) {
      await db.prepare(
        `UPDATE bv_queue SET status = 'failed', last_error = ? WHERE id = ?`
      ).bind(err.message || 'Unknown error', item.id).run()
      errors++
    }
  }

  return { processed, errors }
}

// ── PROCESSOR RANG ────────────────────────────────────────────

/**
 * W2 — Traite la rank_queue : recalcule les rangs en attente
 * Appelé après chaque cycle BV
 */
export async function processRankQueue(db: D1Database): Promise<{ processed: number }> {
  const items = await db.prepare(
    `SELECT DISTINCT member_id FROM rank_queue
     WHERE status = 'pending' AND attempts < 5
     ORDER BY created_at ASC LIMIT 50`
  ).all()

  let processed = 0

  for (const item of items.results as any[]) {
    // Marquer en traitement
    await db.prepare(
      `UPDATE rank_queue SET status = 'processing', attempts = attempts + 1
       WHERE member_id = ? AND status = 'pending'`
    ).bind(item.member_id).run()

    try {
      const newRank = await calculateMemberRank(db, item.member_id)

      // Récupérer le rang actuel pour détecter une promotion
      const currentMember = await db.prepare(
        `SELECT current_rank, first_name, last_name FROM members WHERE id = ?`
      ).bind(item.member_id).first() as any

      // Enregistrer rank_achieved_at si nouvelle promotion
      const isPromotion = newRank !== 'none' && newRank !== currentMember?.current_rank
      if (isPromotion) {
        await db.prepare(
          `UPDATE members SET current_rank = ?, rank_achieved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(newRank, item.member_id).run()
        // Créditer immédiatement la prime de rang (règle : rang le plus haut du mois)
        const period = getMauritiusDateStr().substring(0, 7) // 'YYYY-MM'
        await upgradePrimeLeadership(db, item.member_id, newRank, period)
        await createNotification(
          db, item.member_id, 'success',
          `🏆 Félicitations ! Nouveau rang atteint`,
          `Vous venez d'atteindre le rang ${newRank} ! Votre prime de leadership a été créditée.`
        )
      } else {
        await db.prepare(
          `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(newRank, item.member_id).run()
      }

      await db.prepare(
        `UPDATE rank_queue SET status = 'completed', processed_at = datetime('now')
         WHERE member_id = ? AND status = 'processing'`
      ).bind(item.member_id).run()

      processed++
    } catch (err: any) {
      await db.prepare(
        `UPDATE rank_queue SET status = 'pending', last_error = ?
         WHERE member_id = ? AND status = 'processing'`
      ).bind(err.message || 'Unknown error', item.member_id).run()
    }
  }

  return { processed }
}

/**
 * upgradePrimeLeadership — Appelée à chaque promotion de rang dans le même mois.
 *
 * Règle CDC v2 : la prime de leadership est versée INTÉGRALEMENT au membre.
 * En PLUS, un Crédit de Croissance (CC) additionnel est généré séparément.
 *
 * Comportement :
 *   1. Prime brute du rang = versée intégrale (plafonné au monthly_cap)
 *   2. CC = % de la prime brute, crédité en bonus additionnel (wallet CC)
 *   3. RS = % de la prime brute, crédité séparément (wallet RS, rang Mentor+)
 *   4. Neutraliser les commissions prime_leadership inférieures ce mois
 *   5. Créditer le wallet uniquement du delta (primeIntegrale - déjà payé)
 */
export async function upgradePrimeLeadership(
  db: D1Database,
  memberId: string,
  newRank: string,
  period: string   // ex: '2026-05'
): Promise<void> {
  // ── Règle Administrator : commission unique à vie ────────────
  // Bloqué si le membre a déjà reçu une prime Administrator dans son historique.
  if (newRank === 'Administrator') {
    const alreadyPaid = await db.prepare(
      `SELECT id FROM commissions
       WHERE member_id = ? AND type = 'prime_leadership' AND description LIKE '%Administrator%'
       LIMIT 1`
    ).bind(memberId).first()
    if (alreadyPaid) return
  }
  // ────────────────────────────────────────────────────────────

  // ── 1. Config du nouveau rang ─────────────────────────────
  const rankConfig = await db.prepare(
    `SELECT monthly_prime, monthly_cap FROM rank_config WHERE rank_name = ?`
  ).bind(newRank).first() as any
  if (!rankConfig || !rankConfig.monthly_prime) return

  const cap        = rankConfig.monthly_cap   || 0
  const grossPrime = rankConfig.monthly_prime || 0

  // ── 2. Config CC / RS ────────────────────────────────────
  const ccPct     = await getConfigPct(db, 'credit_croissance_pct', 20)
  const rsPct     = await getConfigPct(db, 'reserve_strategique_pct', 10)
  const ccEnabled = await isBonusEnabled(db, 'credit_croissance_enabled')
  const rsEnabled = await isBonusEnabled(db, 'reserve_strategique_enabled')

  // Lire le toggle rétroactivité intra-mois (utilisé en §8b / §8d)
  const retroEnabled =
    (await db.prepare(`SELECT value FROM bonus_config WHERE key = 'retroactivite_intra_mois_enabled'`)
      .first() as any)?.value !== 'false'
  const ccMinRank = await getConfigStr(db, 'credit_croissance_rank', 'Leader')
  const rsMinRank = await getConfigStr(db, 'reserve_strategique_rank', 'Mentor')
  const rankIdx   = getRankIndex(newRank)

  // RS — rang Mentor à President inclus (Director et au-dessus exclus)
  // Prélèvement réel sur la prime brute — le membre reçoit la prime NETTE
  const rsEligible = rsEnabled
    && rankIdx >= getRankIndex(rsMinRank)
    && rankIdx < getRankIndex('Director')
  const rsAmt = rsEligible ? grossPrime * (rsPct / 100) : 0

  // CC additionnel — calculé SUR la prime brute, indépendant du versement
  // Puis plafonné : le wallet CC du membre ne peut jamais dépasser cc_cap (défaut 5000$)
  const ccCapRaw  = await getConfigPct(db, 'credit_croissance_cap', 5000)
  const ccCap     = ccCapRaw > 0 ? ccCapRaw : 5000
  const ccAmtRaw  = (ccEnabled && rankIdx >= getRankIndex(ccMinRank))
    ? grossPrime * (ccPct / 100) : 0
  // CC cible = min(CC calculé, plafond absolu) — c'est le montant final visé ce mois
  // Solde CC actuel ce mois uniquement (entrées 'held'+'available' de la période)
  // On compare CC cible vs CC déjà actif CE MOIS pour calculer le delta à créditer
  const ccBalanceRow = await db.prepare(
    `SELECT COALESCE(SUM(amount - used_amount), 0) as bal
     FROM credit_croissance
     WHERE member_id = ? AND period = ? AND status IN ('held','available')`
  ).bind(memberId, period).first() as any
  const ccCurrentBalance = ccBalanceRow?.bal ?? 0
  // ccAmt = montant CC cible pour ce rang (plafonné au cap absolu)
  const ccAmt = Math.min(ccAmtRaw, ccCap)

  // ── 3. Prime NETTE versée au membre (prime brute − prélèvement RS)
  // La RS est prélevée AVANT versement : membre reçoit grossPrime × (1 − rsPct%)
  const netPrime    = grossPrime - rsAmt
  const targetPrime = Math.min(netPrime, cap)

  // ── 3b. Réserve Stratégique — exécutée AVANT le guard delta ──────────────
  // IMPORTANT : la RS doit s'exécuter indépendamment du delta prime.
  // Cas typique : upgrade Mentor→Superviseur dans le même mois.
  // La prime nette Superviseur (6300) = alreadyPaid (6300 déjà crédité) → delta=0
  // mais grossPrime a changé (3000→7000), donc la RS doit être remplacée.
  // rsAmt et grossPrime sont calculés d'après le newRank — c'est la source de vérité.
  if (rsAmt > 0) {
    const abondementRate = await getAbondementRate(db, newRank)
    const abondementAmt  = grossPrime * abondementRate  // % appliqué sur la prime brute
    const totalRS        = rsAmt + abondementAmt         // épargne membre + abondement compagnie
    const lockedUntil    = new Date()
    lockedUntil.setFullYear(lockedUntil.getFullYear() + 3)  // +3 ans exacts depuis aujourd'hui

    // Annulation rétroactive — RS du même mois (rang inférieur atteint précédemment)
    const prevRSRow = await db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM reserve_strategique
       WHERE member_id = ? AND period = ? AND status = 'locked'`
    ).bind(memberId, period).first() as any
    const alreadyRS = prevRSRow?.total ?? 0

    // Vérifier si la RS déjà existante est identique (même totalRS) → pas de doublon
    const alreadyRSExactRow = await db.prepare(
      `SELECT COUNT(*) as cnt FROM reserve_strategique
       WHERE member_id = ? AND period = ? AND status = 'locked' AND amount = ?`
    ).bind(memberId, period, totalRS).first() as any
    const rsAlreadyCorrect = (alreadyRSExactRow?.cnt ?? 0) > 0

    if (!rsAlreadyCorrect) {
      if (alreadyRS > 0) {
        // Annuler les entrées RS précédentes du même mois
        await db.prepare(
          `UPDATE reserve_strategique SET status = 'cancelled'
           WHERE member_id = ? AND period = ? AND status = 'locked'`
        ).bind(memberId, period).run()
        // Annuler les commissions RS précédentes du même mois
        await db.prepare(
          `UPDATE commissions SET status = 'cancelled'
           WHERE member_id = ? AND period = ? AND type = 'reserve_strategique' AND status = 'locked'`
        ).bind(memberId, period).run()
        // Décrémenter le compteur members.reserve_strategique
        await db.prepare(
          `UPDATE members SET reserve_strategique = MAX(0, reserve_strategique - ?) WHERE id = ?`
        ).bind(alreadyRS, memberId).run()
      }

      await db.prepare(
        `INSERT INTO reserve_strategique
          (id, member_id, amount, period, locked_until, abondement_rate, status)
         VALUES (?, ?, ?, ?, ?, ?, 'locked')`
      ).bind(generateId(), memberId, totalRS, period,
        lockedUntil.toISOString().substring(0, 10), abondementRate).run()

      await db.prepare(
        `UPDATE members SET reserve_strategique = reserve_strategique + ? WHERE id = ?`
      ).bind(totalRS, memberId).run()

      // Commission RS (non retirable — traçabilité) avec détail du prélèvement
      await db.prepare(
        `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
         VALUES (?, ?, 'reserve_strategique', ?, ?, ?, 'locked')`
      ).bind(generateId(), memberId, totalRS,
        `Réserve Stratégique ${period} — prélèvement ${rsAmt.toFixed(2)}$ + abondement ${(abondementRate*100).toFixed(0)}% (${abondementAmt.toFixed(2)}$) — libération ${lockedUntil.toISOString().substring(0,10)}`,
        period).run()
    }
  }

  // ── 3c. Montant prime déjà crédité en pending ce mois ─────
  const alreadyRow = await db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM wallet_transactions
     WHERE member_id = ? AND wallet_type = 'pending'
       AND transaction_type = 'prime_leadership'
       AND created_at >= ? || '-01'`
  ).bind(memberId, period).first() as any
  const alreadyPaid = alreadyRow?.total ?? 0

  const delta = targetPrime - alreadyPaid
  if (delta <= 0) {
    // Rang inférieur ou égal déjà crédité en prime — mais §3b-CC et §8d doivent quand même
    // s'exécuter si ce membre vient de changer de rang.

    // ── §3b-CC : Crédit de Croissance (indépendant de la prime) ──────────────
    // Le CC doit être calculé pour le nouveau rang même si delta=0 (prime déjà versée).
    // Ex : double recalcul dans le même mois → prime déjà créditée mais CC peut manquer.
    if (ccAmt > 0) {
      const alreadyCC = ccCurrentBalance
      const deltaCC   = ccAmt - alreadyCC
      if (deltaCC > 0) {
        const ccValidityMonths = await getConfigPct(db, 'credit_croissance_validity_months', 3)
        const availableAt = getNextMonthStart(period) + ' 00:00:00'
        const expiresAt   = (() => {
          const d = new Date(getNextMonthStart(period))
          d.setMonth(d.getMonth() + ccValidityMonths)
          return d.toISOString().replace('T',' ').substring(0,19)
        })()
        const ccEntryId = generateId()
        const ccCommId  = generateId()
        // Trouver la commission prime_leadership active ce mois (source_commission_id)
        const existingCommRow = await db.prepare(
          `SELECT id FROM commissions
           WHERE member_id = ? AND type = 'prime_leadership' AND period = ?
             AND status IN ('pending','approved','paid') ORDER BY created_at DESC LIMIT 1`
        ).bind(memberId, period).first() as any
        const sourceCommId = existingCommRow?.id ?? null
        if (alreadyCC > 0) {
          const balBeforeUpgrade = await getCCBalance(db, memberId)
          await db.prepare(
            `UPDATE credit_croissance SET status = 'expired', updated_at = datetime('now')
             WHERE member_id = ? AND period = ? AND status IN ('held','available')`
          ).bind(memberId, period).run()
          await db.prepare(
            `INSERT INTO cc_transactions (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
             VALUES (?, ?, 'debit', ?, ?, ?, ?, 'upgrade_cancel', ?)`
          ).bind(generateId(), memberId, alreadyCC, Math.max(0, balBeforeUpgrade.total - alreadyCC),
            `Remplacement — Crédit de Croissance rang précédent annulé suite à la promotion ${newRank}`,
            ccEntryId, period).run()
        } else {
          await db.prepare(
            `UPDATE credit_croissance SET status = 'expired', updated_at = datetime('now')
             WHERE member_id = ? AND period = ? AND status IN ('held','available')`
          ).bind(memberId, period).run()
        }
        await db.prepare(
          `INSERT INTO credit_croissance
            (id, member_id, amount, used_amount, period, source_commission_id,
             available_at, expires_at, status)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'held')`
        ).bind(ccEntryId, memberId, ccAmt, period, sourceCommId, availableAt, expiresAt).run()
        await db.prepare(
          `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
           VALUES (?, ?, 'credit_croissance', ?, ?, ?, 'non_withdrawable')`
        ).bind(ccCommId, memberId, ccAmt,
          `Crédit de Croissance — Leadership ${newRank} ${period}`, period).run()
        const balAfterCC = await getCCBalance(db, memberId)
        await db.prepare(
          `INSERT INTO cc_transactions
            (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
           VALUES (?, ?, 'credit', ?, ?, ?, ?, 'credit_croissance', ?)`
        ).bind(generateId(), memberId, ccAmt, balAfterCC.total,
          `Crédit de Croissance — Prime Leadership ${newRank} (${period}) · Disponible le ${getMonthName(availableAt)} · Valable ${ccValidityMonths} mois`,
          ccEntryId, period).run()
      }
    }

    // ── §8d : Rétroactivité sponsors ─────────────────────────────────────────
    if (await isBonusEnabled(db, 'rayonnement_enabled') || await isBonusEnabled(db, 'influence_enabled')) {
      const memberRowFor8d = await db.prepare(`SELECT sponsor_id FROM members WHERE id = ?`).bind(memberId).first() as any
      if (memberRowFor8d?.sponsor_id) {
        const sponsorFor8d = await db.prepare(
          `SELECT * FROM members WHERE id = ? AND license_active = 1 AND member_status IN ('AMI','Partenaire') AND unique_id != 'ROOT'`
        ).bind(memberRowFor8d.sponsor_id).first() as any
        if (sponsorFor8d) {
          const sponsorRankCfgFor8d = await db.prepare(`SELECT monthly_cap FROM rank_config WHERE rank_name = ?`).bind(sponsorFor8d.current_rank).first() as any
          const sponsorCapFor8d = sponsorRankCfgFor8d?.monthly_cap || 0
          const sponsorMVFor8d = await db.prepare(`SELECT leadership_prime, influence_bonus FROM monthly_validations WHERE member_id = ? AND period = ?`).bind(memberRowFor8d.sponsor_id, period).first() as any
          const sponsorRemCapFor8d = Math.max(0, sponsorCapFor8d - (sponsorMVFor8d?.leadership_prime || 0) - (sponsorMVFor8d?.influence_bonus || 0))
          // Purge + recalcul rayonnement sponsor
          const oldRayFor8d = await db.prepare(`SELECT id, member_id, amount FROM commissions WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`).bind(memberRowFor8d.sponsor_id, period).all()
          for (const row of oldRayFor8d.results as any[]) {
            await db.prepare(`UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`).bind(row.amount, row.member_id).run()
          }
          await db.prepare(`DELETE FROM commissions WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`).bind(memberRowFor8d.sponsor_id, period).run()
          if (await isBonusEnabled(db, 'rayonnement_enabled')) {
            await calculateRayonnementBonus(db, memberRowFor8d.sponsor_id, period, sponsorRemCapFor8d, retroEnabled)
          }
          // Recalcul influence depuis ce filleul
          if (await isBonusEnabled(db, 'influence_enabled')) {
            const memberPrimeFor8d = (await db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM commissions WHERE member_id=? AND type='prime_leadership' AND period=? AND status IN ('pending','approved','paid')`).bind(memberId, period).first() as any)?.t || 0
            const memberCapFor8d = (await db.prepare(`SELECT monthly_cap FROM rank_config WHERE rank_name = (SELECT current_rank FROM members WHERE id = ?)`).bind(memberId).first() as any)?.monthly_cap || 0
            const oldInflFor8d = await db.prepare(`SELECT id, member_id, amount FROM commissions WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`).bind(memberId, period).all()
            for (const row of oldInflFor8d.results as any[]) {
              await db.prepare(`UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`).bind(row.amount, row.member_id).run()
            }
            await db.prepare(`DELETE FROM commissions WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`).bind(memberId, period).run()
            await calculateInfluenceBonus(db, memberId, memberPrimeFor8d, period, Math.max(0, memberCapFor8d - memberPrimeFor8d), retroEnabled)
          }
        }
      }
    }
    return
  }

  // ── 4. Neutraliser les commissions prime_leadership inférieures ce mois ──
  await db.prepare(
    `UPDATE commissions
     SET amount = 0,
         description = description || ' — Remplacée par rang ' || ?,
         status = 'cancelled'
     WHERE member_id = ? AND type = 'prime_leadership'
       AND period = ? AND status IN ('pending','approved')`
  ).bind(newRank, memberId, period).run()

  // Clôturer les pending_wallet_entries liées
  await db.prepare(
    `UPDATE pending_wallet_entries
     SET total_amount = days_paid * amount_per_day,
         status = 'completed'
     WHERE member_id = ? AND period = ? AND commission_type = 'prime_leadership'
       AND status IN ('pending_release','active')`
  ).bind(memberId, period).run()

  // ── 5. Commission prime_leadership INTÉGRALE ──────────────
  const newCommId = generateId()
  await db.prepare(
    `INSERT INTO commissions
      (id, member_id, type, amount, description, period, rank_at_time, status)
     VALUES (?, ?, 'prime_leadership', ?, ?, ?, ?, 'pending')`
  ).bind(
    newCommId, memberId, targetPrime,
    `Prime de Leadership ${newRank} — ${period}`,
    period, newRank
  ).run()

  // Créditer le delta en pending wallet
  await walletOperation(db, memberId, delta, 'pending', 'prime_leadership')
  await creditPendingWallet(db, memberId, newCommId, 'prime_leadership', period, targetPrime)

  // ── 6. Crédit de Croissance ADDITIONNEL ───────────────────
  // ccAmt = montant CC cible pour ce rang (plafonné au cap absolu)
  // ccCurrentBalance = CC actif ce mois (calculé en §2)
  // deltaCC = différence → si positif, on complète jusqu'au plafond
  if (ccAmt > 0) {
    const alreadyCC = ccCurrentBalance
    const deltaCC   = ccAmt - alreadyCC

    if (deltaCC > 0) {
      // Calculer available_at = 1er du mois suivant, expires_at = +validityMonths
      const ccValidityMonths = await getConfigPct(db, 'credit_croissance_validity_months', 3)
      const availableAt = getNextMonthStart(period) + ' 00:00:00'
      const expiresAt   = (() => {
        const d = new Date(getNextMonthStart(period))
        d.setMonth(d.getMonth() + ccValidityMonths)
        return d.toISOString().replace('T',' ').substring(0,19)
      })()

      const ccEntryId = generateId()
      const ccCommId  = generateId()

      // Journal débit — lire le solde AVANT expiration (ordre important)
      if (alreadyCC > 0) {
        const balBeforeUpgrade = await getCCBalance(db, memberId)
        // Annuler les entrées CC précédentes ce mois (rang inférieur)
        await db.prepare(
          `UPDATE credit_croissance SET status = 'expired',
             updated_at = datetime('now')
           WHERE member_id = ? AND period = ? AND status IN ('held','available')`
        ).bind(memberId, period).run()
        await db.prepare(
          `INSERT INTO cc_transactions (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
           VALUES (?, ?, 'debit', ?, ?, ?, ?, 'upgrade_cancel', ?)`
        ).bind(generateId(), memberId, alreadyCC, Math.max(0, balBeforeUpgrade.total - alreadyCC),
          `Remplacement — Crédit de Croissance rang précédent annulé suite à la promotion ${newRank}`,
          ccEntryId, period).run()
      } else {
        // Pas de CC précédent — expirer quand même les éventuelles entrées orphelines
        await db.prepare(
          `UPDATE credit_croissance SET status = 'expired',
             updated_at = datetime('now')
           WHERE member_id = ? AND period = ? AND status IN ('held','available')`
        ).bind(memberId, period).run()
      }

      // Nouvelle entrée CC pour le rang upgradé
      await db.prepare(
        `INSERT INTO credit_croissance
          (id, member_id, amount, used_amount, period, source_commission_id,
           available_at, expires_at, status)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'held')`
      ).bind(ccEntryId, memberId, ccAmt, period, newCommId, availableAt, expiresAt).run()

      // Commission CC (non retirable — traçabilité dans l'historique commissions)
      await db.prepare(
        `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
         VALUES (?, ?, 'credit_croissance', ?, ?, ?, 'non_withdrawable')`
      ).bind(ccCommId, memberId, ccAmt,
        `Crédit de Croissance — Leadership ${newRank} ${period}`, period).run()

      // Journal CC — crédit (balance_after via getCCBalance = source de vérité)
      const balAfterCC = await getCCBalance(db, memberId)
      await db.prepare(
        `INSERT INTO cc_transactions
          (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
         VALUES (?, ?, 'credit', ?, ?, ?, ?, 'credit_croissance', ?)`
      ).bind(generateId(), memberId, ccAmt, balAfterCC.total,
        `Crédit de Croissance — Prime Leadership ${newRank} (${period}) · Disponible le ${getMonthName(availableAt)} · Valable ${ccValidityMonths} mois`,
        ccEntryId, period).run()
    }
  }

  // §7 RS déplacé avant le guard delta (voir §3b ci-dessus) — supprimé ici pour éviter doublon

  // ── 8. Verrou monthly_validations ────────────────────────
  // INSERT OR REPLACE pour mettre à jour si un verrou partiel existait déjà
  // (ex: posé à rang Manager avec influence_bonus=0, on le remplace par Mentor)
  await db.prepare(
    `INSERT OR REPLACE INTO monthly_validations (member_id, period, leadership_prime, influence_bonus)
     VALUES (?, ?, ?, 0)`
  ).bind(memberId, period, targetPrime).run()

  // ── 8b. Bonus d'Influence ─────────────────────────────────
  // Purge COMPLÈTE : supprime tous les bonus_influence générés depuis ce membre
  // (dans le wallet de ses sponsors N1..N5) pour cette période, puis recalcul.
  // Impact croisé : annuler également les montants dans les wallets pending correspondants.
  const oldInfluenceRows = await db.prepare(
    `SELECT id, member_id, amount FROM commissions
     WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
  ).bind(memberId, period).all()

  for (const row of oldInfluenceRows.results as any[]) {
    // Annuler le wallet pending du bénéficiaire (rembourser le delta)
    await db.prepare(
      `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
    ).bind(row.amount, row.member_id).run()
  }
  await db.prepare(
    `DELETE FROM commissions
     WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
  ).bind(memberId, period).run()

  let influenceSpent = 0
  const remainingCapForBonuses = cap - targetPrime
  if (await isBonusEnabled(db, 'influence_enabled')) {
    influenceSpent = await calculateInfluenceBonus(
      db, memberId, targetPrime, period, remainingCapForBonuses, retroEnabled
    )
    // Mettre à jour le verrou avec le montant d'influence réellement distribué
    await db.prepare(
      `UPDATE monthly_validations SET influence_bonus = ? WHERE member_id = ? AND period = ?`
    ).bind(influenceSpent, memberId, period).run()
  }

  // ── 8c. Bonus de Rayonnement (du membre lui-même) ─────────
  // Purge + recalcul du rayonnement que CE membre reçoit de SES directs.
  // Annuler les wallets pending liés avant purge.
  const oldRayRows = await db.prepare(
    `SELECT id, member_id, amount FROM commissions
     WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
  ).bind(memberId, period).all()
  for (const row of oldRayRows.results as any[]) {
    await db.prepare(
      `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
    ).bind(row.amount, row.member_id).run()
  }
  await db.prepare(
    `DELETE FROM commissions
     WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
  ).bind(memberId, period).run()

  if (await isBonusEnabled(db, 'rayonnement_enabled')) {
    const capAfterInfluence = Math.max(0, remainingCapForBonuses - influenceSpent)
    // Passer retroEnabled pour ignorer les conditions BV/parrainage en mode rétroactif
    await calculateRayonnementBonus(db, memberId, period, capAfterInfluence, retroEnabled)
  }

  // ── 8d. Recalcul rayonnement + influence des sponsors (rétroactivité même mois) ────
  //
  // RÈGLE MÉTIER : si un sponsor se qualifie (rang / package) APRÈS que ses filleuls
  // ont déjà atteint leur rang dans le MÊME mois calendaire, il doit recevoir
  // immédiatement ses bonus comme s'il avait été qualifié dès le début du mois.
  //
  // Ce bloc couvre deux cas :
  //   A) Rayonnement N1 (sponsor direct) : 10% de la prime du filleul qui vient de monter.
  //      → Purge + recalcul complet du rayonnement du sponsor direct.
  //   B) Influence N1..N5 (5 niveaux) : le filleul qui vient de monter génère de
  //      l'influence vers ses sponsors de niveaux 1 à 5. Si un de ces sponsors s'est
  //      qualifié ce mois après que le filleul a monté, il n'avait pas reçu l'influence.
  //      → Pour chaque niveau N1..N5 depuis CE filleul, on recalcule l'influence
  //        due à CE filleul chez chaque sponsor éligible.
  //
  // NB : calculateInfluenceBonus est appelée avec memberId = le filleul qui vient
  //      de monter (source de l'influence), et remonte automatiquement sur 5 niveaux.
  //      Elle est déjà idempotente (purge + recalcul).

  const memberRow = await db.prepare(
    `SELECT sponsor_id FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  if (memberRow?.sponsor_id) {
    const sponsorId = memberRow.sponsor_id

    // Vérifier que le sponsor est actif et éligible (pas ROOT)
    const sponsor = await db.prepare(
      `SELECT * FROM members WHERE id = ?
       AND license_active = 1 AND member_status IN ('AMI','Partenaire')
       AND unique_id != 'ROOT'`
    ).bind(sponsorId).first() as any

    if (sponsor) {
      // Récupérer le cap du sponsor
      const sponsorRankCfg = await db.prepare(
        `SELECT monthly_cap, monthly_prime FROM rank_config WHERE rank_name = ?`
      ).bind(sponsor.current_rank).first() as any

      const sponsorCap = sponsorRankCfg?.monthly_cap || 0

      // Calculer la prime nette + influence déjà versées au sponsor ce mois
      const sponsorMV = await db.prepare(
        `SELECT leadership_prime, influence_bonus FROM monthly_validations
         WHERE member_id = ? AND period = ?`
      ).bind(sponsorId, period).first() as any
      const sponsorPrime    = sponsorMV?.leadership_prime || 0
      const sponsorInfluence = sponsorMV?.influence_bonus  || 0
      const sponsorRemainingCap = Math.max(0, sponsorCap - sponsorPrime - sponsorInfluence)

      // ── A) Recalcul RAYONNEMENT du sponsor direct ─────────────
      // Purger les bonus_rayonnement générés par CE membre vers le sponsor
      const oldSponsorRayRows = await db.prepare(
        `SELECT id, member_id, amount FROM commissions
         WHERE member_id = ? AND source_member_id = ?
           AND type = 'bonus_rayonnement' AND period = ?`
      ).bind(sponsorId, memberId, period).all()
      for (const row of oldSponsorRayRows.results as any[]) {
        await db.prepare(
          `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
        ).bind(row.amount, row.member_id).run()
      }
      await db.prepare(
        `DELETE FROM commissions
         WHERE member_id = ? AND source_member_id = ?
           AND type = 'bonus_rayonnement' AND period = ?`
      ).bind(sponsorId, memberId, period).run()

      // Recalculer TOUT le rayonnement du sponsor (tous ses directs, pas seulement ce membre)
      // pour éviter les doublons — on purge tout le rayonnement du sponsor puis on recalcule
      const allSponsorRayRows = await db.prepare(
        `SELECT id, member_id, amount FROM commissions
         WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
      ).bind(sponsorId, period).all()
      for (const row of allSponsorRayRows.results as any[]) {
        await db.prepare(
          `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
        ).bind(row.amount, row.member_id).run()
      }
      await db.prepare(
        `DELETE FROM commissions
         WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
      ).bind(sponsorId, period).run()

      if (await isBonusEnabled(db, 'rayonnement_enabled')) {
        await calculateRayonnementBonus(db, sponsorId, period, sponsorRemainingCap, retroEnabled)
      }
    }
  }

  // ── B) Recalcul INFLUENCE depuis CE filleul vers N1..N5 ───────
  // Rétroactivité même mois : un sponsor qui vient de se qualifier ce mois
  // doit recevoir l'influence provenant de filleuls qui ont monté AVANT lui.
  // calculateInfluenceBonus(memberId=filleul) remonte automatiquement sur 5 niveaux
  // et est idempotente (purge les anciens bonus de CE filleul avant recalcul).
  if (await isBonusEnabled(db, 'influence_enabled')) {
    // Lire la prime TOTALE du filleul pour ce mois (somme de toutes ses prime_leadership)
    // IMPORTANT : on utilise la prime totale, pas "targetPrime" qui est le delta
    // de la promotion en cours (après timeout/reprise, targetPrime ≠ prime totale).
    const filleulTotalPrimeRow = await db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as t FROM commissions
       WHERE member_id = ? AND type = 'prime_leadership' AND period = ?
         AND status IN ('pending','approved','paid')`
    ).bind(memberId, period).first() as any
    const filleulTotalPrime = (filleulTotalPrimeRow?.t as number) || targetPrime

    // Purger les bonus_influence déjà générés depuis CE filleul ce mois
    // (pour tous ses sponsors N1..N5) — ajustement wallet inclus
    const oldInfluenceFromFilleul = await db.prepare(
      `SELECT id, member_id, amount FROM commissions
       WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
    ).bind(memberId, period).all()
    for (const row of oldInfluenceFromFilleul.results as any[]) {
      await db.prepare(
        `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
      ).bind(row.amount, row.member_id).run()
    }
    await db.prepare(
      `DELETE FROM commissions
       WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
    ).bind(memberId, period).run()

    // Recalculer l'influence depuis ce filleul sur la base de sa prime TOTALE
    const influenceSpent = await calculateInfluenceBonus(
      db, memberId, filleulTotalPrime, period, Math.max(0, cap - filleulTotalPrime), retroEnabled
    )
    // Mettre à jour monthly_validations du filleul pour tracer l'influence générée
    await db.prepare(
      `UPDATE monthly_validations SET influence_bonus = ? WHERE member_id = ? AND period = ?`
    ).bind(influenceSpent, memberId, period).run()

    // ── B2) Recalcul de l'influence que le SPONSOR DIRECT reçoit depuis ce filleul ──
    // Problème : §8d-B recalcule l'influence que le filleul GÉNÈRE vers N1..N5,
    // mais si le sponsor direct s'est qualifié APRÈS que le filleul a été promu,
    // son propre recalculBonusRetroactif() a tourné quand le filleul n'avait pas
    // encore de prime — donc le sponsor n'a pas reçu l'influence de ce filleul.
    // Solution : déclencher recalculBonusRetroactif(sponsorId) pour que le sponsor
    // recalcule son influence totale (depuis tous ses filleuls ayant une prime ce mois).
    const sponsorIdForB2 = memberRow?.sponsor_id
    if (sponsorIdForB2) {
      const sponsorForB2 = await db.prepare(
        `SELECT id FROM members WHERE id = ?
         AND license_active = 1 AND member_status IN ('AMI','Partenaire')
         AND unique_id != 'ROOT'`
      ).bind(sponsorIdForB2).first() as any
      if (sponsorForB2) {
        await recalculBonusRetroactif(db, sponsorIdForB2, period)
      }
    }
  }

  // ── 9. Notification ──────────────────────────────────────
  const ccNotif = ccAmt > 0
    ? ` + ${ccAmt.toFixed(2)}$ en Crédit de Croissance (disponible le 1er ${getMonthName(getNextMonthStart(period))})` : ''
  const rsNotif = rsAmt > 0
    ? ` | ${rsAmt.toFixed(2)}$ prélevés en Réserve Stratégique + abondement compagnie (libération dans 3 ans)` : ''
  await createNotification(
    db, memberId, 'commission',
    `💰 Prime de Leadership — ${newRank}`,
    `Félicitations ! Votre prime nette est de ${targetPrime.toFixed(2)}$${ccNotif}${rsNotif}.`
  )
}

/**
 * Recalcule les rangs de TOUS les membres éligibles
 * (force l'insertion dans rank_queue puis traite immédiatement)
 */
export async function forceRecalcAllRanks(
  db: D1Database
): Promise<{ processed: number; rankChanges: Array<{uniqueId: string; oldRank: string; newRank: string}> }> {
  // Récupérer tous les membres avec licence active (Partenaire ou AMI)
  const eligibleMembers = await db.prepare(
    `SELECT id, unique_id, current_rank, member_status
     FROM members
     WHERE license_active = 1
       AND member_status IN ('Partenaire', 'AMI')
       AND unique_id != 'ROOT'`
  ).all()

  const rankChanges: Array<{uniqueId: string; oldRank: string; newRank: string}> = []
  let processed = 0

  for (const member of eligibleMembers.results as any[]) {
    try {
      const newRank = await calculateMemberRank(db, member.id)
      const oldRank = member.current_rank || 'none'

      if (newRank !== oldRank) {
        // Promotion réelle = rang calculé STRICTEMENT supérieur au rang actuel
        // (évite double-prime si recalcul déclenché sur même rang)
        const isPromotion = newRank !== 'none' && getRankIndex(newRank) > getRankIndex(oldRank)
        if (isPromotion) {
          // Enregistrer rank_achieved_at uniquement lors d'une vraie promotion
          await db.prepare(
            `UPDATE members SET current_rank = ?, rank_achieved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
          ).bind(newRank, member.id).run()
          // Créditer prime de rang + CC immédiatement (règle : rang le plus haut du mois)
          const period = getMauritiusDateStr().substring(0, 7)
          await upgradePrimeLeadership(db, member.id, newRank, period)
          await createNotification(
            db, member.id, 'success',
            `🏆 Félicitations ! Nouveau rang atteint`,
            `Vous venez d'atteindre le rang ${newRank} ! Votre prime de leadership a été créditée.`
          )
        } else {
          // Rétrogradation ou changement sans promotion → simple mise à jour du rang
          await db.prepare(
            `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(newRank, member.id).run()
        }
        rankChanges.push({ uniqueId: member.unique_id, oldRank, newRank })
      }

      // Marquer les entrées rank_queue de ce membre comme traitées
      await db.prepare(
        `UPDATE rank_queue SET status = 'completed', processed_at = datetime('now')
         WHERE member_id = ? AND status IN ('pending', 'processing')`
      ).bind(member.id).run()

      processed++
    } catch (err: any) {
      console.error(`[RANK] Erreur recalcul rang membre ${member.unique_id}: ${err.message}`)
    }
  }

  return { processed, rankChanges }
}

// ── ACTIVATION & RÉCOMPENSES ──────────────────────────────────

/**
 * activateAndReward — Fonction critique post-paiement
 * Idempotente grâce à activation_done sur package_orders
 *
 * Étapes :
 * 1. Vérifier status=validated et activation_done=0 (B9)
 * 2. Licence seule → activer licence, recalculer statut, STOP
 * 3. Package ± licence → MAJ package_purchased, licence si incluse
 * 4. BV Queue → si arbre: enqueue BV. Si Holding Tank: différer.
 * 5. Valorisation Recommandation → premier package + sponsor avec licence
 * 6. Fast Start → initialiser + vérifier paliers
 * 7. Notifications + RankQueue
 */
export async function activateAndReward(
  db: D1Database,
  orderId: string
): Promise<{ success: boolean; message: string }> {
  // 1. Idempotence — B9
  // OPT: order + configs préchargées en parallèle (un seul batch = 1 round-trip)
  const [orderResult, configResults] = await Promise.all([
    db.prepare(
      `SELECT po.*,
              p.bv_value   AS pkg_catalog_bv,
              p.price_usd  AS pkg_catalog_price,
              p.type       AS package_type,
              p.slug       AS package_slug,
              p.name       AS package_name,
              p.includes_license,
              p.direct_commission_rate AS pkg_direct_rate,
              p.pricing_type, p.payment_mode, p.duration_years,
              m.id         AS member_id,
              m.sponsor_id, m.in_holding_tank,
              m.member_status, m.license_active, m.fast_start_start_date
       FROM package_orders po
       JOIN packages p ON p.id = po.package_id
       JOIN members m ON m.id = po.member_id
       WHERE po.id = ? AND po.status = 'validated'`
    ).bind(orderId).first(),
    db.batch([
      db.prepare(`SELECT key, value FROM compensation_config WHERE key IN ('admin_fee_active','admin_fee_mode','admin_fee_amount','holding_tank_sponsor_days')`),
      db.prepare(`SELECT key, value FROM bonus_config WHERE key IN ('recommendation_enabled','fast_start_enabled')`),
    ])
  ])

  const order = orderResult as any
  if (!order) return { success: false, message: 'Commande introuvable ou non validée' }
  if (order.activation_done) return { success: true, message: 'Déjà activé (idempotent)' }

  // Cache des configs préchargées — évite les SELECT répétés dans les sous-fonctions
  const cfgMap = new Map<string, string>()
  for (const row of (configResults[0].results as any[])) cfgMap.set(row.key, row.value)
  for (const row of (configResults[1].results as any[])) cfgMap.set(row.key, row.value)
  const cfg = (key: string, def: string) => cfgMap.get(key) ?? def

  const memberId = order.member_id
  const period   = new Date().toISOString().substring(0, 7)

  // 2. Licence seule → activer et STOP (pas de BV)
  if (order.package_slug === 'licence') {
    // CDC v2 A10 — Frais admin $49 prélevés sur le PREMIER achat (licence ou package, peu importe)
    // Si c'est la licence qui est achetée en premier, on marque admin_fee_paid maintenant.
    const adminFeeActive = cfg('admin_fee_active', 'true')
    if (adminFeeActive === 'true') {
      const memberCheck = await db.prepare(`SELECT admin_fee_paid FROM members WHERE id = ?`).bind(memberId).first() as any
      if (!memberCheck?.admin_fee_paid) {
        const adminFeeAmt = parseFloat(cfg('admin_fee_amount', '49'))
        await db.batch([
          db.prepare(`UPDATE package_orders SET admin_fee_amount = ?, updated_at = datetime('now') WHERE id = ?`).bind(adminFeeAmt, orderId),
          db.prepare(`UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(memberId),
        ])
        await createNotification(db, memberId, 'info', 'Frais d\'administration prélevés',
          `Frais d'administration uniques de $${adminFeeAmt.toFixed(2)} prélevés sur votre premier achat.`)
      }
    }

    // Séquentiel obligatoire : recalculateMemberStatus lit license_active
    // qui est écrit par activateLicense — doit être terminé avant la lecture
    await activateLicense(db, memberId, null)
    await recalculateMemberStatus(db, memberId)

    await db.batch([
      db.prepare(`UPDATE package_orders SET activation_done = 1, updated_at = datetime('now') WHERE id = ?`).bind(orderId),
    ])

    await createNotification(db, memberId, 'success', 'Licence activée',
      'Votre licence Finstrategia est maintenant active. Bienvenue dans LEADER !')

    return { success: true, message: 'Licence activée avec succès' }
  }

  // 3. Package (± licence)
  // CDC v2 — A2/A9 : récupérer le nom complet du package (package_name) + type
  const packageType = order.package_type
  const packageName = order.package_name || order.package_type || ''

  // OPT: UPDATE membre + lecture admin_fee_paid en parallèle
  const [, memberFeeRow] = await Promise.all([
    db.prepare(
      `UPDATE members SET
        package_type      = ?,
        package_purchased = 1,
        package_name      = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(packageType, packageName, memberId).run(),
    db.prepare(`SELECT admin_fee_paid FROM members WHERE id = ?`).bind(memberId).first(),
  ])
  const memberFee = memberFeeRow as any

  // CDC v2 — A10 : Frais d'administration
  // admin_fee_mode='once'     → prélevés une seule fois sur le compte (irréversible)
  // admin_fee_mode='multiple' → prélevés à chaque commande
  const adminFeeActive = cfg('admin_fee_active', 'true')
  if (adminFeeActive === 'true') {
    const adminFeeMode = cfg('admin_fee_mode', 'once')
    const shouldMarkPaid = adminFeeMode === 'once' && !memberFee?.admin_fee_paid
    const shouldCharge   = adminFeeMode === 'multiple' || !memberFee?.admin_fee_paid
    if (shouldCharge) {
      const adminFeeAmt = parseFloat(cfg('admin_fee_amount', '49'))
      const feeStmts: D1PreparedStatement[] = [
        db.prepare(`UPDATE package_orders SET admin_fee_amount = ?, updated_at = datetime('now') WHERE id = ?`).bind(adminFeeAmt, orderId),
      ]
      if (shouldMarkPaid) {
        feeStmts.push(db.prepare(`UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(memberId))
      }
      await db.batch(feeStmts)
      await createNotification(db, memberId, 'info', 'Frais d\'administration prélevés',
        `Frais d'administration de $${adminFeeAmt.toFixed(2)} prélevés sur cette commande.`)
    }
  }

  // Séquentiel obligatoire : recalculateMemberStatus lit license_active
  // qui est écrit par activateLicense — doit être terminé avant la lecture
  const shouldActivateLicense = order.product_type === 'package_with_license'
    || order.includes_license
    || !!order.linked_license_id
  if (shouldActivateLicense) {
    await activateLicense(db, memberId, order.linked_license_id || null)
  }
  await recalculateMemberStatus(db, memberId)

  // ── POINT DE NON-RETOUR : activation_done = 1 + calcul durée de vie ────────────────────────────
  // On marque MAINTENANT avant les étapes BV/commissions.
  // Ainsi même si une étape post-activation échoue, la commande n'apparaît plus
  // dans la file d'attente admin et le membre reste correctement activé.
  // Les BV/commissions peuvent être relancés manuellement si nécessaire.

  // Calcul de la date d'expiration du package (si non mensuel)
  // priority : durée définie sur le package lui-même > paramètre global admin > défaut 3 ans
  let packageExpiresAt: string | null = null
  const isMonthly = order.pricing_type === 'monthly' || order.payment_mode === 'subscription'
  if (!isMonthly) {
    let durationYears: number | null = order.duration_years ? Number(order.duration_years) : null
    if (!durationYears) {
      const globalDur = await db.prepare(
        `SELECT value FROM branding_config WHERE key = 'package_default_duration_years'`
      ).first() as any
      durationYears = globalDur?.value ? parseInt(globalDur.value, 10) : 3
    }
    if (durationYears && durationYears > 0) {
      const expiresDate = new Date()
      expiresDate.setFullYear(expiresDate.getFullYear() + durationYears)
      packageExpiresAt = expiresDate.toISOString().slice(0, 10)
    }
  }

  await db.prepare(
    `UPDATE package_orders SET activation_done = 1, package_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(packageExpiresAt, orderId).run()

  // 4. BV — CDC §3.1 / §5.2 / §6 (upgrade différentiel)
  // RÈGLE BINAIRE : le membre acheteur NE reçoit PAS de BV dans l'arbre binaire (left/right).
  //   La propagation va UNIQUEMENT vers ses ancêtres.
  // RÈGLE QUALIFICATION : personal_bv_monthly = BV générés par les propres achats du membre
  //   (§5.2 — condition d'activité mensuelle : 300 BV personnels OU 1 client actif).
  // RÈGLE UPGRADE (§6) : lors d'un upgrade, seul le BV DIFFÉRENTIEL est propagé.
  //   BV effectif = upgrade_diff_bv si upgrade, sinon bv_value du package.
  //   Un différentiel nul ou négatif est invalide → pas de propagation.

  let bvAmount: number
  const isUpgrade = order.product_type === 'upgrade' && order.upgrade_from_package_id

  if (isUpgrade && order.upgrade_diff_bv !== null && order.upgrade_diff_bv !== undefined) {
    // Upgrade : utiliser le BV différentiel pré-calculé à la création de la commande
    bvAmount = Math.max(0, order.upgrade_diff_bv)
    console.log(`[BV] Upgrade détecté — BV différentiel : ${bvAmount} (total package : ${order.pkg_catalog_bv})`)
  } else {
    // Premier achat : BV complet du package catalogue
    bvAmount = order.pkg_catalog_bv || 0
  }

  if (bvAmount > 0) {
    // ── GUARD IDEMPOTENCE BV ──────────────────────────────────
    // D1 est auto-commit : si l'activation est tentée 2× avant que activation_done=1
    // soit visible (race condition ou retry), les compteurs seraient incrémentés 2×.
    // On vérifie l'existence d'un bv_log 'personal_purchase' pour cet orderId.
    // Si déjà présent → skip total du bloc BV (compteurs + propagation).
    // OPT: bv_log guard + placement membre en parallèle
    const [existingBvLog, memberPlacement] = await Promise.all([
      db.prepare(`SELECT id FROM bv_logs WHERE package_order_id = ? AND bv_type = 'personal_purchase' AND member_id = ? LIMIT 1`).bind(orderId, memberId).first(),
      db.prepare(`SELECT in_holding_tank, binary_parent_id FROM members WHERE id = ?`).bind(memberId).first(),
    ])

    if (existingBvLog) {
      console.warn(`[BV] IDEMPOTENCE — bv_log personal_purchase déjà présent pour order=${orderId}, membre=${memberId}. Skip BV.`)
    } else {
    // ── Compteurs personnels de l'acheteur ───────────────────
    //   personal_bv_monthly : qualification mensuelle (§5.2 — 300 BV personnels ce mois)
    //   personal_bv_total   : cumul historique
    //   NB : fast_start_bv n'est PAS incrémenté ici — il s'incrémente chez le SPONSOR
    //        quand ce membre est un filleul direct (voir processRecommendationValo)

    // OPT: UPDATE BV + INSERT bv_log en batch (1 round-trip au lieu de 2)
    const bvStmts: D1PreparedStatement[] = [
      db.prepare(
        `UPDATE members SET
          personal_bv_monthly = personal_bv_monthly + ?,
          personal_bv_total   = COALESCE(personal_bv_total, 0) + ?,
          updated_at          = datetime('now')
         WHERE id = ?`
      ).bind(bvAmount, bvAmount, memberId),
      // Log de traçabilité — achat personnel (source de vérité pour reconstruction BV)
      // NOTE : on insère le log AVANT la propagation pour que la guard ci-dessus soit
      // immédiatement effective en cas de retry concurrent.
      db.prepare(
        `INSERT INTO bv_logs
           (id, member_id, source_member_id, bv_amount, bv_type, package_order_id, propagated, period)
         VALUES (?, ?, ?, ?, 'personal_purchase', ?, 0, ?)`
      ).bind(generateId(), memberId, memberId, bvAmount, orderId, period),
    ]
    // Si upgrade : stocker le bv_snapshot sur la commande pour traçabilité
    if (isUpgrade) {
      bvStmts.push(db.prepare(`UPDATE package_orders SET bv_snapshot = ?, updated_at = datetime('now') WHERE id = ?`).bind(bvAmount, orderId))
    }
    await db.batch(bvStmts)

    // ── Propagation BV vers les ANCÊTRES ─────────────────────
    // CDC §3 : le membre acheteur NE reçoit PAS de BV sur son propre achat.
    // La propagation est déclenchée IMMÉDIATEMENT (synchrone) si le membre est
    // placé dans l'arbre (binary_parent_id != null ET in_holding_tank = 0).
    // Si le membre est en Holding Tank, on enqueue en bv_queue pour traitement
    // différé dès qu'il sera placé dans l'arbre.
    const placement = memberPlacement as any
    if (!placement?.in_holding_tank && placement?.binary_parent_id) {
      // Membre déjà dans l'arbre → propagation immédiate et synchrone
      await propagateBV(db, memberId, bvAmount, period, orderId)
    } else {
      // Membre en Holding Tank → BV différé jusqu'au placement dans l'arbre
      await queueBVPropagation(db, memberId, orderId, bvAmount, period)
      console.log(`[BV] Membre ${memberId} en Holding Tank — BV ${bvAmount} mis en queue pour traitement différé`)
    }
    } // fin else idempotence BV
  }

  // 5 + 6. Valorisation Recommandation + Fast Start — OPT: parallèles (indépendants)
  const commissionBase = isUpgrade ? (order.amount_usd || 0) : (order.pkg_catalog_price || 0)
  const sponsorId      = order.sponsor_id  // déjà dans order (JOIN members)

  await Promise.all([
    // 5. Valorisation Recommandation — non bloquante
    (async () => {
      try {
        await processRecommendationValo(db, memberId, commissionBase, order.pkg_direct_rate, orderId, period)
      } catch (err: any) {
        console.error('[activateAndReward] processRecommendationValo échoué (non bloquant):', err?.message || err)
      }
    })(),

    // 6. Fast Start Bonus — non bloquant
    (async () => {
      if (!sponsorId) return
      try {
        await initFastStart(db, sponsorId)
        await addFastStartBV(db, sponsorId, bvAmount, orderId)
        await checkFastStart(db, sponsorId)
      } catch (err: any) {
        console.error('[activateAndReward] Fast Start Bonus échoué (non bloquant):', err?.message || err)
      }
    })(),
  ])

  // 7. Rétroactivité même mois — recalcul bonus du membre acheteur
  //
  // RÈGLE MÉTIER : si le membre vient d'activer ou d'upgrader son package dans le
  // mois calendaire en cours, il peut désormais satisfaire des conditions
  // (package ≥ 1000$, catégorie cat-synex/cat-club) qui étaient bloquées avant.
  // On recalcule immédiatement ses bonus rayonnement et influence pour que les
  // filleuls qui ont atteint leur rang PLUS TÔT dans le mois lui soient crédités.
  //
  // IMPORTANT : await obligatoire — Cloudflare Workers tue les IIFE non-awaitées.
  try {
    await recalculBonusRetroactif(db, memberId, period)
  } catch (err: any) {
    console.error('[activateAndReward] Recalcul bonus rétroactif échoué (non bloquant):', err?.message || err)
  }

  // activation_done=1 déjà positionné avant les BV/commissions (voir ci-dessus)

  // Notifications + RankQueue — OPT: toutes en parallèle
  const finalTasks: Promise<any>[] = [
    createNotification(db, memberId, 'success', 'Package activé',
      `Votre package a été activé avec succès. ${bvAmount} BV ajoutés.`).catch(() => {}),
    db.prepare(
      `INSERT OR IGNORE INTO rank_queue (id, member_id, trigger_event, status)
       VALUES (?, ?, 'package_activation', 'pending')`
    ).bind(generateId(), memberId).run().catch(() => {}),
  ]

  // Notifier le sponsor si le membre est en Holding Tank
  if (order.in_holding_tank) {
    // OPT: infos membre + config délai en parallèle
    finalTasks.push((async () => {
      const [memberInfo, delayCfg] = await Promise.all([
        db.prepare(`SELECT first_name, last_name, unique_id, sponsor_id FROM members WHERE id = ?`).bind(memberId).first(),
        Promise.resolve(cfg('holding_tank_sponsor_days', '15')),
      ])
      const info = memberInfo as any
      if (!info?.sponsor_id) return
      const sponsorDays = parseInt(delayCfg, 10)

      await Promise.all([
        createNotification(
          db, info.sponsor_id, 'warning',
          ' Filleul à placer dans votre arbre !',
          `${info.first_name} ${info.last_name} (${info.unique_id}) vient de rejoindre via votre lien et attend son placement. ` +
          `Vous avez ${sponsorDays} jours pour le placer dans votre arbre binaire. ` +
          `Rendez-vous dans "Réservoir à placement" de votre espace membre.`
        ),
        db.prepare(
          `UPDATE holding_tank
           SET sponsor_deadline_at = datetime(created_at, '+'||(?) ||' days'),
               admin_can_place = 0,
               sponsor_notified = 1
           WHERE member_id = ? AND status = 'waiting'`
        ).bind(sponsorDays, memberId).run(),
      ])
    })().catch(() => {}))
  }

  await Promise.all(finalTasks)

  return { success: true, message: 'Activation et récompenses traitées avec succès' }
}

/**
 * Active ou renouvelle la licence d'un membre.
 * CDC v2 — A8 : +renewalDays depuis la date d'expiration existante si future (renouvellement cumulatif).
 * Prix et durée lus depuis compensation_config (aucun hardcode).
 *
 * @param linkedLicenseId  ID d'une finstrategia_license déjà en statut 'pending'
 *                         (créée lors de la commande package avec add_license=true).
 *                         Si null → crée une nouvelle entrée de licence active.
 */
async function activateLicense(db: D1Database, memberId: string, linkedLicenseId: string | null): Promise<void> {
  // Lire prix et durée depuis compensation_config (pas de hardcode)
  const cfgRows = await db.prepare(
    `SELECT key, value FROM compensation_config WHERE key IN ('license_price', 'license_renewal_days')`
  ).all() as any
  const cfgMap: Record<string, string> = {}
  for (const r of (cfgRows?.results || [])) cfgMap[r.key] = r.value
  const licensePrice   = parseFloat(cfgMap['license_price']        || '97')
  const renewalDays    = parseInt(cfgMap['license_renewal_days']    || '365', 10)

  // Calculer la date d'expiration de façon cumulative
  // Si expiry future → part de cette expiry + renewalDays (pas de perte de jours)
  // Sinon → aujourd'hui + renewalDays
  const existingLic = await db.prepare(
    `SELECT expires_at FROM finstrategia_licenses
     WHERE member_id = ? AND status = 'active'
     ORDER BY expires_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  const now = new Date()
  let finalExpiry: Date
  if (existingLic?.expires_at) {
    const existingExpiry = new Date(existingLic.expires_at)
    // Partir de l'expiry existante si dans le futur, sinon d'aujourd'hui
    const baseDate = existingExpiry > now ? existingExpiry : now
    finalExpiry = new Date(baseDate)
    finalExpiry.setDate(finalExpiry.getDate() + renewalDays)
  } else {
    finalExpiry = new Date(now)
    finalExpiry.setDate(finalExpiry.getDate() + renewalDays)
  }

  if (linkedLicenseId) {
    // Mettre à jour la licence pending existante → active (créée lors de la commande)
    // Mettre à jour aussi le prix avec la valeur config actuelle
    await db.prepare(
      `UPDATE finstrategia_licenses
       SET status = 'active', price_usd = ?, starts_at = datetime('now'), expires_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(licensePrice, finalExpiry.toISOString(), linkedLicenseId).run()
  } else {
    // Créer une nouvelle entrée de licence active (cas includes_license du package)
    await db.prepare(
      `INSERT INTO finstrategia_licenses (id, member_id, price_usd, status, expires_at)
       VALUES (?, ?, ?, 'active', ?)`
    ).bind(generateId(), memberId, licensePrice, finalExpiry.toISOString()).run()
  }

  // Activer la licence sur le membre
  await db.prepare(
    `UPDATE members SET
      license_active     = 1,
      license_expires_at = ?,
      updated_at         = datetime('now')
     WHERE id = ?`
  ).bind(finalExpiry.toISOString(), memberId).run()
}

/**
 * Recalcule et met à jour le statut d'un membre selon ses assets
 * AMI = package + licence
 * Client = package sans licence
 * Partenaire = licence sans package
 * Membre = rien
 */
export async function recalculateMemberStatus(db: D1Database, memberId: string): Promise<void> {
  const member = await db.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return

  const hasPackage = await db.prepare(
    `SELECT id FROM package_orders
     WHERE member_id = ? AND status = 'validated'
       AND package_id NOT IN (SELECT id FROM packages WHERE slug = 'licence')`
  ).bind(memberId).first()

  const hasLicense = member.license_active

  let newStatus: string
  if (hasPackage && hasLicense)       newStatus = 'AMI'
  else if (hasPackage && !hasLicense) newStatus = 'Client'
  else if (!hasPackage && hasLicense) newStatus = 'Partenaire'
  else                                newStatus = 'Membre'

  if (newStatus !== member.member_status) {
    await db.prepare(
      `UPDATE members SET member_status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newStatus, memberId).run()

    await createNotification(db, memberId, 'success', 'Statut mis à jour',
      `Votre statut est maintenant : ${newStatus}`)
  }
}

// ── VALORISATION RECOMMANDATION ───────────────────────────────

/**
 * Valorisation Recommandation — CDC v2 A5 (révisé)
 *
 * Règles :
 * - Déclenchée à CHAQUE achat de package d'un filleul DIRECT (pas seulement le premier)
 * - Upgrades inclus : commission calculée sur le différentiel payé (amount_usd)
 * - Taux = direct_commission_rate du package si > 0,
 *          sinon recommendation_pct global (défaut 10%)
 *          sinon statuts qualifiants = recommendation_eligible_statuses config
 * - Idempotence par orderId : une seule VR par commande (pas par filleul)
 * - Sponsor doit avoir license_active = 1 ET statut dans recommendation_eligible_statuses
 * - Payée en pending wallet (règle 14j + M+1)
 */
async function processRecommendationValo(
  db: D1Database,
  memberId: string,
  packagePrice: number,
  pkgDirectRate: number | null | undefined,
  orderId: string,
  period: string
): Promise<void> {
  // 1. Bonus activé globalement ?
  const enabled = await isBonusEnabled(db, 'recommendation_enabled')
  if (!enabled) return

  // 2. Récupérer le sponsor du filleul
  const member = await db.prepare(
    `SELECT sponsor_id FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member?.sponsor_id) return

  // 3. Statuts qualifiants (configurable — défaut : Partenaire,AMI)
  const eligibleStatusesStr = await getConfigStr(db, 'recommendation_eligible_statuses', 'Partenaire,AMI')
  const eligibleStatuses    = eligibleStatusesStr.split(',').map(s => s.trim()).filter(Boolean)
  const placeholders        = eligibleStatuses.map(() => '?').join(',')

  const sponsor = await db.prepare(
    `SELECT * FROM members
     WHERE id = ? AND license_active = 1 AND member_status IN (${placeholders})`
  ).bind(member.sponsor_id, ...eligibleStatuses).first() as any
  if (!sponsor) return

  // 4. Idempotence stricte par orderId — une seule VR par commande
  const alreadyPaid = await db.prepare(
    `SELECT id FROM commissions
     WHERE type = 'valorisation_recommandation'
       AND source_member_id = ?
       AND reference_order_id = ?`
  ).bind(memberId, orderId).first()
  if (alreadyPaid) return

  // 5. Taux : direct_commission_rate du package (prioritaire) ou taux global
  let pct: number
  if (pkgDirectRate !== null && pkgDirectRate !== undefined && pkgDirectRate > 0) {
    pct = pkgDirectRate
  } else {
    pct = await getConfigPct(db, 'recommendation_pct', 10)
  }

  // 6. Guard : bonus doit être > 0
  const bonus = packagePrice * (pct / 100)
  if (bonus <= 0) return

  // 7. INSERT commission + pending wallet
  const recoCommId = generateId()
  await db.prepare(
    `INSERT INTO commissions
       (id, member_id, type, amount, description, period, source_member_id, reference_order_id, status)
     VALUES (?, ?, 'valorisation_recommandation', ?, ?, ?, ?, ?, 'approved')`
  ).bind(
    recoCommId, sponsor.id, bonus,
    `Valorisation Recommandation ${pct}% — filleul (commande ${orderId.substring(0, 8)}…)`,
    period, memberId, orderId
  ).run()

  // IMPORTANT : recoCommId partagé → pending_wallet_entry liée à la commission (traçabilité)
  // reference_id = recoCommId pour traçabilité JOIN dans /api/members/transactions
  await walletOperation(db, sponsor.id, bonus, 'pending', 'valorisation_recommandation', undefined, recoCommId)
  await creditPendingWallet(db, sponsor.id, recoCommId, 'valorisation_recommandation', period, bonus)

  await createNotification(db, sponsor.id, 'commission', 'Valorisation Recommandation reçue',
    `Vous avez reçu ${bonus.toFixed(2)}$ (${pct}%) de valorisation pour l'achat de votre filleul. Versement sous 14j dans votre wallet.`)
}

// ── FAST START BONUS ──────────────────────────────────────────

/**
 * Initialise le Fast Start sur le membre LUI-MÊME à son inscription.
 *
 * Règle CDC corrigée :
 * - La fenêtre de 30j part de created_at du membre (date d'inscription),
 *   pas du moment où son premier filleul achète.
 * - Un membre a 30j DEPUIS SON INSCRIPTION pour accumuler les BV
 *   de ses filleuls directs et atteindre un palier.
 * - Idempotent : si fast_start_start_date déjà renseigné, ne fait rien.
 *
 * Appelé à la création du compte (handler inscription) ET en fallback
 * dans activateAndReward si jamais non initialisé.
 */
export async function initFastStart(db: D1Database, memberId: string): Promise<void> {
  const member = await db.prepare(
    `SELECT fast_start_start_date, created_at FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  if (!member?.fast_start_start_date) {
    // Fenêtre = à partir de la date d'inscription du membre lui-même
    const startDate = member?.created_at || new Date().toISOString()
    await db.prepare(
      `UPDATE members SET fast_start_start_date = ?, fast_start_completed = 0 WHERE id = ?`
    ).bind(startDate, memberId).run()
  }
}

/**
 * Incrémente fast_start_bv chez le SPONSOR lorsqu'un filleul direct achète.
 *
 * Règles CDC :
 * - Le Fast Start se génère uniquement sur les volumes des filleuls DIRECTS du sponsor
 * - Le sponsor doit avoir license_active = 1 pour accumuler des BV Fast Start
 * - N'accumule que dans la fenêtre des 30j depuis l'inscription du sponsor (created_at)
 *
 * IDEMPOTENCE : orderId obligatoire — si cet order a déjà contribué au Fast Start
 * du sponsor (bv_logs personal_purchase existant), on skip pour éviter les doublons
 * dus aux retries D1 auto-commit.
 */
export async function addFastStartBV(db: D1Database, sponsorId: string, bvAmount: number, orderId?: string): Promise<void> {
  const member = await db.prepare(
    `SELECT fast_start_start_date, fast_start_completed, license_active FROM members WHERE id = ?`
  ).bind(sponsorId).first() as any

  if (!member?.fast_start_start_date || member.fast_start_completed) return

  // FS-B : le sponsor doit avoir une licence active pour accumuler
  if (!member.license_active) return

  const startDate = new Date(member.fast_start_start_date)
  const now       = new Date()
  const diffDays  = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  const maxDays   = await getConfigPct(db, 'fast_start_days', 30)

  // N'accumuler que dans la fenêtre des 30 jours depuis l'inscription
  if (diffDays > maxDays) return

  // Résoudre l'acheteur réel de l'order UNE SEULE FOIS (réutilisé par les deux guards suivants)
  let realBuyerId: string | null = null
  if (orderId) {
    const orderOwner = await db.prepare(
      `SELECT member_id FROM package_orders WHERE id = ?`
    ).bind(orderId).first() as any
    realBuyerId = orderOwner?.member_id ?? null
  }

  // GUARD ANTI-SELF-SPONSOR — bloquer si l'order appartient au sponsor lui-même.
  // Cas réel : sponsor_id était mal configuré (pointait sur le membre lui-même) avant
  // correction DB → addFastStartBV(sponsorId=acheteur) créditait ses propres BV à
  // son propre fast_start. Ce guard rend cette corruption impossible à l'avenir.
  if (realBuyerId && realBuyerId === sponsorId) {
    console.warn(`[FastStart] SELF-SPONSOR BLOQUÉ — order=${orderId} appartient au sponsor=${sponsorId} lui-même, BV ignorés`)
    return
  }

  // GUARD IDEMPOTENCE — vérifier via bv_logs 'fast_start_contribution' dédié
  // (pas 'personal_purchase' qui est écrit AVANT cet appel → évite skip systématique)
  if (orderId) {
    const alreadyContributed = await db.prepare(
      `SELECT id FROM bv_logs
       WHERE package_order_id = ? AND bv_type = 'fast_start_contribution' AND member_id = ? LIMIT 1`
    ).bind(orderId, sponsorId).first()
    if (alreadyContributed) {
      console.warn(`[FastStart] IDEMPOTENCE — order=${orderId} déjà contribué au fast_start_bv de sponsor=${sponsorId}`)
      return
    }
  }

  // Enregistrer la contribution Fast Start dans bv_logs (idempotence future)
  // NOTE : on omet created_at → le DEFAULT (datetime('now')) s'applique côté SQLite
  // (passer datetime('now') via bind ne fonctionne pas sous miniflare D1)
  if (orderId) {
    // source_member_id = le filleul qui a acheté (realBuyerId déjà résolu ci-dessus)
    const sourceId = realBuyerId ?? sponsorId
    await db.prepare(
      `INSERT OR IGNORE INTO bv_logs (id, member_id, source_member_id, bv_amount, bv_type, package_order_id, propagated, period)
       VALUES (?, ?, ?, ?, 'fast_start_contribution', ?, 0, ?)`
    ).bind(generateId(), sponsorId, sourceId, bvAmount, orderId, new Date().toISOString().substring(0, 7)).run()
  }

  await db.prepare(
    `UPDATE members SET fast_start_bv = fast_start_bv + ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(bvAmount, sponsorId).run()

  console.log(`[FastStart] +${bvAmount} BV ajoutés au fast_start_bv de sponsor=${sponsorId} (order=${orderId})`)
}

/**
 * Vérifie et attribue le Fast Start Bonus — UNE SEULE FOIS au palier MAX atteint.
 *
 * Règles CDC :
 * - Source BV : cumul des BV des filleuls directs (fast_start_bv), jamais le propre volume
 * - Période   : 30 premiers jours suivant l'adhésion du sponsor
 * - Unicité   : un seul bonus déclenché, au palier le plus élevé atteint
 * - Si la période expire sans bonus → marquer completed sans paiement
 */
export async function checkFastStart(db: D1Database, memberId: string): Promise<void> {
  const member = await db.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any

  if (!member?.fast_start_start_date || member.fast_start_completed) return

  const startDate = new Date(member.fast_start_start_date)
  const now       = new Date()
  const diffDays  = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

  // Vérifier si Fast Start activé globalement
  const enabled = await isBonusEnabled(db, 'fast_start_enabled')
  if (!enabled) return

  // Durée configurée (défaut 30j)
  const maxDays = await getConfigPct(db, 'fast_start_days', 30)

  if (diffDays > maxDays) {
    // Période expirée → fermer sans paiement
    await db.prepare(`UPDATE members SET fast_start_completed = 1 WHERE id = ?`).bind(memberId).run()
    return
  }

  // BV cumulé des filleuls directs pendant la fenêtre Fast Start
  const fastStartBV = member.fast_start_bv || 0
  if (fastStartBV <= 0) return

  // ── RÈGLE CDC Fast Start ──────────────────────────────────────
  // Le membre reçoit UNIQUEMENT le bonus du palier MAX atteint.
  // Pas de cumul de paliers. Exemple :
  //   0 → 5040 BV : reçoit 300$ (palier 5000), PAS 50$+150$+300$
  //   0 → 1800 BV : reçoit 50$ (palier 1500)
  //   puis monte à 3200 BV : reçoit 100$ supplémentaires (delta 150$-50$)
  //
  // Mécanisme : on calcule le montant total dû (= bonus du palier max),
  // on soustrait ce qui a déjà été versé (somme des commissions fast_start
  // non annulées), et on verse uniquement le DELTA.
  // Si le delta ≤ 0 → rien à faire (palier déjà payé ou dépassé).

  // Sélectionner tous les paliers en DESC pour trouver le plus haut atteint
  const paliers = await db.prepare(
    `SELECT * FROM fast_start_config ORDER BY bv_threshold DESC`
  ).all()

  // Trouver le palier max atteint
  let bestPalier: any = null
  for (const palier of paliers.results as any[]) {
    if (fastStartBV >= (palier as any).bv_threshold) {
      bestPalier = palier
      break // DESC → premier qui passe = le plus haut
    }
  }
  if (!bestPalier) return // Aucun palier atteint

  const maxThreshold = bestPalier.bv_threshold
  const maxBonus     = bestPalier.bonus_amount
  const period       = new Date().toISOString().substring(0, 7)

  // Montant total déjà versé en fast_start (commissions non annulées)
  const alreadyPaidRow = await db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM commissions
     WHERE member_id = ? AND type = 'fast_start' AND status != 'cancelled'`
  ).bind(memberId).first() as any
  const alreadyPaid = alreadyPaidRow?.total ?? 0

  // Delta à verser = bonus palier max - déjà reçu
  const delta = maxBonus - alreadyPaid
  if (delta <= 0) return // Palier max déjà entièrement payé

  // FS-C : commissionId unique partagé entre INSERT et creditPendingWallet
  const fsCommId = generateId()

  await db.prepare(
    `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
     VALUES (?, ?, 'fast_start', ?, ?, ?, 'approved')`
  ).bind(
    fsCommId, memberId, delta,
    `Fast Start Bonus — palier ${maxThreshold} BV (${maxBonus}$)`, period
  ).run()

  // → Pending wallet (règle 14j + M+1)
  await walletOperation(db, memberId, delta, 'pending', 'fast_start')
  await creditPendingWallet(db, memberId, fsCommId, 'fast_start', period, delta)

  await createNotification(db, memberId, 'commission', 'Fast Start Bonus !',
    `Félicitations ! Palier ${maxThreshold} BV atteints en Fast Start. Bonus : ${delta}$. Versement sous 14j dans votre wallet.`)

  console.log(`[FastStart] Palier ${maxThreshold} BV — delta ${delta}$ versé à membre=${memberId} (total dû=${maxBonus}$, déjà reçu=${alreadyPaid}$)`)

  // NE PAS marquer completed ici — le widget reste visible jusqu'à la fin des 30j
  // fast_start_completed = 1 est positionné UNIQUEMENT à l'expiration (diffDays > maxDays)
}

// ── COMMISSIONS MENSUELLES ────────────────────────────────────

/**
 * Orchestre le calcul complet des commissions du mois M
 * Appelé le 1er du mois à 02h00
 *
 * FIX B7 — Verrou anti-double-calcul via table monthly_validations
 * FIX B1 — Cap appliqué AVANT la création des commissions d'Influence
 * FIX B2 — Influence calculée sur la prime NETTE validée du filleul
 * FIX B3 — Rayonnement calculé sur la prime RÉELLE du direct ce mois
 * FIX B5 — Crédit Croissance inséré dans table credit_croissance
 * FIX B6 — Abondement RS crédité en commission supplémentaire
 *
 * Ordre de priorité sur le plafond mensuel :
 *   1. Prime de Leadership (nette, après déductions)
 *   2. Bonus d'Influence (5 niveaux sponsor)
 *   3. Bonus de Rayonnement (Captain+ / Pinnacle)
 */
export async function processMonthlyCommissions(
  db: D1Database,
  period: string
): Promise<{ processed: number; skipped: number; alreadyDone: number }> {

  // FIX B7 — Compter ceux déjà traités ce mois
  const alreadyDoneCount = await db.prepare(
    `SELECT COUNT(*) as cnt FROM monthly_validations WHERE period = ?`
  ).bind(period).first() as any

  const members = await db.prepare(
    `SELECT m.* FROM members m
     WHERE m.license_active = 1
       AND m.member_status IN ('AMI','Partenaire')
       AND m.current_rank IS NOT NULL
       AND m.current_rank != 'none'`
  ).all()

  let processed = 0
  let skipped   = 0

  for (const member of members.results as any[]) {
    // FIX B7 v2 — Verrou ATOMIQUE : on tente d'insérer le verrou EN PREMIER.
    // INSERT OR IGNORE échoue silencieusement si la ligne existe déjà (UNIQUE member_id+period).
    // On vérifie ensuite si la ligne existait avant notre INSERT → si oui, on skip.
    const lockBefore = await db.prepare(
      `SELECT id FROM monthly_validations WHERE member_id = ? AND period = ?`
    ).bind(member.id, period).first()
    if (lockBefore) { skipped++; continue }

    // Poser le verrou IMMÉDIATEMENT (avant tout calcul / toute insertion)
    await db.prepare(
      `INSERT OR IGNORE INTO monthly_validations (member_id, period, leadership_prime)
       VALUES (?, ?, 0)`
    ).bind(member.id, period).run()

    // Vérifier que c'est bien NOUS qui avons posé le verrou (contre la race condition)
    const lockOwned = await db.prepare(
      `SELECT id FROM monthly_validations WHERE member_id = ? AND period = ? AND leadership_prime = 0`
    ).bind(member.id, period).first()
    if (!lockOwned) { skipped++; continue }  // quelqu'un d'autre a déjà calculé

    // Validation mensuelle obligatoire — retourne le rang mensuel effectif ou null
    const effectiveRank = await checkMonthlyQualification(db, member.id, member)
    if (!effectiveRank) { skipped++; continue }

    // ── Règle Administrator : commission unique à vie ────────────
    // La prime Administrator ne peut être versée qu'une seule fois dans toute la vie du membre.
    // Elle est bloquée si :
    //   (A) le rang à vie du membre est Manager ou plus (il a déjà dépassé ce rang), OU
    //   (B) il a déjà reçu une commission Administrator dans le passé.
    if (effectiveRank === 'Administrator') {
      const adminRankIdx = getRankIndex('Administrator')
      const realRankIdx  = getRankIndex(member.current_rank)
      // (A) rang à vie > Administrator → jamais éligible
      if (realRankIdx > adminRankIdx) { skipped++; continue }
      // (B) déjà payé une fois dans l'historique
      const alreadyPaid = await db.prepare(
        `SELECT id FROM commissions
         WHERE member_id = ? AND type = 'prime_leadership' AND description LIKE '%Administrator%'
         LIMIT 1`
      ).bind(member.id).first()
      if (alreadyPaid) { skipped++; continue }
    }
    // ────────────────────────────────────────────────────────────

    // La prime est calculée au taux du rang mensuel effectif (peut être inférieur au rang réel)
    const rankConfig = await db.prepare(
      `SELECT * FROM rank_config WHERE rank_name = ?`
    ).bind(effectiveRank).first() as any
    if (!rankConfig) { skipped++; continue }

    const cap       = rankConfig.monthly_cap   || 0
    const grossPrime = rankConfig.monthly_prime || 0

    // ── Config CC / RS ───────────────────────────────────────
    const ccPct    = await getConfigPct(db, 'credit_croissance_pct', 20)
    const rsPct    = await getConfigPct(db, 'reserve_strategique_pct', 10)
    const ccEnabled = await isBonusEnabled(db, 'credit_croissance_enabled')
    const rsEnabled = await isBonusEnabled(db, 'reserve_strategique_enabled')
    const ccMinRank = await getConfigStr(db, 'credit_croissance_rank', 'Leader')
    const rsMinRank = await getConfigStr(db, 'reserve_strategique_rank', 'Mentor')

    // RS / CC eligibility basée sur le rang effectif (pas le rang réel)
    const memberRankIdx = getRankIndex(effectiveRank)

    // RS — prélevée sur la prime brute (Mentor → President inclus, Director+ exclus)
    const rsEligible = rsEnabled
      && memberRankIdx >= getRankIndex(rsMinRank)
      && memberRankIdx < getRankIndex('Director')
    const reserveStrategiqueAmt = rsEligible ? grossPrime * (rsPct / 100) : 0

    // CC — additionnel, calculé sur la prime brute, puis plafonné à cc_cap (défaut 5000$)
    const ccCapRaw2  = await getConfigPct(db, 'credit_croissance_cap', 5000)
    const ccCap2     = ccCapRaw2 > 0 ? ccCapRaw2 : 5000
    const ccAmtRaw2  = (ccEnabled && memberRankIdx >= getRankIndex(ccMinRank))
      ? grossPrime * (ccPct / 100) : 0
    // Solde CC actuel (on exclut les entrées du même mois qui seront recalculées)
    const ccBalRow2 = await db.prepare(
      `SELECT COALESCE(SUM(amount - used_amount), 0) as bal
       FROM credit_croissance
       WHERE member_id = ? AND status IN ('held','available') AND period != ?`
    ).bind(member.id, period).first() as any
    const ccCurrentBal2    = ccBalRow2?.bal ?? 0
    // CC cible = min(CC calculé, cap absolu) — même logique que §2 du flux upgrade
    const creditCroissanceAmt = Math.min(ccAmtRaw2, ccCap2)

    // Prime NETTE versée au membre = prime brute − prélèvement RS
    const primeACreer = Math.min(grossPrime - reserveStrategiqueAmt, cap)
    let   remainingCap = cap - primeACreer

    // ── ÉTAPE 1 : Prime de Leadership INTÉGRALE ────────────
    const primeCommId = generateId()
    await db.prepare(
      `INSERT INTO commissions
        (id, member_id, type, amount, description, period, rank_at_time, status)
       VALUES (?, ?, 'prime_leadership', ?, ?, ?, ?, 'pending')`
    ).bind(primeCommId, member.id, primeACreer,
      `Prime de Leadership ${effectiveRank}${effectiveRank !== member.current_rank ? ` (rang réel: ${member.current_rank})` : ''} — ${period}`,
      period, effectiveRank
    ).run()

    // ── Crédit de Croissance ADDITIONNEL ───────────────────
    // Logique rang le plus haut du mois : on ne verse que le delta par rapport
    // à ce qui a déjà été accordé ce mois (annulation rétroactive si rang inférieur existait)
    // SOURCE DE VÉRITÉ : credit_croissance (entrées actives held/available) et non
    // cc_transactions SUM qui cumule les crédits annulés → débit excessif corrigé
    if (creditCroissanceAmt > 0) {
      const prevCCRow = await db.prepare(
        `SELECT COALESCE(SUM(amount - used_amount), 0) as total
         FROM credit_croissance
         WHERE member_id = ? AND period = ? AND status IN ('held','available')`
      ).bind(member.id, period).first() as any
      const alreadyCC = prevCCRow?.total ?? 0
      const deltaCC   = creditCroissanceAmt - alreadyCC

      if (deltaCC > 0) {
        // Durée de validité configurable (défaut 3 mois)
        const ccValidityMonths = await getConfigPct(db, 'credit_croissance_validity_months', 3)
        const availableAt = getNextMonthStart(period) + ' 00:00:00'
        const expiresAt   = (() => {
          const d = new Date(getNextMonthStart(period))
          d.setMonth(d.getMonth() + ccValidityMonths)
          return d.toISOString().replace('T',' ').substring(0,19)
        })()

        const ccEntryId = generateId()
        const ccCommId  = generateId()

        // Journal débit — lire solde AVANT expiration (ordre important)
        if (alreadyCC > 0) {
          const balBeforeUpgrade = await getCCBalance(db, member.id)
          // Annuler les entrées CC précédentes du même mois (rang inférieur)
          await db.prepare(
            `UPDATE credit_croissance SET status = 'expired',
               updated_at = datetime('now')
             WHERE member_id = ? AND period = ? AND status IN ('held','available')`
          ).bind(member.id, period).run()
          await db.prepare(
            `INSERT INTO cc_transactions (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
             VALUES (?, ?, 'debit', ?, ?, ?, ?, 'upgrade_cancel', ?)`
          ).bind(generateId(), member.id, alreadyCC,
            Math.max(0, balBeforeUpgrade.total - alreadyCC),
            `Remplacement — Crédit de Croissance rang précédent annulé suite à la promotion ${member.current_rank}`,
            ccEntryId, period).run()
        }

        // Table credit_croissance (avec expiration)
        await db.prepare(
          `INSERT INTO credit_croissance
            (id, member_id, amount, used_amount, period, source_commission_id,
             available_at, expires_at, status)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'held')`
        ).bind(ccEntryId, member.id, creditCroissanceAmt, period, primeCommId,
          availableAt, expiresAt).run()

        // Commission non retirable — traçabilité dans l'historique commissions
        await db.prepare(
          `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
           VALUES (?, ?, 'credit_croissance', ?, ?, ?, 'non_withdrawable')`
        ).bind(ccCommId, member.id, creditCroissanceAmt,
          `Crédit de Croissance — Leadership ${effectiveRank} ${period}`, period).run()

        // Journal CC (balance_after via getCCBalance = source de vérité)
        const balAfterCC = await getCCBalance(db, member.id)
        await db.prepare(
          `INSERT INTO cc_transactions
            (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
           VALUES (?, ?, 'credit', ?, ?, ?, ?, 'credit_croissance', ?)`
        ).bind(generateId(), member.id, creditCroissanceAmt,
          balAfterCC.total,
          `Crédit de Croissance — Prime Leadership ${effectiveRank} (${period}) · Disponible le 1er ${getMonthName(availableAt)} · Valable ${ccValidityMonths} mois`,
          ccEntryId, period).run()
      }
    }

    // ── Réserve Stratégique — prélevée sur la prime brute (Mentor → President) ──
    // reserveStrategiqueAmt = prélèvement 10% sur grossPrime (déjà déduit de primeACreer)
    // abondement = compagnie ajoute le MÊME % sur la prime brute (pas sur rsAmt)
    //   ex. Mentor : rsAmt=300$ (10%×3000), abond=300$ (10%×3000) → total=600$
    //   ex. Executive : rsAmt=1200$ (10%×12000), abond=2400$ (20%×12000) → total=3600$
    // locked_until = date exacte d'aujourd'hui + 3 ans
    if (reserveStrategiqueAmt > 0) {
      const abondementRate = await getAbondementRate(db, member.current_rank)
      const abondementAmt  = grossPrime * abondementRate  // % appliqué sur la prime brute
      const totalRS        = reserveStrategiqueAmt + abondementAmt  // épargne + abondement

      const lockedUntil = new Date()
      lockedUntil.setFullYear(lockedUntil.getFullYear() + 3)  // +3 ans exacts depuis aujourd'hui

      // Annulation rétroactive — RS du même mois (rang inférieur atteint précédemment)
      const prevRSRow2 = await db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM reserve_strategique
         WHERE member_id = ? AND period = ? AND status = 'locked'`
      ).bind(member.id, period).first() as any
      const alreadyRS2 = prevRSRow2?.total ?? 0

      if (alreadyRS2 > 0) {
        // Annuler les entrées RS précédentes du même mois
        await db.prepare(
          `UPDATE reserve_strategique SET status = 'cancelled'
           WHERE member_id = ? AND period = ? AND status = 'locked'`
        ).bind(member.id, period).run()
        // Annuler les commissions RS précédentes du même mois
        await db.prepare(
          `UPDATE commissions SET status = 'cancelled'
           WHERE member_id = ? AND period = ? AND type = 'reserve_strategique' AND status = 'locked'`
        ).bind(member.id, period).run()
        // Décrémenter le compteur members.reserve_strategique
        await db.prepare(
          `UPDATE members SET reserve_strategique = MAX(0, reserve_strategique - ?) WHERE id = ?`
        ).bind(alreadyRS2, member.id).run()
      }

      await db.prepare(
        `INSERT INTO reserve_strategique
          (id, member_id, amount, period, locked_until, abondement_rate, status)
         VALUES (?, ?, ?, ?, ?, ?, 'locked')`
      ).bind(generateId(), member.id, totalRS, period,
        lockedUntil.toISOString().substring(0, 10), abondementRate).run()

      await db.prepare(
        `UPDATE members SET reserve_strategique = reserve_strategique + ? WHERE id = ?`
      ).bind(totalRS, member.id).run()

      // Commission RS (non retirable — traçabilité) avec détail du prélèvement
      await db.prepare(
        `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
         VALUES (?, ?, 'reserve_strategique', ?, ?, ?, 'locked')`
      ).bind(generateId(), member.id, totalRS,
        `Réserve Stratégique ${period} — prélèvement ${reserveStrategiqueAmt.toFixed(2)}$ + abondement ${(abondementRate*100).toFixed(0)}% (${abondementAmt.toFixed(2)}$) — libération ${lockedUntil.toISOString().substring(0,10)}`,
        period).run()
    }

    // ── ÉTAPE 2 : Bonus d'Influence ──────────────────────────
    // FIX B1+B2 — Cap passé à la fonction, calculé sur prime NETTE du filleul
    if (await isBonusEnabled(db, 'influence_enabled')) {
      const influenceSpent = await calculateInfluenceBonus(
        db, member.id, primeACreer, period, remainingCap
      )
      remainingCap = Math.max(0, remainingCap - influenceSpent)
    }

    // ── ÉTAPE 3 : Bonus de Rayonnement ───────────────────────
    // FIX B3 — Prime réelle du direct fournie depuis commissions
    if (await isBonusEnabled(db, 'rayonnement_enabled')) {
      await calculateRayonnementBonus(db, member.id, period, remainingCap)
    }

    // ── MISE À JOUR VERROU avec les vrais montants (FIX B7 v2) ─
    await db.prepare(
      `UPDATE monthly_validations
       SET leadership_prime = ?
       WHERE member_id = ? AND period = ?`
    ).bind(primeACreer, member.id, period).run()

    // ── CRÉDITER PENDING WALLET (règle 14j + M+1) ─────────────
    if (primeACreer > 0) {
      await walletOperation(db, member.id, primeACreer, 'pending', 'prime_leadership')
      await creditPendingWallet(db, member.id, primeCommId, 'prime_leadership', period, primeACreer)
    }

    const nextMonthStart = getNextMonthStart(period)
    await createNotification(db, member.id, 'commission', 'Commissions calculées',
      `Vos commissions de ${period} ont été calculées : ${primeACreer.toFixed(2)}$. Versement en attente (14j après rang + à partir du 1er ${getMonthName(nextMonthStart)}).`)

    processed++
  }

  return { processed, skipped, alreadyDone: alreadyDoneCount?.cnt || 0 }
}

/**
 * creditPendingWallet — Enregistre une entrée dans pending_wallet_entries
 * lors de la création d'une commission.
 *
 * eligible_date = MAX(1er M+1, rank_achieved_at + 14j)
 * Si rank_achieved_at est NULL (rang pas encore enregistré), on utilise datetime('now').
 *
 * Le montant est DÉJÀ dans pending_balance (walletOperation 'pending' appelée avant).
 * Cette table sert uniquement au plan de versement journalier.
 */
export async function creditPendingWallet(
  db: D1Database,
  memberId: string,
  commissionId: string,
  commissionType: string,
  period: string,         // ex: '2026-05'
  totalAmount: number
): Promise<void> {
  if (totalAmount <= 0) return

  // Date de création de cette commission = maintenant (UTC)
  // C'est à partir de CETTE date que le délai de 14 jours est calculé,
  // pas depuis rank_achieved_at (qui peut dater de plusieurs mois)
  const commissionCreatedAt = new Date()

  // Date M+1 (1er du mois suivant la période)
  const nextMonthStart = getNextMonthStart(period)      // ex: '2026-06-01'
  const m1Date         = new Date(nextMonthStart + 'T00:00:00Z')

  // Date commission + 14 jours
  const commPlus14 = new Date(commissionCreatedAt)
  commPlus14.setDate(commPlus14.getDate() + 14)

  // eligible_date = le plus tard des deux
  // - Si la commission est créée suffisamment tôt dans le mois M (ex: 1er mai),
  //   commPlus14 = 15 mai < 1er juin → eligible_date = 1er juin (M+1) ✓
  // - Si la commission est créée fin du mois M (ex: 26 mai),
  //   commPlus14 = 9 juin > 1er juin → eligible_date = 9 juin ✓
  const eligibleDate = commPlus14 > m1Date ? commPlus14 : m1Date
  const eligibleStr  = eligibleDate.toISOString().substring(0, 10)

  // Nombre de jours du mois M+1 — la prime est divisée sur les N jours de M+1
  // même si les versements commencent après le 1er (cas des 14 jours)
  // Les jours "manqués" du 1er à eligible_date sont versés le premier jour éligible
  const daysInMonth  = getDaysInMonth(nextMonthStart)
  const amountPerDay = totalAmount / daysInMonth

  await db.prepare(
    `INSERT INTO pending_wallet_entries
      (id, member_id, commission_id, commission_type, period,
       total_amount, amount_per_day, days_in_month,
       eligible_date, start_date, rank_achieved_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_release')`
  ).bind(
    generateId(),
    memberId,
    commissionId,
    commissionType,
    period,
    totalAmount,
    amountPerDay,
    daysInMonth,
    eligibleStr,
    nextMonthStart,                                              // start_date = 1er M+1
    commissionCreatedAt.toISOString().substring(0, 19).replace('T', ' ')
  ).run()
}

/**
 * processDailyPayments — Appelé chaque jour par l'orchestrateur
 *
 * Règles du Pending Wallet :
 *  1. La commission reste dans pending_balance jusqu'à eligible_date
 *  2. eligible_date = MAX(1er M+1, date_creation_commission + 14j)
 *  3. À partir d'eligible_date, on verse UNE tranche par jour calendaire
 *  4. Chaque tranche = amount_per_day = total_amount / days_in_month(M+1)
 *  5. Les jours "manqués" entre start_date et eligible_date sont versés
 *     INDIVIDUELLEMENT le jour d'eligible_date (une transaction par jour manqué)
 *  6. Garde-fou anti-doublon : si last_paid_at = aujourd'hui, on skip
 *  7. Total versé sur le mois M+1 = 100% de la commission
 */
export async function processDailyPayments(db: D1Database): Promise<number> {
  // ⚠️ Toujours utiliser l'heure de Maurice (UTC+4) comme référence
  const todayStr = getMauritiusDateStr()

  // ── VERROU GLOBAL : une seule exécution par jour (clé système) ────────────
  // Protection contre les appels concurrents (plusieurs Workers en parallèle)
  // TTL 23h : si le verrou est plus vieux que 23h (run planté après pose du verrou),
  // il est considéré orphelin et supprimé pour permettre le rattrapage.
  const lockKey = `daily_payment_lock_${todayStr}`
  const existingLock = await db.prepare(
    `SELECT value, updated_at FROM system_config WHERE key = ?`
  ).bind(lockKey).first() as any
  if (existingLock) {
    const lockAgeMs = Date.now() - new Date(existingLock.updated_at + 'Z').getTime()
    if (lockAgeMs < 23 * 60 * 60 * 1000) {
      // Verrou frais (< 23h) : run déjà effectué aujourd'hui, on skip normalement
      console.log(`[processDailyPayments] Déjà exécuté aujourd'hui (${todayStr}) — verrou actif`)
      return 0
    }
    // Verrou orphelin (> 23h) : le run précédent a planté après avoir posé le verrou
    // On le supprime pour rejouer le rattrapage
    console.warn(`[processDailyPayments] Verrou orphelin détecté (${todayStr}, âge ${Math.round(lockAgeMs/3600000)}h) — suppression et relance`)
    await db.prepare(`DELETE FROM system_config WHERE key = ?`).bind(lockKey).run()
  }
  // Poser le verrou atomiquement (INSERT OR IGNORE évite les doublons)
  await db.prepare(
    `INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES (?, 'locked', datetime('now'))`
  ).bind(lockKey).run()

  // Entrées dont la eligible_date est atteinte et qu'il reste des jours à payer
  // Pour prime_leadership : une seule entry par membre (rang le plus haut = amount_per_day MAX)
  // Les entries de rangs inférieurs (amount_per_day < MAX pour ce membre/période) sont ignorées
  const allEntries = await db.prepare(
    `SELECT * FROM pending_wallet_entries
     WHERE status IN ('pending_release', 'active')
       AND eligible_date <= ?
       AND days_paid < days_in_month`
  ).bind(todayStr).all()

  // Filtrer : pour prime_leadership, ne garder que l'entry avec le plus grand amount_per_day par membre
  const primeLeadershipMax = new Map<string, number>()
  for (const e of allEntries.results as any[]) {
    if (e.commission_type === 'prime_leadership') {
      const cur = primeLeadershipMax.get(e.member_id) ?? 0
      if (e.amount_per_day > cur) primeLeadershipMax.set(e.member_id, e.amount_per_day)
    }
  }
  const entries = {
    results: (allEntries.results as any[]).filter(e => {
      if (e.commission_type !== 'prime_leadership') return true
      // Garder uniquement l'entry avec le APD maximum pour ce membre
      return e.amount_per_day >= (primeLeadershipMax.get(e.member_id) ?? 0)
    })
  }

  let paid = 0

  for (const entry of entries.results as any[]) {

    // ── GUARD 1 : membre supprimé ──────────────────────────────────────────
    const memberExists = await db.prepare(
      `SELECT id FROM members WHERE id = ?`
    ).bind(entry.member_id).first()
    if (!memberExists) {
      await db.prepare(
        `UPDATE pending_wallet_entries SET status = 'cancelled' WHERE id = ?`
      ).bind(entry.id).run()
      console.warn(`[processDailyPayments] Membre ${entry.member_id} introuvable — entrée ${entry.id} annulée`)
      continue
    }

    // ── GUARD 2 (redondant avec le verrou global, mais conservé en sécurité) ─
    if (entry.last_paid_at) {
      const lastPaidDay = entry.last_paid_at.substring(0, 10) // 'YYYY-MM-DD'
      if (lastPaidDay === todayStr) {
        // Déjà versé aujourd'hui → skip
        continue
      }
    }

    // ── Calculer quels jours doivent être versés ───────────────────────────
    // Chaque "jour" correspond à un jour calendaire du mois M+1 (start_date)
    // Le jour N correspond à : start_date + (N-1) jours
    // Les jours déjà payés : 0..days_paid-1
    // On identifie les jours DUS = depuis le jour eligible jusqu'à aujourd'hui
    // puis on les verse UN PAR UN (une transaction par jour)

    const eligibleMs = Date.UTC(
      parseInt(entry.eligible_date.substring(0, 4)),
      parseInt(entry.eligible_date.substring(5, 7)) - 1,
      parseInt(entry.eligible_date.substring(8, 10))
    )
    const startMs = Date.UTC(
      parseInt(entry.start_date.substring(0, 4)),
      parseInt(entry.start_date.substring(5, 7)) - 1,
      parseInt(entry.start_date.substring(8, 10))
    )
    const todayMs = Date.UTC(
      parseInt(todayStr.substring(0, 4)),
      parseInt(todayStr.substring(5, 7)) - 1,
      parseInt(todayStr.substring(8, 10))
    )

    // Jour 1 = start_date (1er M+1), jour 2 = start_date+1, etc.
    // eligible_date peut être > start_date (cas des 14 jours)
    // eligible_day_index = index 0-based du jour eligible dans le mois M+1
    const eligibleDayIndex = Math.floor((eligibleMs - startMs) / (1000 * 60 * 60 * 24))
    // today_day_index = index 0-based d'aujourd'hui dans le mois M+1
    const todayDayIndex    = Math.min(
      Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24)),
      entry.days_in_month - 1  // plafonner au dernier jour alloué (= dernier jour du mois)
    )

    // On doit payer les jours dont l'index est entre days_paid et todayDayIndex inclus
    // mais seulement si l'index >= eligibleDayIndex (pas avant eligible_date)
    const firstDueDayIndex = Math.max(entry.days_paid, eligibleDayIndex)
    const lastDueDayIndex  = todayDayIndex

    if (firstDueDayIndex > lastDueDayIndex) continue

    // Email envoyé seulement au 1er versement de cette entrée
    const isFirstPayout = (entry.status === 'pending_release')

    let currentDaysPaid = entry.days_paid

    // ── Boucle : une transaction par jour dû ──────────────────────────────
    for (let dayIndex = firstDueDayIndex; dayIndex <= lastDueDayIndex; dayIndex++) {
      // Guard anti-doublon : re-lire days_paid depuis DB avant chaque versement
      // Protection contre race condition (2 Workers en parallèle sur la même entrée)
      const freshEntry = await db.prepare(
        `SELECT days_paid, status FROM pending_wallet_entries WHERE id = ?`
      ).bind(entry.id).first() as any
      if (!freshEntry || freshEntry.status === 'completed' || freshEntry.status === 'cancelled') break
      if (freshEntry.days_paid !== currentDaysPaid) {
        // Un autre Worker a déjà avancé days_paid — on recalcule depuis son état
        console.warn(`[processDailyPayments] Race condition détectée sur ${entry.id} : days_paid DB=${freshEntry.days_paid} vs local=${currentDaysPaid} — abandon`)
        break
      }

      // Date calendaire de ce jour (pour le libellé)
      const dayDate = new Date(startMs + dayIndex * 24 * 60 * 60 * 1000)
      const dayLabel = dayDate.toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC'
      })

      const amountForThisDay = entry.amount_per_day

      // ── IDs déterministes — clé d'idempotence anti-doublon ────────────────
      // Format : "dpay-{pwe_id_8chars}-d{dayIndex:02d}-out/in"
      // Si la transaction existe déjà (INSERT OR IGNORE la rejette silencieusement),
      // on skip ce jour sans toucher aux wallets ni à days_paid.
      const pweShort   = entry.id.replace(/-/g, '').substring(0, 12)
      const txIdDebit  = `dpay-${pweShort}-d${String(dayIndex).padStart(3,'0')}-out`
      const txIdCredit = `dpay-${pweShort}-d${String(dayIndex).padStart(3,'0')}-in`

      // Vérifier si ce jour a déjà été versé (idempotence stricte)
      const alreadyPaid = await db.prepare(
        `SELECT id FROM wallet_transactions WHERE id = ?`
      ).bind(txIdCredit).first()
      if (alreadyPaid) {
        // Transaction déjà présente : days_paid est peut-être en retard, on le rattrape
        currentDaysPaid++
        continue
      }

      // Lire les soldes avant ce versement
      const walletSnap = await db.prepare(
        `SELECT balance, pending_balance FROM wallets WHERE member_id = ?`
      ).bind(entry.member_id).first() as any
      const balPrincipalBefore = walletSnap?.balance ?? 0
      const balPendingBefore   = walletSnap?.pending_balance ?? 0

      // Déduire du pending_balance
      await db.prepare(
        `UPDATE wallets
         SET pending_balance = MAX(0, pending_balance - ?),
             updated_at = datetime('now')
         WHERE member_id = ?`
      ).bind(amountForThisDay, entry.member_id).run()

      // Transaction de sortie du wallet pending (ID déterministe → INSERT OR IGNORE)
      await db.prepare(
        `INSERT OR IGNORE INTO wallet_transactions
           (id, member_id, wallet_type, transaction_type, amount,
            balance_before, balance_after, description, reference_id)
         VALUES (?, ?, 'pending', 'debit_transfer', ?, ?, ?, ?, ?)`
      ).bind(
        txIdDebit,
        entry.member_id,
        -amountForThisDay,
        balPendingBefore,
        Math.max(0, balPendingBefore - amountForThisDay),
        `Libération vers portefeuille principal — ${labelForSource(entry.commission_type)} · ${dayLabel}`,
        entry.id
      ).run()

      // Créditer le portefeuille principal (ID déterministe → INSERT OR IGNORE)
      const mauritiusNowStr = new Date(Date.now() + MAURITIUS_OFFSET_HOURS * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
      await db.prepare(
        `UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(amountForThisDay, entry.member_id).run()
      await db.prepare(
        `UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
      ).bind(amountForThisDay, amountForThisDay, entry.member_id).run()
      await db.prepare(
        `INSERT OR IGNORE INTO wallet_transactions
           (id, member_id, wallet_type, transaction_type, amount,
            balance_before, balance_after, description, reference_id, created_at)
         VALUES (?, ?, 'principal', ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        txIdCredit,
        entry.member_id,
        entry.commission_type + '_daily',
        amountForThisDay,
        balPrincipalBefore,
        balPrincipalBefore + amountForThisDay,
        `${labelForSource(entry.commission_type + '_daily')} · ${dayLabel} · $${amountForThisDay.toFixed(2)}/j`,
        entry.id,
        mauritiusNowStr
      ).run()

      currentDaysPaid++
      paid++

      // ── Mise à jour atomique après CHAQUE versement journalier ─────────
      // CRITIQUE : si le Worker est tué (timeout CPU Cloudflare), les jours
      // déjà versés sont persistés immédiatement en DB, empêchant les re-paiements.
      // Sans cet UPDATE ici, days_paid reste à sa valeur d'origine et le prochain
      // run recommencerait tout depuis le début (cause des doublons observés).
      const isCompletedSoFar = currentDaysPaid >= entry.days_in_month
      await db.prepare(
        `UPDATE pending_wallet_entries
         SET days_paid    = ?,
             status       = ?,
             last_paid_at = datetime('now')
         WHERE id = ?`
      ).bind(currentDaysPaid, isCompletedSoFar ? 'completed' : 'active', entry.id).run()
    }

    // ── Post-boucle : notifications et commission parente ────────────────
    // Note : days_paid et status ont déjà été mis à jour après CHAQUE versement
    // (dans la boucle ci-dessus). On utilise isCompleted ici uniquement pour
    // décider des notifications et de la mise à jour de la commission parente.
    const isCompleted = currentDaysPaid >= entry.days_in_month

    // Marquer la commission parente comme payée si terminée
    if (isCompleted && entry.commission_id) {
      await db.prepare(
        `UPDATE commissions SET status = 'paid', paid_at = datetime('now') WHERE id = ?`
      ).bind(entry.commission_id).run()
    }

    // ── Notification "100% libéré" quand la PWE est terminée ──────────────
    if (isCompleted) {
      const typeLabels: Record<string, string> = {
        prime_leadership:            'Prime de Leadership',
        bonus_influence:             "Bonus d'Influence",
        bonus_rayonnement:           'Bonus de Rayonnement',
        valorisation_recommandation: 'Valorisation Recommandation',
        fast_start:                  'Fast Start Bonus',
      }
      const label = typeLabels[entry.commission_type] || entry.commission_type
      await createNotification(db, entry.member_id, 'commission',
        '✅ Commission entièrement libérée',
        `Votre ${label} de ${entry.total_amount?.toFixed(2)}$ a été intégralement versée dans votre portefeuille disponible. Vous pouvez maintenant retirer ce montant.`
      )
    }

    // ── Notification "début de libération" — premier versement ───────────
    if (isFirstPayout && !isCompleted) {
      const typeLabels3: Record<string, string> = {
        prime_leadership:            'Prime de Leadership',
        bonus_influence:             "Bonus d'Influence",
        bonus_rayonnement:           'Bonus de Rayonnement',
        valorisation_recommandation: 'Valorisation Recommandation',
        fast_start:                  'Fast Start Bonus',
      }
      const label3 = typeLabels3[entry.commission_type] || entry.commission_type
      await createNotification(db, entry.member_id, 'commission',
        '🔓 Libération commencée',
        `Votre ${label3} de ${entry.total_amount?.toFixed(2)}$ commence à être libérée. Vous recevrez ${entry.amount_per_day?.toFixed(2)}$/jour pendant ${entry.days_in_month} jours.`
      )
    }

    // ── Notification "rattrapage versé" — jours manqués versés en bloc ────
    // Détecté quand on verse plusieurs jours d'un coup au premier déblocage
    const nbJoursVersesAujourd = lastDueDayIndex - firstDueDayIndex + 1
    if (isFirstPayout && nbJoursVersesAujourd > 1) {
      const typeLabels2: Record<string, string> = {
        prime_leadership:            'Prime de Leadership',
        bonus_influence:             "Bonus d'Influence",
        bonus_rayonnement:           'Bonus de Rayonnement',
        valorisation_recommandation: 'Valorisation Recommandation',
        fast_start:                  'Fast Start Bonus',
      }
      const label2   = typeLabels2[entry.commission_type] || entry.commission_type
      const rattrapage = (nbJoursVersesAujourd * entry.amount_per_day).toFixed(2)
      await createNotification(db, entry.member_id, 'commission',
        '💰 Rattrapage de commission versé',
        `Votre ${label2} était en attente pendant ${nbJoursVersesAujourd - 1} jour(s). Un rattrapage de ${rattrapage}$ (${nbJoursVersesAujourd} jours × ${entry.amount_per_day?.toFixed(2)}$/j) vient d'être versé dans votre portefeuille disponible.`
      )
    }

    // Email commission_received — seulement au 1er versement
    if (isFirstPayout) {
      try {
        const mbrComm = await db.prepare(
          `SELECT first_name, email FROM members WHERE id=?`
        ).bind(entry.member_id).first() as any
        if (mbrComm) {
          await sendEmail(db, {
            to: mbrComm.email, toName: mbrComm.first_name,
            templateId: 'commission_received',
            variables: {
              prenom:          mbrComm.first_name || '',
              montant:         String(entry.total_amount?.toFixed(2) || '0'),
              devise:          'USD',
              type_commission: labelForSource(entry.commission_type),
              periode:         entry.period || '',
              dashboard_url:   'https://willbeleader.pages.dev',
            }
          }).catch(() => {})
        }
      } catch (_) {}
    }
  }

  // Écrire la date du dernier run dans system_config
  if (paid > 0) {
    await db.prepare(
      `INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('last_daily_payment', ?, datetime('now'))`
    ).bind(todayStr).run()
  }

  return paid
}

// ── BONUS D'INFLUENCE ─────────────────────────────────────────

/**
 * Helper générique : lit une valeur numérique depuis bonus_config.
 */
async function getInfluenceConfigPct(db: D1Database, key: string, defaultVal: number): Promise<number> {
  const r = await db.prepare(`SELECT value FROM bonus_config WHERE key = ?`).bind(key).first() as any
  return r ? parseFloat(r.value) : defaultVal
}

/**
 * Helper générique : lit une valeur string depuis bonus_config.
 */
async function getInfluenceConfigStr(db: D1Database, key: string, defaultVal: string): Promise<string> {
  const r = await db.prepare(`SELECT value FROM bonus_config WHERE key = ?`).bind(key).first() as any
  return r?.value ?? defaultVal
}

/**
 * Vérifie si un membre a validé son rang via son BV mensuel
 * (left_bv_monthly + right_bv_monthly — la jambe la plus faible doit atteindre
 *  le seuil min_bv_leg du rang configuré dans rank_config).
 *
 * NB : personal_bv_monthly n'est PAS compté ici (legs réseau uniquement).
 */
async function hasValidatedRankByMonthlyBV(db: D1Database, member: any): Promise<boolean> {
  const rankName = member.current_rank
  if (!rankName || rankName === 'none') return false

  const rankCfg = await db.prepare(
    `SELECT min_bv_leg FROM rank_config WHERE rank_name = ?`
  ).bind(rankName).first() as any
  if (!rankCfg) return false

  const leftBV  = member.left_bv_monthly  || 0
  const rightBV = member.right_bv_monthly || 0
  const minLeg  = Math.min(leftBV, rightBV)

  return minLeg >= (rankCfg.min_bv_leg as number)
}

/**
 * Calcule le Bonus d'Influence sur 5 niveaux sponsor.
 *
 * CONDITIONS SUR LE BÉNÉFICIAIRE (sponsor qui reçoit) :
 * ① Rang minimum configurable (défaut Leader)
 * ② A parrainé au moins 1 personne ayant acheté un package validé dans le mois
 *    (si influence_require_parrainage_achat = 'true')
 * ③ A validé son rang via son BV mensuel (jambe min >= seuil rank_config)
 *    (si influence_min_monthly_bv_ratio = 'true')
 *
 * CONDITIONS SUR LE FILLEUL (source de la prime) :
 * ④ Rang actuel >= rang minimum filleul configurable (défaut Manager)
 *    — Administrator exclu quelle que soit la config
 * ⑤ A validé ce rang via son BV mensuel
 *
 * Taux par niveau : N1=5%, N2=4%, N3=3%, N4=2%, N5=1% (configurables).
 * Cap partagé depuis la prime du filleul.
 *
 * @param basePrime    Prime nette du filleul (source du bonus)
 * @param remainingCap Cap restant sur la prime du filleul
 * @returns Total d'influence effectivement attribué (déduit du cap)
 */
async function calculateInfluenceBonus(
  db: D1Database,
  memberId: string,
  basePrime: number,
  period: string,
  remainingCap: number,
  skipMonthlyConditions = false   // true en mode rétroactif : ignore ②③ sponsor + ⑤ filleul
): Promise<number> {

  // ── Lecture configuration depuis bonus_config ────────────────
  const minRankStr         = await getInfluenceConfigStr(db, 'influence_min_rank', 'Leader')
  const minFilleulRankStr  = await getInfluenceConfigStr(db, 'influence_min_filleul_rank', 'Manager')
  const requireParrainAchat = await getInfluenceConfigStr(db, 'influence_require_parrainage_achat', 'true') !== 'false'
  const requireMonthlyBV   = await getInfluenceConfigStr(db, 'influence_min_monthly_bv_ratio', 'true') !== 'false'

  const minRankIdx        = getRankIndex(minRankStr)
  const minFilleulRankIdx = getRankIndex(minFilleulRankStr)
  const adminRankIdx      = getRankIndex('Administrator') // toujours exclu

  // ── Niveaux de taux ──────────────────────────────────────────
  const levels = await db.prepare(
    `SELECT * FROM influence_config ORDER BY level ASC`
  ).all()

  // ── Vérification condition filleul (source) ─────────────────
  // CONDITION ④ : rang filleul >= minFilleulRankIdx ET != Administrator
  const filleul = await db.prepare(
    `SELECT * FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!filleul) return 0

  const filleulRankIdx = getRankIndex(filleul.current_rank)
  // Administrator exclu ET rang insuffisant → pas d'influence générée
  if (filleulRankIdx <= adminRankIdx) return 0
  if (filleulRankIdx < minFilleulRankIdx) return 0

  // CONDITION ⑤ : filleul a validé son rang via BV mensuel
  // Ignorée si skipMonthlyConditions=true (rétroactivité intra-mois activée)
  if (requireMonthlyBV && !skipMonthlyConditions) {
    const filleulValidated = await hasValidatedRankByMonthlyBV(db, filleul)
    if (!filleulValidated) return 0
  }

  // ── Remontée sur 5 niveaux sponsor ──────────────────────────
  let currentId  = memberId
  let totalSpent = 0
  let capLeft    = remainingCap

  // Calcul de la période calendaire (mois en cours : YYYY-MM)
  const periodYM = period.substring(0, 7) // "2026-05"

  for (const lvl of levels.results as any[]) {
    if (capLeft <= 0) break

    // Remonter d'un niveau
    const current = await db.prepare(
      `SELECT sponsor_id FROM members WHERE id = ?`
    ).bind(currentId).first() as any
    if (!current?.sponsor_id) break

    const sponsorId = current.sponsor_id

    const sponsor = await db.prepare(
      `SELECT * FROM members WHERE id = ?
       AND license_active = 1
       AND member_status IN ('AMI','Partenaire')`
    ).bind(sponsorId).first() as any

    // Avancer le curseur même si le sponsor est inéligible (on continue la chaîne)
    currentId = sponsorId

    if (!sponsor) continue

    // ── CONDITION ① : rang bénéficiaire >= minRankIdx ───────────
    const sponsorRankIdx = getRankIndex(sponsor.current_rank)
    if (sponsorRankIdx < minRankIdx) continue

    // ── CONDITION ② : bénéficiaire a validé son rang via BV mensuel ──
    // Ignorée si skipMonthlyConditions=true (rétroactivité intra-mois activée)
    if (requireMonthlyBV && !skipMonthlyConditions) {
      const sponsorValidated = await hasValidatedRankByMonthlyBV(db, sponsor)
      if (!sponsorValidated) continue
    }

    // ── CONDITION ③ : bénéficiaire a parrainé avec achat de package ce mois ──
    // Ignorée si skipMonthlyConditions=true (rétroactivité intra-mois activée)
    if (requireParrainAchat && !skipMonthlyConditions) {
      // Un filleul direct ayant un package validé dont created_at est dans le mois
      const parrainRow = await db.prepare(
        `SELECT COUNT(*) as cnt
         FROM members m
         JOIN package_orders po ON po.member_id = m.id
         WHERE m.sponsor_id = ?
           AND po.status = 'validated'
           AND strftime('%Y-%m', po.created_at) = ?`
      ).bind(sponsorId, periodYM).first() as any
      if (!parrainRow || (parrainRow.cnt as number) < 1) continue
    }

    // ── Calcul et attribution du bonus ──────────────────────────
    const rawBonus    = basePrime * ((lvl as any).percentage / 100)
    const cappedBonus = Math.min(rawBonus, capLeft)

    if (cappedBonus > 0) {
      const infCommId = generateId()
      await db.prepare(
        `INSERT INTO commissions
          (id, member_id, type, amount, description, period, source_member_id, status)
         VALUES (?, ?, 'bonus_influence', ?, ?, ?, ?, 'pending')`
      ).bind(
        infCommId,
        sponsor.id,
        cappedBonus,
        `Bonus d'Influence Niveau ${(lvl as any).level} — ${period}`,
        period,
        memberId
      ).run()

      // → Wallet pending (règle 14j + M+1) — reference_id = infCommId pour traçabilité JOIN
      await walletOperation(db, sponsor.id, cappedBonus, 'pending', 'bonus_influence', undefined, infCommId)
      await creditPendingWallet(db, sponsor.id, infCommId, 'bonus_influence', period, cappedBonus)

      capLeft    -= cappedBonus
      totalSpent += cappedBonus
    }
  }

  return totalSpent
}

// ── BONUS DE RAYONNEMENT ──────────────────────────────────────

/**
 * Bonus de Rayonnement : 10% de la prime RÉELLE de chaque direct
 *
 * CONDITIONS (toutes obligatoires) :
 * ① Package éligible actif : catégorie cat-synex ou cat-club avec price_usd >= prix_min configuré
 * ② Parrainage mensuel     : au moins 1 nouveau filleul direct recruté dans le mois calendaire
 * ③ BV mensuel Captain     : BV cumulés ce mois (left+right+personal) >= seuil configuré (défaut 6000)
 *
 * Toutes les conditions sont paramétrables depuis le backoffice admin (bonus_config).
 */
async function calculateRayonnementBonus(
  db: D1Database,
  memberId: string,
  period: string,
  remainingCap: number,
  skipMonthlyConditions = false   // true en mode rétroactif : ignore ② et ③
): Promise<void> {
  const member = await db.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return

  // ── Lecture config depuis bonus_config ──────────────────────
  const rayPct          = await getRayonnementConfigPct(db, 'rayonnement_pct', 10)
  // Prix minimum lu depuis bonus_config (paramétrable admin) — aucune valeur hardcodée.
  // Si la clé n'existe pas en DB, on utilise 0 (pas de seuil) plutôt qu'une valeur arbitraire.
  const minPackagePrice = await getRayonnementConfigPct(db, 'rayonnement_min_package_price', 0)
  const eligibleCatsStr = await getRayonnementConfigStr(db, 'rayonnement_eligible_categories', 'cat-synex,cat-club')
  const requireParrain  = await getRayonnementConfigStr(db, 'rayonnement_require_parrainage', 'true') !== 'false'
  const minMonthlyBV    = await getRayonnementConfigPct(db, 'rayonnement_min_monthly_bv', 6000)
  const minRankStr      = await getRayonnementConfigStr(db, 'rayonnement_min_rank', 'Captain')

  const eligibleCats = eligibleCatsStr.split(',').map(s => s.trim()).filter(Boolean)

  // ── CONDITION 0 : rang minimum (current_rank) ───────────────
  const rankIdx    = getRankIndex(member.current_rank)
  const minRankIdx = getRankIndex(minRankStr)
  if (rankIdx < minRankIdx) return

  // ── CONDITION ① : Package éligible ─────────────────────────
  // Toujours vérifiée, même en mode rétroactif (condition structurelle).
  // Doit posséder un package validé dans les catégories autorisées
  // avec price_usd >= minPackagePrice.
  //
  // CAS UPGRADE : si le membre a upgradé depuis un package inférieur,
  // la commande d'upgrade (product_type='upgrade') stocke price_usd = prix du
  // package CIBLE (ex. $2 000 pour INFLUENCE). On considère aussi les upgrades
  // encore en 'pending' car le membre a déjà payé et s'est engagé sur ce niveau.
  // On regarde également le cumul : prix du package de base validé
  // + montant différentiel payé (upgrade_diff_amount) pour couvrir les cas
  // où l'upgrade est en pending mais le package de base était déjà validé.
  const catPlaceholders = eligibleCats.map(() => '?').join(',')
  const packageRow = await db.prepare(
    `SELECT po.id FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ?
       AND (
         po.status = 'validated'
         OR (
           -- Upgrade en attente de validation admin (virement bancaire) :
           -- le membre a engagé la montée de package, on considère le niveau cible.
           po.status IN ('pending', 'proof_submitted')
           AND po.product_type = 'upgrade'
           AND po.upgrade_from_package_id IS NOT NULL
         )
       )
       AND p.category_id IN (${catPlaceholders})
       AND p.price_usd >= ?
     ORDER BY p.price_usd DESC
     LIMIT 1`
  ).bind(memberId, ...eligibleCats, minPackagePrice).first()
  if (!packageRow) return

  // ── CONDITION ② : Parrainage dans le mois ──────────────────
  // Ignorée si skipMonthlyConditions=true (rétroactivité intra-mois activée)
  if (requireParrain && !skipMonthlyConditions) {
    const periodStart = period + '-01'                        // ex. "2026-05-01"
    const periodEnd   = (() => {
      const [y, m] = period.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      return `${period}-${String(lastDay).padStart(2,'0')}`   // ex. "2026-05-31"
    })()
    const parrainRow = await db.prepare(
      `SELECT id FROM members
       WHERE sponsor_id = ?
         AND DATE(created_at) >= ?
         AND DATE(created_at) <= ?
       LIMIT 1`
    ).bind(memberId, periodStart, periodEnd).first()
    if (!parrainRow) return
  }

  // ── CONDITION ③ : BV mensuel >= seuil Captain ──────────────
  // Ignorée si skipMonthlyConditions=true (rétroactivité intra-mois activée)
  // BV cumulés du mois = left_bv_monthly + right_bv_monthly + personal_bv_monthly
  if (!skipMonthlyConditions) {
    const totalMonthlyBV = (member.left_bv_monthly || 0)
                         + (member.right_bv_monthly || 0)
                         + (member.personal_bv_monthly || 0)
    if (totalMonthlyBV < minMonthlyBV) return
  }

  // ── Calcul du bonus pour chaque direct ─────────────────────
  // Récupérer la prime RÉELLE calculée ce mois pour chaque direct
  const directPrimes = await db.prepare(
    `SELECT c.member_id, c.amount as real_prime, m.first_name, m.last_name
     FROM commissions c
     JOIN members m ON m.id = c.member_id
     WHERE m.sponsor_id = ?
       AND c.type = 'prime_leadership'
       AND c.period = ?
       AND c.status IN ('pending','approved','paid')`
  ).bind(memberId, period).all()

  let capLeft = remainingCap

  for (const direct of directPrimes.results as any[]) {
    if (capLeft <= 0) break

    const rawBonus    = direct.real_prime * (rayPct / 100)
    const cappedBonus = Math.min(rawBonus, capLeft)

    if (cappedBonus > 0) {
      const rayCommId = generateId()
      await db.prepare(
        `INSERT INTO commissions
          (id, member_id, type, amount, description, period, source_member_id, status)
         VALUES (?, ?, 'bonus_rayonnement', ?, ?, ?, ?, 'pending')`
      ).bind(
        rayCommId, memberId, cappedBonus,
        `Bonus de Rayonnement — ${direct.first_name} ${direct.last_name} — ${period}`,
        period, direct.member_id
      ).run()

      // → Pending wallet (règle M+1) — reference_id = rayCommId pour traçabilité JOIN
      await walletOperation(db, memberId, cappedBonus, 'pending', 'bonus_rayonnement', undefined, rayCommId)
      await creditPendingWallet(db, memberId, rayCommId, 'bonus_rayonnement', period, cappedBonus)

      capLeft -= cappedBonus
    }
  }
}

// ── Helpers config Rayonnement (lecture depuis bonus_config) ──
async function getRayonnementConfigPct(db: D1Database, key: string, defaultVal: number): Promise<number> {
  const r = await db.prepare(`SELECT value FROM bonus_config WHERE key = ?`).bind(key).first() as any
  return r ? parseFloat(r.value) : defaultVal
}
async function getRayonnementConfigStr(db: D1Database, key: string, defaultVal: string): Promise<string> {
  const r = await db.prepare(`SELECT value FROM bonus_config WHERE key = ?`).bind(key).first() as any
  return r?.value ?? defaultVal
}

// ── VALIDATION MENSUELLE ──────────────────────────────────────

/**
 * Vérifie si un membre est éligible aux commissions ce mois
 * Conditions : licence active + package actif +
 *   (300 BV personnels OU 1 client actif)
 */
/**
 * checkMonthlyQualification — Nouveau système Prime de Leadership (Session H)
 *
 * Retourne le rang mensuel effectif (string) ou null (pas de paiement ce mois).
 *
 * Règles :
 *  1. Licence active obligatoire, statut AMI ou Partenaire
 *  2. Rang à vie (current_rank) doit exister
 *  3. Rang mensuel effectif = le plus bas de :
 *     a) Rang BV mensuel : le rang le plus haut dont min_monthly_bv_leg ≤ petite jambe mensuelle du membre
 *     b) Rang recrutement : le rang le plus haut dont min_monthly_directs ≤ nouvelles recrues ce mois
 *        avec package ≥ min_monthly_package_value (0 = pas de filtre sur le package)
 *     Si min_monthly_bv_leg = 0 sur tous les rangs → critère BV = rang à vie (non bloquant)
 *     Si min_monthly_directs = 0 → critère recrutement = rang à vie (non bloquant)
 *  4. Plancher par rang réel : si rang effectif < (rang réel - monthly_floor_ranks) → null
 *  5. Rang effectif ne peut pas dépasser le rang à vie réel
 */
async function checkMonthlyQualification(
  db: D1Database,
  memberId: string,
  member: any
): Promise<string | null> {
  if (!member.license_active) return null
  if (member.member_status === 'Membre' || member.member_status === 'Client') return null

  const realRank = member.current_rank as string
  if (!realRank || realRank === 'none') return null

  // Charger tous les rangs par ordre décroissant
  const ranksResult = await db.prepare(
    `SELECT * FROM rank_config ORDER BY rank_order DESC`
  ).all()
  const ranks = ranksResult.results as any[]

  // Trouver la config du rang réel
  const realRankConfig = ranks.find(r => r.rank_name === realRank)
  if (!realRankConfig) return null

  // ── BV mensuel petite jambe ──────────────────────────────────
  const leftBVMonthly  = member.left_bv_monthly  || 0
  const rightBVMonthly = member.right_bv_monthly || 0
  const smallLegMonthly = Math.min(leftBVMonthly, rightBVMonthly)

  // ── Nouvelles recrues directes ce mois ──────────────────────
  // = membres dont sponsor_id = memberId ET created_at dans le mois en cours
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const monthStr = currentMonthStart.toISOString().substring(0, 7) // 'YYYY-MM'

  // Rang BV mensuel : rang le plus élevé dont min_monthly_bv_leg ≤ petite jambe mensuelle
  // Si min_monthly_bv_leg = 0 → ce rang est toujours atteint côté BV (non bloquant)
  let bvMonthlyRank: string = 'none'
  for (const rank of ranks) {
    // Ne pas dépasser le rang réel
    if (getRankIndex(rank.rank_name) > getRankIndex(realRank)) continue
    const threshold = rank.min_monthly_bv_leg || 0
    if (threshold === 0 || smallLegMonthly >= threshold) {
      bvMonthlyRank = rank.rank_name
      break
    }
  }

  // Rang recrutement mensuel : rang le plus élevé dont min_monthly_directs ≤ recrues ce mois
  // Filtre sur package ≥ min_monthly_package_value si > 0
  let recruitMonthlyRank: string = 'none'
  for (const rank of ranks) {
    // Ne pas dépasser le rang réel
    if (getRankIndex(rank.rank_name) > getRankIndex(realRank)) continue
    const minDir = rank.min_monthly_directs || 0
    if (minDir === 0) {
      recruitMonthlyRank = rank.rank_name
      break
    }
    const minPkgVal = rank.min_monthly_package_value || 0
    // Compter les nouvelles recrues directes ce mois avec package suffisant
    let recruitsCount = 0
    if (minPkgVal > 0) {
      const row = await db.prepare(
        `SELECT COUNT(DISTINCT m.id) as cnt
         FROM members m
         JOIN package_orders po ON po.member_id = m.id
         JOIN packages p ON p.id = po.package_id
         WHERE m.sponsor_id = ?
           AND strftime('%Y-%m', m.created_at) = ?
           AND po.status = 'validated'
           AND p.price_usd >= ?`
      ).bind(memberId, monthStr, minPkgVal).first() as any
      recruitsCount = row?.cnt || 0
    } else {
      const row = await db.prepare(
        `SELECT COUNT(*) as cnt FROM members
         WHERE sponsor_id = ? AND strftime('%Y-%m', created_at) = ?`
      ).bind(memberId, monthStr).first() as any
      recruitsCount = row?.cnt || 0
    }
    if (recruitsCount >= minDir) {
      recruitMonthlyRank = rank.rank_name
      break
    }
  }

  // Rang effectif = le plus bas des deux critères
  const bvIdx      = getRankIndex(bvMonthlyRank)
  const recruitIdx = getRankIndex(recruitMonthlyRank)
  const effectiveIdx  = Math.min(bvIdx, recruitIdx)
  const effectiveRank = RANK_ORDER[effectiveIdx] || 'none'

  if (effectiveRank === 'none') return null

  // ── Plancher par rang réel ───────────────────────────────────
  const floorRanks = realRankConfig.monthly_floor_ranks || 0
  if (floorRanks > 0) {
    const realIdx  = getRankIndex(realRank)
    const floorIdx = realIdx - floorRanks  // index minimum accepté
    if (effectiveIdx < floorIdx) return null  // en dessous du plancher → pas de paiement
  }

  return effectiveRank
}

// ── HOLDING TANK & PLACEMENT ──────────────────────────────────

/**
 * Place un membre depuis le Holding Tank dans l'arbre binaire
 * Déclenche la BVQueue après placement
 */
export async function placeMemberFromHoldingTank(
  db: D1Database,
  memberId: string,
  parentId: string,
  position: 'L' | 'R',
  placedBy: string,       // adminId OU memberId (sponsor) — utilisé pour logs uniquement
  isAdmin: boolean = true // false quand c'est le sponsor qui place (évite FK violation sur admin_users)
): Promise<{ success: boolean; message: string }> {
  // Chercher le membre — accepter in_holding_tank=1 OU entry holding_tank waiting
  // HT-FIX : on recherche aussi les membres dont holding_tank.status='waiting'
  // même si in_holding_tank=0 (désync possible après placement direct en DB)
  const member = await db.prepare(
    `SELECT m.* FROM members m
     WHERE m.id = ?
     AND (m.in_holding_tank = 1
          OR EXISTS (SELECT 1 FROM holding_tank ht WHERE ht.member_id = m.id AND ht.status = 'waiting'))`
  ).bind(memberId).first() as any
  if (!member) return { success: false, message: 'Membre non trouvé en Holding Tank' }

  // HT-FIX — Détecter les cas de désync AVANT le placement :
  // Si in_holding_tank=0 ET binary_parent_id existe → le membre est DÉJÀ PLACÉ
  // (holding_tank.status='waiting' est orphelin). Corriger la désync et retourner SUCCESS
  // car le résultat final (membre dans l'arbre) est correct — pas une erreur pour l'admin.
  if (!member.in_holding_tank && member.binary_parent_id) {
    // Le membre est déjà dans l'arbre — corriger l'entrée holding_tank orpheline
    // placed_by REFERENCES admin_users(id) — NULL ici pour éviter FK violation.
    // La route admin complète placed_by APRÈS via son propre try/catch.
    await db.prepare(
      `UPDATE holding_tank SET status = 'placed', placed_at = datetime('now'), placed_by = NULL
       WHERE member_id = ? AND status = 'waiting'`
    ).bind(memberId).run()
    return {
      success: true,
      message: `Membre (${member.unique_id}) déjà placé dans l'arbre (position ${member.binary_position}). Entrée Holding Tank synchronisée automatiquement.`
    }
  }

  // Forcer la cohérence : s'assurer que in_holding_tank = 1 si pas encore fait
  if (!member.in_holding_tank) {
    await db.prepare(`UPDATE members SET in_holding_tank = 1 WHERE id = ?`).bind(memberId).run()
  }

  // HOLD_001 — Vérifier que le slot est libre (via binary_parent_id + binary_position)
  const existing = await db.prepare(
    `SELECT id FROM members WHERE binary_parent_id = ? AND binary_position = ? AND in_holding_tank = 0`
  ).bind(parentId, position).first()
  if (existing) return { success: false, message: `HOLD_001 — Slot ${position} déjà occupé` }

  // HOLD_002 — Vérification directe sur la colonne binary_left_id / binary_right_id du parent
  // Garde-fou contre toute désynchronisation entre la colonne du parent et binary_parent_id de l'enfant
  const colParent = position === 'L' ? 'binary_left_id' : 'binary_right_id'
  const parentNode = await db.prepare(
    `SELECT binary_left_id, binary_right_id FROM members WHERE id = ?`
  ).bind(parentId).first() as any
  const colCurrentValue = position === 'L' ? parentNode?.binary_left_id : parentNode?.binary_right_id
  if (colCurrentValue && colCurrentValue !== memberId) {
    // La colonne pointe déjà vers un autre membre : désynchronisation détectée → bloquer
    return {
      success: false,
      message: `HOLD_002 — Désynchronisation détectée : colonne ${colParent} du parent pointe vers ${colCurrentValue} (attendu NULL ou ${memberId}). Nettoyez le slot via le panneau admin avant de réessayer.`
    }
  }

  // ── Mise à jour du membre placé ─────────────────────────────
  await db.prepare(
    `UPDATE members SET
      binary_parent_id = ?,
      binary_position  = ?,
      in_holding_tank  = 0,
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(parentId, position, memberId).run()

  // ── Mise à jour du parent (binary_left_id ou binary_right_id) ─
  await db.prepare(
    `UPDATE members SET ${colParent} = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId, parentId).run()

  // ── Mettre à jour holding_tank.status → 'placed' ────────────
  // HT-FIX : s'assurer que TOUTES les entrées waiting de ce membre sont marquées placed
  // (évite les apparitions fantômes dans l'admin HT)
  // placed_by REFERENCES admin_users(id) — TOUJOURS NULL ici pour éviter toute FK violation.
  // Le placed_by est mis à jour par la route admin APRÈS ce retour (dans le try/catch post-placement).
  await db.prepare(
    `UPDATE holding_tank SET status = 'placed', placed_at = datetime('now'), placed_by = NULL
     WHERE member_id = ? AND status = 'waiting'`
  ).bind(memberId).run()

  // ── Opérations post-placement (non bloquantes) ──────────────
  // Chaque bloc est isolé dans un try/catch : une erreur ici
  // ne doit JAMAIS annuler un placement déjà enregistré en DB.

  // 1. Traiter les BV en queue pour ce membre
  try {
    const pendingBVItems = await db.prepare(
      `SELECT * FROM bv_queue WHERE member_id = ? AND status IN ('pending','failed','processing') ORDER BY created_at ASC`
    ).bind(memberId).all() as any

    for (const item of (pendingBVItems.results || [])) {
      try {
        await db.prepare(
          `UPDATE bv_queue SET status = 'processing', attempts = attempts + 1 WHERE id = ?`
        ).bind(item.id).run()

        // Idempotence via bv_propagated
        if (item.package_order_id) {
          const order = await db.prepare(
            `SELECT bv_propagated FROM package_orders WHERE id = ?`
          ).bind(item.package_order_id).first() as any
          if (order?.bv_propagated) {
            await db.prepare(
              `UPDATE bv_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?`
            ).bind(item.id).run()
            continue
          }
        }

        await propagateBV(db, item.member_id, item.bv_amount, item.period, item.package_order_id)

        await db.prepare(
          `UPDATE bv_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?`
        ).bind(item.id).run()
      } catch (err: any) {
        await db.prepare(
          `UPDATE bv_queue SET status = 'failed', last_error = ? WHERE id = ?`
        ).bind(err.message || 'Erreur propagation', item.id).run()
      }
    }
  } catch (_bvErr) {
    // BV queue non bloquante — le placement est déjà enregistré
  }

  // 2. Notification au membre placé
  try {
    await createNotification(db, memberId, 'success', 'Placé dans l\'arbre',
      `Vous avez été placé dans l'arbre binaire à la position ${position === 'L' ? 'Gauche' : 'Droite'}.`)
  } catch (_notifErr) { /* non bloquant */ }

  // 3. Enqueue recalcul rang pour le membre placé ET son parent
  //    IMPORTANT : on insère memberId (pas parentId) — FK members(id)
  //    On ignore ROOT car son rang n'existe pas dans le système
  try {
    await db.prepare(
      `INSERT OR IGNORE INTO rank_queue (id, member_id, trigger_event, status)
       VALUES (?, ?, 'placement', 'pending')`
    ).bind(generateId(), memberId).run()
  } catch (_rqErr) { /* non bloquant */ }

  try {
    // Enqueue le parent seulement s'il n'est pas ROOT
    const parentMember = await db.prepare(
      `SELECT unique_id FROM members WHERE id = ?`
    ).bind(parentId).first() as any
    if (parentMember && parentMember.unique_id !== 'ROOT') {
      await db.prepare(
        `INSERT OR IGNORE INTO rank_queue (id, member_id, trigger_event, status)
         VALUES (?, ?, 'placement', 'pending')`
      ).bind(generateId(), parentId).run()
    }
  } catch (_rqParentErr) { /* non bloquant */ }

  return { success: true, message: 'Membre placé avec succès dans l\'arbre binaire' }
}

// ── RESET BV MENSUEL ──────────────────────────────────────────

/**
 * Reset des BV mensuels — 1er du mois à 00h01
 * NB : fast_start_bv n'est PAS remis à 0 (B4 — indépendant du mois)
 */
/**
 * resetMonthlyBV — Remet à zéro les BV mensuels de tous les membres.
 * Enregistre la date/heure du reset dans compensation_config.bv_reset_last_at.
 * fast_start_bv intentionnellement NON remis à 0.
 */
export async function resetMonthlyBV(db: D1Database): Promise<void> {
  await db.prepare(
    `UPDATE members SET
      left_bv_monthly     = 0,
      right_bv_monthly    = 0,
      personal_bv_monthly = 0`
  ).run()
  // Mémoriser la date/heure exacte du reset (ISO UTC) pour le calcul du prochain cycle
  await db.prepare(
    `INSERT OR REPLACE INTO compensation_config (key, value)
     VALUES ('bv_reset_last_at', datetime('now'))`
  ).run()
}

/**
 * shouldResetBV — Vérifie si le reset BV automatique doit tourner maintenant.
 *
 * Logique :
 *   1. Lire bv_reset_auto (true/false) — si false, jamais automatique
 *   2. Lire bv_reset_cycle_days  — durée du cycle en jours (défaut 30)
 *   3. Lire bv_reset_timezone    — ex: 'Indian/Mauritius' (défaut)
 *   4. Lire bv_reset_hour        — heure locale du reset (défaut 0 = minuit)
 *   5. Lire bv_reset_last_at     — date/heure du dernier reset (vide = jamais fait)
 *
 * Le reset doit tourner si :
 *   - Mode automatique actif
 *   - L'heure locale actuelle dans le fuseau configuré = bv_reset_hour
 *   - Nombre de jours écoulés depuis le dernier reset >= bv_reset_cycle_days
 *     (ou jamais fait → reset immédiat à la prochaine heure configurée)
 */
async function shouldResetBV(db: D1Database): Promise<boolean> {
  const cfgRows = await db.prepare(
    `SELECT key, value FROM compensation_config
     WHERE key IN ('bv_reset_auto','bv_reset_mode','bv_reset_cycle_days','bv_reset_timezone','bv_reset_hour','bv_reset_last_at')`
  ).all()

  const cfg: Record<string, string> = {}
  for (const row of cfgRows.results as any[]) cfg[row.key] = row.value

  // Mode manuel → pas de reset automatique
  if (cfg['bv_reset_auto'] === 'false') return false

  const resetMode    = cfg['bv_reset_mode'] || 'cycle'        // 'cycle' | 'first_of_month'
  const cycleDays    = parseInt(cfg['bv_reset_cycle_days'] || '30', 10)
  const timezone     = cfg['bv_reset_timezone'] || 'Indian/Mauritius'
  const resetHour    = parseInt(cfg['bv_reset_hour'] || '0', 10)
  const lastResetStr = cfg['bv_reset_last_at'] || ''

  const nowUTC = new Date()

  // ── Calcul heure/jour/mois locaux dans le fuseau configuré ──────
  let localHour: number
  let localDay: number
  let localMonth: string  // "YYYY-MM"
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
      hour12: false
    })
    const p = fmt.formatToParts(nowUTC)
    const get = (t: string) => p.find(x => x.type === t)?.value || '0'
    localHour  = parseInt(get('hour'), 10)
    localDay   = parseInt(get('day'),  10)
    localMonth = `${get('year')}-${get('month')}`
  } catch {
    // Fallback UTC+4 (Maurice)
    const offsetMs = 4 * 60 * 60 * 1000
    const local    = new Date(nowUTC.getTime() + offsetMs)
    localHour  = local.getUTCHours()
    localDay   = local.getUTCDate()
    localMonth = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`
  }

  // Condition commune : on est bien à l'heure configurée
  if (localHour !== resetHour) return false

  // ── MODE 1 : 1er du mois ────────────────────────────────────────
  if (resetMode === 'first_of_month') {
    // Doit être le 1er du mois (heure locale)
    if (localDay !== 1) return false
    // Ne pas refaire si déjà fait ce mois-ci
    if (lastResetStr) {
      const lastReset = new Date(lastResetStr.replace(' ', 'T') + 'Z')
      const fmtLast = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit'
      })
      const lastMonth = fmtLast.format(lastReset).substring(0, 7)
      if (lastMonth === localMonth) return false
    }
    return true
  }

  // ── MODE 2 : cycle en jours glissants (défaut) ──────────────────
  if (!lastResetStr) return true  // jamais fait → reset immédiat à la prochaine heure configurée
  const lastReset  = new Date(lastResetStr.replace(' ', 'T') + 'Z')
  const elapsedMs  = nowUTC.getTime() - lastReset.getTime()
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)
  return elapsedDays >= cycleDays
}

// ── ORCHESTRATEUR ─────────────────────────────────────────────

/**
 * Orchestrateur principal — appelé toutes les heures via POST /admin/orchestrate
 *
 * À chaque appel :
 *   - Traite BV Queue, Rank Queue, paiements journaliers
 *   - Vérifie si le reset BV mensuel automatique doit tourner (selon config admin)
 *   - Le 1er du mois à 02h : calcule les commissions du mois précédent
 */
export async function orchestrateur(db: D1Database): Promise<any> {
  const now            = new Date()
  const isFirstOfMonth = now.getDate() === 1

  const bvResult   = await processBVQueue(db)
  const rankResult = await processRankQueue(db)   // W2 — processor rang
  const dailyPaid  = await processDailyPayments(db)

  // ── Reset BV mensuel automatique (configurable admin) ────────
  let bvResetDone = false
  try {
    if (await shouldResetBV(db)) {
      await resetMonthlyBV(db)
      bvResetDone = true
      console.log('[orchestrateur] Reset BV mensuel automatique effectué')
    }
  } catch (bvResetErr: any) {
    console.error('[orchestrateur] Reset BV échoué (non bloquant):', bvResetErr?.message || bvResetErr)
  }

  let commResult = null
  if (isFirstOfMonth && now.getHours() >= 2) {
    const period = getPreviousMonth()
    // FIX B7 — verrou interne dans processMonthlyCommissions
    commResult = await processMonthlyCommissions(db, period)
  }

  // FS-D : vérification périodique Fast Start
  try {
    const activeFastStarts = await db.prepare(
      `SELECT id FROM members
       WHERE fast_start_start_date IS NOT NULL
         AND fast_start_completed = 0`
    ).all()
    for (const m of activeFastStarts.results as any[]) {
      await checkFastStart(db, m.id)
    }
  } catch (fsErr: any) {
    console.error('[orchestrateur] Fast Start check échoué (non bloquant):', fsErr?.message || fsErr)
  }

  // CC-EXP : expiration automatique des Crédits de Croissance arrivés à échéance
  let ccExpired = 0
  try {
    ccExpired = await expireCreditssCroissance(db)
  } catch (ccErr: any) {
    console.error('[orchestrateur] Expiration CC échouée (non bloquant):', ccErr?.message || ccErr)
  }

  // CC-AVAIL : libération des CC dont available_at est atteint (held → available) + notifications
  try {
    await releaseAvailableCC(db)
  } catch (ccRErr: any) {
    console.error('[orchestrateur] Libération CC échouée (non bloquant):', ccRErr?.message || ccRErr)
  }

  // RS-UNLOCK : libération automatique des Réserves Stratégiques arrivées à terme
  let rsUnlocked = 0
  try {
    rsUnlocked = await releaseMaturedRS(db)
  } catch (rsErr: any) {
    console.error('[orchestrateur] Libération RS échouée (non bloquant):', rsErr?.message || rsErr)
  }

  return { bvResult, rankResult, dailyPaid, commResult, ccExpired, rsUnlocked, bvResetDone }
}

// ── OPÉRATIONS WALLET ─────────────────────────────────────────

/**
 * W1 — Opération atomique sur le wallet
 * credit → wallet_balance (retirable)
 * pending → pending_balance (non retirable, pour commissions M+1)
 */
export async function walletOperation(
  db: D1Database,
  memberId: string,
  amount: number,
  type: 'credit' | 'debit' | 'pending',
  source: string,
  description?: string,
  referenceId?: string
): Promise<void> {
  // Horodatage en heure de Maurice (UTC+4) pour tous les enregistrements
  const mauritiusNowStr = (() => {
    const d = new Date(Date.now() + 4 * 60 * 60 * 1000)
    return d.toISOString().replace('T', ' ').substring(0, 19)
  })()

  // GUARD : s'assurer que le wallet existe avant toute opération
  // Évite la FK violation sur wallet_transactions.member_id → members(id)
  // et garantit que les UPDATE wallets affectent bien une ligne
  await db.prepare(
    `INSERT OR IGNORE INTO wallets (id, member_id, balance, total_earned, total_withdrawn, pending_balance)
     VALUES (lower(hex(randomblob(16))), ?, 0, 0, 0, 0)`
  ).bind(memberId).run()

  if (type === 'credit') {
    const walletBefore = await db.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
    const balBefore = walletBefore?.balance ?? 0

    await db.prepare(
      `UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(amount, memberId).run()
    await db.prepare(
      `UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
    ).bind(amount, amount, memberId).run()

    // Enregistrer le mouvement — created_at en heure Maurice
    await db.prepare(
      `INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at)
       VALUES (lower(hex(randomblob(16))), ?, 'principal', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(memberId, source, amount, balBefore, balBefore + amount,
      description || labelForSource(source), referenceId || null, mauritiusNowStr).run()

  } else if (type === 'debit') {
    const walletBefore = await db.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
    const balBefore = walletBefore?.balance ?? 0

    await db.prepare(
      `UPDATE members SET wallet_balance = wallet_balance - ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(amount, memberId).run()
    await db.prepare(
      `UPDATE wallets SET balance = balance - ?, total_withdrawn = total_withdrawn + ?, updated_at = datetime('now') WHERE member_id = ?`
    ).bind(amount, amount, memberId).run()

    // Enregistrer le mouvement — created_at en heure Maurice
    await db.prepare(
      `INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at)
       VALUES (lower(hex(randomblob(16))), ?, 'principal', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(memberId, source, -amount, balBefore, balBefore - amount,
      description || labelForSource(source), referenceId || null, mauritiusNowStr).run()

  } else if (type === 'pending') {
    const walletBefore = await db.prepare(`SELECT pending_balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
    const pendBefore = walletBefore?.pending_balance ?? 0

    await db.prepare(
      `UPDATE wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
    ).bind(amount, amount, memberId).run()

    // Enregistrer le mouvement — created_at en heure Maurice
    await db.prepare(
      `INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at)
       VALUES (lower(hex(randomblob(16))), ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(memberId, source, amount, pendBefore, pendBefore + amount,
      description || labelForSource(source), referenceId || null, mauritiusNowStr).run()
  }
}

function labelForSource(source: string): string {
  const labels: Record<string, string> = {
    'prime_leadership_daily':           'Prime de Leadership — versement journalier',
    'fast_start_daily':                 'Fast Start Bonus — versement journalier',
    'valorisation_recommandation_daily':'Valorisation Recommandation — versement journalier',
    'bonus_influence_daily':            'Bonus d\'Influence — versement journalier',
    'bonus_rayonnement_daily':          'Bonus de Rayonnement — versement journalier',
    'prime_leadership':                 'Prime de Leadership créditée',
    'fast_start':                       'Fast Start Bonus crédité',
    'valorisation_recommandation':      'Valorisation Recommandation créditée',
    'bonus_influence':                  'Bonus d\'Influence crédité',
    'bonus_rayonnement':                'Bonus de Rayonnement crédité',
    'retrait':                          'Retrait demandé',
    'debit_withdrawal':                 'Retrait exécuté',
    'dreamiles_conversion':             'Conversion Dreamiles → USD',
  }
  return labels[source] || source
}

// ── NOTIFICATIONS ─────────────────────────────────────────────

export async function createNotification(
  db: D1Database,
  memberId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  await db.prepare(
    `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
  ).bind(generateId(), memberId, type, title, message).run()
}

// ── UTILITAIRES ───────────────────────────────────────────────

async function getConfigPct(db: D1Database, key: string, defaultVal: number): Promise<number> {
  const r = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = ?`
  ).bind(key).first() as any
  return r ? parseFloat(r.value) : defaultVal
}

async function getConfigStr(db: D1Database, key: string, defaultVal: string): Promise<string> {
  const r = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = ?`
  ).bind(key).first() as any
  return r?.value || defaultVal
}

// ── RECALCUL BONUS RÉTROACTIF ────────────────────────────────

/**
 * recalculBonusRetroactif — Recalcul complet des bonus d'un membre pour un mois donné.
 *
 * Appelé dans deux contextes :
 *   A) Post-activation/upgrade de package (activateAndReward §7)
 *      → le membre vient de changer de package, ses conditions rayonnement/influence
 *        peuvent maintenant être satisfaites pour les filleuls qualifiés ce mois.
 *   B) Recalcul admin manuel (route POST /admin/members/:id/recalcul-bonus)
 *      → l'admin force le recalcul pour corriger des cas historiques.
 *
 * RÈGLE RÉTROACTIVITÉ INTRA-MOIS (retroactivite_intra_mois_enabled) :
 *   Si cette clé bonus_config est 'false', les conditions de validation mensuelle
 *   (BV mensuel, parrainage ce mois) restent actives même en recalcul.
 *   Si 'true' (défaut), ces conditions sont ignorées en mode recalcul pour permettre
 *   la rétroactivité : un membre qualifié à n'importe quel moment du mois
 *   reçoit tous les bonus des filleuls qualifiés plus tôt dans ce mois.
 *
 * @param db       Base D1
 * @param memberId Membre dont on recalcule les bonus
 * @param period   Période 'YYYY-MM'
 * @param forceRetro  true = ignorer conditions BV mensuel/parrainage (mode rétroactif forcé)
 */
export async function recalculBonusRetroactif(
  db: D1Database,
  memberId: string,
  period: string,
  forceRetro?: boolean
): Promise<{ rayonnement: number; influence: number; details: string[] }> {
  const details: string[] = []

  // Lire le toggle rétroactivité globale
  const retroEnabled = forceRetro ??
    (await db.prepare(`SELECT value FROM bonus_config WHERE key = 'retroactivite_intra_mois_enabled'`)
      .first() as any)?.value !== 'false'

  // Relire le membre avec ses données fraîches
  const member = await db.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return { rayonnement: 0, influence: 0, details: ['Membre introuvable'] }

  details.push(`Membre : ${member.unique_id} — Rang : ${member.current_rank}`)
  details.push(`Rétroactivité intra-mois : ${retroEnabled ? 'OUI' : 'NON'}`)

  // Récupérer la prime et le cap du membre ce mois
  const mvRow = await db.prepare(
    `SELECT leadership_prime, influence_bonus FROM monthly_validations WHERE member_id = ? AND period = ?`
  ).bind(memberId, period).first() as any
  const memberPrime    = mvRow?.leadership_prime || 0
  const memberInfluence = mvRow?.influence_bonus  || 0

  const memberRankCfg = await db.prepare(
    `SELECT monthly_cap FROM rank_config WHERE rank_name = ?`
  ).bind(member.current_rank).first() as any
  const memberCap = memberRankCfg?.monthly_cap || 0

  let totalRayonnement = 0
  let totalInfluence   = 0

  // ── A) Recalcul RAYONNEMENT du membre ─────────────────────────
  // Conditions vérifiées dans calculateRayonnementBonus :
  //   ① Package éligible (cat-synex/cat-club ≥ 1000$ = DÉVELOPPEMENT minimum) — toujours vérifiée
  //   ② Parrainage ce mois  → ignorée si retroEnabled
  //   ③ BV mensuel ≥ seuil  → ignorée si retroEnabled
  if (await isBonusEnabled(db, 'rayonnement_enabled')) {
    // Purge des anciens bonus rayonnement du membre ce mois
    const oldRayRows = await db.prepare(
      `SELECT id, member_id, amount FROM commissions
       WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
    ).bind(memberId, period).all()
    for (const row of oldRayRows.results as any[]) {
      await db.prepare(
        `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
      ).bind(row.amount, row.member_id).run()
    }
    await db.prepare(
      `DELETE FROM commissions WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
    ).bind(memberId, period).run()

    const capRay = Math.max(0, memberCap - memberPrime - memberInfluence)
    await calculateRayonnementBonus(db, memberId, period, capRay, retroEnabled)

    // Comptabiliser ce qui a été généré
    const newRayRow = await db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total FROM commissions
       WHERE member_id = ? AND type = 'bonus_rayonnement' AND period = ?`
    ).bind(memberId, period).first() as any
    totalRayonnement = newRayRow?.total || 0
    details.push(`Rayonnement recalculé : $${totalRayonnement.toFixed(2)}`)
  }

  // ── B) Recalcul INFLUENCE depuis chaque filleul direct qualifié ce mois ──
  // Pour chaque filleul direct ayant une prime_leadership ce mois,
  // recalculer l'influence que ce filleul génère vers ses sponsors N1..N5.
  // Conditions vérifiées dans calculateInfluenceBonus :
  //   ① Rang sponsor >= minRank (Leader) — toujours vérifiée
  //   ② BV mensuel sponsor >= seuil    → ignorée si retroEnabled
  //   ③ Parrainage sponsor ce mois     → ignorée si retroEnabled
  //   ④ Rang filleul >= minFilleulRank  — toujours vérifiée
  //   ⑤ BV mensuel filleul >= seuil    → ignorée si retroEnabled
  if (await isBonusEnabled(db, 'influence_enabled')) {
    const directsWithPrime = await db.prepare(
      `SELECT c.member_id as filleul_id, c.amount as prime
       FROM commissions c
       JOIN members m ON m.id = c.member_id
       WHERE m.sponsor_id = ?
         AND c.type = 'prime_leadership'
         AND c.period = ?
         AND c.status IN ('pending','approved','paid')`
    ).bind(memberId, period).all()

    details.push(`Filleuls avec prime ce mois : ${directsWithPrime.results.length}`)

    for (const direct of directsWithPrime.results as any[]) {
      // Purger l'influence depuis CE filleul (vers tous ses sponsors N1..N5)
      const oldInflRows = await db.prepare(
        `SELECT id, member_id, amount FROM commissions
         WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
      ).bind(direct.filleul_id, period).all()
      for (const row of oldInflRows.results as any[]) {
        await db.prepare(
          `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
        ).bind(row.amount, row.member_id).run()
      }
      await db.prepare(
        `DELETE FROM commissions WHERE source_member_id = ? AND type = 'bonus_influence' AND period = ?`
      ).bind(direct.filleul_id, period).run()

      // Recalculer l'influence depuis ce filleul
      const filleulRankCfg = await db.prepare(
        `SELECT monthly_cap FROM rank_config
         WHERE rank_name = (SELECT current_rank FROM members WHERE id = ?)`
      ).bind(direct.filleul_id).first() as any
      const filleulCap = filleulRankCfg?.monthly_cap || 0

      const influenceSpent = await calculateInfluenceBonus(
        db, direct.filleul_id, direct.prime, period,
        Math.max(0, filleulCap - direct.prime),
        retroEnabled
      )
      totalInfluence += influenceSpent

      // Mettre à jour monthly_validations du filleul
      await db.prepare(
        `INSERT INTO monthly_validations (member_id, period, leadership_prime, influence_bonus)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(member_id, period) DO UPDATE SET influence_bonus = ?`
      ).bind(direct.filleul_id, period, direct.prime, influenceSpent, influenceSpent).run()
    }
    details.push(`Influence totale recalculée : $${totalInfluence.toFixed(2)}`)
  }

  return { rayonnement: totalRayonnement, influence: totalInfluence, details }
}

async function isBonusEnabled(db: D1Database, key: string): Promise<boolean> {
  const r = await db.prepare(
    `SELECT value FROM bonus_config WHERE key = ?`
  ).bind(key).first() as any
  return r?.value !== 'false'
}

/**
 * FIX B6 — Retourne le taux d'abondement selon le rang
 * Mentor : 10%, Executive+ : 20%
 */
async function getAbondementRate(db: D1Database, rank: string): Promise<number> {
  const rankIdx   = getRankIndex(rank)
  const execIdx   = getRankIndex('Executive')
  const mentorIdx = getRankIndex('Mentor')

  if (rankIdx >= execIdx) {
    const r = await db.prepare(
      `SELECT value FROM compensation_config WHERE key = 'abondement_executive_pct'`
    ).first() as any
    return parseFloat(r?.value || '20') / 100
  } else if (rankIdx >= mentorIdx) {
    const r = await db.prepare(
      `SELECT value FROM compensation_config WHERE key = 'abondement_mentor_pct'`
    ).first() as any
    return parseFloat(r?.value || '10') / 100
  }
  return 0
}

function getNextMonthStart(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const next = new Date(year, month, 1) // month est 0-indexed donc month = next month
  return next.toISOString().substring(0, 10)
}

function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function getPreviousMonth(): string {
  const now  = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return prev.toISOString().substring(0, 7)
}

function getMonthName(dateStr: string): string {
  const months = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ]
  const d = new Date(dateStr)
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

// ── CRÉDIT DE CROISSANCE — CYCLE DE VIE ──────────────────────

/**
 * releaseAvailableCC — Libère les entrées CC dont available_at est atteint.
 * Passe status 'held' → 'available'.
 * Appelé par l'orchestrateur à chaque run.
 */
export async function releaseAvailableCC(db: D1Database): Promise<void> {
  const now = new Date().toISOString().replace('T',' ').substring(0,19)

  // Trouver les entrées qui vont être libérées (avant la mise à jour)
  const toRelease = await db.prepare(
    `SELECT cc.id, cc.member_id, cc.amount, cc.period, cc.expires_at
     FROM credit_croissance cc
     WHERE cc.status = 'held'
       AND cc.available_at <= ?`
  ).bind(now).all()

  await db.prepare(
    `UPDATE credit_croissance
     SET status     = 'available',
         updated_at = datetime('now')
     WHERE status = 'held'
       AND available_at <= ?`
  ).bind(now).run()

  // Notifier chaque membre dont le CC vient d'être libéré
  for (const entry of toRelease.results as any[]) {
    const monthLabel = getMonthName(entry.period + '-01')
    const expiryDate = entry.expires_at ? entry.expires_at.substring(0,10) : '—'
    await createNotification(
      db, entry.member_id, 'commission',
      '💰 Crédit de Croissance disponible !',
      `Votre Crédit de Croissance de ${Number(entry.amount).toFixed(2)}$ (${monthLabel}) est maintenant disponible. Utilisez-le avant le ${expiryDate} pour rembourser vos dépenses business.`
    )
  }
}

/**
 * releaseMaturedRS — Libère automatiquement les Réserves Stratégiques
 * dont la date de libération (locked_until) est atteinte.
 * Passe status 'locked' → 'unlocked', crédite le wallet du membre.
 * Envoie des notifications J-30 et J-7 avant libération.
 * Appelé par l'orchestrateur à chaque run.
 */
export async function releaseMaturedRS(db: D1Database): Promise<number> {
  const now     = new Date()
  const nowStr  = now.toISOString().replace('T',' ').substring(0,19)
  const nowDate = now.toISOString().substring(0,10)

  // ── Notifications J-30 avant libération ──
  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)
  const in30Str  = in30Days.toISOString().substring(0,10)

  const alertJ30 = await db.prepare(
    `SELECT rs.*, m.first_name FROM reserve_strategique rs
     JOIN members m ON m.id = rs.member_id
     WHERE rs.status = 'locked'
       AND rs.locked_until = ?
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.member_id = rs.member_id
           AND n.type = 'info'
           AND n.message LIKE '%libération dans 30 jours%'
           AND n.message LIKE '%' || rs.id || '%'
       )`
  ).bind(in30Str).all()

  for (const rs of alertJ30.results as any[]) {
    await createNotification(
      db, rs.member_id, 'info',
      '📅 Réserve Stratégique — libération dans 30 jours',
      `Votre Réserve Stratégique de ${Number(rs.amount).toFixed(2)}$ (période ${rs.period}) sera libérée le ${rs.locked_until}. Préparez-vous à utiliser ces fonds ! [ref:${rs.id}]`
    )
  }

  // ── Notifications J-7 avant libération ──
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)
  const in7Str = in7Days.toISOString().substring(0,10)

  const alertJ7 = await db.prepare(
    `SELECT rs.*, m.first_name FROM reserve_strategique rs
     JOIN members m ON m.id = rs.member_id
     WHERE rs.status = 'locked'
       AND rs.locked_until = ?
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.member_id = rs.member_id
           AND n.type = 'warning'
           AND n.message LIKE '%libération dans 7 jours%'
           AND n.message LIKE '%' || rs.id || '%'
       )`
  ).bind(in7Str).all()

  for (const rs of alertJ7.results as any[]) {
    await createNotification(
      db, rs.member_id, 'warning',
      '🔔 Réserve Stratégique — libération dans 7 jours !',
      `Dans 7 jours, votre Réserve Stratégique de ${Number(rs.amount).toFixed(2)}$ (période ${rs.period}) sera automatiquement versée sur votre wallet principal. [ref:${rs.id}]`
    )
  }

  // ── CC — Notifications J-7 avant expiration ──
  const ccIn7 = await db.prepare(
    `SELECT cc.id, cc.member_id, cc.amount, cc.period, cc.expires_at,
            (cc.amount - cc.used_amount) as residual
     FROM credit_croissance cc
     WHERE cc.status = 'available'
       AND date(cc.expires_at) = ?
       AND (cc.amount - cc.used_amount) > 0
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.member_id = cc.member_id
           AND n.type = 'warning'
           AND n.message LIKE '%expire dans 7 jours%'
           AND n.message LIKE '%' || cc.id || '%'
       )`
  ).bind(in7Str).all()

  for (const cc of ccIn7.results as any[]) {
    const monthLabel = getMonthName(cc.period + '-01')
    await createNotification(
      db, cc.member_id, 'warning',
      '⚠️ Crédit de Croissance expirant bientôt !',
      `Votre Crédit de Croissance de ${Number(cc.residual).toFixed(2)}$ (${monthLabel}) expire dans 7 jours (${cc.expires_at?.substring(0,10)}). Soumettez une demande de remboursement avant qu'il ne soit perdu. [ref:${cc.id}]`
    )
  }

  // ── Libération des RS arrivées à terme ──
  const matured = await db.prepare(
    `SELECT rs.*, m.first_name
     FROM reserve_strategique rs
     JOIN members m ON m.id = rs.member_id
     WHERE rs.status = 'locked'
       AND rs.locked_until <= ?`
  ).bind(nowDate).all()

  let count = 0
  for (const rs of matured.results as any[]) {
    const amount = Number(rs.amount)

    // Mettre à jour le statut
    await db.prepare(
      `UPDATE reserve_strategique
       SET status = 'unlocked', unlocked_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(rs.id).run()

    // Créditer le wallet principal
    await walletOperation(db, rs.member_id, amount, 'credit', 'reserve_strategique_unlock',
      `Réserve Stratégique libérée — période ${rs.period} (abondement ${(Number(rs.abondement_rate||0)*100).toFixed(0)}%)`,
      rs.id)

    // Mettre à jour le compteur members
    await db.prepare(
      `UPDATE members SET reserve_strategique = MAX(0, reserve_strategique - ?), updated_at = datetime('now') WHERE id = ?`
    ).bind(amount, rs.member_id).run()

    // Commission RS — marquer comme libérée
    await db.prepare(
      `UPDATE commissions SET status = 'approved', updated_at = datetime('now')
       WHERE member_id = ? AND period = ? AND type = 'reserve_strategique' AND status = 'locked'`
    ).bind(rs.member_id, rs.period).run()

    // Notification de libération
    await createNotification(
      db, rs.member_id, 'commission',
      '🎉 Réserve Stratégique libérée !',
      `Votre Réserve Stratégique de ${amount.toFixed(2)}$ (période ${rs.period}) a été versée sur votre wallet principal. Félicitations pour votre engagement de 3 ans !`
    )

    count++
  }
  return count
}

/**
 * expireCreditssCroissance — Expire les CC dont expires_at est dépassé et
 * qui n'ont pas été entièrement utilisés.
 * Débite le solde CC du membre, insère un journal débit avec libellé premium.
 * Appelé par l'orchestrateur à chaque run.
 */
export async function expireCreditssCroissance(db: D1Database): Promise<number> {
  const now = new Date().toISOString().replace('T',' ').substring(0,19)

  // Trouver toutes les entrées expirées avec montant résiduel
  const expired = await db.prepare(
    `SELECT cc.*, m.credit_croissance as member_cc
     FROM credit_croissance cc
     JOIN members m ON m.id = cc.member_id
     WHERE cc.status = 'available'
       AND cc.expires_at <= ?
       AND cc.amount > cc.used_amount`
  ).bind(now).all()

  let count = 0
  for (const entry of expired.results as any[]) {
    const residual = entry.amount - entry.used_amount
    if (residual <= 0) continue

    // Marquer expirée
    await db.prepare(
      `UPDATE credit_croissance
       SET status     = 'expired',
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(entry.id).run()

    // Solde après expiration (source de vérité = table credit_croissance)
    const balAfterExp = await getCCBalance(db, entry.member_id)

    // Journal débit — libellé premium
    const monthLabel = getMonthName(entry.period + '-01')
    await db.prepare(
      `INSERT INTO cc_transactions
        (id, member_id, type, amount, balance_after, label, reference_id, reference_type, period)
       VALUES (?, ?, 'debit', ?, ?, ?, ?, 'expiration', ?)`
    ).bind(
      generateId(), entry.member_id, residual,
      balAfterExp.total,
      `Crédit de Croissance non utilisé — ${monthLabel} · Expiré le ${now.substring(0,10)} · Engagement réseau non constaté sur la période`,
      entry.id, entry.period
    ).run()

    // Notification au membre
    await createNotification(
      db, entry.member_id, 'warning',
      '⏳ Crédit de Croissance expiré',
      `Votre Crédit de Croissance de ${residual.toFixed(2)}$ (période ${entry.period}) a expiré faute d'utilisation. Restez actif pour valoriser vos prochains crédits.`
    )

    count++
  }
  return count
}

/**
 * recordCCWithdrawal — Enregistre un remboursement CC approuvé par l'admin.
 * Débite le montant des entrées CC disponibles (FIFO) + journal.
 */
export async function recordCCWithdrawal(
  db: D1Database,
  memberId: string,
  amount: number,
  withdrawalId: string,
  adminNote: string
): Promise<void> {
  let remaining = amount

  // Consommer les entrées CC disponibles — ordre FIFO (plus ancienne en premier)
  const available = await db.prepare(
    `SELECT * FROM credit_croissance
     WHERE member_id = ? AND status = 'available'
       AND amount > used_amount
     ORDER BY available_at ASC`
  ).bind(memberId).all()

  for (const entry of available.results as any[]) {
    if (remaining <= 0) break
    const entryLeft   = entry.amount - entry.used_amount
    const toConsume   = Math.min(remaining, entryLeft)
    const newUsed     = entry.used_amount + toConsume
    const newStatus   = newUsed >= entry.amount ? 'used' : 'available'

    await db.prepare(
      `UPDATE credit_croissance
       SET used_amount = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(newUsed, newStatus, entry.id).run()

    remaining -= toConsume
  }

  // Solde CC réel après consommation FIFO (source de vérité = table credit_croissance)
  const balAfter = await getCCBalance(db, memberId)

  // Journal débit — remboursement
  await db.prepare(
    `INSERT INTO cc_transactions
      (id, member_id, type, amount, balance_after, label, reference_id, reference_type)
     VALUES (?, ?, 'debit', ?, ?, ?, ?, 'cc_withdrawal')`
  ).bind(
    generateId(), memberId, amount,
    balAfter.total,
    `Remboursement approuvé — ${adminNote || 'Dépense business validée par l\'équipe'}`,
    withdrawalId
  ).run()
}

/**
 * getCCBalance — Retourne le solde CC utilisable (entrées available non expirées)
 * Distinct de members.credit_croissance qui inclut les 'held'
 */
export async function getCCBalance(db: D1Database, memberId: string): Promise<{
  total: number, available: number, held: number
}> {
  const row = await db.prepare(
    `SELECT
      COALESCE(SUM(amount - used_amount), 0)                                   as total,
      COALESCE(SUM(CASE WHEN status='available' THEN amount - used_amount ELSE 0 END), 0) as available,
      COALESCE(SUM(CASE WHEN status='held'      THEN amount - used_amount ELSE 0 END), 0) as held
     FROM credit_croissance
     WHERE member_id = ? AND status IN ('available','held')`
  ).bind(memberId).first() as any
  return {
    total:     row?.total     ?? 0,
    available: row?.available ?? 0,
    held:      row?.held      ?? 0,
  }
}
