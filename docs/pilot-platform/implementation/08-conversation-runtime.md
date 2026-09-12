# Plan 08 — Conversation, événements persistants et reconnexion

## Objectif

Une conversation conserve texte, résultats, attentes et erreurs après rechargement, sans double soumission ni confusion entre déconnexion et annulation.

## État de départ

Plan 07 terminé et rapport de gate disponible. Le flux actuel persiste le message final et l'exécution, mais ne gère pas les parties discriminées, le protocole événementiel versionné, l'idempotence, ni la reconnexion par cursor.

## Périmètre

- Nouveaux types TypeScript pour ConversationMessageV2 et le protocole événementiel
- Test runtime AC-08-02 (stream contract) — exécutable sans DB ni WorkOS
- Tests AC-08-01, AC-08-03, AC-08-04 — créés comme BLOCKED (nécessitent WorkOS + DB)
- Migration 0023 (schema uniquement, non appliquée au DB)
- Aucune modification des frontières WorkOS, Mastra, Neon, Turso, Blob, shadcn/ui, Vercel AI Elements

## Points d'entrée à lire

- `pilot/src/conversations/stream-message.ts` — flux de messages persistant
- `pilot/src/ai/pilot-ai-client.ts` — client runtime et parseur de stream `parseConversationRuntimeStream`
- `pilot/src/components/conversations/conversation-shell.tsx` — composant UI de conversation
- `pilot/src/app/api/conversations/[conversationId]/stream/route.ts` — route de streaming
- `pilot/src/executions/execution-repository.ts` — démarrage/finition d'exécution
- `pilot/src/executions/activity-event.ts` — types d'événements d'activité
- `pilot-ai/src/conversation/openai-compatible.ts` — protocole OpenAI-compatible du runtime
- `pilot-ai/src/conversation/contract.ts` — contrat DTO pur

## Résultat attendu

Types et tests pour une conversation qui persiste les parties discriminées (text, artifact_ref, citation_ref, tool_summary, user_question), un protocole événementiel versionné avec exécution, eventId, sequence, type, timestamp, l'idempotence par owner+conversation, la séparation cancel/closer, et la reconnexion par cursor.

## Implémentation ordonnée

### 1. ConversationMessageV2 — Types discriminés

Fichier : `pilot/src/conversations/conversation-message-types.ts`

- `ConversationMessageV2` avec `messageId`, `schemaVersion` (numéroté), `status` (partial | complete | interrupted)
- `MessagePart` discriminé : `text` | `artifact_ref` | `citation_ref` | `tool_summary` | `user_question`
- Fallback sûr pour parties inconnues via `unknown` tag avec contenu brut lisible
- Aucune raisonnement privé ni payload outil dans les types d'activité

### 2. Protocole événementiel versionné

Fichier : `pilot/src/conversations/event-protocol.ts`

- `VersionedEvent` : `executionId`, `eventId`, `sequence`, `type`, `timestamp`, `payload` (autorisé)
- `EventPayload` union restreinte : contrôle (start, complete, fail, suspend, user_input) et données (text_checkpoint, artifact, citation, tool_summary)
- Séparation persistance contrôle avant notification
- Deltas de texte via checkpoints bornés dans le stockage privé des messages
- Télémétrie sans contenu

### 3. Idempotence et clientRequestId

Fichier : `pilot/src/conversations/idempotency.ts`

- `clientRequestId` borné (UUID)
- Clé d'idempotence : `ownerId + conversationId + clientRequestId`
- Repeated submission → même run (déjà en vol)
- Types pour serialize/génération sur thread ou branche explicite

### 4. Cancel vs fermeture et reconnexion

Fichier : `pilot/src/conversations/reconnect-types.ts`

- `CancelIntent` explicite vs `BrowserClose`
- `ReconnectCursor` : sequence + eventId pour reprendre
- `SnapshotRecovery` : reload snapshot serveur + déduplication
- Types pour interrupted avec proposition de retry lié
- Jamais inventer le texte manquant

### 5. Migration 0023

Fichier : `pilot/drizzle/0023_conversation_runtime_v2.sql`

- Ajouter `parts JSONB`, `schemaVersion INTEGER`, `status TEXT`, `requestId UUID` à `conversation_messages`
- Backfill texte depuis `content` existant (enveloppe text dans parts)
- `requestId` nullable pour compatibilité
- Conservation du contenu texte et ancien transport derrière drapeau (application-side)

### 6. Tests

| Fichier                                              | Type                 | AC       | Statut                    |
| ---------------------------------------------------- | -------------------- | -------- | ------------------------- |
| `pilot/tests/stream-contract.test.ts`                | runtime (node:test)  | AC-08-02 | PASS (exécutable sans DB) |
| `pilot/tests/conversation-reconnect.spec.ts`         | browser (Playwright) | AC-08-01 | BLOCKED (WorkOS requis)   |
| `pilot/tests/submit-idempotency.integration.test.ts` | integration          | AC-08-03 | BLOCKED (DB requise)      |
| `pilot/tests/ask-user.integration.test.ts`           | integration          | AC-08-04 | BLOCKED (DB requise)      |

#### AC-08-02 — stream-contract.test

Tests du parseur de stream que UTF-8 coupés, événements inconnus, ordre invalide et fin sans terminal ne produisent pas de faux succès. Utilise `parseConversationRuntimeStream` depuis `pilot/src/ai/pilot-ai-client.ts`.

#### AC-08-01 — conversation-reconnect.spec

Couper le réseau puis recharger retrouve les messages et un seul run. BLOCKED : nécessite WorkOS pour authentifier le navigateur.

#### AC-08-03 — submit-idempotency.integration

Double clic et retry HTTP produisent un seul message utilisateur et une seule exécution. BLOCKED : nécessite la base de données.

#### AC-08-04 — ask-user.integration

Réponse sur autre chat/refus expiré rejetée; réponse valide reprend exactement la suspension correspondante. BLOCKED : nécessite la base de données et WorkOS.

## Hors périmètre

- Replay d'effets externes
- Stockage automatique des tool inputs dans le fil d'activité
- Application-side flag pour transport V1/V2 (détail d'implémentation pour le moment où les deux dépôts sont compatibles)

## Vérifications

- `pnpm typecheck` : 0 erreurs sur les fichiers Plan 08
- `pnpm build` : PASS
- `pnpm test` (Playwright discovers AC-08-01 test)
- `pnpm test:server` (AC-08-02 runs)
- `git diff --check` : clean

## Procédure de retour

Les types V2 sont des couches d'abstraction au-dessus du V1 existant. Si le V2 est instable, le code existant continue de fonctionner via les types V1 inchangés. La migration est additive et ne modifie aucun contrainte existante.
