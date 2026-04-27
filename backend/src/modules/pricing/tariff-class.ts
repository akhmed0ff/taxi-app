export const TariffClassValue = {
  ECONOMY: 'ECONOMY',
  COMFORT: 'COMFORT',
  PREMIUM: 'PREMIUM',
} as const;

export type TariffClass =
  (typeof TariffClassValue)[keyof typeof TariffClassValue];

export const DEFAULT_TARIFF_CLASS: TariffClass = TariffClassValue.ECONOMY;
