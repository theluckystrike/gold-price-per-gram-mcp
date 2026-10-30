# gold-price-per-gram-mcp

The live gold price per gram for AI assistants, by karat and currency, with metal prices, jewelry melt value and exact gold unit conversion.

This is a Model Context Protocol (MCP) server. It reads the gold, silver, platinum and palladium spot price at call time and converts it with central-bank FX rates for about 160 currencies. It needs no API key.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_gold_price_per_gram` | Gold price per gram, troy ounce, tola and kilogram for 24K, 22K, 21K, 18K, 14K, 10K and 9K in any currency, with the spot time stamp and FX date. |
| `get_metal_prices` | Spot price of gold, silver, platinum and palladium per troy ounce, gram and kilogram in any currency. A metal whose feed is down is reported, not fatal. |
| `calculate_jewelry_value` | Melt value of a gold item from weight, unit and karat, with an optional dealer spread percent. States that retail and buyback prices differ from melt value. |
| `convert_gold_units` | Exact conversion between gram, kilogram, troy ounce, pennyweight, grain, avoirdupois ounce, tola, Thai baht, Vietnamese chi and luong, Hong Kong tael, Taiwan tael and China liang, with the definition and source of each unit. |

Every result has structured JSON, a one-paragraph summary, `as_of`, `source` and `more` (the matching page on [goldgramprice.com](https://goldgramprice.com/?utm_source=mcp&utm_medium=gold-price-per-gram-mcp)).

## What it knows that your model does not

- Today's gold price. Spot moves every minute and a model's training data is months old.
- Today's exchange rate for INR, AED, SAR, PKR, EUR, GBP and about 150 more currencies.
- Exact unit constants. A troy ounce is 31.1034768 g and a grain is 64.79891 mg by definition (NIST Handbook 44). A tola is 180 grains. A Thai bullion baht is 15.244 g, not 15 g. A kitchen-scale ounce is 28.349523125 g, not a troy ounce.
- Karat purity as an exact fraction (karat / 24), so 22K is 91.6667% and 14K is 58.3333%.

## Install

### Hosted (Claude.ai custom connector, ChatGPT developer mode)

Paste this URL. No token, no sign-up.

```
https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http gold-price https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp
```

Or run it locally over stdio:

```
claude mcp add gold-price -- npx -y github:theluckystrike/gold-price-per-gram-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gold-price": { "command": "npx", "args": ["-y", "github:theluckystrike/gold-price-per-gram-mcp"] }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gold-price": { "url": "https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "gold-price": { "type": "http", "url": "https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

Node 20 or newer is needed for the local stdio version.

## Example prompts

- "What is the 22K gold price per gram in India today?"
- "How much is one tola of 24K gold in Pakistani rupees?"
- "I have a 14K chain that weighs 12 grams. What is its melt value, and what might a buyer offer at a 25% spread?"
- "Show gold, silver and platinum prices in euros."
- "How many grams are in a Thai baht of gold, and in a Vietnamese chi?"

## Data sources

All keyless and free to use from a server. Full list with fetch dates in [DATA_SOURCES.md](DATA_SOURCES.md).

- Spot prices from [gold-api.com](https://gold-api.com/), the same feed goldgramprice.com uses. Its terms allow commercial use and ask callers not to send several requests per second, so the hosted server caches each price for 5 minutes.
- FX rates from [Frankfurter](https://frankfurter.dev/), blended from the ECB and other central banks. Cached for 1 hour. Rates update once a working day.
- Unit constants from NIST Handbook 44 Appendix C. Karat definition from 16 CFR 23.3.

## Limitations

- Prices are spot (melt) values for pure metal. Jewellery in a shop costs more (making charges, design, tax) and buyers pay less (refining and margin). The tools say so in every answer.
- The spot price can be up to 5 minutes old on the hosted server. FX rates are daily reference rates, not live market quotes.
- Purity uses the nominal karat fraction. Real items can be slightly under (legal tolerances) or over.
- Regional tael values differ (Hong Kong 37.429 g, Vietnam 37.5 g, Taiwan 37.5 g, China 50 g). Pick the one you mean.
- When a price feed is down, the tool returns a clear error instead of a stale or remembered number.

## More

Karat calculators, scrap gold, city price pages and gold price history are on [goldgramprice.com](https://goldgramprice.com/?utm_source=mcp&utm_medium=gold-price-per-gram-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm test            # builds, then runs the fixture tests against saved upstream payloads
node scripts/smoke-stdio.mjs   # live stdio check, one real call per tool
npx wrangler deploy            # Cloudflare Worker, Streamable HTTP at /mcp
```

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
