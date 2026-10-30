# Data sources

All sources below were fetched on 2026-10-30 while building version 1.0.0.

## Live data (read at call time, no key)

| Data | URL | Terms |
|---|---|---|
| Gold, silver, platinum, palladium spot in USD per troy ounce | https://api.gold-api.com/price/XAU (also XAG, XPT, XPD) | https://gold-api.com/terms says the real-time price API is free, has no rate limit, and that commercial use is always permitted. It forbids several requests per second, so the Worker caches each answer at the edge for 300 s. |
| FX rates, USD base, about 160 currencies blended from central banks (ECB and others) | https://api.frankfurter.dev/v2/rates?base=USD | https://frankfurter.dev says the public API is free and needs no key, and that commercial use is allowed. Cached 3600 s. Rates update once a working day. |

This is the same spot feed goldgramprice.com uses (`scripts/fetch-spot.mjs`, source `gold-api.com` in `src/data/metals.json`). The site's optional paid keys (goldapi.io, metalpriceapi.com) are not used here and no key ships in this repo.

## Constants

| Constant | Value | Source |
|---|---|---|
| grain | 64.79891 mg exactly | NIST Handbook 44 (2024) Appendix C, https://www.nist.gov/system/files/documents/2024/01/14/NIST%20HB%2044%202024%20Appendix%20C%20General%20Tables%20of%20Units%20of%20Measurement.pdf |
| troy ounce | 480 grains = 31.1034768 g exactly | NIST Handbook 44 Appendix C |
| pennyweight | 1/20 troy ounce = 1.55517384 g | NIST Handbook 44 Appendix C |
| avoirdupois ounce | 28.349523125 g exactly | NIST Handbook 44 Appendix C |
| tola | 180 grains = 11.6638038 g = 3/8 troy ounce | https://en.wikipedia.org/wiki/Tola_(unit) (Regulation VII of 1833) |
| Thai baht (gold) | 15.244 g bullion, 15.16 g jewellery | https://en.wikipedia.org/wiki/Baht_(unit) |
| Vietnamese chi and luong | 3.75 g and 37.5 g (gold trade) | https://en.wikipedia.org/wiki/Tael |
| Hong Kong gold tael (troy tael) | 37.429 g | https://en.wikipedia.org/wiki/Tael (Hong Kong troy units) |
| Taiwan tael, China liang | 37.5 g, 50 g | https://en.wikipedia.org/wiki/Tael |
| Karat purity | karat / 24; 24 karat is fine gold | 16 CFR 23.3, https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-23/section-23.3 |

The Hong Kong tael value of 37.429 g is a rounded trade value, so the tool marks it `exact: false`.
