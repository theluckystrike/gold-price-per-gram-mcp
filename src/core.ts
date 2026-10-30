// Pure core for gold-price-per-gram-mcp. The only I/O is two keyless upstream fetches
// (gold-api.com spot, Frankfurter FX), done through an injected fetchText.
import type { FetchText } from './types.js';

export const REPO = 'gold-price-per-gram-mcp';
export const SITE = 'https://goldgramprice.com';
export const UTM = `utm_source=mcp&utm_medium=${REPO}`;
export const SPOT_API = 'https://api.gold-api.com/price';
export const FX_API = 'https://api.frankfurter.dev/v2/rates?base=USD';
export const SPOT_TTL = 300;
export const FX_TTL = 3600;

export class InputError extends Error {}
export class UpstreamError extends Error {}

export const link = (path: string) => `${SITE}${path}?${UTM}`;

// ---------------------------------------------------------------- units

const NIST_HB44 = 'https://www.nist.gov/system/files/documents/2024/01/14/NIST%20HB%2044%202024%20Appendix%20C%20General%20Tables%20of%20Units%20of%20Measurement.pdf';
const GRAIN_G = 0.06479891; // exact, NIST HB44 Appendix C
export const TROY_OZ_G = 480 * GRAIN_G; // 31.1034768 exact

export interface UnitDef { grams: number; label: string; exact: boolean; definition: string; source: string }

export const UNITS: Record<string, UnitDef> = {
  gram: { grams: 1, label: 'gram (g)', exact: true, definition: 'SI unit', source: NIST_HB44 },
  kilogram: { grams: 1000, label: 'kilogram (kg)', exact: true, definition: '1000 g', source: NIST_HB44 },
  troy_ounce: { grams: TROY_OZ_G, label: 'troy ounce (oz t)', exact: true, definition: '480 grains = 31.1034768 g', source: NIST_HB44 },
  pennyweight: { grams: TROY_OZ_G / 20, label: 'pennyweight (dwt)', exact: true, definition: '1/20 troy ounce = 24 grains = 1.55517384 g', source: NIST_HB44 },
  grain: { grams: GRAIN_G, label: 'grain (gr)', exact: true, definition: '64.79891 mg', source: NIST_HB44 },
  avoirdupois_ounce: { grams: 28.349523125, label: 'avoirdupois ounce (oz, kitchen scale)', exact: true, definition: '1/16 lb = 28.349523125 g', source: NIST_HB44 },
  tola: { grams: 180 * GRAIN_G, label: 'tola (South Asia, Gulf)', exact: true, definition: '180 grains = 3/8 troy ounce = 11.6638038 g', source: 'https://en.wikipedia.org/wiki/Tola_(unit)' },
  baht: { grams: 15.244, label: 'baht, Thai gold bullion', exact: true, definition: '15.244 g (Thai bullion trade convention; Thai bullion is 96.5% gold)', source: 'https://en.wikipedia.org/wiki/Baht_(unit)' },
  baht_jewelry: { grams: 15.16, label: 'baht, Thai gold jewellery', exact: true, definition: '15.16 g (Thai jewellery trade convention)', source: 'https://en.wikipedia.org/wiki/Baht_(unit)' },
  chi: { grams: 3.75, label: 'chi (chỉ, Vietnam gold)', exact: true, definition: '1/10 luong = 3.75 g', source: 'https://en.wikipedia.org/wiki/Tael' },
  tael: { grams: 37.429, label: 'tael, Hong Kong gold (troy tael, 金衡兩)', exact: false, definition: '37.429 g, about 1.2 troy ounces (Hong Kong gold trade)', source: 'https://en.wikipedia.org/wiki/Tael' },
  luong: { grams: 37.5, label: 'luong / cay (lượng, Vietnam gold tael)', exact: true, definition: '37.5 g, used for domestic gold trade in Vietnam', source: 'https://en.wikipedia.org/wiki/Tael' },
  tael_taiwan: { grams: 37.5, label: 'tael, Taiwan (台兩)', exact: true, definition: '37.5 g', source: 'https://en.wikipedia.org/wiki/Tael' },
  tael_china: { grams: 50, label: 'liang, mainland China market (市两)', exact: true, definition: '50 g = 1/10 jin', source: 'https://en.wikipedia.org/wiki/Tael' },
};
export const UNIT_NAMES = Object.keys(UNITS) as [string, ...string[]];

