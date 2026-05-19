"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFlipOpportunities = findFlipOpportunities;
exports.analyseItemFlip = analyseItemFlip;
const prices_1 = require("./prices");
const PRICES_API = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';
// ── Constants ─────────────────────────────────────────────────────────────
const STALE_SECONDS = 30 * 60; // prices older than 30 min are unreliable
const MAX_SPREAD_RATIO = 0.40; // spread > 40% of buy price = anomaly / manipulation
const GE_TAX_CAP = 5000000; // GE tax is capped at 5M gp per transaction
// ── API helpers ───────────────────────────────────────────────────────────
async function fetchJson(path) {
    const res = await fetch(`${PRICES_API}${path}`, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok)
        throw new Error(`Prices API ${path}: ${res.status}`);
    return res.json();
}
// ── Tax calculation ───────────────────────────────────────────────────────
/**
 * GE tax: 2% of sell price, exempt under 50 gp, capped at 5,000,000 gp.
 * Always applied to the sell price (what you receive).
 */
function calcTax(sellPrice) {
    if (sellPrice < 50)
        return 0;
    return Math.min(Math.floor(sellPrice * 0.02), GE_TAX_CAP);
}
// ── Trend classification ──────────────────────────────────────────────────
function classifyTrend(avg5m, avg1h) {
    const price5m = avg5m?.avgHighPrice ?? avg5m?.avgLowPrice;
    const price1h = avg1h?.avgHighPrice ?? avg1h?.avgLowPrice;
    if (!price5m || !price1h || price1h === 0)
        return { trend: 'unknown', trendPct: 0 };
    const pct = ((price5m - price1h) / price1h) * 100;
    const trend = pct > 1 ? 'up' : pct < -1 ? 'down' : 'stable';
    return { trend, trendPct: Math.round(pct * 10) / 10 };
}
// ── Action plan helpers ───────────────────────────────────────────────────
/**
 * Compute the time-horizon-aware action plan for a flip.
 *
 * timeHours = the buy window: how long the buy order stays open before you
 *             cancel it and start selling. This is "time between start of
 *             buy and start of sale."
 *
 * Quantity = how many items realistically fill during that buy window.
 *   - Use 50% of market volume in the window (conservative fill rate at +1 gp)
 *   - Cap by available GE buy limit (resets every 4h)
 *
 * estimatedFillMinutes = how long the SELL order takes AFTER the buy closes.
 */
