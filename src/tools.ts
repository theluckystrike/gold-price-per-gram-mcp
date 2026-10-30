// Tool registry shared by the stdio and Worker entries.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { InputError, REPO, SITE, UNIT_NAMES, calculateJewelryValue, convertGoldUnits, getGoldPricePerGram, getMetalPrices } from './core.js';
import type { FetchText } from './types.js';

export const VERSION = '1.0.0';

export const TOOL_INFO = [
  { name: 'get_gold_price_per_gram', blurb: 'Live gold price per gram, troy ounce, tola and kilogram for 24K, 22K, 21K, 18K, 14K, 10K and 9K in any of 160+ currencies.' },
  { name: 'get_metal_prices', blurb: 'Live spot price of gold, silver, platinum and palladium per troy ounce, gram and kilogram in any major currency.' },
  { name: 'calculate_jewelry_value', blurb: 'Melt value of gold jewellery from weight, unit and karat, with an optional dealer spread. Says plainly that shop prices differ.' },
  { name: 'convert_gold_units', blurb: 'Exact conversions between gram, troy ounce, tola, Thai baht, Vietnamese chi and luong, Hong Kong tael, kilogram and more, with sources.' },
];

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

function ok(data: Record<string, unknown> & { summary: string }) {
  return { content: [{ type: 'text' as const, text: `${data.summary}\n\n${JSON.stringify(data, null, 2)}` }], structuredContent: data };
}
function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { isError: true, content: [{ type: 'text' as const, text: `${e instanceof InputError ? 'Error' : 'Upstream price feed error'}: ${msg}` }] };
}

const currency = z.string().min(3).max(3).default('USD').describe('ISO 4217 currency code, for example USD, EUR, GBP, INR, AED, SAR, PKR, CAD, AUD. Default USD.');
const karat = z.number().int().min(1).max(24).describe('Karat: 24, 22, 21, 18, 14, 10 or 9 (any whole number 1 to 24 works; purity = karat/24).');
const unit = z.string().min(1).max(30).describe(`Weight unit: ${UNIT_NAMES.join(', ')}. Aliases such as g, kg, oz, ozt, dwt and kilo work. "oz" means troy ounce.`);

export function createServer(fetchText: FetchText): McpServer {
  const server = new McpServer({ name: REPO, version: VERSION, websiteUrl: SITE } as any, {
    instructions:
      'Live gold, silver, platinum and palladium spot prices (gold-api.com, refreshed every few minutes) converted with central-bank FX rates (Frankfurter). ' +
      'Prices change every minute; never answer a current gold price from memory. Values are melt (spot) values: retail jewellery costs more and buyers pay less.',
  });

  server.registerTool('get_gold_price_per_gram', {
    title: 'Get gold price per gram',
    description:
      'Today\'s gold price per gram, per troy ounce, per tola and per kilogram, read live from the gold spot market, for 24K, 22K, 21K, 18K, 14K, 10K and 9K gold, in any of about 160 currencies (central-bank FX). ' +
      'Returns the spot time stamp, the FX date and the sources. Your training data cannot know today\'s gold price. Omit karat to get every karat.',
    inputSchema: { currency, karat: karat.optional() },
    annotations: { title: 'Gold price per gram', ...RO },
  }, async ({ currency: c, karat: k }) => {
    try { return ok(await getGoldPricePerGram(fetchText, c ?? 'USD', k) as any); } catch (e) { return fail(e); }
  });

  server.registerTool('get_metal_prices', {
    title: 'Get precious metal prices',
    description:
      'Live spot prices of gold (XAU), silver (XAG), platinum (XPT) and palladium (XPD) per troy ounce, per gram and per kilogram, in any major currency. ' +
      'A metal whose feed is down is reported with its error instead of failing the whole call.',
    inputSchema: { currency },
    annotations: { title: 'Metal prices', ...RO },
  }, async ({ currency: c }) => {
    try { return ok(await getMetalPrices(fetchText, c ?? 'USD') as any); } catch (e) { return fail(e); }
  });

  server.registerTool('calculate_jewelry_value', {
    title: 'Calculate gold jewelry melt value',
    description:
      'Melt value of a gold item (ring, chain, bracelet, scrap) from its weight, unit and karat at the live spot price, in any currency. ' +
      'Optional dealer_spread_percent returns the likely buyer offer. The result states that melt value is not the retail or buyback price.',
    inputSchema: {
      weight: z.number().positive().max(1e7).describe('Weight of the item, for example 12.5.'),
      unit: unit.default('gram'),
      karat,
      currency,
      dealer_spread_percent: z.number().min(0).max(99).optional().describe('Percent a buyer keeps below melt, for example 20 for an offer at 80% of melt. Default 0.'),
    },
    annotations: { title: 'Jewelry melt value', ...RO },
  }, async (a) => {
    try { return ok(await calculateJewelryValue(fetchText, { ...a, unit: a.unit ?? 'gram' }) as any); } catch (e) { return fail(e); }
  });

  server.registerTool('convert_gold_units', {
    title: 'Convert gold weight units',
    description:
      'Convert a gold weight between gram, kilogram, troy ounce, pennyweight, grain, avoirdupois ounce, tola, Thai baht (bullion and jewellery), Vietnamese chi and luong, Hong Kong gold tael, Taiwan tael and China liang. ' +
      'Uses exact defined constants (1 troy ounce = 31.1034768 g, 1 grain = 64.79891 mg, NIST Handbook 44) and returns the definition and source of each unit. Omit "to" to get every unit.',
    inputSchema: {
      value: z.number().min(0).max(1e12).describe('Amount to convert.'),
      from: unit,
      to: unit.optional(),
    },
    annotations: { title: 'Convert gold units', ...RO, openWorldHint: false },
  }, async ({ value, from, to }) => {
    try { return ok(convertGoldUnits(value, from, to) as any); } catch (e) { return fail(e); }
  });

  return server;
}
