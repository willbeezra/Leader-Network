#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   LW → D1 IMPORT PIPELINE                                   ║
# ║   Usage: ./lw_import_pipeline.sh <lw_export.json>           ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Ce script :
# 1. Valide le JSON exporté par window._lwExportForD1()
# 2. Génère le SQL de mise à jour
# 3. L'importe en D1 LOCAL (test)
# 4. Demande confirmation pour la PRODUCTION
# 5. Importe en production si confirmé
# 6. Lance un rebuild + redeploy Cloudflare Pages

set -e

WEBAPP_DIR="/home/user/webapp"
SCRIPT_DIR="$WEBAPP_DIR/scripts"
JSON_FILE="${1:-}"

# ── Couleurs ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  LW → D1 IMPORT PIPELINE${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Vérification du fichier JSON ────────────────────────────────
if [ -z "$JSON_FILE" ]; then
  err "Usage: $0 <lw_export.json>\n  Exemple: $0 /tmp/lw_export.json"
fi

if [ ! -f "$JSON_FILE" ]; then
  err "Fichier non trouvé: $JSON_FILE"
fi

info "Fichier JSON: $JSON_FILE ($(wc -c < "$JSON_FILE") octets)"

# Valider le JSON
python3 -c "
import json, sys
with open('$JSON_FILE') as f:
    d = json.load(f)
courses = d.get('courses', [])
total_lessons = sum(
    len(l.get('lessons',[]))
    for c in courses
    for s in c.get('sections',[])
    for l in [s]
)
print(f'Cours: {len(courses)}')
print(f'Leçons: {d.get(\"totalLessons\", total_lessons)}')
" || err "JSON invalide"

# ── Étape 1 : Générer le SQL ────────────────────────────────────
echo ""
info "Génération du SQL..."
SQL_FILE="/tmp/lw_real_structure.sql"
python3 "$SCRIPT_DIR/lw_d1_importer.py" "$JSON_FILE" 2>&1

if [ ! -f "$SQL_FILE" ]; then
  err "SQL non généré. Vérifier les erreurs ci-dessus."
fi

SQL_SIZE=$(wc -c < "$SQL_FILE")
ok "SQL généré: $SQL_FILE ($SQL_SIZE octets)"

# ── Étape 2 : Import LOCAL ──────────────────────────────────────
echo ""
info "Import en D1 LOCAL (test)..."
cd "$WEBAPP_DIR"

npx wrangler d1 execute leader-network-production \
  --local \
  --file="$SQL_FILE" 2>&1 | tail -20

# Vérifier les counts locaux
echo ""
info "Vérification D1 LOCAL:"
npx wrangler d1 execute leader-network-production --local \
  --command="SELECT 'categories' as t, COUNT(*) as n FROM campus_categories
  UNION ALL SELECT 'courses', COUNT(*) FROM campus_courses
  UNION ALL SELECT 'modules', COUNT(*) FROM campus_modules
  UNION ALL SELECT 'lessons', COUNT(*) FROM campus_lessons
  UNION ALL SELECT 'lessons_with_video', COUNT(*) FROM campus_lessons WHERE video_url != ''
  UNION ALL SELECT 'total_duration_min', COALESCE(SUM(total_duration_minutes),0) FROM campus_courses;" \
  2>/dev/null | grep -E '"[a-z_]+"' | python3 -c "
import sys, json
data = json.load(sys.stdin)
for result in data:
    if isinstance(result, dict) and 'results' in result:
        for row in result['results']:
            print(f'  {row.get(\"t\",\"\"):30s} : {row.get(\"n\",\"?\")}')" 2>/dev/null || \
  npx wrangler d1 execute leader-network-production --local \
    --command="SELECT COUNT(*) FROM campus_lessons;" 2>/dev/null

ok "Import local réussi"

# ── Étape 3 : Confirmation PRODUCTION ───────────────────────────
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  IMPORT EN PRODUCTION${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ATTENTION: Cela va modifier la DB de production!${NC}"
echo ""
read -p "  Importer en production? (oui/non) : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  warn "Import production annulé."
  info "Pour importer manuellement:"
  info "  cd $WEBAPP_DIR && npx wrangler d1 execute leader-network-production --file=$SQL_FILE"
  exit 0
fi

# ── Étape 4 : Import PRODUCTION ─────────────────────────────────
echo ""
info "Import en D1 PRODUCTION..."
npx wrangler d1 execute leader-network-production \
  --file="$SQL_FILE" 2>&1 | tail -20

ok "Import production réussi"

# Vérifier les counts production
echo ""
info "Vérification D1 PRODUCTION:"
npx wrangler d1 execute leader-network-production \
  --command="SELECT COUNT(*) as modules FROM campus_modules;
  SELECT COUNT(*) as lessons FROM campus_lessons;
  SELECT COUNT(*) as lessons_with_video FROM campus_lessons WHERE video_url != '';" \
  2>/dev/null | tail -20

# ── Étape 5 : Rebuild + Redeploy ────────────────────────────────
echo ""
read -p "  Rebuild + redeploy Cloudflare Pages? (oui/non) : " REBUILD

if [ "$REBUILD" = "oui" ]; then
  info "Build en cours..."
  npm run build 2>&1 | tail -5
  ok "Build terminé"
  
  info "Déploiement..."
  npx wrangler pages deploy dist --project-name willbeleader-git 2>&1 | tail -10
  ok "Déploiement terminé"
  
  # Git commit
  git add -A
  git commit -m "feat: Import vraie structure LearnWorlds $(date +%Y-%m-%d)" 2>/dev/null || true
  ok "Git commit"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ PIPELINE TERMINÉ AVEC SUCCÈS${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
