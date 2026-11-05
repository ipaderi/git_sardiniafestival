-- Preserve existing events and infer their type from their existing dates.
CREATE TYPE "EventType" AS ENUM ('SINGLE_DAY', 'MULTI_DAY', 'MULTI_LOCATION', 'ONLINE');

ALTER TABLE "Event"
  ALTER COLUMN "location" DROP NOT NULL,
  ALTER COLUMN "province" DROP NOT NULL,
  ALTER COLUMN "venue" DROP NOT NULL,
  ADD COLUMN "eventType" "EventType" NOT NULL DEFAULT 'SINGLE_DAY',
  ADD COLUMN "onlineUrl" TEXT;

ALTER TABLE "EventDate"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "province" TEXT,
  ADD COLUMN "venue" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "comuneId" TEXT;

-- Older records used only Event.startsAt/endsAt. Make their occurrence explicit.
INSERT INTO "EventDate" ("id", "eventId", "startsAt", "endsAt", "sortOrder")
SELECT 'legacy-' || e."id", e."id", e."startsAt", e."endsAt", 0
FROM "Event" e
WHERE NOT EXISTS (SELECT 1 FROM "EventDate" d WHERE d."eventId" = e."id");

UPDATE "Event" e SET "eventType" = 'MULTI_DAY'
WHERE (SELECT COUNT(*) FROM "EventDate" d WHERE d."eventId" = e."id") > 1
   OR EXISTS (
     SELECT 1 FROM "EventDate" d WHERE d."eventId" = e."id"
       AND d."endsAt" IS NOT NULL
       AND (d."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::date
           <> (d."endsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::date
   );

CREATE INDEX "EventDate_comuneId_startsAt_idx" ON "EventDate"("comuneId", "startsAt");
ALTER TABLE "EventDate" ADD CONSTRAINT "EventDate_comuneId_fkey"
  FOREIGN KEY ("comuneId") REFERENCES "Comune"("id") ON DELETE SET NULL ON UPDATE CASCADE;
