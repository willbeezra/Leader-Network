// ============================================================
// LEADER — Agent IA Admin (Copilote)
// POST /api/admin/ai-agent/chat    → streaming SSE : étapes visibles en temps réel
// POST /api/admin/ai-agent/execute → exécution après validation humaine
// GET  /api/admin/ai-agent/history → historique sessions
// ============================================================
import { Hono } from 'hono'
import type { Bindings } from '../types/index.js'
import { verifyJWT } from '../lib/auth.js'
import { requirePermission } from '../middleware/permissions.js'

export const aiAgent = new Hono<{ Bindings: Bindings }>()

// ── Middleware auth admin ─────────────────────────────────────
aiAgent.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Non autorisé' }, 401)
  const adminRow = await c.env.DB.prepare(
    `SELECT id, name FROM admin_users WHERE id = ?`
  ).bind(payload.sub).first() as any
  if (!adminRow) return c.json({ error: 'Session invalide' }, 401)
  c.set('adminId' as any, adminRow.id)
  c.set('adminName' as any, adminRow.name)
  await next()
})

// ── Tables protégées ─────────────────────────────────────────
const PROTECTED_TABLES = [
  'admin_users', 'admin_roles', 'admin_role_permissions', 'admin_user_roles',
  'd1_migrations', '_cf_KV', 'sqlite_sequence'
]

// ── Opérations interdites ─────────────────────────────────────
const FORBIDDEN_PATTERNS = [
  /DROP\s+TABLE/i, /DROP\s+INDEX/i, /DELETE\s+FROM\s+(admin_users|withdrawals)/i,
  /TRUNCATE/i, /ALTER\s+TABLE/i, /CREATE\s+TABLE/i, /PRAGMA/i,
]

