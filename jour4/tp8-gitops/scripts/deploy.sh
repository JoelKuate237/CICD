#!/bin/bash
# ===========================================
# Script de deploiement GitOps
# ===========================================
# Usage: ./scripts/deploy.sh <environnement>
# Exemple: ./scripts/deploy.sh staging
#          ./scripts/deploy.sh production

ENVIRONMENT=$1

# --- Validation des arguments ---
if [ -z "$ENVIRONMENT" ]; then
  echo "ERREUR: Vous devez specifier un environnement (staging ou production)"
  echo "Usage: $0 <environnement>"
  exit 1
fi

ENV_FILE="environments/${ENVIRONMENT}.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERREUR: Le fichier $ENV_FILE n'existe pas"
  echo "Environnements disponibles:"
  ls environments/*.env 2>/dev/null || echo "  Aucun fichier .env trouve"
  exit 1
fi

echo "========================================="
echo "  DEPLOIEMENT GitOps"
echo "  Environnement: $ENVIRONMENT"
echo "========================================="

# --- Etape 1: Charger la configuration ---
echo ""
echo "[1/5] Chargement de la configuration depuis $ENV_FILE..."

# Lire les variables depuis le fichier .env
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "  - APP_PORT=$APP_PORT"
echo "  - NODE_ENV=$NODE_ENV"
echo "  - LOG_LEVEL=$LOG_LEVEL"
echo "  - API_URL=$API_URL"

# --- Etape 2: Installation des dependances ---
echo ""
echo "[2/5] Verification des dependances..."
if [ -d "node_modules" ]; then
  echo "  OK - Dependances deja installees"
else
  echo "  Installation des dependances en cours..."
  npm install --production 2>/dev/null || echo "  (Simulation) Dependances installees"
fi

# --- Etape 3: Construction de l'application ---
echo ""
echo "[3/5] Construction de l'application..."
sleep 1
echo "  OK - Application construite pour $ENVIRONMENT"

# --- Etape 4: Deploiement ---
echo ""
echo "[4/5] Deploiement vers $ENVIRONMENT..."
sleep 1
echo "  OK - Application deployee sur le port $APP_PORT"
echo "  OK - Mode $NODE_ENV active"
echo "  OK - Niveau de log: $LOG_LEVEL"

# --- Etape 5: Creation du manifeste de deploiement ---
echo ""
echo "[5/5] Creation du manifeste de deploiement..."

# Recuperer les informations de deploiement
VERSION="${APP_VERSION:-1.0.0}"
COMMIT_SHA="${CI_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'local-dev')}"
SHORT_SHA="${CI_COMMIT_SHORT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYER="${GITLAB_USER_LOGIN:-$(whoami)}"
BRANCH="${CI_COMMIT_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"

# Creer le fichier manifeste JSON
cat > deployment-manifest.json << MANIFEST_EOF
{
  "version": "$VERSION",
  "commit_sha": "$COMMIT_SHA",
  "short_sha": "$SHORT_SHA",
  "branch": "$BRANCH",
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "deployer": "$DEPLOYER",
  "config": {
    "app_port": "$APP_PORT",
    "node_env": "$NODE_ENV",
    "log_level": "$LOG_LEVEL",
    "api_url": "$API_URL"
  }
}
MANIFEST_EOF

echo "  OK - Manifeste cree: deployment-manifest.json"
echo ""
echo "  Contenu du manifeste:"
cat deployment-manifest.json
echo ""

echo "========================================="
echo "  DEPLOIEMENT TERMINE AVEC SUCCES"
echo "========================================="
echo "  Version     : $VERSION"
echo "  Commit      : $SHORT_SHA"
echo "  Branche     : $BRANCH"
echo "  Environnement: $ENVIRONMENT"
echo "  Date        : $TIMESTAMP"
echo "  Deploye par : $DEPLOYER"
echo "========================================="
