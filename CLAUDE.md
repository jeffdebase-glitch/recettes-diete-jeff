# Recettes Diète Jeff — Instructions Claude Code

Ce repo contient le site statique "On mange quoi aujourd'hui ?" hébergé sur GitHub Pages.
Les recettes sont stockées dans Google Sheets et lues via CSV public.

---

## Quand ajouter ou modifier une recette

Dès que je mentionne une nouvelle recette, une modification de macros, une correction d'ingrédients, ou que je joins une photo — lancer le workflow ci-dessous sans attendre que je dise "utilise le workflow".

---

## Informations fixes

- **Repo** : `jeffdebase-glitch/recettes-diete-jeff` (branche `main`)
- **Sheet ID** : `1qMnsJ7g90pZ8C6FKQbNNwYXctsA7wDh14RpfXtuS6eQ`
- **Dossier images repo** : `images/`
- **URL du site** : `https://jeffdebase-glitch.github.io/recettes-diete-jeff/`

---

## Format du Google Sheet

Colonnes dans l'ordre exact :

| Col | Nom | Valeurs |
|-----|-----|---------|
| A | `id` | slug unique (lowercase, sans accents, espaces→tirets) |
| B | `title` | Titre de la recette |
| C | `category` | `Glaces Creami` / `Recettes salées` / `Desserts` |
| D | `section` | `Mes Creami` / `Recettes validées` / `Plaisirs contrôlés` |
| E | `status` | `Compatible sèche` / `Validée Jeff` / `Plaisir contrôlé` / `À tester` |
| F | `kcal` | Entier ou vide |
| G | `protein` | Grammes ou vide |
| H | `carbs` | Grammes ou vide |
| I | `fat` | Grammes ou vide |
| J | `image` | `images/<id>.jpg` (ou `.png` selon l'extension réelle) |
| K | `ingredients` | Séparés par ` || ` |
| L | `steps` | Séparés par ` || ` |
| M | `note` | Texte libre |

**Règles de déduction si non précisé :**
- Catégorie : whey/glace/Creami → `Glaces Creami` ; viande/légumes → `Recettes salées` ; sucré hors glace → `Desserts`
- Section : Creami → `Mes Creami` ; quotidien/sèche → `Recettes validées` ; gourmand/plaisir → `Plaisirs contrôlés`
- Status : sèche → `Compatible sèche` ; plaisir → `Plaisir contrôlé` ; validée → `Validée Jeff` ; nouveau → `À tester`
- Macros manquantes : laisser vide, ne pas bloquer

---

## Workflow à suivre

### 1. Générer l'id

```
id = titre en lowercase, accents supprimés, espaces → tirets
ex: "Creami fraise cassis" → creami-fraise-cassis
```

### 2. Lire le Sheet pour vérifier l'unicité

```bash
curl -s "https://docs.google.com/spreadsheets/d/1qMnsJ7g90pZ8C6FKQbNNwYXctsA7wDh14RpfXtuS6eQ/export?format=csv&gid=983750731" \
  | head -20
```

Si l'id existe déjà → ajouter suffixe `-2`, `-3`, etc.
Pour une modification, noter le numéro de ligne existante.

### 3. Écrire dans le Sheet via API Google Sheets

Demander le token OAuth Google si pas encore fourni dans la session.
Utiliser l'API Sheets v4 :

**Ajout (nouvelle recette) — append :**
```bash
curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/1qMnsJ7g90pZ8C6FKQbNNwYXctsA7wDh14RpfXtuS6eQ/values/A1:M1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS" \
  -H "Authorization: Bearer <GOOGLE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "values": [[
      "<id>","<title>","<category>","<section>","<status>",
      <kcal_ou_null>,"<protein>","<carbs>","<fat>",
      "images/<id>.<ext>",
      "<ingr1> || <ingr2> || <ingr3>",
      "<step1> || <step2> || <step3>",
      "<note>"
    ]]
  }'
```

**Modification (recette existante) — update sur la ligne trouvée :**
```bash
curl -s -X PUT \
  "https://sheets.googleapis.com/v4/spreadsheets/1qMnsJ7g90pZ8C6FKQbNNwYXctsA7wDh14RpfXtuS6eQ/values/A<N>:M<N>?valueInputOption=RAW" \
  -H "Authorization: Bearer <GOOGLE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"values": [[...]]}'
```

### 4. Uploader la photo dans le repo GitHub

**Uniquement si une image a été fournie.**

Demander le GitHub Personal Access Token si pas encore fourni (scope `contents:write`).

Convertir l'image en base64 :
```bash
base64 -i <fichier_image> | tr -d '\n' > /tmp/img_b64.txt
IMG_B64=$(cat /tmp/img_b64.txt)
```

Vérifier si le fichier existe déjà (pour récupérer le SHA si besoin) :
```bash
curl -s \
  -H "Authorization: token <GITHUB_TOKEN>" \
  "https://api.github.com/repos/jeffdebase-glitch/recettes-diete-jeff/contents/images/<id>.<ext>"
```

Uploader (sans SHA = création, avec SHA = remplacement) :
```bash
curl -s -X PUT \
  -H "Authorization: token <GITHUB_TOKEN>" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/jeffdebase-glitch/recettes-diete-jeff/contents/images/<id>.<ext>" \
  -d "{
    \"message\": \"feat: image <id>\",
    \"content\": \"$IMG_B64\",
    \"branch\": \"main\"
  }"
```

Si le fichier existait déjà, ajouter `"sha": "<sha_récupéré>"` dans le body.

### 5. Confirmer

Afficher un résumé compact :
```
✓ Sheet mis à jour
  <title> · <category> / <section> · <status>
  <kcal> kcal | <protein>g P | <carbs>g G | <fat>g L

✓ Image uploadée : images/<id>.<ext>

→ https://jeffdebase-glitch.github.io/recettes-diete-jeff/
```

Ou si pas d'image fournie :
```
⚠ Pas d'image — à uploader dans images/<id>.jpg quand tu l'auras.
```

---

## Tokens — règles de sécurité

- Demander le **GitHub Token** et le **Google Token** en début de session si nécessaire
- Ne jamais les afficher en clair dans les confirmations
- Ne jamais les stocker dans un fichier du repo
- Les redemander à chaque nouvelle session (ne pas supposer qu'ils sont encore valides)

---

## Valeurs autorisées (copier-coller exact)

```
Catégories : Glaces Creami | Recettes salées | Desserts
Sections   : Mes Creami | Recettes validées | Plaisirs contrôlés
Statuts    : Compatible sèche | Validée Jeff | Plaisir contrôlé | À tester
Séparateur : " || " (espace pipe pipe espace)
```
