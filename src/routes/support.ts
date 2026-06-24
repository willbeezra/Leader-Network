// ============================================================
// LEADER — Routes Support Client
// ============================================================
import { Hono } from 'hono'
import type { Bindings } from '../types/index.js'
import { verifyJWT } from '../lib/auth.js'
import { requirePermission, requireAnyPermission } from '../middleware/permissions.js'

export const support = new Hono<{ Bindings: Bindings }>()

// ── Middleware auth membre ────────────────────────────────────
support.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'member') return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId' as any, payload.sub)
  await next()
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Priorité automatique selon la catégorie */
function autoPriority(category: string): string {
  const map: Record<string, string> = {
    wallet: 'high',
    commission: 'normal',
    package: 'normal',
    account: 'high',
    tree: 'normal',
    license: 'normal',
    other: 'normal',
  }
  return map[category] || 'normal'
}

/** Snapshot contextuel du membre — COMPLET pour réponses IA précises */
async function buildContextSnapshot(db: D1Database, memberId: string): Promise<string> {
  try {
    const [
      member,
      wallet,
      allCommissions,
      pendingWallet,
      packageOrders,
      bvLogsPersonal,
      bvLogsTeam,
      withdrawals,
      walletTxRecent,
      monthlyValidations,
      downlinesAll,
      creditCroissance,
      rankConfig,
    ] = await Promise.all([
      // Membre complet (rang, BV, statut, licence, KYC)
      db.prepare(`
        SELECT unique_id, first_name, last_name, email, phone, country, member_status,
               current_rank, rank_achieved_at, personal_bv_monthly, personal_bv_total,
               left_bv_monthly, right_bv_monthly, left_bv_total, right_bv_total,
               license_active, license_expires_at, kyc_status, kyc_level,
               fast_start_start_date, fast_start_bv, package_type, package_name,
               activation_done, created_at, sponsor_id
        FROM members WHERE id=?
      `).bind(memberId).first() as any,

      // Wallet complet
      db.prepare(`
        SELECT balance, pending_balance, total_earned, total_withdrawn
        FROM wallets WHERE member_id=?
      `).bind(memberId).first() as any,

      // Toutes les commissions (30 dernières)
      db.prepare(`
        SELECT type, amount, description, period, rank_at_time,
               source_member_id, status, paid_at, created_at
        FROM commissions
        WHERE member_id=?
        ORDER BY created_at DESC LIMIT 30
      `).bind(memberId).all(),

      // Pending wallet entries (versements en cours)
      db.prepare(`
        SELECT commission_type, period, total_amount, amount_per_day,
               days_paid, days_in_month, eligible_date, start_date,
               rank_achieved_at, status, last_paid_at
        FROM pending_wallet_entries
        WHERE member_id=?
        ORDER BY created_at DESC LIMIT 10
      `).bind(memberId).all(),

      // Toutes les commandes de packages
      db.prepare(`
        SELECT po.status, po.amount_usd, po.bv_value, po.payment_method,
               po.validated_at, po.created_at,
               p.name as package_name, p.bv_value as package_bv
        FROM package_orders po
        LEFT JOIN packages p ON p.id=po.package_id
        WHERE po.member_id=?
        ORDER BY po.created_at DESC LIMIT 10
      `).bind(memberId).all(),

      // BV personnels (6 derniers mois)
      db.prepare(`
        SELECT bv_amount, bv_type, period, created_at
        FROM bv_logs
        WHERE member_id=? AND propagated=0
        ORDER BY created_at DESC LIMIT 20
      `).bind(memberId).all(),

      // BV reçus de l'équipe (propagation vers ce membre)
      db.prepare(`
        SELECT bl.bv_amount, bl.period, bl.bv_type,
               m.unique_id as source_uid, m.first_name||' '||m.last_name as source_name
        FROM bv_logs bl
        LEFT JOIN members m ON m.id=bl.source_member_id
        WHERE bl.member_id=? AND bl.propagated=1
        ORDER BY bl.created_at DESC LIMIT 20
      `).bind(memberId).all(),

      // Retraits (10 derniers)
      db.prepare(`
        SELECT amount, fee, net_amount, status, admin_note,
               confirmed_at, created_at
        FROM withdrawals
        WHERE member_id=?
        ORDER BY created_at DESC LIMIT 10
      `).bind(memberId).all(),

      // Transactions wallet récentes (20 dernières)
      db.prepare(`
        SELECT transaction_type, amount, balance_before, balance_after,
               description, created_at
        FROM wallet_transactions
        WHERE member_id=?
        ORDER BY created_at DESC LIMIT 20
      `).bind(memberId).all(),

      // Historique validations mensuelles (rang + primes calculées)
      db.prepare(`
        SELECT period, leadership_prime, influence_bonus, rayonnement_bonus
        FROM monthly_validations
        WHERE member_id=?
        ORDER BY period DESC LIMIT 12
      `).bind(memberId).all(),

      // Filleuls directs avec leur statut et rang
      db.prepare(`
        SELECT unique_id, first_name||' '||last_name as name,
               current_rank, member_status, package_type,
               personal_bv_monthly, created_at
        FROM members
        WHERE sponsor_id=?
        ORDER BY created_at DESC LIMIT 20
      `).bind(memberId).all(),

      // Crédit de croissance
      db.prepare(`
        SELECT amount, used_amount, period, status, available_at, expires_at
        FROM credit_croissance
        WHERE member_id=?
        ORDER BY created_at DESC LIMIT 10
      `).bind(memberId).all(),

      // Config des rangs (barème officiel)
      db.prepare(`
        SELECT rank_name, rank_order, min_bv_leg, min_directs,
               monthly_prime, monthly_cap
        FROM rank_config ORDER BY rank_order ASC
      `).all(),
    ])

    // Enrichir avec sponsor
    let sponsorInfo = null
    if (member?.sponsor_id) {
      sponsorInfo = await db.prepare(
        `SELECT unique_id, first_name||' '||last_name as name, current_rank FROM members WHERE id=?`
      ).bind(member.sponsor_id).first() as any
    }

    return JSON.stringify({
      // ── Identité membre
      unique_id:             member?.unique_id,
      name:                  `${member?.first_name} ${member?.last_name}`,
      email:                 member?.email,
      country:               member?.country,
      member_since:          member?.created_at,
      status:                member?.member_status,
      activation_done:       !!member?.activation_done,

      // ── Rang & BV
      current_rank:          member?.current_rank,
      rank_achieved_at:      member?.rank_achieved_at,
      personal_bv_monthly:   member?.personal_bv_monthly ?? 0,
      personal_bv_total:     member?.personal_bv_total ?? 0,
      left_bv_monthly:       member?.left_bv_monthly ?? 0,
      right_bv_monthly:      member?.right_bv_monthly ?? 0,
      left_bv_total:         member?.left_bv_total ?? 0,
      right_bv_total:        member?.right_bv_total ?? 0,
      weak_leg_bv_monthly:   Math.min(member?.left_bv_monthly ?? 0, member?.right_bv_monthly ?? 0),
      strong_leg_bv_monthly: Math.max(member?.left_bv_monthly ?? 0, member?.right_bv_monthly ?? 0),

      // ── Licence & Package
      license_active:        !!member?.license_active,
      license_expires_at:    member?.license_expires_at,
      package_type:          member?.package_type,
      package_name:          member?.package_name,

      // ── KYC
      kyc_status:            member?.kyc_status,
      kyc_level:             member?.kyc_level ?? 0,

      // ── Fast Start
      fast_start_start_date: member?.fast_start_start_date,
      fast_start_bv:         member?.fast_start_bv ?? 0,

      // ── Wallet
      wallet_balance:        wallet?.balance ?? 0,
      wallet_pending:        wallet?.pending_balance ?? 0,
      wallet_total_earned:   wallet?.total_earned ?? 0,
      wallet_total_withdrawn:wallet?.total_withdrawn ?? 0,

      // ── Commissions détaillées (30 dernières)
      commissions:           allCommissions?.results ?? [],

      // ── Versements en attente (détail journalier)
      pending_wallet_entries: pendingWallet?.results ?? [],

      // ── Commandes packages
      package_orders:        packageOrders?.results ?? [],

      // ── BV personnels
      bv_logs_personal:      bvLogsPersonal?.results ?? [],

      // ── BV équipe reçus
      bv_logs_team:          bvLogsTeam?.results ?? [],

      // ── Retraits
      withdrawals:           withdrawals?.results ?? [],

      // ── Transactions wallet
      wallet_transactions:   walletTxRecent?.results ?? [],

      // ── Validations mensuelles (historique primes)
      monthly_validations:   monthlyValidations?.results ?? [],

      // ── Filleuls directs
      direct_downlines:      downlinesAll?.results ?? [],
      direct_count:          (downlinesAll?.results ?? []).length,
      direct_active_count:   (downlinesAll?.results as any[] ?? []).filter((d:any) => d.member_status !== 'inactive').length,

      // ── Crédit de croissance
      credit_croissance:     creditCroissance?.results ?? [],

      // ── Barème officiel des rangs
      rank_config:           rankConfig?.results ?? [],

      // ── Sponsor
      sponsor:               sponsorInfo,

      snapshot_at:           new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[buildContextSnapshot] error:', err?.message)
    return '{}'
  }
}

// ─────────────────────────────────────────────────────────────
//  IA SUPPORT — GPT-4o réponse automatique (invisible membre)
// ─────────────────────────────────────────────────────────────

const LEADER_SYSTEM_PROMPT = `Tu es le Support LEADER, l'assistant officiel de LEADER.
Tu réponds TOUJOURS en Français, de manière professionnelle et chaleureuse.
Tu ne révèles JAMAIS que tu es une IA. Tu te comportes comme un agent humain senior.
Tu signes tes réponses "L'équipe Support LEADER".

╔════════════════════════════════════════╗
║ RÈGLE ABSOLUE N°1 : PRÉCISION DONNÉES  ║
╚════════════════════════════════════════╝

Tu as accès au CONTEXTE_MEMBRE complet ci-dessous avec TOUTES les données réelles du compte.
Tu DOIS exploiter ces données pour répondre avec une précision chirurgicale.

 INTERDIT : Donner des explications génériques si les données sont disponibles dans le contexte.
 OBLIGATOIRE : Citer les montants exacts, les dates exactes, les statuts exacts du compte.

EXEMPLES DE BONNE RÉPONSE :
- "Votre solde actuel est de 247.50 USD disponible + 89.00 USD en cours de versement journalier."
- "Vous avez reçu 3 primes de leadership ce mois : 150 USD le 01/04 (rang Gold, période 2026-03), 120 USD le 01/03 (rang Silver, période 2026-02)."
- "Votre BV côté gauche est de 1240 et côté droit de 890 ce mois. La jambe faible est droite à 890 BV."
- "Pour passer au rang Platinum, il vous manque 310 BV en jambe faible (actuel : 890, requis : 1200 selon le barème)."

══════════════════════════════════════════
 RÉFÉRENTIEL LEADER NETWORK
══════════════════════════════════════════

## TYPES DE COMMISSIONS (champ "type" dans la DB)
- prime_leadership          → Prime de Leadership mensuelle (calculée sur la BV jambe faible)
- bonus_influence           → Bonus d'Influence (propagation BV vers les uplines)
- bonus_rayonnement         → Bonus de Rayonnement
- valorisation_recommandation → Valorisation Recommandation (recrutement direct)
- fast_start                → Bonus Fast Start (3 premiers filleuls en 30j)
- credit_croissance         → Crédit de Croissance (remboursement package sur primes)
- reserve_strategique       → Réserve Stratégique

## STATUTS COMMISSIONS
- pending   → en attente de validation (pas encore au wallet)
- approved  → approuvée, en cours de versement journalier (voir pending_wallet_entries)
- paid      → entièrement versée au wallet
- cancelled → annulée

## VERSEMENT JOURNALIER (pending_wallet_entries)
Les primes approuvées ne sont PAS versées en une fois.
Elles sont divisées sur le nombre de jours du mois suivant (amount_per_day × jours_restants).
Chaque jour, un versement partiel est transféré du pending vers le wallet disponible.
- eligible_date : date de début du versement (M+1 + 14 jours minimum)
- days_paid : nombre de jours déjà versés
- days_in_month : total de jours prévu
- total_amount : montant total de la prime
- amount_per_day : versement journalier = total / jours_mois
Montant restant à verser = (days_in_month - days_paid) × amount_per_day

## RANGS ET PRIMES (utilise rank_config du contexte pour les valeurs exactes du barème)
Les rangs sont calculés sur la BV de la JAMBE LA PLUS FAIBLE (min des deux jambes).
Chaque rang a une prime mensuelle (monthly_prime) et un plafond (monthly_cap).
Le membre reçoit la prime du rang le PLUS ÉLEVÉ atteint dans le mois.
Si le membre change de rang en cours de mois → c'est le rang le plus haut qui prime.

## BV (Business Volume)
- personal_bv_monthly : BV personnels du mois en cours
- left_bv_monthly / right_bv_monthly : BV de chaque jambe ce mois
- weak_leg_bv_monthly : jambe la plus faible = min(gauche, droite) → base de calcul du rang
- Les BV se reset au 1er de chaque mois
- bv_logs_personal : détail des BV générés par ce membre (avec dates et périodes)
- bv_logs_team : BV reçus en propagation depuis la downline

## WALLET
- balance : solde disponible immédiatement
- pending_balance : en cours de versement journalier (sera transféré progressivement)
- total_earned : total historique gagné depuis l'inscription
- total_withdrawn : total retiré depuis l'inscription
- wallet_transactions : détail chronologique de chaque crédit/débit

## RETRAITS
- Minimum : 50 USD
- Frais : 2% (min 2 USD)
- Délai : 5-7 jours ouvrés
- Condition : KYC niveau 1 validé requis
- KYC niveau 2 requis pour montants > 500 USD/mois
- withdrawals : historique avec statut, montant, date

## KYC
- kyc_level 0 : non vérifié → retraits bloqués
- kyc_level 1 : CNI/Passeport + selfie validés → retraits jusqu'à 500 USD/mois
- kyc_level 2 : justificatif domicile + KYC1 → retraits illimités
- kyc_status : not_submitted | pending | verified | rejected

## LICENCES
- license_active=1 : licence valide → peut parrainer
- license_active=0 : licence expirée → parrainage bloqué
- license_expires_at : date d'expiration exacte
- Renouvellement : 99 USD/an

## FAST START
- Actif pendant 30 jours depuis fast_start_start_date
- Objectif : recruter 3 filleuls avec achat package en 30 jours
- fast_start_bv : BV déjà accumulés pour le Fast Start
- Le bonus varie selon le package du filleul recruté

## CRÉDIT DE CROISSANCE
- Montant mis de côté pour rembourser le package d'origine
- available_at : date de disponibilité
- expires_at : expire 3 mois après available_at si non utilisé
- Statuts : held | available | expired | used

## VALIDATIONS MENSUELLES (monthly_validations)
Historique des primes calculées chaque mois :
- period : mois de qualification (ex: 2026-04)
- leadership_prime : montant prime leadership calculée ce mois
- influence_bonus : bonus influence calculé
- rayonnement_bonus : bonus rayonnement calculé

══════════════════════════════════════════
 INSTRUCTIONS DE RÉPONSE
══════════════════════════════════════════

1. **TOUJOURS utiliser les données réelles** du contexte. Cite les montants, dates, statuts exacts.
2. **Pour une question sur les primes/commissions** :
   - Liste CHAQUE prime reçue avec : type traduit, montant $, date, période, rang_au_moment, statut
   - Explique le calcul : rang → prime mensuelle selon barème → versement journalier
   - Détaille les pending_wallet_entries en cours (combien/jour, combien il reste)
   - Cite les monthly_validations pour l'historique mensuel
3. **Pour une question sur le rang** :
   - Donne le rang actuel + date d'obtention (rank_achieved_at)
   - Donne les BV exacts (gauche, droite, jambe faible)
   - Compare avec le barème du rang suivant (depuis rank_config du contexte)
   - Calcule exactement ce qu'il manque en BV jambe faible
4. **Pour une question sur le wallet/retraits** :
   - Donne le solde exact disponible + pending
   - Vérifie les conditions (KYC level, montant min)
   - Si retrait en cours : donne le statut exact depuis withdrawals
5. **Pour une question sur les filleuls** :
   - Liste les filleuls avec leur nom, unique_id, rang, statut, BV mensuel
6. **Escalade (needs_human=true)** uniquement si : action manuelle requise (remboursement, correction erreur DB, déblocage exceptionnel) ou données insuffisantes.
7. **Langage** : Français, professionnel, vouvoyer le membre, empathie si frustration.
8. **Longueur** : Aussi longue que nécessaire pour être précis et complet.

TA RÉPONSE DOIT ÊTRE EN JSON STRICT (pas de markdown autour) :
{
  "reply": "<ta réponse complète en français avec toutes les données précises>",
  "needs_human": <true si escalade requise, false sinon>,
  "confidence": <nombre entre 0 et 1>,
  "internal_note": "<note optionnelle pour l'équipe admin, non visible par le membre>"
}`

/**
 * Escalade un ticket vers l'admin en créant une note interne explicative.
 * Appelée quand l'IA ne peut pas traiter (needs_human, erreur API, exception).
 * Met le ticket en priorité high (si pas urgent) et le tag 'needs_human'.
 */
async function _escaladeAdmin(
  db: D1Database,
  ticketId: string,
  raison: string
): Promise<void> {
  // 1. Note interne visible uniquement par l'admin, avec la raison exacte
  await db.prepare(`
    INSERT INTO support_messages
      (ticket_id, sender_type, sender_id, sender_name, content, is_internal)
    VALUES (?, 'admin', 'ai-support', ' IA — Escalade requise', ?, 1)
  `).bind(ticketId, `️ Ce ticket nécessite une intervention humaine.\n\n${raison}\n\nMerci de prendre en charge ce ticket et de répondre directement au membre.`).run()

  // 2. Taguer needs_human (idempotent)
  await db.prepare(
    `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?,?)`
  ).bind(ticketId, 'needs_human').run()

  // 3. Élever la priorité à high si elle est à normal ou low
  await db.prepare(`
    UPDATE support_tickets
    SET priority = CASE WHEN priority IN ('normal','low') THEN 'high' ELSE priority END,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(ticketId).run()
}

/**
 * Déclenche une réponse IA GPT-4o pour un ticket de support.
 * La réponse est insérée avec sender_type='admin' → invisible comme IA côté membre.
 * Appelée en mode fire-and-forget (pas d'await bloquant dans la route).
 */
async function _aiSupportReply(
  db: D1Database,
  ticketId: string,
  memberId: string,
  env: Bindings
): Promise<void> {
  try {
    // 1. Récupérer les données contextuelles du membre
    const contextSnapshot = await buildContextSnapshot(db, memberId)

    // 2. Récupérer l'historique des messages du ticket (max 20 derniers)
    const messagesResult = await db.prepare(`
      SELECT sender_type, sender_name, content, created_at
      FROM support_messages
      WHERE ticket_id=? AND is_internal=0
      ORDER BY created_at ASC
      LIMIT 20
    `).bind(ticketId).all()

    const messages = (messagesResult?.results || []) as any[]

    // 3. Récupérer les infos du ticket (sujet + catégorie)
    const ticket = await db.prepare(
      `SELECT subject, category, priority FROM support_tickets WHERE id=?`
    ).bind(ticketId).first() as any

    // 4. Construire la conversation pour GPT
    // On sépare le dernier message membre du reste de l'historique
    const conversation = messages.map((m: any) => ({
      role: m.sender_type === 'member' ? 'user' : 'assistant',
      content: m.content,
    }))

    // Toujours s'assurer qu'il y a au moins 1 message user
    if (!conversation.length || conversation[conversation.length - 1].role !== 'user') {
      return // Pas de message membre à traiter
    }

    // Récupérer le dernier message membre pour l'injecter dans le userPrompt
    const lastMemberMsg = messages[messages.length - 1]?.content || ''

    const userPrompt = `══ CONTEXTE_MEMBRE (données RÉELLES du compte — utilise-les pour répondre avec précision) ══
${contextSnapshot}
══ FIN CONTEXTE_MEMBRE ══

TICKET :
- Sujet : ${ticket?.subject || 'non précisé'}
- Catégorie : ${ticket?.category || 'other'}
- Priorité : ${ticket?.priority || 'normal'}

INSTRUCTION : Réponds au DERNIER message du membre en utilisant les données réelles ci-dessus.
Ne donne PAS de réponse générique — cite les montants, dates et statuts exacts de son compte.

DERNIER MESSAGE DU MEMBRE : "${lastMemberMsg}"`

    // 5. Appel GPT-4o
    // On envoie : system prompt + historique (sans dernier msg) + userPrompt enrichi (avec contexte + dernier msg)
    const historyWithoutLast = conversation.slice(0, -1)

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: LEADER_SYSTEM_PROMPT },
          // Historique des échanges précédents (sans le dernier message)
          ...historyWithoutLast,
          // Dernier message du membre enrichi du contexte complet
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!gptRes.ok) {
      const errText = await gptRes.text()
      console.error('[AI Support] GPT-4o error:', gptRes.status, errText)
      // Escalade admin — erreur API OpenAI
      await _escaladeAdmin(db, ticketId,
        `L'IA n'a pas pu traiter ce ticket — erreur API OpenAI (HTTP ${gptRes.status}). Détail technique : ${errText.substring(0, 300)}`)
      return
    }

    const gptData = await gptRes.json() as any
    const rawContent = gptData?.choices?.[0]?.message?.content || ''

    let parsed: { reply: string; needs_human: boolean; confidence: number; internal_note?: string }
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      console.error('[AI Support] JSON parse error:', rawContent)
      // Escalade admin — réponse IA non parseable
      await _escaladeAdmin(db, ticketId,
        `L'IA n'a pas pu traiter ce ticket — la réponse GPT-4o n'était pas du JSON valide. Contenu reçu : "${rawContent.substring(0, 300)}"`)
      return
    }

    if (!parsed.reply?.trim()) {
      // Escalade admin — réponse vide
      await _escaladeAdmin(db, ticketId,
        `L'IA n'a pas pu traiter ce ticket — réponse vide retournée par GPT-4o (confidence: ${parsed.confidence ?? 'N/A'}).`)
      return
    }

    // 6. Si l'IA ne peut pas répondre → escalade avec explication pour l'admin
    if (parsed.needs_human === true) {
      const raison = parsed.internal_note?.trim()
        || `L'IA a estimé (confidence: ${parsed.confidence ?? 'N/A'}) qu'une intervention humaine est requise pour traiter ce ticket. Sujet : "${ticket?.subject}".`
      // Taguer + noter + escalade visible
      await db.prepare(
        `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?,?)`
      ).bind(ticketId, 'needs_human').run()
      await _escaladeAdmin(db, ticketId, raison)
      console.log(`[AI Support] Escalade ticket ${ticketId} — confidence: ${parsed.confidence}`)
      return
    }

    // 7. Insérer la réponse IA comme message admin (invisible comme IA côté membre)
    const msgId = crypto.randomUUID()
    await db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, content, is_internal)
      VALUES (?, ?, 'admin', 'ai-support', 'Support LEADER', ?, 0)
    `).bind(msgId, ticketId, parsed.reply.trim()).run()

    // 8. Mettre à jour statut ticket → waiting_member + tag ai_handled
    await db.prepare(
      `UPDATE support_tickets SET status='waiting_member', updated_at=datetime('now'), last_reply_at=datetime('now'), last_reply_by='admin' WHERE id=?`
    ).bind(ticketId).run()

    await db.prepare(
      `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?,?)`
    ).bind(ticketId, 'ai_handled').run()

    // 9. Note interne optionnelle (visible seulement en admin)
    if (parsed.internal_note?.trim()) {
      await db.prepare(`
        INSERT INTO support_messages (ticket_id, sender_type, sender_id, sender_name, content, is_internal)
        VALUES (?, 'admin', 'ai-support', '[IA Note interne]', ?, 1)
      `).bind(ticketId, parsed.internal_note.trim()).run()
    }

    console.log(`[AI Support] Ticket ${ticketId} traité — confidence: ${parsed.confidence}`)

  } catch (err: any) {
    console.error('[AI Support] Erreur critique:', err?.message || err)
    // Escalade admin — exception non prévue (ex: clé OpenAI absente, réseau)
    try {
      await _escaladeAdmin(db, ticketId,
        `L'IA n'a pas pu traiter ce ticket — erreur technique inattendue : "${err?.message || String(err)}". Veuillez traiter ce ticket manuellement.`)
    } catch { /* ignorer pour ne pas masquer l'erreur originale */ }
  }
}

/** Mettre à jour updated_at + last_reply du ticket */
async function touchTicket(db: D1Database, ticketId: string, replyBy: 'member' | 'admin') {
  await db.prepare(
    `UPDATE support_tickets SET updated_at=datetime('now'), last_reply_at=datetime('now'), last_reply_by=? WHERE id=?`
  ).bind(replyBy, ticketId).run()
}

/** Marquer les messages comme lus */
async function markRead(db: D1Database, ticketId: string, readerType: 'member' | 'admin') {
  const senderToMark = readerType === 'member' ? 'admin' : 'member'
  await db.prepare(
    `UPDATE support_messages SET is_read=1 WHERE ticket_id=? AND sender_type=? AND is_read=0`
  ).bind(ticketId, senderToMark).run()
}

// ─────────────────────────────────────────────────────────────
// ══ ROUTES MEMBRES ══
// Préfixe : /api/support/   (authentification membre requise)
// ─────────────────────────────────────────────────────────────

/** GET /api/support/tickets — Liste des tickets du membre */
support.get('/tickets', async (c) => {
  const memberId = c.get('memberId' as any)
  const { status, page = '1', per_page = '20' } = c.req.query()
  const limit = Math.min(parseInt(per_page) || 20, 50)
  const offset = (Math.max(parseInt(page), 1) - 1) * limit

  const whereStatus = status ? `AND t.status = '${status}'` : ''

  try {
    const [rows, countRow, unreadRow] = await Promise.all([
      c.env.DB.prepare(`
        SELECT t.id, t.ticket_number, t.category, t.subject, t.priority,
               t.status, t.created_at, t.updated_at, t.last_reply_at, t.last_reply_by,
               t.rating, t.resolved_at,
               (SELECT COUNT(*) FROM support_messages sm
                WHERE sm.ticket_id=t.id AND sm.sender_type='admin' AND sm.is_read=0) AS unread_count,
               (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id) AS message_count
        FROM support_tickets t
        WHERE t.member_id=? ${whereStatus}
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
      c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM support_tickets WHERE member_id=? ${whereStatus ? `AND status='${status}'` : ''}`
      ).bind(memberId).first() as any,
      c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM support_tickets t
         JOIN support_messages sm ON sm.ticket_id=t.id
         WHERE t.member_id=? AND sm.sender_type='admin' AND sm.is_read=0`
      ).bind(memberId).first() as any,
    ])

    return c.json({
      tickets: rows.results || [],
      total: countRow?.total || 0,
      unread_total: unreadRow?.cnt || 0,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur', tickets: [], total: 0 }, 500)
  }
})