// ── Bible : Plan de Compensation LEADER 2025 ──────────
const PLAN_COMPENSATION = `
═══════════════════════════════════════════════════════════════
PLAN DE COMPENSATION LEADER NETWORK 2025 — RÉFÉRENCE ABSOLUE
═══════════════════════════════════════════════════════════════

## 1. LES 11 RANGS (jambe faible BV / directs actifs min / package requis / prime brute / plafond mensuel)

| Rang          | BV Jambe Faible | Directs min | Package      | Prime brute | Plafond/mois |
|---------------|----------------|-------------|--------------|-------------|--------------|
| Administrator |       400 BV   |      1      | Production   |      $50    |      $100    |
| Manager       |     2 000 BV   |      1      | Production   |     $150    |      $300    |
| Captain       |     6 000 BV   |      2      | Pinnacle     |     $600    |    $1 000    |
| Leader        |    12 500 BV   |      2      | Pinnacle     |   $1 500    |    $2 500    |
| Mentor        |    35 000 BV   |      2      | Pinnacle     |   $3 000    |    $5 000    |
| Superviseur   |    80 000 BV   |      4      | Pinnacle     |   $7 000    |   $10 000    |
| Executive     |   170 000 BV   |      2      | Pinnacle     |  $12 000    |   $15 000    |
| President     |   350 000 BV   |      5      | Pinnacle     |  $20 000    |   $30 000    |
| Director      |   700 000 BV   |      6      | Pinnacle     |  $50 000    |   $60 000    |
| Boss          | 1 400 000 BV   |      8      | Pinnacle     |  $70 000    |   $85 000    |
| Visionary     | 2 800 000 BV   |     12      | Pinnacle     | $100 000    |  $120 000    |

## 2. QUALIFICATION MENSUELLE (obligatoire pour toucher les commissions)
- Générer ≥ 300 BV personnels ce mois-ci OU avoir au moins 1 client actif
- Sans qualification : aucune commission versée ce mois

## 3. LES 7 SOURCES DE REVENUS

### 3.1 Fast Start (bonus recrutement, valable 30 jours après inscription)
Paliers CUMULATIFS sur BV générés par le nouveau filleul :
- Palier 1 : 1 500 BV → +$50
- Palier 2 : 3 000 BV → +$150 (total $200)
- Palier 3 : 5 000 BV → +$300 (total $500)
- Palier 4 : 10 000 BV → +$500 (total $1 000)
Maximum Fast Start : $1 000 par filleul

### 3.2 Valorisation Recommandation
- 10% sur la valeur de commande du filleul direct
- Conditions : statut Partenaire ou AMI requis

### 3.3 Prime de Leadership (revenu principal)
- Montant FIXE par rang (voir tableau ci-dessus)
- Calculée sur la jambe faible du binaire
- Plafond mensuel applicable (voir tableau)
- Versée progressivement chaque jour du mois (amount_per_day × jours)
- Prime NETTE reçue = prime_brute - RS (10% prélevé)
- Rang Captain min requis

### 3.4 Rayonnement (sur Prime Leadership des filleuls directs)
- 10% de la Prime Leadership perçue par chaque filleul direct
- Conditions d'éligibilité CUMULATIVES :
  • Rang Captain minimum
  • Package Pinnacle ≥ $1 499
  • ≥ 1 nouveau parrainage ce mois
  • ≥ 6 000 BV ce mois

### 3.5 Bonus d'Influence (5 niveaux de profondeur sponsor)
Pourcentage sur la Prime Leadership des filleuls en profondeur :
- Niveau 1 : 5% (filleul direct)
- Niveau 2 : 4%
- Niveau 3 : 3%
- Niveau 4 : 2%
- Niveau 5 : 1%
Conditions : Rang Leader minimum, filleul concerné minimum Manager

### 3.6 Crédit de Croissance (CC)
- 20% de la Prime Leadership brute
- Rang Leader minimum
- Disponible le 1er du mois suivant (M+1)
- Expire 3 mois après attribution
- Utilisable UNIQUEMENT pour achat de packages/abonnements (non encaissable)
- Stocké dans la table credit_croissance

### 3.7 Réserve Stratégique (RS)
- Prélevée sur la prime brute (réduit la prime nette)
- Rang MINIMUM : Mentor (Captain, Leader → pas de RS)
- Rangs éligibles : Mentor, Superviseur, Executive, President
- Director, Boss, Visionary → PAS de RS
- Taux de prélèvement : 10% de la prime brute
- Abondement entreprise selon rang :
  • Mentor / Superviseur : +10% → totalRS = prime_brute × 20%
  • Executive / President : +20% → totalRS = prime_brute × 30%
- Bloquée 3 ans (locked_until = date + 3 ans)
- Libérée après 3 ans (status → released)
- En upgrade intra-mois : ancienne RS → cancelled, nouvelle RS créée au bon montant

## 4. PACKAGES ET BV

| Package                 | Prix    | BV attribués |
|-------------------------|---------|--------------|
| Synex Production        | $600    | 240 BV       |
| Synex Développement     | $1 000  | 400 BV       |
| Synex Pinnacle          | $1 500  | 600 BV       |
| Synex Influence         | $2 000  | 800 BV       |
| Club Prestige           | $1 499  | 900 BV       |
| Club Premium            | $1 600  | 500 BV       |
| Club Premium Plus       | $3 200  | 1 100 BV     |
| Club Premium Executive  | $4 800  | 1 700 BV     |
| Ezra Formation          | $49–$99 | 0 BV         |
| Luxia & Licences        | €99–$97 | 0 BV         |
| Frais d'entrée          | $49     | 0 BV         |

## 5. CALCULS CLÉS À MAÎTRISER

### Prime nette reçue (versée au membre)
= prime_brute - (prime_brute × 10%)
= prime_brute × 90%
Exemple Superviseur : $7 000 × 90% = $6 300 net

### RS totale créée
Mentor/Superviseur : prime_brute × 20%
  Ex : $7 000 × 20% = $1 400 RS
Executive/President : prime_brute × 30%
  Ex : $12 000 × 30% = $3 600 RS

### CC créé
= prime_brute × 20%
  Ex Superviseur : $7 000 × 20% = $1 400 CC

### Vérification cohérence RS
members.reserve_strategique = SUM(reserve_strategique.amount WHERE status='locked')
Si différent → anomalie à corriger

## 6. ANOMALIES COURANTES À DÉTECTER
1. members.reserve_strategique ≠ SUM RS locked → compteur désynchronisé
2. RS locked d'un ancien rang non annulée après upgrade intra-mois
3. Prime versée ne correspond pas au rang actuel
4. CC non créé alors que rang Leader+
5. Rayonnement versé à un membre sans les conditions (Captain+, Pinnacle, 1 parrainage/mois, 6000BV)
6. Influence versée sur un filleul qui n'est pas Manager minimum
7. pending_balance ≠ SUM(pending_wallet_entries actifs)
`

