-- Lab 4 rollback for migration "lab4_actions_taken" (specification.md section 7).
-- Removes only Lab 4 objects: ActionTaken table, ActionStatus enum, Ticket.version and the
-- (currentStatus, updatedAt) dashboard index. Lab 1-3 tables and rows are not touched.
-- WARNING: all Actions Taken are lost. Take a pg_dump before running this on a real database.
-- Usage: npx prisma db execute --file ../docs/lab-04/rollback.sql --schema prisma/schema.prisma

BEGIN;

DROP TABLE IF EXISTS "ActionTaken";
DROP TYPE IF EXISTS "ActionStatus";
DROP INDEX IF EXISTS "Ticket_currentStatus_updatedAt_idx";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "version";

-- Forget the migration so `prisma migrate deploy` can re-apply it later (skipped if the
-- database was not created by Prisma Migrate).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations') THEN
    DELETE FROM "_prisma_migrations" WHERE "migration_name" LIKE '%_lab4_actions_taken';
  END IF;
END $$;

COMMIT;