/** POST /api/support/tickets — Créer un nouveau ticket */
support.post('/tickets', async (c) => {
  const memberId = c.get('memberId' as any)
  try {
    const { category, subject, message } = await c.req.json()
    if (!subject?.trim() || !message?.trim()) {
      return c.json({ error: 'Sujet et message requis' }, 400)
    }
    if (!['wallet','commission','package','account','tree','license','other'].includes(category)) {
      return c.json({ error: 'Catégorie invalide' }, 400)
    }

    const ticketId = crypto.randomUUID()
    const priority = autoPriority(category)
    const context = await buildContextSnapshot(c.env.DB, memberId)

    // Récupérer le nom du membre
    const member = await c.env.DB.prepare(
      `SELECT first_name, last_name FROM members WHERE id=?`
    ).bind(memberId).first() as any

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (id, member_id, category, subject, priority, context_snapshot)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(ticketId, memberId, category, subject.trim(), priority, context).run()

    // Premier message
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_id, sender_name, content)
      VALUES (?, 'member', ?, ?, ?)
    `).bind(ticketId, memberId, `${member?.first_name} ${member?.last_name}`, message.trim()).run()

    await touchTicket(c.env.DB, ticketId, 'member')

    const ticket = await c.env.DB.prepare(
      `SELECT * FROM support_tickets WHERE id=?`
    ).bind(ticketId).first()

    //  Déclencher la réponse IA en arrière-plan (fire-and-forget)
    // On n'attend pas la réponse GPT pour ne pas bloquer la réponse HTTP
    c.executionCtx?.waitUntil(
      _aiSupportReply(c.env.DB, ticketId, memberId, c.env)
    )

    return c.json({ ticket }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur création ticket' }, 500)
  }
})

/** GET /api/support/tickets/:id — Détail ticket + messages */
support.get('/tickets/:id', async (c) => {
  const memberId = c.get('memberId' as any)
  const ticketId = c.req.param('id')
  try {
    const ticket = await c.env.DB.prepare(
      `SELECT t.*, m.first_name||' '||m.last_name AS member_name, m.unique_id
       FROM support_tickets t JOIN members m ON m.id=t.member_id
       WHERE t.id=? AND t.member_id=?`
    ).bind(ticketId, memberId).first() as any

    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)

    const [messages, tags] = await Promise.all([
      c.env.DB.prepare(
        `SELECT id, sender_type, sender_name, content, attachment_url, is_internal, is_read, created_at
         FROM support_messages
         WHERE ticket_id=? AND is_internal=0
         ORDER BY created_at ASC`
      ).bind(ticketId).all(),
      c.env.DB.prepare(`SELECT tag FROM support_ticket_tags WHERE ticket_id=?`).bind(ticketId).all(),
    ])

    // Marquer les messages admin comme lus
    await markRead(c.env.DB, ticketId, 'member')

    return c.json({
      ticket,
      messages: messages.results || [],
      tags: (tags.results || []).map((r: any) => r.tag),
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur' }, 500)
  }
})

/** POST /api/support/tickets/:id/messages — Ajouter un message membre */
support.post('/tickets/:id/messages', async (c) => {
  const memberId = c.get('memberId' as any)
  const ticketId = c.req.param('id')
  try {
    const ticket = await c.env.DB.prepare(
      `SELECT id, status FROM support_tickets WHERE id=? AND member_id=?`
    ).bind(ticketId, memberId).first() as any
    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)
    if (ticket.status === 'closed') return c.json({ error: 'Ticket fermé' }, 400)

    const { content } = await c.req.json()
    if (!content?.trim()) return c.json({ error: 'Message vide' }, 400)

    const member = await c.env.DB.prepare(
      `SELECT first_name, last_name FROM members WHERE id=?`
    ).bind(memberId).first() as any

    const msgId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, content)
      VALUES (?, ?, 'member', ?, ?, ?)
    `).bind(msgId, ticketId, memberId, `${member?.first_name} ${member?.last_name}`, content.trim()).run()

    // Réouvrir si waiting_member
    if (ticket.status === 'waiting_member') {
      await c.env.DB.prepare(
        `UPDATE support_tickets SET status='in_progress' WHERE id=?`
      ).bind(ticketId).run()
    }

    await touchTicket(c.env.DB, ticketId, 'member')

    //  Déclencher la réponse IA en arrière-plan (fire-and-forget)
    c.executionCtx?.waitUntil(
      _aiSupportReply(c.env.DB, ticketId, memberId, c.env)
    )

    return c.json({ success: true, message_id: msgId })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur' }, 500)
  }
})