// ── Prompt Phase 1 : planification des requêtes SQL ───────────
const PROMPT_PHASE1 = `Tu es l'Agent IA Admin de LEADER. Tu connais par cœur le plan de compensation ci-dessous — c'est ta bible absolue.

${PLAN_COMPENSATION}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS TECHNIQUES
═══════════════════════════════════════════════════════════════

️ BASE DE DONNÉES : SQLite (PAS MySQL, PAS PostgreSQL)
Fonctions de date SQLite OBLIGATOIRES :
- Date du jour : date('now')
- Mois en cours (format YYYY-MM) : strftime('%Y-%m', 'now')
- Mois précédent : strftime('%Y-%m', 'now', '-1 month')
- NE JAMAIS utiliser : CURDATE(), NOW(), DATE_FORMAT(), GETDATE()

## SCHÉMA COMPLET

### members
id TEXT, unique_id TEXT, first_name TEXT, last_name TEXT, current_rank TEXT,
member_status TEXT (Partenaire | AMI | Membre | Client),
license_active INTEGER (1=actif, 0=inactif),
sponsor_id TEXT (FK → members.id : parrain LIGNE de sponsor direct),
binary_parent_id TEXT (FK → members.id : parent dans l'arbre binaire),
reserve_strategique REAL (compteur dénormalisé = SUM RS locked),
created_at TEXT

### commissions
id TEXT, member_id TEXT (qui reçoit le bonus),
type TEXT (prime_leadership | reserve_strategique | credit_croissance | bonus_influence | bonus_rayonnement | valorisation_recommandation | fast_start | admin_credit),
amount REAL, period TEXT (YYYY-MM),
status TEXT (pending | approved | paid | cancelled),
source_member_id TEXT (pour VR = filleul qui a acheté ; pour influence/rayonnement = membre source),
reference_order_id TEXT (pour VR = ID de la commande package_orders déclenchante),
rank_at_time TEXT, description TEXT, created_at TEXT

### package_orders
id TEXT, member_id TEXT (acheteur), package_id TEXT,
amount_usd REAL, bv_value REAL,
status TEXT (pending | proof_submitted | validated | rejected | cancelled),
validated_at TEXT, created_at TEXT

### packages
id TEXT, name TEXT, slug TEXT, price_usd REAL, bv_value REAL,
direct_commission_rate REAL (% VR propre au package, défaut 10%)

### bonus_config
key TEXT, value TEXT
— clés importantes :
  recommendation_enabled = 'true'/'false' (VR activée globalement ?)
  recommendation_pct = taux VR global si pas de taux package
  recommendation_eligible_statuses = 'Partenaire,AMI' (statuts éligibles)

### wallets
member_id TEXT, balance REAL (disponible), pending_balance REAL (en attente)

### wallet_transactions
id TEXT, member_id TEXT, wallet_type TEXT (main | pending), transaction_type TEXT, amount REAL, description TEXT, created_at TEXT

### pending_wallet_entries
id TEXT, member_id TEXT, commission_type TEXT, amount_per_day REAL, days_paid INTEGER, days_in_month INTEGER, period TEXT (YYYY-MM), status TEXT (active | completed | cancelled)

### reserve_strategique
id TEXT, member_id TEXT, amount REAL, period TEXT (YYYY-MM),
status TEXT (locked | released | forfeited | unlocked | cancelled),
abondement_rate REAL, locked_until TEXT, created_at TEXT

### monthly_validations
id TEXT, member_id TEXT, period TEXT (YYYY-MM), leadership_prime REAL, influence_bonus REAL, created_at TEXT

### rank_config
rank_name TEXT, monthly_prime REAL (prime brute), monthly_cap REAL, min_bv_leg REAL

### bv_logs
id TEXT, member_id TEXT, bv_amount REAL, period TEXT (YYYY-MM), side TEXT (L | R), created_at TEXT

### credit_croissance
id TEXT, member_id TEXT, amount REAL, period TEXT (YYYY-MM), status TEXT, expires_at TEXT

## RÈGLES MÉTIER PRÉCISES

### Valorisation Recommandation (VR)
- Déclenchée lors de la VALIDATION d'une commande (package_orders.status = 'validated')
- Versée au SPONSOR DIRECT du membre qui achète (members.sponsor_id → le parrain)
- Conditions CUMULATIVES pour que le sponsor reçoive la VR :
  1. bonus_config recommendation_enabled = 'true'
  2. sponsor.license_active = 1
  3. sponsor.member_status IN ('Partenaire', 'AMI')
- Taux = packages.direct_commission_rate (sinon bonus_config recommendation_pct, défaut 10%)
- Montant = package_orders.amount_usd × taux%
- Idempotence : une seule VR par commande (vérifier commissions WHERE type='valorisation_recommandation' AND reference_order_id = orderId)
- Stockée dans commissions : member_id=sponsor, source_member_id=filleul, reference_order_id=orderId

### DIAGNOSTIC VR — REQUÊTES OBLIGATOIRES
Si on te demande pourquoi un membre n'a PAS reçu de VR, tu DOIS :
1. Trouver le membre (sponsor)
2. Vérifier ses conditions d'éligibilité : license_active + member_status
3. Récupérer ses filleuls directs (WHERE sponsor_id = membre.id)
4. Récupérer les commandes validées de ces filleuls (package_orders WHERE member_id IN (filleuls) AND status='validated')
5. Vérifier si des VR existent pour ces commandes (commissions WHERE type='valorisation_recommandation' AND source_member_id IN (filleuls))
6. Vérifier la config globale : bonus_config WHERE key='recommendation_enabled'
7. Vérifier les commandes du sponsor lui-même aussi (il peut être filleul de quelqu'un)

### RS (Réserve Stratégique)
- Éligible UNIQUEMENT : Mentor, Superviseur, Executive, President
- Mentor/Superviseur : totalRS = prime_brute × 20%
- Executive/President : totalRS = prime_brute × 30%
- members.reserve_strategique DOIT = SUM(reserve_strategique.amount WHERE status='locked')
- Upgrade intra-mois : ancienne RS → 'cancelled', nouvelle RS créée

## TA MISSION
Génère les requêtes SQLite SELECT pour un diagnostic COMPLET et EXHAUSTIF.
NE réponds PAS — collecte seulement les données.

POUR TOUT DIAGNOSTIC SUR UN MEMBRE :
1. Cherche le membre (par nom ou unique_id)
2. Selon le type de question, adapte les requêtes (voir ci-dessus)
3. Récupère ses commissions récentes (3 derniers mois, TOUS types, TOUS statuts)
4. Récupère son wallet
5. Si question sur VR → requêtes obligatoires VR ci-dessus
6. Si question sur RS → RS locked/cancelled + compteur members

Ne cherche JAMAIS juste "le mois en cours" — cherche les 3 derniers mois.

## FORMAT (JSON strict)
{
  "sql_queries": [
    { "step": 1, "description": "Ce qu'on cherche", "sql": "SELECT ... FROM ... WHERE ..." }
  ]
}

Maximum 10 requêtes. Pour un diagnostic VR : minimum 5 requêtes obligatoires.
`

