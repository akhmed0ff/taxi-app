-- Passenger-facing tariff labels, sort order, ETA and optional per-100m price.

ALTER TABLE "Tariff" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tariff" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tariff" ADD COLUMN "etaMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Tariff" ADD COLUMN "seats" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Tariff" ADD COLUMN "pricePer100m" INTEGER;

UPDATE "Tariff"
SET
  "sortOrder" = CASE "tariffClass"
    WHEN 'STANDARD' THEN 1
    WHEN 'COMFORT' THEN 2
    WHEN 'COMFORT_PLUS' THEN 3
    WHEN 'DELIVERY' THEN 4
    ELSE 99
  END,
  "title" = CASE "tariffClass"
    WHEN 'STANDARD' THEN 'Стандарт'
    WHEN 'COMFORT' THEN 'Комфорт'
    WHEN 'COMFORT_PLUS' THEN 'Комфорт+'
    WHEN 'DELIVERY' THEN 'Доставка'
    ELSE "tariffClass"
  END,
  "etaMinutes" = 5
WHERE TRUE;
