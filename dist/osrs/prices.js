"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMapping = getMapping;
exports.findItemByName = findItemByName;
exports.findItemsFuzzy = findItemsFuzzy;
exports.getLatestPrice = getLatestPrice;
exports.get5mAveragePrice = get5mAveragePrice;
exports.getCombinedPrice = getCombinedPrice;
const fuzzy_1 = require("./fuzzy");
const PRICES_API = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';
let mappingCache = null;
async function pricesGet(path, params) {
    const url = new URL(`${PRICES_API}${path}`);
    if (params) {
        for (const [k, v] of Object.entries(params))
            url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok)
        throw new Error(`Prices API error: ${res.status} ${res.statusText}`);
    return res.json();
}
async function getMapping() {
    if (mappingCache)
        return mappingCache;
    const data = await pricesGet('/mapping');
    mappingCache = data;
    return data;
}
async function findItemByName(name) {
    const mapping = await getMapping();
    const lower = name.toLowerCase();
    return (mapping.find((item) => item.name.toLowerCase() === lower) ??
        mapping.find((item) => item.name.toLowerCase().includes(lower)) ??
        null);
}
/** Fuzzy-rank items by name. Returns top matches above threshold. */
async function findItemsFuzzy(name, threshold = 0.25, limit = 5) {
    const mapping = await getMapping();
    return (0, fuzzy_1.fuzzyRank)(name, mapping, (item) => item.name, threshold, limit);
}
async function getLatestPrice(itemId) {
    const data = await pricesGet('/latest', { id: String(itemId) });
    const entry = data.data[String(itemId)];
    if (!entry)
        return null;
    return { id: itemId, name: '', ...entry };
}
async function get5mAveragePrice(itemId) {
    const data = await pricesGet('/5m', { id: String(itemId) });
    return data.data[String(itemId)] ?? null;
}
async function getCombinedPrice(itemName) {
    const item = await findItemByName(itemName);
    if (!item)
        return null;
    const [latest, avg] = await Promise.all([
        getLatestPrice(item.id),
        get5mAveragePrice(item.id),
    ]);
    return {
        id: item.id,
        name: item.name,
        high: latest?.high ?? null,
        highTime: latest?.highTime ?? null,
        low: latest?.low ?? null,
        lowTime: latest?.lowTime ?? null,
        avgHighPrice: avg?.avgHighPrice ?? null,
        avgLowPrice: avg?.avgLowPrice ?? null,
        examine: item.examine,
        members: item.members,
        limit: item.limit ?? null,
        highalch: item.highalch,
        lowalch: item.lowalch,
    };
}
//# sourceMappingURL=prices.js.map