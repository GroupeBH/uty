# Contrat backend requis pour la moderation Uty

L'application mobile utilise ces routes authentifiees. Elles doivent etre implementees sur l'API de production avant la nouvelle soumission Apple.

## Signaler un contenu ou un utilisateur

`POST /moderation/reports`

```json
{
  "targetType": "announcement",
  "targetId": "announcement-id",
  "reportedUserId": "user-id",
  "reason": "Contenu offensant ou haineux",
  "details": "Details facultatifs"
}
```

La reponse doit retourner un statut 2xx, par exemple `{ "received": true, "id": "report-id" }`.

Chaque signalement doit apparaitre dans une file de moderation horodatee. L'equipe doit pouvoir retirer le contenu et suspendre l'auteur dans un delai maximal de 24 heures.

## Bloquer un utilisateur

`POST /moderation/blocks/:userId`

```json
{
  "sourceTargetType": "announcement",
  "sourceTargetId": "announcement-id",
  "reason": "Blocage initie depuis une annonce"
}
```

La reponse doit retourner un statut 2xx, par exemple `{ "blocked": true }`.

Le backend doit enregistrer le blocage pour l'utilisateur connecte, creer une entree visible par la moderation et exclure des reponses API les annonces, commentaires et messages de l'utilisateur bloque. L'application effectue deja le masquage local immediat.

## Filtrage

Le filtre mobile constitue une premiere barriere. Le backend doit refaire la verification sur les annonces, commentaires et messages afin qu'un client modifie ne puisse pas contourner les regles.
