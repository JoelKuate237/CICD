# ============================================================
# FICHIER : Dockerfile
# DESCRIPTION : Image Docker de l'application TP2 Blue/Green
#
# Ce Dockerfile construit une image autonome de l'application.
# Il est utilise par le job build-image du pipeline GitLab CI.
#
# NOTE : En local (etapes 3 a 9 du guide), on n'utilise PAS
# ce Dockerfile. On monte le code en volume dans l'image
# officielle node:18-alpine (voir docker-compose.blue.yml).
# Ce Dockerfile sert uniquement au build en pipeline CI.
# ============================================================

# Image de base : Node.js 18 sur Alpine Linux (leger)
FROM node:18-alpine

# Repertoire de travail dans le conteneur
WORKDIR /app

# Copie des fichiers de dependances AVANT le code
# Cela permet a Docker de reutiliser le cache si seules les dependances
# ne changent pas (optimisation classique du build Docker)
COPY package.json ./

# Installation des dependances en mode production
# --omit=dev evite d'installer les devDependencies (plus rapide, plus leger)
RUN npm install --omit=dev

# Copie du code source apres l'installation des dependances
COPY src ./src

# Port expose par l'application (documentation, pas d'ouverture effective)
EXPOSE 3000

# Commande de demarrage du conteneur
CMD ["node", "src/index.js"]