/** PATCH /api/support/tickets/:id/resolve — Membre marque son ticket comme résolu */
support.patch('/tickets/:id/resolve', async (c) => {
  const memberId = c.get('memberId' as any)
  const ticketId = c.req.param('id')
  try {
    const ticket = await c.env.DB.prepare(
      `SELECT id, status FROM support_tickets WHERE id=? AND member_id=?`
    ).bind(ticketId, memberId).first() as any
    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)
    if (['resolved','closed'].includes(ticket.status)) return c.json({ success: true, already_resolved: true })

    // Marquer résolu
    await c.env.DB.prepare(
      `UPDATE support_tickets SET status='resolved', resolved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).bind(ticketId).run()

    // Message interne pour l'admin
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_id, sender_name, content, is_internal, created_at)
      VALUES (?, 'admin', 'system', 'Système', ' Le membre a confirmé que son problème est résolu.', 1, datetime('now'))
    `).bind(ticketId).run()

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur' }, 500)
  }
})

/** POST /api/support/tickets/:id/rate — Évaluer le support avec escalade automatique si note ≤ 2 */
support.post('/tickets/:id/rate', async (c) => {
  const memberId = c.get('memberId' as any)
  const ticketId = c.req.param('id')
  try {
    const { rating, comment } = await c.req.json()
    if (!rating || rating < 1 || rating > 5) return c.json({ error: 'Note entre 1 et 5' }, 400)

    const ticket = await c.env.DB.prepare(
      `SELECT id, status FROM support_tickets WHERE id=? AND member_id=?`
    ).bind(ticketId, memberId).first() as any
    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)

    // Accepter la note même si le ticket n'est pas encore résolu (cas résolution instantanée)
    // Si le ticket est encore ouvert, le marquer resolved au passage
    if (!['resolved','closed'].includes(ticket.status)) {
      await c.env.DB.prepare(
        `UPDATE support_tickets SET status='resolved', resolved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
      ).bind(ticketId).run()
    }

    // Enregistrer la note
    await c.env.DB.prepare(
      `UPDATE support_tickets SET rating=?, rating_comment=?, updated_at=datetime('now') WHERE id=?`
    ).bind(rating, comment?.trim() || null, ticketId).run()

    // ── ESCALADE QUALITÉ : note ≤ 2 ────────────────────────────
    if (rating <= 2) {
      // 1. Rouvrir le ticket + tag needs_human
      await c.env.DB.prepare(
        `UPDATE support_tickets SET status='open', updated_at=datetime('now') WHERE id=?`
      ).bind(ticketId).run()

      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?, 'needs_human')`
      ).bind(ticketId).run()

      // 2. Message interne visible admin uniquement
      const noteText = comment?.trim()
        ? ` Note qualité : ${rating}/5 — "${comment.trim()}" — Escalade vers support humain requise.`
        : ` Note qualité : ${rating}/5 — Escalade vers support humain requise.`

      await c.env.DB.prepare(`
        INSERT INTO support_messages (ticket_id, sender_type, sender_id, sender_name, content, is_internal, created_at)
        VALUES (?, 'admin', 'system', 'Qualité Support', ?, 1, datetime('now'))
      `).bind(ticketId, noteText).run()

      return c.json({ success: true, escalated: true, message: 'Un conseiller humain va reprendre votre dossier.' })
    }

    return c.json({ success: true, escalated: false })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur' }, 500)
  }
})

