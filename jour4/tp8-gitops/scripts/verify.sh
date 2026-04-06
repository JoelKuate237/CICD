#!/bin/bash
# ===========================================
# Script de verification de deploiement
# ===========================================
# Usage: ./scripts/verify.sh
# Ce script verifie que le deploiement s'est bien passe
# en lisant et validant le manifeste de deploiement.

MANIFEST="deployment-manifest.json"
EXIT_CODE=0

echo "========================================="
echo "  VERIFICATION DU DEPLOIEMENT"
echo "========================================="

# --- Etape 1: Verifier que le manifeste existe ---
echo ""
echo "[1/4] Verification du manifeste de deploiement..."

if [ ! -f "$MANIFEST" ]; then
  echo "  ERREUR: Le manifeste $MANIFEST n'existe pas!"
  echo "  Le deploiement n'a peut-etre pas ete effectue."
  echo "  Verifiez que le job de deploiement a bien cree le manifeste."
  exit 1
fi

echo "  OK - Manifeste trouve: $MANIFEST"

# --- Etape 2: Afficher le contenu du manifeste ---
echo ""
echo "[2/4] Lecture du manifeste de deploiement..."
echo "  -------------------------------------------"
cat "$MANIFEST"
echo ""
echo "  -------------------------------------------"

# --- Etape 3: Verifier les champs requis ---
echo ""
echo "[3/4] Verification des champs requis..."

REQUIRED_FIELDS=("version" "commit_sha" "timestamp" "environment" "deployer")
ALL_FIELDS_OK=true

for field in "${REQUIRED_FIELDS[@]}"; do
  # Verifier que le champ existe et n'est pas vide
  VALUE=$(grep -o "\"$field\": \"[^\"]*\"" "$MANIFEST" | head -1 | cut -d'"' -f4)

  if [ -n "$VALUE" ]; then
    echo "  OK - $field = $VALUE"
  else
    echo "  ERREUR - Champ '$field' manquant ou vide!"
    ALL_FIELDS_OK=false
    EXIT_CODE=1
  fi
done

# Verifier les champs de configuration
echo ""
echo "  Verification de la configuration..."
CONFIG_FIELDS=("app_port" "node_env" "log_level" "api_url")

for field in "${CONFIG_FIELDS[@]}"; do
  VALUE=$(grep -o "\"$field\": \"[^\"]*\"" "$MANIFEST" | head -1 | cut -d'"' -f4)

  if [ -n "$VALUE" ]; then
    echo "  OK - config.$field = $VALUE"
  else
    echo "  ATTENTION - config.$field manquant ou vide"
  fi
done

# --- Etape 4: Simulation du health check ---
echo ""
echo "[4/4] Simulation du health check..."

# Extraire les informations du manifeste
ENVIRONMENT=$(grep -o '"environment": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
VERSION=$(grep -o '"version": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
COMMIT=$(grep -o '"short_sha": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
DEPLOYER=$(grep -o '"deployer": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
TIMESTAMP=$(grep -o '"timestamp": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
APP_PORT=$(grep -o '"app_port": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)

sleep 1

echo "  Simulation de requete vers http://localhost:${APP_PORT:-3000}/health ..."
sleep 1
echo "  Reponse simulee: { \"status\": \"healthy\", \"version\": \"$VERSION\" }"
echo ""
echo "  Resume du deploiement:"
echo "  - Environnement : $ENVIRONMENT"
echo "  - Version       : $VERSION"
echo "  - Commit        : $COMMIT"
echo "  - Deploye par   : $DEPLOYER"
echo "  - Date          : $TIMESTAMP"
echo "  - Port          : $APP_PORT"
echo "  - Statut        : HEALTHY"

# --- Resultat final ---
echo ""
echo "========================================="
if [ "$ALL_FIELDS_OK" = true ]; then
  echo "  VERIFICATION REUSSIE"
  echo "  Le deploiement est valide et complet."
  echo "  Tous les champs requis sont presents."
else
  echo "  VERIFICATION ECHOUEE"
  echo "  Des champs requis sont manquants."
  echo "  Verifiez le script de deploiement."
fi
echo "========================================="

exit $EXIT_CODE
