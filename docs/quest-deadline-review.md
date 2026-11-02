# Bilan avant les points de résignation

Une lecture des quêtes ne modifie plus leurs statuts et ne demande plus d'expiration automatique.
Sur les pages Grindleveling, toute quête PENDING/IN_PROGRESS dont due_at est dépassé présente « Quelle est ton excuse ? ».
La durée estimée d'une tâche et le minuteur de concentration ne constituent pas une échéance.
L'heure est affichée dans le fuseau du navigateur ; une échéance de fin de journée doit être enregistrée comme telle.

La réponse est obligatoire. L'utilisateur qualifie lui-même son retard : contrainte réelle (aucun point, quête conservée) ou évitement volontaire (barème existant, quête EXPIRED). Aucun classement automatique du texte.
« Répondre plus tard » diffère le bilan pour cette session, sans écriture en base. Il revient au prochain chargement ou via « Reprendre le bilan ».

La migration 0015 est nécessaire AVANT la publication de l'interface. Elle neutralise aussi l'ancien RPC d'expiration pour les anciennes pages. Le nouveau RPC vérifie l'identité, l'échéance et le statut, verrouille la quête et enregistre réponse et points dans une transaction. Une même quête/échéance ne peut être traitée deux fois. Les réponses ne sont lisibles que par leur propriétaire. Aucun historique précédent n'est modifié. L'abandon explicite SKIPPED reste inchangé.

## Mission démarrée, non terminée dans la journée (migration 0017)

« Démarrer » ne fixe pas d'échéance : une mission démarrée restait donc en cours indéfiniment sans bilan. Désormais, toute quête IN_PROGRESS démarrée avant le minuit local du jour présente le même « Quelle est ton excuse ? », une fois par journée tant qu'elle reste en cours.
Contrainte réelle : aucun point. Évitement volontaire : la résignation augmente de l'XP de base qu'aurait rapportée la quête (f_base_xp_for_tier, source OBJECTIVE_POSTPONED). Dans les deux cas la mission reste en cours, son statut ne change pas.
Le RPC review_started_quest vérifie l'identité, le statut, une fin de journée passée de moins de 26 h et postérieure au démarrage, et n'enregistre qu'une réponse par mission et par journée (tolérance de 20 h pour les fuseaux). Les bilans portent un type (deadline / started_day).

Sans migration, l'interface bloque la validation et affiche l'indisponibilité du service. Elle n'utilise jamais l'ancien chemin pour attribuer des points en secours. Déployer les fichiers statiques ne suffit pas à mettre à jour Supabase.