/** GET /api/support/faq — FAQ publique */
support.get('/faq', async (c) => {
  const { category } = c.req.query()
  try {
    const where = category ? `AND category=?` : ''
    const rows = await (category
      ? c.env.DB.prepare(`SELECT * FROM support_faq WHERE is_active=1 ${where} ORDER BY sort_order ASC`).bind(category).all()
      : c.env.DB.prepare(`SELECT * FROM support_faq WHERE is_active=1 ORDER BY category, sort_order ASC`).all()
    )
    return c.json({ faq: rows.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur', faq: [] }, 500)
  }
})

/** POST /api/support/faq/:id/view — Incrémenter le compteur de vues */
support.post('/faq/:id/view', async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare(`UPDATE support_faq SET views=views+1 WHERE id=?`).bind(id).run()
    return c.json({ success: true })
  } catch { return c.json({ success: false }) }
})

/** GET /api/support/unread — Compteur de messages non lus (pour badge sidebar) */
support.get('/unread', async (c) => {
  const memberId = c.get('memberId' as any)
  try {
    const row = await c.env.DB.prepare(`
      SELECT COUNT(*) as cnt
      FROM support_tickets t
      JOIN support_messages sm ON sm.ticket_id=t.id
      WHERE t.member_id=? AND sm.sender_type='admin' AND sm.is_read=0
    `).bind(memberId).first() as any
    return c.json({ unread: row?.cnt || 0 })
  } catch {
    return c.json({ unread: 0 })
  }
})

