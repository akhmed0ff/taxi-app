export const TariffClassValue = {
  STANDARD: 'STANDARD',
  COMFORT: 'COMFORT',
  COMFORT_PLUS: 'COMFORT_PLUS',
  DELIVERY: 'DELIVERY',
} as const;

export type TariffClass =
  (typeof TariffClassValue)[keyof typeof TariffClassValue];

export const TARIFF_CLASS_VALUES = Object.values(TariffClassValue);

export const DEFAULT_TARIFF_CLASS: TariffClass = TariffClassValue.STANDARD;
