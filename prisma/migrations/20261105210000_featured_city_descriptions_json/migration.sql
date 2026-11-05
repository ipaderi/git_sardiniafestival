ALTER TABLE "FeaturedCity" ADD COLUMN "descriptions" JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE "FeaturedCity"
SET "descriptions" = jsonb_strip_nulls(
  jsonb_build_object('it', "description", 'en', "descriptionEn")
);

ALTER TABLE "FeaturedCity"
  DROP COLUMN "descriptionEn",
  DROP COLUMN "description";
