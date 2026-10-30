// Local shipping test: initialize, tools/list and one real tools/call per tool over stdio.
// Usage: node scripts/smoke-stdio.mjs [command args...]   (default: node dist/stdio.js)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const [cmd, ...args] = process.argv.length > 2 ? process.argv.slice(2) : ['node', 'dist/stdio.js'];
const client = new Client({ name: 'smoke', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: cmd, args }));
console.log('server:', JSON.stringify(client.getServerVersion()));
const { tools } = await client.listTools();
console.log('tools:', tools.map((t) => t.name).join(', '));
const calls = [
  ['get_gold_price_per_gram', { currency: 'INR' }],
  ['get_metal_prices', { currency: 'EUR' }],
  ['calculate_jewelry_value', { weight: 10, unit: 'gram', karat: 14, currency: 'USD', dealer_spread_percent: 20 }],
  ['convert_gold_units', { value: 1, from: 'troy_ounce' }],
];
let bad = 0;
for (const [name, a] of calls) {
  const r = await client.callTool({ name, arguments: a });
  if (r.isError) bad++;
  console.log(`\n== ${name} ${r.isError ? 'ERROR' : 'ok'}\n${r.content[0].text.split('\n\n')[0].slice(0, 700)}`);
}
await client.close();
process.exit(bad ? 1 : 0);