const UNIT_ALIASES: Record<string, string> = {
  g: 'gram', grams: 'gram', gm: 'gram', kg: 'kilogram', kilo: 'kilogram', kilos: 'kilogram', kilograms: 'kilogram',
  oz: 'troy_ounce', ozt: 'troy_ounce', 'oz t': 'troy_ounce', troy_oz: 'troy_ounce', 'troy ounce': 'troy_ounce', ounce: 'troy_ounce', ounces: 'troy_ounce',
  dwt: 'pennyweight', gr: 'grain', grains: 'grain', tolas: 'tola', tolla: 'tola', tael_hk: 'tael', taels: 'tael',
  cay: 'luong', 'lượng': 'luong', 'chỉ': 'chi', liang: 'tael_china', baht_bullion: 'baht', avdp_ounce: 'avoirdupois_ounce',
};

export function resolveUnit(u: string): string {
  const k = u.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (UNITS[k]) return k;
  const a = UNIT_ALIASES[u.trim().toLowerCase()] ?? UNIT_ALIASES[k];
  if (a) return a;
  throw new InputError(`Unknown unit "${u}". Use one of: ${UNIT_NAMES.join(', ')}.`);
}

// ---------------------------------------------------------------- karats

export const KARATS = [24, 22, 21, 18, 14, 10, 9] as const;
export const KARAT_SOURCE = 'https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-23/section-23.3';
/** Karat purity is k/24 by definition (24 karat = fine gold, 16 CFR 23.3). */
export const purity = (k: number) => k / 24;
const KARAT_PAGES = new Set([24, 22, 18, 14, 10]);
export const karatPage = (k: number) => (KARAT_PAGES.has(k) ? link(`/${k}k-gold-price-per-gram/`) : link('/gold-calculator/'));

export function checkKarat(k: number): number {
  if (!Number.isInteger(k) || k < 1 || k > 24) throw new InputError(`Karat must be a whole number from 1 to 24 (common: ${KARATS.join(', ')}). Got ${k}.`);
  return k;
}

// ---------------------------------------------------------------- arithmetic

export const round = (x: number, d = 2) => { const f = 10 ** d; return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f; };

export function convert(value: number, from: string, to: string): number {
  return (value * UNITS[resolveUnit(from)].grams) / UNITS[resolveUnit(to)].grams;
}

export function convertAll(value: number, from: string) {
  if (!(value >= 0) || !Number.isFinite(value)) throw new InputError('Value must be a finite number of 0 or more.');
  const f = resolveUnit(from);
  const grams = value * UNITS[f].grams;
  const results = Object.entries(UNITS).map(([name, u]) => ({ unit: name, label: u.label, value: round(grams / u.grams, 6), grams_per_unit: u.grams, definition: u.definition, exact: u.exact, source: u.source }));
  return { from: f, grams, results };
}

// ---------------------------------------------------------------- upstream parsing

export interface Spot { symbol: string; name: string; usd_per_troy_ounce: number; updated_at: string }

const RANGES: Record<string, [number, number]> = { XAU: [500, 50000], XAG: [3, 2000], XPT: [100, 20000], XPD: [100, 20000] };