// ─────────────────────────────────────────────────────────────
// ══ ROUTES ADMIN ══
// Préfixe : /api/admin/support/
// (Ces routes sont montées depuis admin.ts)
// ─────────────────────────────────────────────────────────────

export const adminSupport = new Hono<{ Bindings: Bindings }>()

// ── Middleware auth admin ─────────────────────────────────────
adminSupport.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès admin requis' }, 403)
  c.set('adminId' as any, payload.sub)
  // Récupérer le nom de l'admin pour les messages
  try {
    const adminRow = await c.env.DB.prepare(`SELECT name FROM admin_users WHERE id=?`).bind(payload.sub).first() as any
    c.set('adminName' as any, adminRow?.name || 'Support')
  } catch {
    c.set('adminName' as any, 'Support')
  }
  await next()
})

/** GET /api/admin/support/stats — Statistiques globales */
adminSupport.get('/stats', requirePermission('support.view'), async (c) => {
  try {
    const [counts, avgResponse, todayResolved, unassigned, ratingAvg] = await Promise.all([
      c.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open_count,
          SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
          SUM(CASE WHEN status='waiting_member' THEN 1 ELSE 0 END) AS waiting_count,
          SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) AS resolved_count,
          SUM(CASE WHEN priority='urgent' AND status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS urgent_count,
          SUM(CASE WHEN priority='high' AND status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS high_count
        FROM support_tickets
      `).first() as any,
      c.env.DB.prepare(`
        SELECT AVG(
          CAST((julianday(resolved_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
        ) as avg_minutes
        FROM support_tickets WHERE resolved_at IS NOT NULL AND created_at >= date('now','-30 days')
      `).first() as any,
      c.env.DB.prepare(`
        SELECT COUNT(*) as cnt FROM support_tickets
        WHERE status='resolved' AND date(resolved_at)=date('now')
      `).first() as any,
      c.env.DB.prepare(`
        SELECT COUNT(*) as cnt FROM support_tickets
        WHERE assigned_to IS NULL AND status NOT IN ('resolved','closed')
      `).first() as any,
      c.env.DB.prepare(`
        SELECT AVG(rating) as avg, COUNT(rating) as cnt FROM support_tickets WHERE rating IS NOT NULL
      `).first() as any,
    ])

    const avgMin = Math.round(avgResponse?.avg_minutes || 0)
    const avgHours = Math.floor(avgMin / 60)
    const avgMins = avgMin % 60

    return c.json({
      counts,
      avg_response_time: avgMin > 0 ? `${avgHours}h${String(avgMins).padStart(2,'0')}` : '—',
      today_resolved: todayResolved?.cnt || 0,
      unassigned: unassigned?.cnt || 0,
      rating_avg: ratingAvg?.avg ? Math.round(ratingAvg.avg * 10) / 10 : null,
      rating_count: ratingAvg?.cnt || 0,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** GET /api/admin/support/tickets — File de tickets (avec filtres) */
adminSupport.get('/tickets', requirePermission('support.view'), async (c) => {
  const { status, category, priority, assigned_to, search, page = '1', per_page = '25' } = c.req.query()
  const limit = Math.min(parseInt(per_page) || 25, 100)
  const offset = (Math.max(parseInt(page), 1) - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (status)      { conditions.push(`t.status=?`);      params.push(status) }
  if (category)    { conditions.push(`t.category=?`);    params.push(category) }
  if (priority)    { conditions.push(`t.priority=?`);    params.push(priority) }
  if (assigned_to === 'me') {
    // handled separately if needed
  } else if (assigned_to) { conditions.push(`t.assigned_to=?`); params.push(assigned_to) }
  if (search)      { conditions.push(`(t.subject LIKE ? OR m.first_name||' '||m.last_name LIKE ? OR m.unique_id LIKE ?)`); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const [rows, countRow] = await Promise.all([
      c.env.DB.prepare(`
        SELECT t.id, t.ticket_number, t.category, t.subject, t.priority, t.status,
               t.created_at, t.updated_at, t.last_reply_at, t.last_reply_by,
               t.assigned_to, t.rating,
               m.first_name||' '||m.last_name AS member_name,
               m.unique_id AS member_uid,
               m.id AS member_id,
               aa.name AS assigned_name,
               (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id AND sm.sender_type='member' AND sm.is_read=0) AS unread_count,
               (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id) AS message_count,
               (SELECT sm2.content FROM support_messages sm2 WHERE sm2.ticket_id=t.id ORDER BY sm2.created_at DESC LIMIT 1) AS last_message_preview
        FROM support_tickets t
        JOIN members m ON m.id=t.member_id
        LEFT JOIN admin_users aa ON aa.id=t.assigned_to
        ${where}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          t.updated_at DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as total
        FROM support_tickets t JOIN members m ON m.id=t.member_id ${where}
      `).bind(...params).first() as any,
    ])

    return c.json({ tickets: rows.results || [], total: countRow?.total || 0 })
  } catch (err: any) {
    return c.json({ error: err.message, tickets: [], total: 0 }, 500)
  }
})

/** GET /api/admin/support/tickets/:id — Détail ticket complet (admin) */
adminSupport.get('/tickets/:id', requirePermission('support.view'), async (c) => {
  const ticketId = c.req.param('id')
  try {
    const [ticket, messages, tags] = await Promise.all([
      c.env.DB.prepare(`
        SELECT t.*,
               m.first_name||' '||m.last_name AS member_name, m.unique_id, m.email,
               m.current_rank, m.member_status,
               aa.name AS assigned_name,
               w.balance AS wallet_balance, w.pending_balance AS wallet_pending,
               w.total_earned AS wallet_total_earned, w.total_withdrawn AS wallet_total_withdrawn
        FROM support_tickets t
        JOIN members m ON m.id=t.member_id
        LEFT JOIN admin_users aa ON aa.id=t.assigned_to
        LEFT JOIN wallets w ON w.member_id=m.id
        WHERE t.id=?
      `).bind(ticketId).first() as any,
      c.env.DB.prepare(
        `SELECT * FROM support_messages WHERE ticket_id=? ORDER BY created_at ASC`
      ).bind(ticketId).all(),
      c.env.DB.prepare(`SELECT tag FROM support_ticket_tags WHERE ticket_id=?`).bind(ticketId).all(),
    ])

    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)

    // Marquer les messages membre comme lus par l'admin
    await markRead(c.env.DB, ticketId, 'admin')

    return c.json({
      ticket,
      messages: messages.results || [],
      tags: (tags.results || []).map((r: any) => r.tag),
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** POST /api/admin/support/tickets/:id/reply — Répondre (admin) */
adminSupport.post('/tickets/:id/reply', requirePermission('support.reply'), async (c) => {
  const ticketId = c.req.param('id')
  const adminId = c.get('adminId' as any)
  const adminName = c.get('adminName' as any) || 'Support'
  try {
    const { content, is_internal = false, new_status } = await c.req.json()
    if (!content?.trim()) return c.json({ error: 'Message vide' }, 400)

    const ticket = await c.env.DB.prepare(
      `SELECT id, status FROM support_tickets WHERE id=?`
    ).bind(ticketId).first() as any
    if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404)

    const msgId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, content, is_internal)
      VALUES (?, ?, 'admin', ?, ?, ?, ?)
    `).bind(msgId, ticketId, adminId || 'admin', adminName, content.trim(), is_internal ? 1 : 0).run()

    // Changer le statut si demandé
    const targetStatus = new_status || (is_internal ? ticket.status : 'waiting_member')
    await c.env.DB.prepare(
      `UPDATE support_tickets SET status=?, updated_at=datetime('now'), last_reply_at=datetime('now'), last_reply_by='admin' WHERE id=?`
    ).bind(targetStatus, ticketId).run()

    if (targetStatus === 'resolved') {
      await c.env.DB.prepare(
        `UPDATE support_tickets SET resolved_at=datetime('now') WHERE id=?`
      ).bind(ticketId).run()
    }

    return c.json({ success: true, message_id: msgId })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** PATCH /api/admin/support/tickets/:id — Modifier statut/priorité/assignation/tags */
adminSupport.patch('/tickets/:id', requireAnyPermission(['support.assign', 'support.close']), async (c) => {
  const ticketId = c.req.param('id')
  try {
    const body = await c.req.json()
    const allowed = ['status','priority','assigned_to']
    const sets: string[] = []
    const vals: any[] = []

    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key}=?`)
        vals.push(body[key] || null)
      }
    }
    if (body.status === 'resolved') {
      sets.push(`resolved_at=datetime('now')`)
    }
    if (body.status === 'closed') {
      sets.push(`closed_at=datetime('now')`)
    }
    sets.push(`updated_at=datetime('now')`)

    if (sets.length > 1) {
      await c.env.DB.prepare(
        `UPDATE support_tickets SET ${sets.join(',')} WHERE id=?`
      ).bind(...vals, ticketId).run()
    }

    // Gérer les tags (remplacement complet)
    if (Array.isArray(body.tags)) {
      await c.env.DB.prepare(`DELETE FROM support_ticket_tags WHERE ticket_id=?`).bind(ticketId).run()
      for (const tag of body.tags) {
        await c.env.DB.prepare(
          `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?,?)`
        ).bind(ticketId, tag).run()
      }
    }
    // Ajouter un tag individuel
    if (body.add_tag) {
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO support_ticket_tags (ticket_id, tag) VALUES (?,?)`
      ).bind(ticketId, body.add_tag.trim()).run()
    }
    // Supprimer un tag individuel
    if (body.remove_tag) {
      await c.env.DB.prepare(
        `DELETE FROM support_ticket_tags WHERE ticket_id=? AND tag=?`
      ).bind(ticketId, body.remove_tag).run()
    }

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** GET /api/admin/support/templates — Liste des templates */
adminSupport.get('/templates', requirePermission('support.view'), async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT * FROM support_templates ORDER BY category, sort_order ASC`
    ).all()
    return c.json({ templates: rows.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message, templates: [] }, 500)
  }
})

/** POST /api/admin/support/templates — Créer un template */
adminSupport.post('/templates', requirePermission('support.reply'), async (c) => {
  const adminId = c.get('adminId' as any)
  try {
    const { title, content, category = 'general', sort_order = 0 } = await c.req.json()
    if (!title?.trim() || !content?.trim()) return c.json({ error: 'Titre et contenu requis' }, 400)
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO support_templates (id, title, content, category, sort_order, created_by) VALUES (?,?,?,?,?,?)`
    ).bind(id, title.trim(), content.trim(), category, sort_order, adminId || null).run()
    return c.json({ success: true, id }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** PUT /api/admin/support/templates/:id — Modifier un template */
adminSupport.put('/templates/:id', requirePermission('support.reply'), async (c) => {
  const id = c.req.param('id')
  try {
    const { title, content, category, sort_order } = await c.req.json()
    await c.env.DB.prepare(
      `UPDATE support_templates SET title=?, content=?, category=?, sort_order=?, updated_at=datetime('now') WHERE id=?`
    ).bind(title, content, category, sort_order ?? 0, id).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** DELETE /api/admin/support/templates/:id — Supprimer un template */
adminSupport.delete('/templates/:id', requirePermission('support.delete'), async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare(`DELETE FROM support_templates WHERE id=?`).bind(id).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** GET /api/admin/support/unread — Compteur tickets non lus (badge sidebar admin) */
adminSupport.get('/unread', requirePermission('support.view'), async (c) => {
  try {
    const row = await c.env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM support_tickets t
      JOIN support_messages sm ON sm.ticket_id=t.id
      WHERE sm.sender_type='member' AND sm.is_read=0
    `).first() as any
    const openRow = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM support_tickets WHERE status='open'`
    ).first() as any
    return c.json({ unread: row?.cnt || 0, open: openRow?.cnt || 0 })
  } catch {
    return c.json({ unread: 0, open: 0 })
  }
})

/** GET /api/admin/support/faq — Gérer la FAQ */
adminSupport.get('/faq', requirePermission('support.view'), async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT * FROM support_faq ORDER BY category, sort_order ASC`
    ).all()
    return c.json({ faq: rows.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message, faq: [] }, 500)
  }
})

/** POST /api/admin/support/faq — Créer article FAQ */
adminSupport.post('/faq', requirePermission('support.reply'), async (c) => {
  try {
    const { category, question, answer, sort_order = 0 } = await c.req.json()
    if (!question?.trim() || !answer?.trim()) return c.json({ error: 'Question et réponse requises' }, 400)
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO support_faq (id, category, question, answer, sort_order) VALUES (?,?,?,?,?)`
    ).bind(id, category || 'general', question.trim(), answer.trim(), sort_order).run()
    return c.json({ success: true, id }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** PUT /api/admin/support/faq/:id — Modifier article FAQ */
adminSupport.put('/faq/:id', requirePermission('support.reply'), async (c) => {
  const id = c.req.param('id')
  try {
    const { category, question, answer, sort_order, is_active } = await c.req.json()
    await c.env.DB.prepare(
      `UPDATE support_faq SET category=?, question=?, answer=?, sort_order=?, is_active=?, updated_at=datetime('now') WHERE id=?`
    ).bind(category, question, answer, sort_order ?? 0, is_active ?? 1, id).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/** DELETE /api/admin/support/faq/:id */
adminSupport.delete('/faq/:id', requirePermission('support.delete'), async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare(`DELETE FROM support_faq WHERE id=?`).bind(id).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
