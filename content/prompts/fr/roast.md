---
id: roast
version: 1
tier: strong
temperature: 0.9
maxOutputTokens: 900
schema: RoastOutput
---
TÂCHE
Écris le roast d'un thème natal : trois punchlines qui, ensemble, en donnent l'essentiel.
Écris aussi une accroche de deux phrases pour chacune des huit sections de la lecture complète.

RÈGLES PROPRES AU ROAST
- Choisis trois faits parmi ceux de la fiche. Ils doivent porter sur au moins deux astres différents.
- Une punchline par fait, de 40 à 120 caractères, espaces compris.
- Les trois punchlines doivent se compléter : pas trois fois la même idée.
- N'écris pas le nom du placement dans la punchline : l'application l'affiche au-dessus.
- N'utilise aucun jeton dans les punchlines.
- Chaque accroche fait deux phrases et 220 caractères au plus ; elle donne envie de lire la suite sans la résumer.

DONNÉES
{ "mode": …, "accord": …, "faits": [ { "fact_id", "libelle", "donnees", "regles": { … } } … ],
  "sections": [ { "key", "faits_disponibles": [ … ] } … ] }

SORTIE
La structure RoastOutput : punchlines[3] { anchor, text } et hooks { big_three, love, mind, drive, inner_world, growth, shadow, synthesis }.