// ── Prompt Phase 2 : analyse avec les données réelles ─────────
const PROMPT_PHASE2 = `Tu es l'Agent IA Admin de LEADER. Tu es un assistant intelligent, clair et bienveillant — exactement comme ChatGPT ou Claude, mais spécialisé dans le plan de compensation MLM de LEADER.

Tu connais par cœur le plan de compensation ci-dessous — c'est ta bible absolue. Utilise-la pour valider chaque chiffre, détecter les anomalies et proposer des corrections précises.

${PLAN_COMPENSATION}

## TON STYLE
- Tu parles en français, de façon simple et humaine.
- Tu présentes les données RÉELLES récupérées (montants exacts, dates, statuts). Jamais de suppositions.
- Tu analyses TOUT ce que tu as reçu avant de conclure.
- Si les données montrent que tout est correct, tu le dis clairement avec les chiffres à l'appui.
- Si tu détectes une anomalie, tu expliques précisément ce qui ne va pas et pourquoi.
- Tu termines TOUJOURS par une proposition concrète : correction ou confirmation.
- Tu n'affiches JAMAIS de JSON brut.
- Si tu proposes des corrections (UPDATE/INSERT), tu les mets dans sql_queries avec is_read_only=false.

## RÈGLES ABSOLUES
- Ne modifie JAMAIS : admin_users, admin_roles, withdrawals déjà payés
- Jamais de DROP TABLE, ALTER TABLE, TRUNCATE
- Base SQLite : utilise strftime('%Y-%m','now') pour la date courante, JAMAIS CURDATE() ou NOW()

## COMMENT ANALYSER
Avant de formuler ta réponse, parcours méthodiquement chaque tableau de données reçu.

### Si la question porte sur la Valorisation Recommandation (VR) :
1. Le sponsor est-il éligible ? license_active=1 ET member_status IN ('Partenaire','AMI') ?
2. La VR est-elle activée globalement ? (bonus_config recommendation_enabled)
3. Quels filleuls directs (sponsor_id = membre) ont des commandes validées récemment ?
4. Pour chaque commande validée d'un filleul, existe-t-il une commission VR dans commissions (type='valorisation_recommandation', source_member_id=filleul, reference_order_id=commande) ?
5. Si commande validée MAIS pas de VR → cause probable : soit sponsor inéligible au moment de la validation, soit bug, soit VR désactivée.
6. Cite les commandes (montant, date, filleul, package) et les VR correspondantes (ou leur absence) avec les IDs exacts.

### Si la question porte sur la RS :
1. Quel est le rang actuel ? Est-il éligible RS ?
2. Y a-t-il des entrées dans reserve_strategique ? Quels statuts ? Quels montants ? Quelles périodes ?
3. Le compteur members.reserve_strategique correspond-il à SUM(RS locked) ?
4. Y a-t-il des commissions de type reserve_strategique ? Quels statuts ?
5. Les monthly_validations confirment-elles la prime attendue ?

### Règle générale :
- Si tout est correct → dis-le clairement avec les chiffres. Ne cherche pas un problème qui n'existe pas.
- Si une anomalie est détectée → explique précisément la cause avec les données réelles (IDs, montants, dates).

## FORMAT DE RÉPONSE (JSON strict)
{
  "message": "Ton analyse en markdown. NE TERMINE PAS par une question — les actions sont gérées séparément.",
  "sql_queries": [
    {
      "step": 1,
      "description": "Description de la correction",
      "sql": "UPDATE ... ou INSERT ...",
      "is_read_only": false,
      "is_destructive": true
    }
  ],
  "needs_execution": false,
  "diagnosis": "Cause racine en une phrase (ou 'Aucune anomalie détectée')",
  "confidence": 0.9,
  "requires_code_fix": false,
  "code_fix_hint": null,
  "member_context": {
    "id": "id_du_membre_concerné_ou_null",
    "name": "Prénom Nom ou null",
    "unique_id": "LDRxxxxxx ou null"
  },
  "suggested_actions": [
    {
      "id": "action_id",
      "label": "Libellé court du bouton",
      "icon": "emoji",
      "type": "reply_ticket | fix_db | export | new_query | dismiss",
      "payload": {}
    }
  ]
}

## RÈGLES POUR suggested_actions
Génère TOUJOURS 2 à 4 actions pertinentes selon le contexte :

Si anomalie détectée ET correction SQL possible :
  → { id:"fix", label:"Appliquer la correction", icon:"", type:"fix_db", payload:{} }
  → { id:"ticket", label:"Répondre au ticket de [Prénom]", icon:"️", type:"reply_ticket", payload:{ member_name:"[Prénom Nom]", draft:"[texte complet du message à envoyer au membre, professionnel, bienveillant, en français, expliquant la situation et ce qu'on va faire]" } }
  → { id:"dismiss", label:"C'est bon, merci", icon:"", type:"dismiss", payload:{} }

Si tout est correct (aucune anomalie) :
  → { id:"ticket", label:"Répondre au ticket de [Prénom]", icon:"️", type:"reply_ticket", payload:{ member_name:"[Prénom Nom]", draft:"[texte complet rassurant, expliquant pourquoi tout est normal avec les chiffres clés]" } }
  → { id:"dismiss", label:"C'est bon, merci", icon:"", type:"dismiss", payload:{} }

Si bug de code détecté (requires_code_fix=true) :
  → { id:"ticket", label:"Répondre au ticket de [Prénom]", icon:"️", type:"reply_ticket", payload:{ member_name:"[Prénom Nom]", draft:"[texte expliquant qu'on a identifié un problème technique et qu'on le règle dans les plus brefs délais]" } }
  → { id:"dismiss", label:"Noté, je vais corriger le code", icon:"️", type:"dismiss", payload:{} }

IMPORTANT pour reply_ticket :
- "draft" = texte COMPLET prêt à envoyer au membre (pas un résumé, un vrai message)
- Commence par "Bonjour [Prénom]," et termine par "Cordialement, L'équipe LEADER"
- Ton : professionnel, chaleureux, rassurant
- Inclure les chiffres clés du diagnostic si pertinent

- sql_queries = [] si aucune correction nécessaire
- needs_execution = true uniquement si des UPDATE/INSERT sont proposés
- member_context = null si aucun membre spécifique identifié
`

