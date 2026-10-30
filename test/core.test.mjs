// Fixtures: exact unit constants (NIST HB44), karat purity (k/24), and parsing of saved upstream payloads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  UNITS, TROY_OZ_G, purity, convert, karatRow, meltValue, parseSpot, parseFx, resolveUnit, round,
  getGoldPricePerGram, getMetalPrices, calculateJewelryValue, convertGoldUnits, InputError, UpstreamError, UTM,
} from '../dist/core.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

// Fake fetcher serving the saved payloads.
const fake = (overrides = {}) => async (url) => {
  if (url in overrides) { const v = overrides[url]; if (v instanceof Error) throw v; return v; }
  const m = url.match(/price\/(X\w\w)$/);
  if (m) return fx(`gold-api-${m[1]}-2026-10-30.json`);
  if (url.includes('frankfurter')) return fx('frankfurter-v2-usd-2026-10-29.json');
  throw new Error('unexpected url ' + url);
};

test('troy ounce is exactly 480 grains = 31.1034768 g', () => close(TROY_OZ_G, 31.1034768, 1e-12));
test('pennyweight is 1.55517384 g', () => close(UNITS.pennyweight.grams, 1.55517384, 1e-12));
test('tola is 180 grains = 11.6638038 g = 3/8 troy ounce', () => { close(UNITS.tola.grams, 11.6638038, 1e-12); close(convert(1, 'tola', 'troy_ounce'), 0.375, 1e-12); });
test('Thai bullion baht 15.244 g, jewellery baht 15.16 g', () => { assert.equal(UNITS.baht.grams, 15.244); assert.equal(UNITS.baht_jewelry.grams, 15.16); });
test('10 chi = 1 luong = 37.5 g', () => close(convert(10, 'chi', 'luong'), 1, 1e-12));
test('1 kilogram = 32.1507466 troy ounces', () => close(round(convert(1, 'kg', 'oz'), 7), 32.1507466, 1e-12));
test('1 Hong Kong gold tael = 37.429 g = 1.2034 troy oz', () => close(round(convert(1, 'tael', 'troy_ounce'), 4), 1.2034, 1e-12));
test('aliases resolve and unknown unit errors', () => {
  assert.equal(resolveUnit('g'), 'gram'); assert.equal(resolveUnit('Troy Ounce'), 'troy_ounce'); assert.equal(resolveUnit('dwt'), 'pennyweight');
  assert.throws(() => resolveUnit('stone'), InputError);
});
test('karat purity is exactly k/24', () => {
  assert.equal(purity(24), 1); assert.equal(purity(18), 0.75); assert.equal(purity(12), 0.5);
  close(purity(22), 0.9166666666666666); close(purity(14), 0.5833333333333334); close(purity(21), 0.875); close(purity(10), 0.4166666666666667); close(purity(9), 0.375);
});
test('karat row arithmetic at a 3110.34768 spot gives 100.00 per gram 24K', () => {
  const r = karatRow(3110.34768, 24);
  assert.equal(r.per_gram, 100); assert.equal(r.per_kilogram, 100000); assert.equal(r.per_tola, 1166.38);
  assert.equal(karatRow(3110.34768, 18).per_gram, 75); assert.equal(karatRow(3110.34768, 22).per_gram, 91.67);
});
test('melt value: 10 g of 14K at 3110.34768 = 583.33, 20% spread offer 466.67', () => {
  const v = meltValue(3110.34768, 10, 'gram', 14, 20);
  assert.equal(v.melt_value, 583.33); assert.equal(v.dealer_offer, 466.67); close(v.fine_gold_grams, 5.833333, 1e-9);
});
test('melt value: 1 tola of 22K at 4000 = 1375.00', () => assert.equal(meltValue(4000, 1, 'tola', 22).melt_value, 1375));
test('parse saved gold-api.com payloads', () => {
  const g = parseSpot(fx('gold-api-XAU-2026-10-30.json'), 'XAU');
  assert.equal(g.usd_per_troy_ounce, 4011); assert.equal(g.updated_at, '2026-10-30T00:41:10Z');
  assert.equal(parseSpot(fx('gold-api-XAG-2026-10-30.json'), 'XAG').usd_per_troy_ounce, 52.026001);
  assert.equal(parseSpot(fx('gold-api-XPT-2026-10-30.json'), 'XPT').usd_per_troy_ounce, 1492);
  assert.equal(parseSpot(fx('gold-api-XPD-2026-10-30.json'), 'XPD').usd_per_troy_ounce, 1026);
});
test('gold-api.com error and garbage payloads raise UpstreamError', () => {
  assert.throws(() => parseSpot(fx('gold-api-error.json'), 'XAU'), UpstreamError);
  assert.throws(() => parseSpot('<html>', 'XAU'), UpstreamError);
  assert.throws(() => parseSpot(fx('gold-api-XAG-2026-10-30.json'), 'XAU'), UpstreamError);
});
test('parse saved Frankfurter v2 payload', () => {
  const r = parseFx(fx('frankfurter-v2-usd-2026-10-29.json'));
  assert.equal(r.date, '2026-10-30'); assert.equal(r.dates.EUR, '2026-10-30'); assert.equal(r.dates.AED, '2026-10-29'); assert.equal(r.rates.AED, 3.6725); assert.equal(r.rates.USD, 1);
  assert.ok(Object.keys(r.rates).length > 150);
  assert.throws(() => parseFx('{"message":"x"}'), UpstreamError);
});
test('get_gold_price_per_gram in USD from fixtures', async () => {
  const r = await getGoldPricePerGram(fake(), 'usd', 24);
  assert.equal(r.karats[0].per_gram, round(4011 / 31.1034768)); assert.equal(r.karats[0].per_gram, 128.96);
  assert.equal(r.as_of, '2026-10-30T00:41:10Z'); assert.ok(r.more.includes('/24k-gold-price-per-gram/') && r.more.includes(UTM));
  const all = await getGoldPricePerGram(fake(), 'USD');
  assert.equal(all.karats.length, 7); assert.ok(all.karats.find((k) => k.karat === 21).more.includes('/gold-calculator/'));
});
test('get_gold_price_per_gram in AED uses the central-bank rate', async () => {
  const r = await getGoldPricePerGram(fake(), 'AED', 22);
  assert.equal(r.karats[0].per_gram, round((4011 * 3.6725 / 31.1034768) * 22 / 24));
});
test('unknown currency and bad karat are input errors', async () => {
  await assert.rejects(getGoldPricePerGram(fake(), 'XYZ'), InputError);
  await assert.rejects(getGoldPricePerGram(fake(), 'USD', 25), InputError);
});
test('upstream down gives a clear UpstreamError', async () => {
  await assert.rejects(getGoldPricePerGram(fake({ 'https://api.gold-api.com/price/XAU': new Error('no answer within 10 s') }), 'USD'), /not answering right now/);
});
test('get_metal_prices keeps going when one metal fails', async () => {
  const r = await getMetalPrices(fake({ 'https://api.gold-api.com/price/XPD': new Error('HTTP 503') }), 'USD');
  assert.equal(r.metals.find((m) => m.metal === 'silver').per_troy_ounce, 52.03);
  assert.ok('error' in r.metals.find((m) => m.metal === 'palladium'));
});
test('calculate_jewelry_value states retail and buyback differ', async () => {
  const r = await calculateJewelryValue(fake(), { weight: 1, unit: 'troy_ounce', karat: 18, currency: 'USD', dealer_spread_percent: 10 });
  assert.equal(r.melt_value, 3008.25); assert.equal(r.dealer_offer, 2707.43);
  assert.match(r.summary, /not a shop price/); assert.match(r.note, /Retail and buyback prices differ/);
});
test('convert_gold_units returns every unit with a source', () => {
  const r = convertGoldUnits(100, 'gram');
  assert.equal(r.results.length, Object.keys(UNITS).length);
  assert.equal(r.results.find((x) => x.unit === 'troy_ounce').value, 3.215075);
  assert.ok(r.results.every((x) => x.source.startsWith('https://')));
  assert.equal(convertGoldUnits(1, 'baht', 'gram').results[0].value, 15.244);
});
