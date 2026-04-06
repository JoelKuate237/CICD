# TP Bonus — CI/CD avec GitHub Actions (version debutant)

## Objectifs

A la fin de ce TP, vous saurez :

1. Creer un **repository GitHub** et y pousser du code
2. Ecrire un **workflow GitHub Actions** (equivalent du `.gitlab-ci.yml`)
3. Utiliser le **cache** pour accelerer les pipelines
4. Generer et telecharger des **artifacts**
5. Tester sur **plusieurs versions de Node.js** avec une matrice
6. Configurer un **deploiement staging** (automatique) et **production** (manuel)
7. Utiliser les **secrets GitHub** (equivalent des variables CI/CD de GitLab)
8. Comprendre les **differences** entre GitLab CI et GitHub Actions

---

## Prerequis

- Avoir fait les TP1 a TP4 (ou au moins les avoir lus)
- Un **compte GitHub** (gratuit sur https://github.com)
- Git Bash installe sur votre machine
- Node.js 18+ installe (pour tester en local)

---

## Etape 1 — GitLab CI vs GitHub Actions : les differences

Avant de commencer, comprenons les equivalences :

| Concept | GitLab CI | GitHub Actions |
|---|---|---|
| **Fichier de config** | `.gitlab-ci.yml` (a la racine) | `.github/workflows/*.yml` (dans un dossier) |
| **Declencheur** | `workflow: rules:` | `on: push/pull_request` |
| **Etape** | `stages` | Pas de stages, on utilise `needs` |
| **Job** | Un bloc YAML nomme | Un bloc dans `jobs:` |
| **Image Docker** | `image: node:18-alpine` | `runs-on: ubuntu-latest` + `setup-node` |
| **Cache** | `cache: key: / paths:` | `actions/cache@v4` |
| **Artifacts** | `artifacts: paths:` | `actions/upload-artifact@v4` |
| **Variables** | `variables:` | `env:` |
| **Secrets** | Settings > CI/CD > Variables (masked) | Settings > Secrets > Actions |
| **Deploy manuel** | `when: manual` | `environment:` avec "Required reviewers" |
| **Runner** | GitLab Runner (shell/docker) | GitHub-hosted runners (ubuntu, windows, macos) |
| **Clone du code** | Automatique | **Manuel** avec `actions/checkout@v4` |

> **Difference importante** : sur GitLab, le code est clone automatiquement dans chaque job. Sur GitHub Actions, vous **devez** ajouter l'etape `actions/checkout@v4` dans chaque job. Si vous l'oubliez, le job n'aura pas acces a votre code !

> **Autre difference** : GitLab CI utilise des **stages** (install → test → build → deploy) pour definir l'ordre. GitHub Actions utilise **needs** pour definir les dependances entre jobs. C'est plus flexible mais demande de bien penser les dependances.

---

## Etape 2 — Creer le repository sur GitHub

1. Allez sur https://github.com
2. Cliquez sur le **+** en haut a droite > **New repository**
3. **Repository name** : `bonus-github-actions`
4. **IMPORTANT** : **Ne cochez PAS** *"Add a README file"*
5. Cliquez sur **Create repository**
6. Gardez l'URL HTTPS de cote (ex: `https://github.com/votre-user/bonus-github-actions.git`)

> **Pourquoi ne pas cocher le README ?** Meme raison que sur GitLab : si le repo distant a un fichier et que votre repo local n'a pas le meme historique, le premier push sera refuse. On l'ajoutera apres.

---

## Etape 3 — Preparer le code en local

Le code est fourni dans le dossier `bonus github action/`. Copiez-le dans un dossier de travail :

```bash
# Aller sur le Bureau
cd ~/Desktop/"CI CD"

# Creer un dossier de travail
mkdir bonus-work
cd bonus-work

# Copier les fichiers du projet
cp -r "../bonus github action/src" ./
cp -r "../bonus github action/tests" ./
cp -r "../bonus github action/scripts" ./
cp "../bonus github action/package.json" ./
cp "../bonus github action/.gitignore" ./

# Copier les workflows GitHub Actions
mkdir -p .github/workflows
cp "../bonus github action/.github/workflows/ci.yml" .github/workflows/
cp "../bonus github action/.github/workflows/test-matrix.yml" .github/workflows/
cp "../bonus github action/.github/workflows/deploy.yml" .github/workflows/
```

### Verifier que tout est la :

```bash
ls -la
ls -la .github/workflows/
```

Vous devez voir :
- A la racine : `.gitignore`, `package.json`, `src/`, `tests/`, `scripts/`, `.github/`
- Dans `.github/workflows/` : `ci.yml`, `test-matrix.yml`, `deploy.yml`

### Tester en local :

```bash
npm install
npm test
```

Vous devez voir : `Tests: 17 passed, 17 total`. Puis :

```bash
rm -rf node_modules
```

> **Pourquoi supprimer node_modules ?** Parce que le `.gitignore` les ignore, mais c'est une bonne habitude de verifier qu'on ne les pousse pas par erreur. node_modules peut contenir 10 000+ fichiers !

---

## Etape 4 — Comprendre le Workflow 1 : CI Pipeline

Ouvrez le fichier `.github/workflows/ci.yml` dans VS Code :

```bash
code .github/workflows/ci.yml
```

### Structure d'un workflow GitHub Actions :

```yaml
name: CI Pipeline           # Nom affiche dans l'interface GitHub

on:                          # QUAND le workflow se declenche
  push:
    branches: [main]         # A chaque push sur main
  pull_request:
    branches: [main]         # A chaque PR vers main

env:                         # Variables globales
  NODE_VERSION: "18"

jobs:                        # Les jobs a executer
  install:                   # Nom du job
    runs-on: ubuntu-latest   # Sur quel type de machine
    steps:                   # Les etapes du job
      - name: Etape 1        # Nom de l'etape
        run: echo "Hello"    # Commande a executer
```

### Les 4 jobs du workflow CI :

| Job | Depend de | Ce qu'il fait |
|---|---|---|
| `install` | - | Installe les dependances et cree le cache |
| `test-unit` | `install` | Lance les tests unitaires |
| `test-integration` | `install` | Lance les tests d'integration |
| `build` | `test-unit` + `test-integration` | Construit l'application |

> **Equivalent GitLab :**
> - `install` = stage `install` avec `cache: policy: push`
> - `test-unit` + `test-integration` = stage `test` avec `cache: policy: pull`
> - `build` = stage `build` avec artifacts `dist/`

### Focus : les Actions (steps reutilisables)

GitHub Actions a un concept unique : les **Actions**. Ce sont des etapes reutilisables creees par la communaute.

```yaml
# ACTION : Cloner le code (obligatoire sur GitHub !)
- uses: actions/checkout@v4

# ACTION : Installer Node.js avec cache
- uses: actions/setup-node@v4
  with:
    node-version: "18"
    cache: "npm"

# ACTION : Uploader un artifact
- uses: actions/upload-artifact@v4
  with:
    name: mon-artifact
    path: dist/
```

> **C'est comme un plugin** : au lieu d'ecrire 10 lignes de commandes bash, vous utilisez une Action en une ligne. Le `@v4` est la version de l'Action (comme une dependance npm).

### Focus : le cache dans GitHub Actions

```yaml
# SAUVEGARDER le cache (equivalent GitLab : policy: push)
- uses: actions/cache/save@v4
  with:
    path: node_modules
    key: node-modules-${{ hashFiles('package-lock.json') }}

# RESTAURER le cache (equivalent GitLab : policy: pull)
- uses: actions/cache/restore@v4
  with:
    path: node_modules
    key: node-modules-${{ hashFiles('package-lock.json') }}
```

> **`${{ hashFiles('package-lock.json') }}`** calcule un hash du fichier. Si le `package-lock.json` ne change pas, le hash reste le meme et le cache est reutilise. C'est exactement comme `key: files: [package-lock.json]` dans GitLab CI.

### Focus : les artifacts

```yaml
# UPLOADER un artifact (equivalent GitLab : artifacts: paths:)
- uses: actions/upload-artifact@v4
  with:
    name: build-${{ github.sha }}    # Nom unique avec le hash du commit
    path: dist/                       # Dossier a sauvegarder
    retention-days: 7                 # Duree de conservation (7 jours)
```

> **Difference avec GitLab** : sur GitLab, les artifacts sont integres dans le pipeline. Sur GitHub, on utilise l'Action `upload-artifact` pour les sauvegarder et `download-artifact` pour les recuperer.

---

## Etape 5 — Comprendre le Workflow 2 : Matrice de tests

Ouvrez le fichier `.github/workflows/test-matrix.yml` :

```bash
code .github/workflows/test-matrix.yml
```

### La strategie matrice

```yaml
strategy:
  matrix:
    node-version: [18, 20]
```

> **Que fait cette matrice ?** GitHub Actions cree **automatiquement** un job pour chaque valeur de la matrice. Ici, il cree :
> - Un job avec `node-version: 18`
> - Un job avec `node-version: 20`
>
> Les deux jobs tournent **en parallele**.
>
> **Comparaison avec GitLab** : dans le TP3, on devait **dupliquer** le job (`test-node-18` et `test-node-20`). Avec la matrice GitHub Actions, un seul job suffit et il est automatiquement duplique. C'est plus elegant !

### Le job runner-info

Ce job affiche les variables predefinies de GitHub Actions :

| Variable GitHub Actions | Equivalent GitLab |
|---|---|
| `github.sha` | `$CI_COMMIT_SHA` |
| `github.ref_name` | `$CI_COMMIT_BRANCH` |
| `github.run_id` | `$CI_PIPELINE_ID` |
| `github.repository` | `$CI_PROJECT_PATH` |
| `runner.os` | `$CI_RUNNER_DESCRIPTION` |
| `github.actor` | `$GITLAB_USER_LOGIN` |
| `github.event_name` | `$CI_PIPELINE_SOURCE` |

---

## Etape 6 — Comprendre le Workflow 3 : Deploiement

Ouvrez le fichier `.github/workflows/deploy.yml` :

```bash
code .github/workflows/deploy.yml
```

### Declenchement conditionnel

```yaml
on:
  workflow_run:
    workflows: ["CI Pipeline"]
    branches: [main]
    types: [completed]
```

> **Que fait `workflow_run` ?** Ce workflow ne se declenche que quand le workflow "CI Pipeline" **termine** sur la branche `main`. C'est l'equivalent d'un stage `deploy` qui vient apres le stage `build` dans GitLab.

### Les environments GitHub

```yaml
environment:
  name: staging
  url: https://staging.example.com
```

> **Les environments** fonctionnent comme dans GitLab. Ils sont visibles dans l'onglet **Environments** de votre repository. On peut ajouter des **regles de protection** :
> - **Required reviewers** : quelqu'un doit approuver avant le deploiement (equivalent de `when: manual` dans GitLab)
> - **Wait timer** : attendre X minutes avant le deploiement
> - **Branch restrictions** : n'autoriser que certaines branches

### Deploiement manuel (production)

Pour rendre le deploiement production **manuel** (comme `when: manual` dans GitLab) :

1. Allez dans votre repo GitHub > **Settings** > **Environments**
2. Cliquez sur **production** (cree automatiquement au premier run)
3. Cochez **Required reviewers**
4. Ajoutez votre nom d'utilisateur
5. Cliquez **Save protection rules**

Desormais, quand le workflow arrive au job `deploy-production`, il **attendra votre approbation** dans l'interface GitHub.

---

## Etape 7 — Pousser vers GitHub et observer

```bash
# Initialiser Git
git init -b main

# Ajouter tous les fichiers
git add .

# Verifier (pas de node_modules !)
git status

# Commiter
git commit -m "init: bonus GitHub Actions CI/CD"

# Connecter au repository GitHub (REMPLACEZ L'URL)
git remote add origin https://github.com/votre-user/bonus-github-actions.git

# Pousser
git push -u origin main
```

> **Des que vous poussez**, GitHub detecte automatiquement les fichiers dans `.github/workflows/` et lance les workflows. Pas besoin de configuration supplementaire !

---

## Etape 8 — Observer les workflows dans GitHub

### 8.1 — Voir les workflows

1. Allez sur votre repository GitHub
2. Cliquez sur l'onglet **Actions** (en haut)
3. Vous verrez les workflows en cours d'execution :
   - **CI Pipeline** : le workflow principal (install → test → build)
   - **Tests Multi-Versions** : les tests sur Node 18 et Node 20
4. Cliquez sur un workflow pour voir le detail

### 8.2 — Voir le detail d'un job

5. Cliquez sur un job (ex: `Tests unitaires`)
6. Vous voyez chaque **step** avec ses logs (comme dans GitLab)
7. Les steps verts = reussis, les steps rouges = echoues

### 8.3 — Comparer les versions de Node

8. Dans le workflow **Tests Multi-Versions**, cliquez sur `Tests Node 18`
9. Cherchez la ligne `Node.js version`
10. Faites de meme avec `Tests Node 20`
11. Les versions sont differentes (comme dans le TP3 avec l'executor Docker)

### 8.4 — Telecharger les artifacts

12. Sur la page du workflow **CI Pipeline**, scrollez en bas
13. Vous verrez la section **Artifacts** avec `build-<hash>`
14. Cliquez dessus pour telecharger le zip contenant `dist/`

### 8.5 — Voir les informations du Runner

15. Dans le workflow **Tests Multi-Versions**, cliquez sur `Informations Runner`
16. Vous verrez toutes les variables GitHub Actions (commit, branche, runner OS, etc.)

---

## Etape 9 — Observer le cache en action

### Premier push (cache froid)

Dans le job `install` du workflow CI Pipeline, vous verrez :

```
Cache not found for input keys: node-modules-abc123
```

C'est normal : le cache n'existe pas encore.

### Deuxieme push (cache chaud)

Faites une petite modification et poussez :

```bash
echo "// test cache" >> src/utils.js
git add .
git commit -m "test: verifier le cache GitHub Actions"
git push
```

Dans le job `test-unit`, vous verrez :

```
Cache restored successfully
```

Le cache `node_modules` est reutilise et le job est plus rapide !

---

## Etape 10 — Creer un secret GitHub (equivalent des variables GitLab)

### 10.1 — Creer le secret

1. Allez dans votre repo > **Settings** > **Secrets and variables** > **Actions**
2. Cliquez sur **New repository secret**
3. **Name** : `DEPLOY_TOKEN`
4. **Secret** : `mon-token-secret-123`
5. Cliquez **Add secret**

> **Difference avec GitLab** : sur GitLab, les variables peuvent etre "masked" (masquees dans les logs) ou "protected" (disponibles uniquement sur les branches protegees). Sur GitHub, **tous les secrets sont automatiquement masques** dans les logs. Si vous essayez d'afficher un secret avec `echo`, vous verrez `***` a la place de la valeur.

### 10.2 — Utiliser le secret dans un workflow

Le secret est utilise dans le workflow `deploy.yml` :

```yaml
- name: Utiliser un secret
  run: |
    echo "Le secret DEPLOY_TOKEN existe : ${{ secrets.DEPLOY_TOKEN != '' }}"
```

> **REGLE ABSOLUE** (meme que GitLab) : ne JAMAIS mettre de secrets dans le code ou les fichiers YAML. Utilisez toujours les Secrets GitHub.

---

## Etape 11 — Configurer le deploiement manuel (optionnel)

Pour que le deploiement en production necessite une approbation :

1. Allez dans **Settings** > **Environments**
2. Si l'environment `production` n'existe pas, cliquez **New environment** > `production`
3. Cochez **Required reviewers**
4. Ajoutez votre nom d'utilisateur GitHub
5. Cliquez **Save protection rules**

Desormais, le job `deploy-production` attendra votre approbation. Vous recevrez une notification et pourrez approuver depuis l'onglet **Actions**.

---

## Recapitulatif

| Concept | GitLab CI | GitHub Actions |
|---|---|---|
| **Fichier** | `.gitlab-ci.yml` | `.github/workflows/*.yml` |
| **Clone du code** | Automatique | `actions/checkout@v4` (obligatoire) |
| **Image Docker** | `image: node:18` | `runs-on: ubuntu-latest` + `setup-node` |
| **Ordre des jobs** | `stages` | `needs` |
| **Cache** | `cache: key: / paths:` | `actions/cache@v4` |
| **Artifacts** | `artifacts: paths:` | `actions/upload-artifact@v4` |
| **Matrice de tests** | Dupliquer les jobs | `strategy: matrix:` |
| **Variables** | `variables:` | `env:` |
| **Secrets** | Settings > CI/CD > Variables (masked) | Settings > Secrets > Actions |
| **Deploy manuel** | `when: manual` | Environment + Required reviewers |
| **Pipelines multiples** | 1 seul fichier `.gitlab-ci.yml` | Plusieurs fichiers dans `workflows/` |
| **Minutes gratuites** | 400 min/mois | 2000 min/mois (plus genereux !) |

---

## Erreurs courantes et solutions

| Erreur | Cause | Solution |
|---|---|---|
| Workflow ne se declenche pas | Fichier pas dans `.github/workflows/` | Verifier le chemin exact (le `.` de `.github` est important) |
| `actions/checkout@v4` echoue | Permissions du token | Verifier Settings > Actions > General > Workflow permissions |
| Cache jamais restaure | Cle differente entre save et restore | Utiliser exactement la meme expression `hashFiles(...)` |
| Secret affiche `***` | C'est normal ! | GitHub masque automatiquement les secrets dans les logs |
| Job `deploy` ne se declenche pas | `workflow_run` mal configure | Verifier que le nom du workflow reference est exact (sensible a la casse) |
| `Permission denied` au push | Authentification HTTPS | Utiliser un Personal Access Token ou configurer SSH |

---

## Pour aller plus loin

- **GitHub Actions Marketplace** : https://github.com/marketplace?type=actions (des milliers d'Actions pretes a l'emploi)
- **Self-hosted runners** : installer votre propre runner (comme les specific runners GitLab)
- **Docker dans GitHub Actions** : construire et pousser des images Docker vers GitHub Container Registry
- **Reusable workflows** : creer des workflows reutilisables (comme les `include` GitLab)
- **Branch protection rules** : proteger la branche `main` et exiger des checks verts avant le merge

---

**Fin du TP Bonus. Vous savez maintenant utiliser les deux plateformes CI/CD les plus populaires : GitLab CI et GitHub Actions !**
