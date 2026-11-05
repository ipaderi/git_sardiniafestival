ALTER TABLE "Event" ADD COLUMN "descriptionTranslations" JSONB NOT NULL DEFAULT '{}'::jsonb;
UPDATE "Event"
SET "descriptionTranslations" = jsonb_strip_nulls(jsonb_build_object('en', "descriptionEn"));
ALTER TABLE "Event" DROP COLUMN "descriptionEn";

ALTER TABLE "EventPoi" ADD COLUMN "descriptionTranslations" JSONB NOT NULL DEFAULT '{}'::jsonb;
UPDATE "EventPoi"
SET "descriptionTranslations" = jsonb_strip_nulls(jsonb_build_object('en', "descriptionEn"));
ALTER TABLE "EventPoi" DROP COLUMN "descriptionEn";
