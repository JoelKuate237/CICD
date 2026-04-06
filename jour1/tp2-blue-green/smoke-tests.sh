#!/bin/bash
# ============================================================
# FICHIER : smoke-tests.sh
# DESCRIPTION : Script de smoke tests pour le deploiement Blue/Green
#
# Les "smoke tests" sont des tests RAPIDES et BASIQUES qui
# verifient que l'application fonctionne correctement apres
# un deploiement. Le nom vient de l'electronique : quand on
# allume un appareil pour la premiere fois, on verifie qu'il
# n'y a pas de fumee (smoke).
#
# Ce script teste :
#   1. Le health check (l'application est-elle en vie ?)
#   2. L'API des utilisateurs (les donnees sont-elles accessibles ?)
#   3. Un utilisateur specifique (le routage fonctionne-t-il ?)
#   4. Le temps de reponse (l'application est-elle assez rapide ?)
#
# UTILISATION :
#   bash smoke-tests.sh [environnement]
#
# EXEMPLES :
#   bash smoke-tests.sh blue     # Teste l'environnement Blue
#   bash smoke-tests.sh green    # Teste l'environnement Green
#   bash smoke-tests.sh          # Teste via localhost (par defaut)
# ============================================================

# --- CONFIGURATION ---

# L'environnement a tester (argument 1 du script, ou "default")
# $1 = le premier argument passe au script
# ${1:-default} = si $1 est vide, utiliser "default"
ENVIRONMENT="${1:-default}"

# L'URL de base pour les tests
# On determine l'URL en fonction de l'environnement
# Le "case" est comme un "switch" en programmation
case "$ENVIRONMENT" in
  # Si l'environnement est "blue", on teste directement le conteneur Blue
  blue)
    BASE_URL="http://app-blue:3000"
    ;;
  # Si l'environnement est "green", on teste directement le conteneur Green
  green)
    BASE_URL="http://app-green:3000"
    ;;
  # Par defaut, on teste via Traefik (ce que voient les utilisateurs)
  *)
    BASE_URL="http://localhost"
    ;;
esac

# Le nombre maximum de tentatives pour chaque test
# Si un test echoue, on reessaie jusqu'a MAX_RETRIES fois
MAX_RETRIES=3

# Le delai entre les tentatives (en secondes)
RETRY_DELAY=5

# Le temps maximum de reponse acceptable (en secondes)
MAX_RESPONSE_TIME=5

# Compteurs pour le resume final
TESTS_PASSED=0      # Nombre de tests reussis
TESTS_FAILED=0      # Nombre de tests echoues
TESTS_TOTAL=0       # Nombre total de tests

# --- FONCTIONS UTILITAIRES ---

