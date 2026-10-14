# Bilan avant les points de résignation

Une lecture des quêtes ne modifie plus leurs statuts et ne demande plus d'expiration automatique.
Sur les pages Grindleveling, toute quête PENDING/IN_PROGRESS dont due_at est dépassé présente « Quelle est ton excuse ? ».
La durée estimée d'une tâche et le minuteur de concentration ne constituent pas une échéance.
L'heure est affichée dans le fuseau du navigateur ; une échéance de fin de journée doit être enregistrée comme telle.

La réponse est obligatoire. L'utilisateur qualifie lui-même son retard : contrainte réelle (aucun point, quête conservée) ou évitement volontaire (barème existant, quête EXPIRED). Aucun classement automatique du texte.
« Répondre plus tard » diffère le bilan pour cette session, sans écriture en base. Il revient au prochain chargement ou via « Reprendre le bilan ».

La migration 0015 est nécessaire AVANT la publication de l'interface. Elle neutralise aussi l'ancien RPC d'expiration pour les anciennes pages. Le nouveau RPC vérifie l'identité, l'échéance et le statut, verrouille la quête et enregistre réponse et points dans une transaction. Une même quête/échéance ne peut être traitée deux fois. Les réponses ne sont lisibles que par leur propriétaire. Aucun historique précédent n'est modifié. L'abandon explicite SKIPPED reste inchangé.

Sans migration, l'interface bloque la validation et affiche l'indisponibilité du service. Elle n'utilise jamais l'ancien chemin pour attribuer des points en secours. Déployer les fichiers statiques ne suffit pas à mettre à jour Supabase.
