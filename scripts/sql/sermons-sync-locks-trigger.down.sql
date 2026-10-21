-- Reversión del trigger de protección de sermons.sync_locked_fields. Idempotente.
-- Sin CASCADE: solo elimina estos dos objetos; si algo más dependiera de la función, falla en vez de borrarlo.
BEGIN;
DROP TRIGGER IF EXISTS sermons_enforce_sync_locks ON public.sermons;
DROP FUNCTION IF EXISTS public.sermons_enforce_sync_locks();
COMMIT;