// ── Helpers ───────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function validateSQLPlan(queries: any[]): { ok: boolean; reason?: string } {
  for (const q of queries) {
    const sql = (q.sql || '').trim()
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(sql)) {
        return { ok: false, reason: `Opération interdite : "${sql.substring(0, 80)}..."` }
      }
    }
    if (!/^\s*SELECT/i.test(sql)) {
      for (const table of PROTECTED_TABLES) {
        if (new RegExp(`\\b${table}\\b`, 'i').test(sql)) {
          return { ok: false, reason: `Table protégée "${table}" ne peut pas être modifiée.` }
        }
      }
    }
  }
  return { ok: true }
}

// ── Helper SSE : encoder un événement ─────────────────────────
function sseEvent(type: string, data: object): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`
}

// ── Helper : appel GPT-4o ─────────────────────────────────────
async function callGPT(apiKey: string, systemPrompt: string, messages: any[], maxTokens = 2000): Promise<{ content: string; tokens: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err.substring(0, 200)}`)
  }
  const data = await res.json() as any
  return {
    content: data?.choices?.[0]?.message?.content || '{}',
    tokens: data?.usage?.total_tokens || 0,
  }
}

// ── POST /api/admin/ai-agent/chat — STREAMING SSE ─────────────
// Workflow en 2 phases : Phase1=planification SQL → exécution → Phase2=analyse+réponse
aiAgent.post('/chat', requirePermission('members.view'), async (c) => {
  const adminId: string = c.get('adminId' as any) as string

  const { message, session_id, history = [] } = await c.req.json()
  if (!message?.trim()) return c.json({ error: 'Message vide' }, 400)

  const sessionId = session_id || genId()
  const db = c.env.DB
  const openaiKey = c.env.OPENAI_API_KEY

  // Sauvegarder le message utilisateur
  await db.prepare(
    `INSERT INTO ai_agent_logs (id, admin_id, session_id, role, content) VALUES (?, ?, ?, 'user', ?)`
  ).bind(genId(), adminId, sessionId, message.trim()).run()

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (type: string, data: object) => {
        controller.enqueue(enc.encode(sseEvent(type, data)))
      }

      try {
        const recentHistory = (history || []).slice(-10)
        const historyMessages = recentHistory.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }))

        // ════════════════════════════════════════════════════════
        // PHASE 1 : GPT planifie quelles requêtes SQL exécuter
        // ════════════════════════════════════════════════════════
        send('step', { icon: '', label: 'Planification de l\'analyse…', status: 'running' })

        let phase1: any = {}
        let totalTokens = 0

        try {
          const p1 = await callGPT(openaiKey, PROMPT_PHASE1, [
            ...historyMessages,
            { role: 'user', content: message.trim() }
          ], 1500)
          totalTokens += p1.tokens
          phase1 = JSON.parse(p1.content)
        } catch (err: any) {
          send('error', { message: `Erreur IA (phase 1) : ${err.message}` })
          controller.close()
          return
        }

        const plannedQueries: any[] = Array.isArray(phase1.sql_queries) ? phase1.sql_queries : []

        send('step', { icon: '', label: `Plan établi — ${plannedQueries.length} requête(s) à exécuter`, status: 'done' })

        // ════════════════════════════════════════════════════════
        // PHASE 1.5 : Exécution des SELECT planifiés
        // ════════════════════════════════════════════════════════
        const queryResults: Array<{ step: number; description: string; sql: string; rows: any[]; error?: string }> = []

        for (const q of plannedQueries) {
          let sql = (q.sql || '').trim()
          if (!sql || !/^\s*SELECT/i.test(sql)) continue

          // Auto-correction syntaxe SQLite (remplace fonctions MySQL/PostgreSQL)
          sql = sql
            .replace(/CURDATE\(\)/gi, "date('now')")
            .replace(/NOW\(\)/gi, "datetime('now')")
            .replace(/DATE_FORMAT\s*\([^,]+,\s*['"]%Y-%m['"]\s*\)/gi, "strftime('%Y-%m','now')")
            .replace(/MONTH\s*\(NOW\(\)\)/gi, "strftime('%m','now')")
            .replace(/YEAR\s*\(NOW\(\)\)/gi, "strftime('%Y','now')")
            .replace(/GETDATE\(\)/gi, "date('now')")

          send('step', {
            icon: '',
            label: `Interrogation DB : ${q.description || `étape ${q.step}`}`,
            status: 'running',
            sql_preview: sql.substring(0, 120)
          })

          try {
            const result = await db.prepare(sql).all()
            const rows = (result.results || []) as any[]
            queryResults.push({ step: q.step, description: q.description || '', sql, rows })

            send('step', {
              icon: '',
              label: `${q.description || `Étape ${q.step}`} — ${rows.length} ligne(s)`,
              status: 'done'
            })
          } catch (err: any) {
            queryResults.push({ step: q.step, description: q.description || '', sql, rows: [], error: err?.message })
            send('step', {
              icon: '️',
              label: `Erreur SQL "${q.description}" : ${err?.message}`,
              status: 'error'
            })
          }
        }

        // ════════════════════════════════════════════════════════
        // PHASE 2 : GPT analyse les données réelles et répond
        // ════════════════════════════════════════════════════════
        send('step', { icon: '', label: 'Analyse des données par l\'IA…', status: 'running' })

        // Construire le contexte avec les résultats réels
        const dataContext = queryResults.map(r => {
          if (r.error) return `\n## ${r.description}\nErreur : ${r.error}`
          if (r.rows.length === 0) return `\n## ${r.description}\nAucun résultat trouvé.`
          const cols = Object.keys(r.rows[0])
          const header = cols.join(' | ')
          const sep = cols.map(() => '---').join(' | ')
          const rowsText = r.rows.slice(0, 20).map(row =>
            cols.map(c => String(row[c] ?? '—')).join(' | ')
          ).join('\n')
          return `\n## ${r.description}\n${header}\n${sep}\n${rowsText}${r.rows.length > 20 ? `\n... (${r.rows.length - 20} lignes supplémentaires)` : ''}`
        }).join('\n')

        const phase2UserContent = `Question de l'admin : "${message.trim()}"

Données récupérées depuis la base de données :
${dataContext || 'Aucune donnée récupérée.'}

Analyse ces données et réponds à l'admin de façon claire et complète.`

        let phase2: any = {}
        try {
          const p2 = await callGPT(openaiKey, PROMPT_PHASE2, [
            ...historyMessages,
            { role: 'user', content: phase2UserContent }
          ], 2500)
          totalTokens += p2.tokens
          phase2 = JSON.parse(p2.content)
        } catch (err: any) {
          send('error', { message: `Erreur IA (phase 2) : ${err.message}` })
          controller.close()
          return
        }

        send('step', { icon: '', label: 'Analyse terminée', status: 'done' })

        // Valider les requêtes d'écriture proposées par GPT phase 2
        const writeQueries: any[] = Array.isArray(phase2.sql_queries)
          ? phase2.sql_queries.filter((q: any) => !q.is_read_only)
          : []

        if (writeQueries.length > 0) {
          const validation = validateSQLPlan(writeQueries)
          if (!validation.ok) {
            phase2.message = (phase2.message || '') + `\n\n **Plan bloqué** : ${validation.reason}`
            phase2.needs_execution = false
            phase2.sql_queries = []
          }
        }

        // ════════════════════════════════════════════════════════
        // Sauvegarde et envoi final
        // ════════════════════════════════════════════════════════
        const finalMessage = phase2.message || 'Analyse terminée.'
        const finalSqlPlan = writeQueries.length > 0 ? JSON.stringify(writeQueries) : null
        const logId = genId()

        await db.prepare(
          `INSERT INTO ai_agent_logs (id, admin_id, session_id, role, content, sql_plan, tokens_used)
           VALUES (?, ?, ?, 'assistant', ?, ?, ?)`
        ).bind(logId, adminId, sessionId, finalMessage, finalSqlPlan, totalTokens).run()

        // read_results pour affichage tableaux inline
        const readResultsMap: Record<string, any[]> = {}
        for (const r of queryResults) {
          if (r.rows.length > 0) readResultsMap[r.description || `étape_${r.step}`] = r.rows
        }

        send('done', {
          session_id: sessionId,
          log_id: logId,
          message: finalMessage,
          sql_queries: writeQueries,
          read_results: readResultsMap,
          needs_execution: (phase2.needs_execution === true) && writeQueries.length > 0,
          diagnosis: phase2.diagnosis || '',
          confidence: phase2.confidence || 0,
          requires_code_fix: phase2.requires_code_fix || false,
          code_fix_hint: phase2.code_fix_hint || null,
          member_context: phase2.member_context || null,
          suggested_actions: Array.isArray(phase2.suggested_actions) ? phase2.suggested_actions : [],
          tokens_used: totalTokens,
        })

      } catch (err: any) {
        send('error', { message: err?.message || 'Erreur interne inattendue' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

// ── POST /api/admin/ai-agent/execute ─────────────────────────
aiAgent.post('/execute', requirePermission('members.edit'), async (c) => {
  const adminId: string = c.get('adminId' as any) as string
  const adminName: string = (c.get('adminName' as any) as string) || 'Admin'

  try {
    const { log_id, sql_queries, session_id } = await c.req.json()

    if (!Array.isArray(sql_queries) || sql_queries.length === 0) {
      return c.json({ error: 'Aucune requête à exécuter' }, 400)
    }

    const validation = validateSQLPlan(sql_queries)
    if (!validation.ok) {
      return c.json({ error: validation.reason }, 400)
    }

    const results: any[] = []
    let hasError = false

    for (const q of sql_queries) {
      const sql = (q.sql || '').trim()
      if (!sql || /^\s*SELECT/i.test(sql)) {
        results.push({ step: q.step, skipped: true, reason: 'SELECT ignoré' })
        continue
      }
      try {
        const result = await c.env.DB.prepare(sql).run()
        results.push({
          step: q.step,
          description: q.description,
          success: true,
          changes: result.meta?.changes || 0,
        })
      } catch (err: any) {
        hasError = true
        results.push({
          step: q.step,
          description: q.description,
          success: false,
          error: err?.message || 'Erreur SQL',
          sql: sql.substring(0, 200),
        })
        break
      }
    }

    const resultJson = JSON.stringify(results)

    // Audit log
    await c.env.DB.prepare(
      `INSERT INTO admin_audit_log (id, admin_id, action, target_type, details, created_at)
       VALUES (?, ?, 'ai_agent_execute', 'database', ?, datetime('now'))`
    ).bind(genId(), adminId, JSON.stringify({
      log_id, queries_count: sql_queries.length, results, admin_name: adminName,
    })).run().catch(() => {})

    if (log_id) {
      await c.env.DB.prepare(
        `UPDATE ai_agent_logs SET sql_executed=1, sql_result=? WHERE id=?`
      ).bind(resultJson, log_id).run()
    }

    if (session_id) {
      const summary = hasError
        ? `️ Exécution partielle — erreur à l'étape ${results.find((r: any) => !r.success)?.step}`
        : ` ${results.filter((r: any) => r.success).length} requête(s) exécutée(s) avec succès`
      await c.env.DB.prepare(
        `INSERT INTO ai_agent_logs (id, admin_id, session_id, role, content, sql_executed, sql_result)
         VALUES (?, ?, ?, 'assistant', ?, 1, ?)`
      ).bind(genId(), adminId, session_id, summary, resultJson).run()
    }

    return c.json({
      success: !hasError,
      results,
      message: hasError
        ? `Exécution interrompue à l'étape ${results.find((r: any) => !r.success)?.step}.`
        : `${results.filter((r: any) => r.success).length} requête(s) exécutée(s) avec succès.`,
    })

  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur interne' }, 500)
  }
})

// ── GET /api/admin/ai-agent/history ──────────────────────────
aiAgent.get('/history', requirePermission('members.view'), async (c) => {
  const adminId: string = c.get('adminId' as any) as string
  const { session_id, limit = '50' } = c.req.query()

  try {
    let rows: any[]
    if (session_id) {
      const result = await c.env.DB.prepare(
        `SELECT id, role, content, sql_plan, sql_executed, sql_result, tokens_used, created_at
         FROM ai_agent_logs
         WHERE admin_id=? AND session_id=?
         ORDER BY created_at ASC LIMIT ?`
      ).bind(adminId, session_id, parseInt(limit) || 50).all()
      rows = (result.results || []) as any[]
    } else {
      const result = await c.env.DB.prepare(
        `SELECT session_id,
                MIN(created_at) as started_at,
                MAX(created_at) as last_at,
                COUNT(*) as message_count,
                SUM(tokens_used) as total_tokens,
                (SELECT content FROM ai_agent_logs l2
                 WHERE l2.session_id=l.session_id AND l2.role='user'
                 ORDER BY l2.created_at ASC LIMIT 1) as first_question
         FROM ai_agent_logs l
         WHERE admin_id=?
         GROUP BY session_id
         ORDER BY last_at DESC
         LIMIT 20`
      ).bind(adminId).all()
      rows = (result.results || []) as any[]
    }
    return c.json({ logs: rows })
  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur', logs: [] }, 500)
  }
})