function computeActionPlan(buyPrice, sellPrice, profit, buyLimit, hourlyVolume, timeHours) {
    // +1 gp over insta-buy price → guaranteed first in buy queue
    const recommendedBuyPrice = buyPrice + 1;
    // -1 gp under insta-sell price → first in sell queue
    const recommendedSellPrice = Math.max(sellPrice - 1, recommendedBuyPrice + 1);
    // STRICT: qty is hard-capped at total market volume in the buy window.
    // qty / hourlyVolume × 60 ≤ timeHours × 60 is always guaranteed by construction.
    const volumeInWindow = Math.floor(hourlyVolume * timeHours); // max fillable in window
    const limitWindows = Math.ceil(timeHours / 4); // GE limit resets every 4h
    const availableLimit = buyLimit * limitWindows;
    const recommendedQty = Math.max(1, Math.min(availableLimit, volumeInWindow));
    const totalInvestment = recommendedBuyPrice * recommendedQty;
    const adjustedProfit = Math.max(0, (recommendedSellPrice - recommendedBuyPrice) - calcTax(recommendedSellPrice));
    const expectedProfit = adjustedProfit * recommendedQty;
    // Buy fill time: strictly within the window (by construction of qty)
    const buyFillMinutes = hourlyVolume > 0
        ? Math.ceil((recommendedQty / hourlyVolume) * 60)
        : Math.round(timeHours * 60);
    // Sell fill time: selling at high-1 undercuts the queue, so it fills roughly
    // twice as fast as the buy order — use half the buy fill time.
    const estimatedFillMinutes = Math.max(1, Math.ceil(buyFillMinutes / 2));
    // Market impact: fraction of window's volume we're absorbing
    const impactRatio = volumeInWindow > 0 ? recommendedQty / volumeInWindow : 1;
    const marketImpact = impactRatio >= 0.8 ? 'high' : impactRatio >= 0.4 ? 'medium' : 'low';
    return { recommendedBuyPrice, recommendedSellPrice, recommendedQty, totalInvestment, expectedProfit, estimatedFillMinutes, marketImpact, buyFillMinutes };
}
async function findFlipOpportunities(filters = {}) {
    const { minProfit = 200, minRoi = 0.5, minVolume = 10, maxBuyPrice, membersOnly, f2pOnly, limit = 20, sortBy = 'score', timeHours = 4, totalBudget, } = filters;
    const nowSec = Math.floor(Date.now() / 1000);
    const [mapping, latestData, data5m, data1h, data24h] = await Promise.all([
        (0, prices_1.getMapping)(),
        fetchJson('/latest'),
        fetchJson('/5m'),
        fetchJson('/1h'),
        fetchJson('/24h'),
    ]);
    const mapById = new Map(mapping.map((m) => [m.id, m]));
    const opportunities = [];
    for (const [idStr, latest] of Object.entries(latestData.data)) {
        const id = Number(idStr);
        const item = mapById.get(id);
        if (!item)
            continue;
        // Require both prices present
        if (!latest.high || !latest.low || !latest.highTime || !latest.lowTime)
            continue;
        if (latest.high <= 0 || latest.low <= 0)
            continue;
        // Staleness check — both buy and sell prices must be fresh
        const dataAge = nowSec - Math.min(latest.highTime, latest.lowTime);
        if (dataAge > STALE_SECONDS)
            continue;
        // Correct assignment:  low = what you PAY,  high = what you RECEIVE
        const buyPrice = latest.low;
        const sellPrice = latest.high;
        if (buyPrice >= sellPrice)
            continue; // no positive spread
        const spread = sellPrice - buyPrice;
        // Anomaly filter: spread > 40% of buy price = stale or manipulated
        if (spread / buyPrice > MAX_SPREAD_RATIO)
            continue;
        const tax = calcTax(sellPrice);
        const profit = spread - tax;
        if (profit <= 0)
            continue;
        const roi = (profit / buyPrice) * 100;
        const avg5m = data5m.data[idStr];
        const avg1h = data1h.data[idStr];
        const avg24h = data24h.data[idStr];
        // Prefer 24h daily-average ÷ 24 for a stable hourly rate.
        // A single 1h snapshot can be zero during off-peak hours for low-volume items.
        const vol24hHigh = avg24h?.highPriceVolume ?? 0;
        const vol24hLow = avg24h?.lowPriceVolume ?? 0;
        const has24h = vol24hHigh > 0 && vol24hLow > 0;
        const vol1hHigh = avg1h?.highPriceVolume ?? 0;
        const vol1hLow = avg1h?.lowPriceVolume ?? 0;
        const has1h = vol1hHigh > 0 && vol1hLow > 0;
        // Require at least one endpoint to show both buy and sell sides active
        if (!has24h && !has1h)
            continue;
        const hourlyVolume = has24h
            ? Math.round((vol24hHigh + vol24hLow) / 24)
            : (vol1hHigh + vol1hLow);
        const buyLimit = item.limit ?? 0;
        // Cap by actual reachable volume in 4h so maxProfit is realistic
        const volume4h = hourlyVolume * 4;
        const maxProfit4h = profit * Math.min(buyLimit, volume4h);
        const { trend, trendPct } = classifyTrend(avg5m, avg1h);
        // User-defined filters
        if (profit < minProfit)
            continue;
        if (roi < minRoi)
            continue;
        if (hourlyVolume < minVolume)
            continue;
        if (maxBuyPrice && buyPrice > maxBuyPrice)
            continue;
        if (membersOnly && !item.members)
            continue;
        if (f2pOnly && item.members)
            continue;
        const actionPlan = computeActionPlan(buyPrice, sellPrice, profit, buyLimit, hourlyVolume, timeHours);
        opportunities.push({
            id, name: item.name, members: item.members, examine: item.examine,
            buyPrice, sellPrice, spread, tax, profit, roi,
            buyLimit, maxProfit4h, hourlyVolume, trend, trendPct, dataAge,
            ...actionPlan,
        });
    }
    // Composite score: balances ROI, absolute profit, and volume
    const score = (o) => o.roi * Math.log10(Math.max(o.hourlyVolume, 1)) * Math.log10(Math.max(o.profit, 1));
    const sorted = opportunities.sort((a, b) => {
        switch (sortBy) {
            case 'roi': return b.roi - a.roi;
            case 'volume': return b.hourlyVolume - a.hourlyVolume;
            case 'profit': return b.profit - a.profit;
            case 'profit4h': return b.maxProfit4h - a.maxProfit4h;
            case 'profit_total': return b.expectedProfit - a.expectedProfit;
            default: return score(b) - score(a); // 'score' — balanced default
        }
    });
    const sliced = sorted.slice(0, limit);
    // Apply total budget: split equally across slots, cap each item's qty
    if (totalBudget && totalBudget > 0 && sliced.length > 0) {
        const perItemBudget = Math.floor(totalBudget / sliced.length);
        const budgeted = [];
        for (const o of sliced) {
            const budgetQty = Math.floor(perItemBudget / o.recommendedBuyPrice);
            if (budgetQty < 1)
                continue; // can't afford even one — skip slot
            const qty = Math.min(o.recommendedQty, budgetQty);
            const invest = o.recommendedBuyPrice * qty;
            const profitPer = Math.max(0, o.expectedProfit / Math.max(o.recommendedQty, 1));
            const profit = Math.round(profitPer * qty);
            const buyFill = o.hourlyVolume > 0 ? Math.ceil((qty / o.hourlyVolume) * 60) : 9999;
            budgeted.push({ ...o, recommendedQty: qty, totalInvestment: invest, expectedProfit: profit, buyFillMinutes: buyFill, estimatedFillMinutes: Math.max(1, Math.ceil(buyFill / 2)) });
        }
        return budgeted;
    }
    return sliced;
}
async function analyseItemFlip(item, timeHours = 4) {
    const nowSec = Math.floor(Date.now() / 1000);
    const [latestData, avg5m, avg1h, avg24h, timeseries] = await Promise.all([
        fetchJson(`/latest?id=${item.id}`),
        fetchJson(`/5m?id=${item.id}`),
        fetchJson(`/1h?id=${item.id}`),
        fetchJson(`/24h?id=${item.id}`),
        fetchJson(`/timeseries?timestep=5m&id=${item.id}`),
    ]);
    const latest = latestData.data[item.id];
    // Correct assignment: low = what you PAY, high = what you RECEIVE
    const buyPrice = latest?.low ?? 0;
    const sellPrice = latest?.high ?? 0;
    const spread = Math.max(0, sellPrice - buyPrice);
    const tax = calcTax(sellPrice);
    const profit = Math.max(0, spread - tax);
    const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;
    const dataAge = latest?.highTime && latest?.lowTime
        ? nowSec - Math.min(latest.highTime, latest.lowTime)
        : 9999;
    const avg5mEntry = avg5m.data[item.id];
    const avg1hEntry = avg1h.data[item.id];
    const avg24hEntry = avg24h.data[item.id];
    // Prefer 24h daily-average ÷ 24 for a stable hourly rate
    const vol24hHigh = avg24hEntry?.highPriceVolume ?? 0;
    const vol24hLow = avg24hEntry?.lowPriceVolume ?? 0;
    const hourlyVolume = (vol24hHigh > 0 && vol24hLow > 0)
        ? Math.round((vol24hHigh + vol24hLow) / 24)
        : (avg1hEntry?.highPriceVolume ?? 0) + (avg1hEntry?.lowPriceVolume ?? 0);
    const buyLimit = item.limit ?? 0;
    const volume4h = hourlyVolume * 4;
    const maxProfit4h = profit * Math.min(buyLimit, volume4h);
    const { trend, trendPct } = classifyTrend(avg5mEntry, avg1hEntry);
    const points = timeseries.data ?? [];
    const prices = points
        .map((p) => p.avgHighPrice ?? p.avgLowPrice)
        .filter((p) => p !== null && p > 0);
    const priceChange1h = calcChangePct(prices, 12);
    const priceChange24h = calcChangePct(prices, 288);
    const volatility = calcVolatility(prices.slice(-12));
    // Recommendation engine
    const stale = dataAge > STALE_SECONDS;
    const anomaly = spread > 0 && buyPrice > 0 && spread / buyPrice > MAX_SPREAD_RATIO;
    let recommendation;
    if (stale)
        recommendation = '⚠️ Price data is stale (>30 min old) — do not trade on this.';
    else if (anomaly)
        recommendation = '⚠️ Spread is abnormally wide — possible manipulation or illiquid market.';
    else if (trend === 'up' && roi > 2)
        recommendation = '📈 Strong buy — price trending up + healthy margin.';
    else if (trend === 'up' && roi < 1)
        recommendation = '📈 Trending up but margin is thin — watch for slippage.';
    else if (trend === 'down' && roi > 3)
        recommendation = '⚠️ High margin but price falling — flip fast or skip.';
    else if (trend === 'down' && roi < 1)
        recommendation = '❌ Avoid — price falling and margin is thin.';
    else
        recommendation = '🔍 Neutral — standard flip opportunity.';
    if (!stale && !anomaly && volatility > 5)
        recommendation += ' High volatility — act quickly.';
    if (!stale && !anomaly && hourlyVolume < 20)
        recommendation += ' Low volume — orders may take time to fill.';
    return {
        id: item.id, name: item.name, members: item.members, examine: item.examine,
        buyPrice, sellPrice, spread, tax, profit, roi,
        buyLimit, maxProfit4h, hourlyVolume, trend, trendPct, dataAge,
        ...computeActionPlan(buyPrice, sellPrice, profit, buyLimit, hourlyVolume, timeHours),
        timeseries: points.slice(-60),
        priceChange1h, priceChange24h, volatility, recommendation,
    };
}
function calcChangePct(prices, lookback) {
    if (prices.length < 2)
        return 0;
    const recent = prices[prices.length - 1];
    const old = prices[Math.max(0, prices.length - 1 - lookback)];
    if (!old || old === 0)
        return 0;
    return Math.round(((recent - old) / old) * 1000) / 10;
}
function calcVolatility(prices) {
    if (prices.length < 2)
        return 0;
    const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
    const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
    return Math.round((Math.sqrt(variance) / mean) * 1000) / 10;
}
//# sourceMappingURL=flip.js.map