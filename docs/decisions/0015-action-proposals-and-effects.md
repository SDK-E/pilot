# ActionProposals et effets externes idempotents

Status: proposed — en attente d'implémentation Plan 10.

## Contexte

Les approvals existantes (Plan 07/08) stockent un résumé minimal et un statut. Elles ne permettent pas de proposer une action concrète (publier un PR, envoyer un message, déployer) avec un contenu vérifiable et des effets externes traçables. Le modèle actuel ne peut pas exprimer la cible exacte, les droits au moment de la proposition, ni l'expiration. Un effet externe ne peut pas être réconcilié après une défaillance de connexion.

## Problème

1. Il n'existe pas de modèle de proposition distinct de l'audit minimal : l'approbation mélange décision et contenu.
2. Les politiques d'action ne sont pas classées : chaque outil est traité individuellement, sans risque ni portée.
3. Les effets externes n'ont pas d'intention enregistrée avec clé d'idempotence : impossible de dédupliquer ou de réconcilier un callback perdu.
4. Une proposition obsolète (changement de contenu/head/revocation) reste consommable.

## Décision

### ActionProposal (données privées)

Une `ActionProposal` est une proposition privée de la base Pilot, distincte de l'audit minimal. Elle contient:

- `type`: classe d'action concrète (publish_pr, send_message, deploy, external_write, delete, financial)
- `version`: incrémentée à chaque changement de contenu ou cible
- `targetRef`: référence à la cible (repo, document, environnement)
- `artifactRevision`: révision de l'artefact concerné
- `canonicalArgsHash`: hash des arguments canoniques de l'action
- `permissionSnapshot`: droits exacts au moment de la proposition (figés)
- `expiresAt`: date d'expiration de la proposition
- `riskSummary`: résumé de risque localisé
- `status`: pending, stale, consumed

L'approbation ne conserve que le `proposalId` et le `proposalHash` (handle), jamais le contenu.

### Policy classes

Chaque action est classée dans une classe fermée:

- `read`: lecture autorisée, auto-approuvable
- `local_reversible`: modification locale réversible
- `external_write`: écriture externe, nécessite grant explicite ou décision
- `destructive`: destruction, nécessite grant + décision + rôle adapté
- `financial`: risque financier, nécessite grant + décision + admin
- `deployment`: déploiement, nécessite grant + décision + environnement vérifié

`auto-classifier` n'est qu'un signal et ne peut jamais donner `allow`.

### EffectIntent (effets traçables)

Chaque effet externe est enregistré comme `EffectIntent`:

- `effectKey`: clé d'idempotence stable (actorId + actionType + targetRef + argsHash)
- `status`: prepared → dispatched → confirmed | failed | unknown
- `externalRef`: identifiant externe si connu (PR URL, message ID, deploy ID)
- Résultats jamais retryés aveuglément: timeout → unknown + réconciliation humaine

### Migration

Nouvelles tables `action_proposals` et `effect_intents` (migration 0025). Tables additifs, sans exposition des anciens payloads. Les approvals existantes restent résumées et utilisent leur handler V1 tant qu'actives.

## Conséquences

- Les ADR existants (0007, 0010) ne sont pas modifiés; ils restent valides pour les approvals V1 (web-search, scratchpad).
- Les `activityEvents` ne sont pas modifiés: ils ne contiennent jamais de payload de proposition.
- L'implémentation V1 des approvals existantes reste fonctionnelle pendant la migration.
- Les nouveaux types sont utilisés par Plan 11 pour les effets externes durables.

## Tables affectées

- Nouveau: `action_proposals`, `effect_intents`
- Aucune modification des tables d'audit existantes
