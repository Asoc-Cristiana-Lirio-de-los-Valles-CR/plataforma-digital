-- Protección atómica de sermons.sync_locked_fields (spec Fase 2B, "Campos protegidos").
-- Rechaza el UPDATE que cambie un campo protegido antes Y después del UPDATE: desmarcar y editar
-- en un mismo guardado está permitido. El bloqueo de fila del UPDATE hace que la comprobación vea
-- siempre la última protección confirmada (también ante una escritura concurrente).
-- Lee las filas con to_jsonb(): sin la columna sync_locked_fields (antes de `apply` o tras `revert`)
-- el trigger no tiene efecto en vez de romper los UPDATE. Idempotente.
-- Los campos deben coincidir con LOCKABLE_FIELDS de nextjs/src/lib/sync-youtube.ts (lo verifica una prueba).
BEGIN;

CREATE OR REPLACE FUNCTION public.sermons_enforce_sync_locks() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  f text;
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
BEGIN
  FOREACH f IN ARRAY ARRAY['sermon_date', 'title'] LOOP
    IF coalesce(old_row -> 'sync_locked_fields' ? f, false)
       AND coalesce(new_row -> 'sync_locked_fields' ? f, false)
       AND new_row -> f IS DISTINCT FROM old_row -> f THEN
      RAISE EXCEPTION 'sermons.% está protegido por sync_locked_fields', f
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sermons_enforce_sync_locks ON public.sermons;
CREATE TRIGGER sermons_enforce_sync_locks
  BEFORE UPDATE ON public.sermons
  FOR EACH ROW EXECUTE FUNCTION public.sermons_enforce_sync_locks();

COMMIT;
