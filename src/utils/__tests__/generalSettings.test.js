import { normalizeGenelAyarlar, resolveDisplayPrice } from '../generalSettings';

describe('general settings helpers', () => {
  it('keeps the latest profit percentage when normalizing settings', () => {
    const settings = normalizeGenelAyarlar({ publicFiyatGoster: true, karYuzdesi: 50 });
    expect(settings.karYuzdesi).toBe(50);
    expect(settings.publicFiyatGoster).toBe(true);
  });

  it('uses the configured profit percentage for display pricing', () => {
    const price = resolveDisplayPrice(100, 120, { karYuzdesi: 50 });
    expect(price).toBe(150);
  });
});