export function parseSpot(text: string, symbol: string): Spot {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new UpstreamError(`gold-api.com returned non-JSON for ${symbol}`); }
  if (j?.error) throw new UpstreamError(`gold-api.com error for ${symbol}: ${j.error}`);
  const p = Number(j?.price);
  const [lo, hi] = RANGES[symbol] ?? [0, Infinity];
  if (j?.symbol !== symbol || !Number.isFinite(p) || p < lo || p > hi) throw new UpstreamError(`gold-api.com returned an implausible ${symbol} price (${j?.price})`);
  if (j?.currency && j.currency !== 'USD') throw new UpstreamError(`gold-api.com returned ${j.currency}, expected USD`);
  return { symbol, name: String(j.name ?? symbol), usd_per_troy_ounce: p, updated_at: String(j.updatedAt ?? '') };
}

export interface Fx { date: string; rates: Record<string, number>; dates: Record<string, string> }

export function parseFx(text: string): Fx {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new UpstreamError('Frankfurter returned non-JSON'); }
  if (!Array.isArray(j) || j.length < 20) throw new UpstreamError('Frankfurter returned an unexpected rates payload');
  const rates: Record<string, number> = { USD: 1 };
  const dates: Record<string, string> = {};
  let date = '';
  for (const r of j) {
    if (r?.base !== 'USD' || typeof r.quote !== 'string' || !(Number(r.rate) > 0)) continue;
    rates[r.quote] = Number(r.rate);
    dates[r.quote] = String(r.date ?? '');
    if (r.date > date) date = r.date;
  }
  if (!rates.EUR) throw new UpstreamError('Frankfurter payload has no EUR rate');
  return { date, rates, dates };
}

// ---------------------------------------------------------------- fetches

const upstream = async (fetchText: FetchText, url: string, ttl: number, who: string) => {
  try { return await fetchText(url, { cacheTtl: ttl, timeoutMs: 10000 }); } catch (e) {
    throw new UpstreamError(`${who} is not answering right now (${(e as Error).message}). Try again in a few minutes. Do not quote a price from memory.`);
  }
};

export const METALS = { gold: 'XAU', silver: 'XAG', platinum: 'XPT', palladium: 'XPD' } as const;
export type Metal = keyof typeof METALS;

export async function fetchSpot(fetchText: FetchText, symbol: string): Promise<Spot> {
  return parseSpot(await upstream(fetchText, `${SPOT_API}/${symbol}`, SPOT_TTL, 'gold-api.com'), symbol);
}

export async function fetchFx(fetchText: FetchText, currency: string): Promise<{ rate: number; date: string | null }> {
  if (currency === 'USD') return { rate: 1, date: null };
  const fx = parseFx(await upstream(fetchText, FX_API, FX_TTL, 'Frankfurter (central bank FX)'));
  const rate = fx.rates[currency];
  if (!rate) throw new InputError(`Currency "${currency}" is not in the central-bank FX set. Use an ISO 4217 code such as USD, EUR, GBP, INR, AED, SAR, PKR, CAD, AUD. Available: ${Object.keys(fx.rates).sort().join(', ')}.`);
  return { rate, date: fx.dates[currency] || fx.date };
}

export function checkCurrency(c: string): string {
  const s = c.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(s)) throw new InputError(`Currency must be a 3-letter ISO 4217 code such as USD, EUR, INR or AED. Got "${c}".`);
  return s;
}

