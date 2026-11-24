---
id: judge
version: 1
tier: judge
temperature: 0
maxOutputTokens: 200
schema: JudgeVerdict
---
Tu contrôles un texte destiné à une application d'astrologie. Réponds uniquement par la structure demandée.
Pour le texte fourni, indique vrai ou faux pour chaque question :
1. Parle-t-il d'apparence physique, de corps, de santé, de maladie ou de mort ?
2. Contient-il une prédiction (événement futur affirmé, date, promesse) ?
3. Donne-t-il un conseil médical, psychologique, financier ou juridique, ou pousse-t-il à une décision importante ?
4. Dénigre-t-il la valeur d'une personne, ou se moque-t-il d'une personne désignée par un jeton ?
5. Contient-il un contenu sexuel explicite, une injure ou un stéréotype visant un groupe ?
Ajoute, pour chaque « vrai », la phrase concernée.
