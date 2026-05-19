import { PriceMapping, ItemPrice } from './types';
import { fuzzyRank, FuzzyMatch } from './fuzzy';

const PRICES_API = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';

let mappingCache: PriceMapping[] | null = null;

async function pricesGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${PRICES_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Prices API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getMapping(): Promise<PriceMapping[]> {
  if (mappingCache) return mappingCache;
  const data = await pricesGet<PriceMapping[]>('/mapping');
  mappingCache = data;
  return data;
}

export async function findItemByName(name: string): Promise<PriceMapping | null> {
  const mapping = await getMapping();
  const lower = name.toLowerCase();
  return (
    mapping.find((item) => item.name.toLowerCase() === lower) ??
    mapping.find((item) => item.name.toLowerCase().includes(lower)) ??
    null
  );
}

/** Fuzzy-rank items by name. Returns top matches above threshold. */
export async function findItemsFuzzy(
  name: string,
  threshold = 0.25,
  limit = 5
): Promise<FuzzyMatch<PriceMapping>[]> {
  const mapping = await getMapping();
  return fuzzyRank(name, mapping, (item) => item.name, threshold, limit);
}

export async function getLatestPrice(itemId: number): Promise<ItemPrice | null> {
  const data = await pricesGet<{ data: Record<string, { high: number | null; highTime: number | null; low: number | null; lowTime: number | null }> }>(
    '/latest',
    { id: String(itemId) }
  );
  const entry = data.data[String(itemId)];
  if (!entry) return null;
  return { id: itemId, name: '', ...entry };
}

export async function get5mAveragePrice(itemId: number): Promise<{ avgHighPrice: number | null; avgLowPrice: number | null } | null> {
  const data = await pricesGet<{ data: Record<string, { avgHighPrice: number | null; avgLowPrice: number | null }> }>(
    '/5m',
    { id: String(itemId) }
  );
  return data.data[String(itemId)] ?? null;
}

export async function getCombinedPrice(itemName: string): Promise<(ItemPrice & { examine: string; members: boolean; limit: number | null; highalch: number | null; lowalch: number | null }) | null> {
  const item = await findItemByName(itemName);
  if (!item) return null;

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