const SOURCE_SPOT = 'https://gold-api.com/';
const SOURCE_FX = 'https://frankfurter.dev/';
const fmt = (x: number, cur: string) => `${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

// ---------------------------------------------------------------- pure pricing

export function karatRow(perOzFine: number, k: number) {
  const perGramFine = perOzFine / TROY_OZ_G;
  const p = purity(k);
  return {
    karat: k, purity: round(p, 6), purity_fraction: `${k}/24`,
    per_gram: round(perGramFine * p), per_troy_ounce: round(perOzFine * p),
    per_tola: round(perGramFine * p * UNITS.tola.grams), per_kilogram: round(perGramFine * p * 1000),
    more: karatPage(k),
  };
}

export function meltValue(perOzFine: number, weight: number, unit: string, k: number, spreadPct = 0) {
  const u = resolveUnit(unit);
  const grams = weight * UNITS[u].grams;
  const fineGrams = grams * purity(k);
  const melt = (fineGrams / TROY_OZ_G) * perOzFine;
  const offer = melt * (1 - spreadPct / 100);
  return { unit: u, grams: round(grams, 6), fine_gold_grams: round(fineGrams, 6), fine_gold_troy_ounces: round(fineGrams / TROY_OZ_G, 6), melt_value: round(melt), dealer_offer: round(offer), spread_amount: round(melt - offer) };
}

// ---------------------------------------------------------------- tool cores

export async function getGoldPricePerGram(fetchText: FetchText, currencyIn = 'USD', karat?: number) {
  const currency = checkCurrency(currencyIn);
  const ks = karat === undefined ? [...KARATS] : [checkKarat(karat)];
  const [spot, fx] = await Promise.all([fetchSpot(fetchText, 'XAU'), fetchFx(fetchText, currency)]);
  const perOz = spot.usd_per_troy_ounce * fx.rate;
  const rows = ks.map((k) => karatRow(perOz, k));
  const lead = rows[0];
  const summary = `${lead.karat}K gold is ${fmt(lead.per_gram, currency)} per gram (${fmt(lead.per_troy_ounce, currency)} per troy ounce, ${fmt(lead.per_tola, currency)} per tola) at a spot of ${fmt(perOz, currency)} per troy ounce of fine gold, as of ${spot.updated_at}` +
    (rows.length > 1 ? `. Per gram by karat: ${rows.slice(1).map((r) => `${r.karat}K ${fmt(r.per_gram, currency)}`).join(', ')}.` : '.') +
    ' These are melt (spot) values. Shops sell jewellery above this and buy it back below it.';
  return {
    currency, spot_per_troy_ounce: round(perOz), spot_usd_per_troy_ounce: spot.usd_per_troy_ounce, usd_to_currency: fx.rate,
    karats: rows, purity_rule: 'purity = karat / 24 (24 karat = fine gold)',
    as_of: spot.updated_at, fx_date: fx.date,
    source: SOURCE_SPOT, sources: { spot: `${SPOT_API}/XAU`, fx: currency === 'USD' ? null : FX_API, karat: KARAT_SOURCE, units: NIST_HB44 },
    more: ks.length === 1 ? karatPage(ks[0]) : link('/'), summary,
  };
}

export async function getMetalPrices(fetchText: FetchText, currencyIn = 'USD') {
  const currency = checkCurrency(currencyIn);
  const names = Object.keys(METALS) as Metal[];
  const [fx, ...spots] = await Promise.all([fetchFx(fetchText, currency), ...names.map((m) => fetchSpot(fetchText, METALS[m]).catch((e: Error) => e))]);
  const metals = names.map((m, i) => {
    const s = spots[i];
    if (s instanceof Error) return { metal: m, symbol: METALS[m], error: s.message };
    const oz = s.usd_per_troy_ounce * fx.rate;
    return { metal: m, symbol: METALS[m], per_troy_ounce: round(oz), per_gram: round(oz / TROY_OZ_G, 4), per_kilogram: round((oz / TROY_OZ_G) * 1000), updated_at: s.updated_at };
  });
  const okRows = metals.filter((m): m is Extract<typeof m, { per_gram: number }> => 'per_gram' in m);
  if (!okRows.length) throw new UpstreamError('gold-api.com returned no metal prices. Try again in a few minutes.');
  const asOf = okRows.map((m) => m.updated_at).sort().pop() ?? '';
  const summary = `Spot prices in ${currency} per troy ounce of pure metal: ${okRows.map((m) => `${m.metal} ${fmt(m.per_troy_ounce, currency)} (${fmt(m.per_gram, currency)}/g)`).join(', ')}, as of ${asOf}.` +
    (okRows.length < metals.length ? ` Not available right now: ${metals.filter((m) => 'error' in m).map((m) => m.metal).join(', ')}.` : '');
  return { currency, usd_to_currency: fx.rate, metals, as_of: asOf, fx_date: fx.date, source: SOURCE_SPOT, sources: { spot: SPOT_API, fx: currency === 'USD' ? null : FX_API }, more: link('/silver-price-per-gram/'), summary };
}

export async function calculateJewelryValue(fetchText: FetchText, a: { weight: number; unit: string; karat: number; currency?: string; dealer_spread_percent?: number }) {
  const currency = checkCurrency(a.currency ?? 'USD');
  const k = checkKarat(a.karat);
  if (!(a.weight > 0) || !Number.isFinite(a.weight)) throw new InputError('Weight must be a positive number.');
  const spread = a.dealer_spread_percent ?? 0;
  if (!(spread >= 0 && spread < 100)) throw new InputError('dealer_spread_percent must be from 0 to below 100.');
  const unit = resolveUnit(a.unit);
  const [spot, fx] = await Promise.all([fetchSpot(fetchText, 'XAU'), fetchFx(fetchText, currency)]);
  const perOz = spot.usd_per_troy_ounce * fx.rate;
  const v = meltValue(perOz, a.weight, unit, k, spread);
  const summary = `${a.weight} ${UNITS[unit].label} of ${k}K gold (${round(purity(k) * 100, 4)}% pure) holds ${v.fine_gold_grams} g of fine gold, a melt value of ${fmt(v.melt_value, currency)} at a spot of ${fmt(perOz, currency)} per troy ounce (as of ${spot.updated_at}).` +
    (spread > 0 ? ` With a ${spread}% dealer spread, a buyer would offer about ${fmt(v.dealer_offer, currency)}.` : '') +
    ' Melt value is not a shop price: retail jewellery sells above melt (making charges, design, brand, tax) and buyers pay below it (refining cost and margin). Ask several buyers for their percentage of melt.';
  return {
    input: { weight: a.weight, unit, karat: k, currency, dealer_spread_percent: spread },
    purity: round(purity(k), 6), ...v, spot_per_troy_ounce: round(perOz), usd_to_currency: fx.rate,
    note: 'melt_value = weight in grams x karat/24 / 31.1034768 x spot per troy ounce. dealer_offer = melt_value x (1 - spread/100). Retail and buyback prices differ from melt value.',
    as_of: spot.updated_at, fx_date: fx.date, source: SOURCE_SPOT, sources: { spot: `${SPOT_API}/XAU`, fx: currency === 'USD' ? null : FX_API, karat: KARAT_SOURCE, units: UNITS[unit].source },
    more: link('/scrap-gold-calculator/'), related: [link('/learn/how-gold-buyers-calculate-offers/'), karatPage(k)], summary,
  };
}

export function convertGoldUnits(value: number, from: string, to?: string) {
  const all = convertAll(value, from);
  const results = to ? all.results.filter((r) => r.unit === resolveUnit(to)) : all.results;
  const pick = to ? results : results.filter((r) => ['gram', 'troy_ounce', 'tola', 'baht', 'chi', 'tael', 'kilogram'].includes(r.unit));
  const summary = `${value} ${UNITS[all.from].label} = ${pick.map((r) => `${r.value} ${r.unit.replace(/_/g, ' ')}`).join(', ')}. Constants: 1 troy ounce = 31.1034768 g and 1 grain = 64.79891 mg exactly (NIST Handbook 44); 1 tola = 180 grains; Thai bullion baht 15.244 g; Vietnamese chi 3.75 g; Hong Kong gold tael 37.429 g.`;
  return { value, from: all.from, grams: round(all.grams, 9), results, as_of: '2026-10-30', source: NIST_HB44, more: link('/gold-weight-converter/'), related: [link('/learn/gold-weight-units-explained/')], summary };
}