# Fonction pour afficher un message de succes
# Usage : print_success "message"
print_success() {
  # $1 = le premier argument de la fonction (le message)
  echo "[OK] $1"
  # On incremente le compteur de tests reussis
  TESTS_PASSED=$((TESTS_PASSED + 1))
  # On incremente le compteur total
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Fonction pour afficher un message d'echec
# Usage : print_failure "message"
print_failure() {
  echo "[ECHEC] $1"
  # On incremente le compteur de tests echoues
  TESTS_FAILED=$((TESTS_FAILED + 1))
  # On incremente le compteur total
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Fonction pour afficher un separateur visuel
print_separator() {
  echo "-------------------------------------------"
}

# Fonction pour faire une requete HTTP avec tentatives
# Usage : http_get "/chemin"
# Retourne : le corps de la reponse (ou vide si echec)
http_get() {
  # $1 = le chemin de l'URL (ex: /health)
  local path="$1"
  # URL complete = base + chemin
  local url="${BASE_URL}${path}"
  # Variable pour stocker la reponse
  local response=""
  # Compteur de tentatives
  local attempt=1

  # Boucle de tentatives
  # On essaie jusqu'a MAX_RETRIES fois
  while [ $attempt -le $MAX_RETRIES ]; do
    # curl : outil en ligne de commande pour faire des requetes HTTP
    # -s : mode silencieux (pas de barre de progression)
    # -f : echoue silencieusement sur les erreurs HTTP (4xx, 5xx)
    # -m : timeout maximum en secondes
    # -w "\n" : ajoute un saut de ligne a la fin
    response=$(curl -s -f -m $MAX_RESPONSE_TIME -w "\n" "$url" 2>/dev/null)

    # $? contient le code de retour de la derniere commande
    # 0 = succes, autre = echec
    if [ $? -eq 0 ]; then
      # La requete a reussi, on retourne la reponse
      echo "$response"
      return 0
    fi

    # La requete a echoue, on attend avant de reessayer
    echo "  Tentative $attempt/$MAX_RETRIES echouee, nouvel essai dans ${RETRY_DELAY}s..." >&2
    sleep $RETRY_DELAY
    # On incremente le compteur de tentatives
    attempt=$((attempt + 1))
  done

  # Toutes les tentatives ont echoue
  return 1
}

# --- DEBUT DES TESTS ---

echo "==========================================="
echo "  SMOKE TESTS"
echo "  Environnement : $ENVIRONMENT"
echo "  URL de base    : $BASE_URL"
echo "  Date           : $(date)"
echo "==========================================="
echo ""

# ============================================================
# TEST 1 : Health Check
# Verifie que l'application est en vie et repond
# C'est le test le plus basique et le plus important
# ============================================================
echo "TEST 1 : Health Check"
print_separator

# On appelle l'endpoint /health
response=$(http_get "/health")

# Si la requete a echoue (code de retour non zero)
if [ $? -ne 0 ]; then
  print_failure "Health check : l'application ne repond pas sur $BASE_URL/health"
else
  # On verifie que la reponse contient "ok"
  # grep -q : mode silencieux (retourne juste le code de retour)
  # -i : insensible a la casse (ok, OK, Ok sont tous acceptes)
  echo "$response" | grep -qi '"status".*"ok"'
  if [ $? -eq 0 ]; then
    print_success "Health check : status OK"
  else
    print_failure "Health check : la reponse ne contient pas status:ok"
    echo "  Reponse recue : $response"
  fi
fi

echo ""

# ============================================================
# TEST 2 : API Utilisateurs - Liste
# Verifie que l'endpoint /api/users retourne des donnees
# ============================================================
echo "TEST 2 : API Utilisateurs - Liste"
print_separator

# On appelle l'endpoint /api/users
response=$(http_get "/api/users")

if [ $? -ne 0 ]; then
  print_failure "API Users : l'endpoint /api/users ne repond pas"
else
  # On verifie que la reponse est un tableau JSON non vide
  # On compte le nombre d'elements dans le tableau avec grep
  # grep -c : compte le nombre de lignes qui correspondent
  user_count=$(echo "$response" | grep -o '"id"' | wc -l)

  if [ "$user_count" -ge 1 ]; then
    print_success "API Users : $user_count utilisateur(s) retourne(s)"
  else
    print_failure "API Users : aucun utilisateur retourne"
    echo "  Reponse recue : $response"
  fi
fi

echo ""

# ============================================================
# TEST 3 : API Utilisateur - Detail
# Verifie que l'endpoint /api/users/1 retourne un utilisateur
# ============================================================
echo "TEST 3 : API Utilisateur - Detail (id=1)"
print_separator

# On appelle l'endpoint /api/users/1
response=$(http_get "/api/users/1")

if [ $? -ne 0 ]; then
  print_failure "API User/1 : l'endpoint /api/users/1 ne repond pas"
else
  # On verifie que la reponse contient "fullName"
  echo "$response" | grep -q '"fullName"'
  if [ $? -eq 0 ]; then
    print_success "API User/1 : utilisateur trouve avec fullName"
  else
    print_failure "API User/1 : la reponse ne contient pas fullName"
    echo "  Reponse recue : $response"
  fi
fi

echo ""

# ============================================================
# TEST 4 : Erreur 404 - Utilisateur inexistant
# Verifie que l'API retourne correctement une erreur 404
# pour un utilisateur qui n'existe pas
# ============================================================
echo "TEST 4 : Erreur 404 - Utilisateur inexistant"
print_separator

# On appelle un endpoint qui ne devrait pas exister
# curl sans -f pour capturer les erreurs HTTP
response=$(curl -s -m $MAX_RESPONSE_TIME "${BASE_URL}/api/users/99999" 2>/dev/null)
http_code=$(curl -s -o /dev/null -w "%{http_code}" -m $MAX_RESPONSE_TIME "${BASE_URL}/api/users/99999" 2>/dev/null)

if [ "$http_code" = "404" ]; then
  print_success "Erreur 404 : code HTTP 404 retourne correctement"
else
  print_failure "Erreur 404 : code HTTP attendu 404, recu $http_code"
fi

echo ""

# ============================================================
# TEST 5 : Temps de reponse
# Verifie que l'application repond assez rapidement
# Un temps de reponse trop long peut indiquer un probleme
# ============================================================
echo "TEST 5 : Temps de reponse"
print_separator

# curl -w "%{time_total}" : affiche le temps total de la requete
# -o /dev/null : jette le corps de la reponse (on veut juste le temps)
response_time=$(curl -s -o /dev/null -w "%{time_total}" -m $MAX_RESPONSE_TIME "${BASE_URL}/health" 2>/dev/null)

if [ $? -ne 0 ]; then
  print_failure "Temps de reponse : impossible de mesurer (application injoignable)"
else
  # On compare le temps de reponse avec le maximum acceptable
  # bc est une calculatrice en ligne de commande
  # On verifie si response_time < MAX_RESPONSE_TIME
  is_fast=$(echo "$response_time < $MAX_RESPONSE_TIME" | bc -l 2>/dev/null || echo "1")

  if [ "$is_fast" = "1" ]; then
    print_success "Temps de reponse : ${response_time}s (< ${MAX_RESPONSE_TIME}s)"
  else
    print_failure "Temps de reponse : ${response_time}s (> ${MAX_RESPONSE_TIME}s, trop lent !)"
  fi
fi

echo ""

# --- RESUME DES TESTS ---
echo "==========================================="
echo "  RESUME DES SMOKE TESTS"
echo "==========================================="
echo "  Total    : $TESTS_TOTAL tests"
echo "  Reussis  : $TESTS_PASSED tests"
echo "  Echoues  : $TESTS_FAILED tests"
echo "==========================================="
echo ""

# --- CODE DE RETOUR ---
# Si au moins un test a echoue, le script retourne 1 (echec)
# Sinon, il retourne 0 (succes)
# C'est important pour le pipeline CI/CD :
#   - exit 0 = le job GitLab CI passe (vert)
#   - exit 1 = le job GitLab CI echoue (rouge)
if [ $TESTS_FAILED -gt 0 ]; then
  echo "RESULTAT : ECHEC ($TESTS_FAILED test(s) echoue(s))"
  echo "Le deploiement NE DOIT PAS continuer."
  exit 1
else
  echo "RESULTAT : SUCCES (tous les tests sont passes)"
  echo "Le deploiement peut continuer en securite."
  exit 0
fi
