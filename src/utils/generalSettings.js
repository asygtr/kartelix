export const normalizeGenelAyarlar = (settings = {}) => {
  const karYuzdesiValue = Number(settings?.karYuzdesi ?? settings?.karYuzde ?? 0);
  return {
    ...settings,
    publicProsesGoster: Boolean(settings?.publicProsesGoster),
    publicFiyatGoster: Boolean(settings?.publicFiyatGoster),
    publicHikayeGoster: settings?.publicHikayeGoster !== false,
    publicHammaddeGoster: settings?.publicHammaddeGoster !== false,
    karYuzdesi: Number.isFinite(karYuzdesiValue) ? karYuzdesiValue : 0
  };
};

export const resolveDisplayPrice = (maliyet, satisFiyati, ayarlar = {}) => {
  const normalized = normalizeGenelAyarlar(ayarlar);
  const maliyetValue = Number(maliyet || 0);
  const satisValue = Number(satisFiyati || 0);

  if (normalized.karYuzdesi > 0 && maliyetValue > 0) {
    return maliyetValue * (1 + normalized.karYuzdesi / 100);
  }

  if (satisValue > 0) {
    return satisValue;
  }

  return maliyetValue;
};
