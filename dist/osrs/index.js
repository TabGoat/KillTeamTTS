#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wiki_1 = require("./wiki");
const prices_1 = require("./prices");
const fuzzy_1 = require("./fuzzy");
const hiscores_1 = require("./hiscores");
const coach_1 = require("./coach");
const flip_1 = require("./flip");
const prices_2 = require("./prices");
const formatter_1 = require("./formatter");
// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function formatTimestamp(unixSec) {
    if (!unixSec)
        return null;
    return new Date(unixSec * 1000).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC';
}
/**
 * Try to resolve a wiki page title with fuzzy fallback.
 * - If exact page exists, returns it directly.
 * - Otherwise searches the wiki, fuzzy-ranks the results, and either
 *   auto-corrects (score ≥ 0.8) or shows suggestions.
 * Returns { page, resolvedTitle, autoCorrectFrom } or null.
 */
async function resolveWikiPage(query, originalQuery) {
    const page = await (0, wiki_1.getPageExtract)(query);
    if (page)
        return page;
    // Fuzzy fallback via wiki search
    const results = await (0, wiki_1.searchWiki)(query, 10);
    if (results.length === 0)
        return null;
    const ranked = (0, fuzzy_1.fuzzyRank)(query, results, (r) => r.title, 0.3, 5);
    if (ranked.length === 0) {
        // Show raw search suggestions
        (0, formatter_1.printDidYouMean)(results.slice(0, 5).map((r) => r.title));
        return null;
    }
    const best = ranked[0];
    if (best.score >= 0.6) {
        // Auto-correct: silently use the best match
        const resolved = await (0, wiki_1.getPageExtract)(best.item.title);
        if (resolved) {
            if (best.item.title.toLowerCase() !== originalQuery.toLowerCase()) {
                resolved.autoCorrectFrom = originalQuery;
            }
            return resolved;
        }
    }
    // Show fuzzy suggestions
    (0, formatter_1.printDidYouMean)(ranked.map((r) => r.item.title));
    return null;
}
/**
 * Resolve a GE item with fuzzy fallback.
 * Returns the best-matching PriceMapping item name, or null with suggestions printed.
 */
async function resolveItemName(query) {
    const exact = await (0, prices_2.findItemByName)(query);
    if (exact)
        return exact.name;
    const fuzzy = await (0, prices_1.findItemsFuzzy)(query, 0.3, 5);
    if (fuzzy.length === 0)
        return null;
    const best = fuzzy[0];
    if (best.score >= 0.7) {
        // High confidence — auto-correct
        (0, formatter_1.printAutoCorrect)(query, best.item.name);
        return best.item.name;
    }
    (0, formatter_1.printDidYouMean)(fuzzy.map((f) => f.item.name));
    return null;
}
// ────────────────────────────────────────────────────────────────────────────
// Subcommand handlers
// ────────────────────────────────────────────────────────────────────────────
async function cmdSearch(query) {
    (0, formatter_1.printHeader)('OSRS Search', query);
    const results = await (0, wiki_1.searchWiki)(query, 8);
    if (results.length === 0) {
        (0, formatter_1.printInfo)('No results found.');
        return;
    }
    for (let i = 0; i < results.length; i++) {
        (0, formatter_1.printSearchResult)(results[i].title, results[i].snippet, i + 1);
    }
    console.log('');
}
async function cmdItem(query) {
    (0, formatter_1.printHeader)('OSRS Item', query);
    // Resolve wiki page with fuzzy fallback
    const page = await resolveWikiPage(query, query);
    if (!page) {
        (0, formatter_1.printInfo)(`No wiki page found for "${query}". Try: osrs search ${query}`);
        return;
    }
    if (page.autoCorrectFrom)
        (0, formatter_1.printAutoCorrect)(page.autoCorrectFrom, page.title);
    // Resolve GE price with fuzzy fallback (use resolved title for better match)
    const resolvedItemName = await resolveItemName(page.title);
    const priceData = resolvedItemName ? await (0, prices_1.getCombinedPrice)(resolvedItemName) : null;
    (0, formatter_1.printSection)('Description');
    const intro = page.extract.split('\n\n')[0];
    (0, formatter_1.printText)(intro || page.extract.slice(0, 600));
    if (priceData) {
        (0, formatter_1.printSection)('Grand Exchange');
        (0, formatter_1.printGEBadge)(priceData.members);
        (0, formatter_1.printPrice)('Instant buy', priceData.high, true);
        (0, formatter_1.printPrice)('Instant sell', priceData.low);
        (0, formatter_1.printPrice)('5m avg buy', priceData.avgHighPrice);
        (0, formatter_1.printPrice)('5m avg sell', priceData.avgLowPrice);
        (0, formatter_1.printKeyValue)('Buy limit', priceData.limit ?? 'Unknown');
        (0, formatter_1.printPrice)('High alch', priceData.highalch ?? undefined);
        (0, formatter_1.printPrice)('Low alch', priceData.lowalch ?? undefined);
        if (priceData.examine)
            (0, formatter_1.printKeyValue)('Examine', priceData.examine);
        (0, formatter_1.printKeyValue)('Last buy', formatTimestamp(priceData.highTime));
        (0, formatter_1.printKeyValue)('Last sell', formatTimestamp(priceData.lowTime));
    }
    (0, formatter_1.printWikiLink)(page.url);
}
async function cmdMonster(query) {
    (0, formatter_1.printHeader)('OSRS Monster / NPC', query);
    const page = await resolveWikiPage(query, query);
    if (!page) {
        (0, formatter_1.printInfo)(`No wiki page found for "${query}". Try: osrs search ${query}`);
        return;
    }
    if (page.autoCorrectFrom)
        (0, formatter_1.printAutoCorrect)(page.autoCorrectFrom, page.title);
    (0, formatter_1.printSection)('Overview');
    (0, formatter_1.printText)(page.extract.split('\n\n')[0] || page.extract.slice(0, 600));
    const wikitext = await (0, wiki_1.getPageWikitext)(page.title);
    if (wikitext) {
        const fields = [
            ['Combat level', 'combat'],
            ['Hitpoints', 'hitpoints'],
            ['Max hit', 'max hit'],
            ['Attack style', 'attack style'],
            ['Attack speed', 'attack speed'],
            ['Aggressive', 'aggressive'],
            ['Poisonous', 'poisonous'],
            ['Immune to poison', 'immune to poison'],
            ['Immune to venom', 'immune to venom'],
            ['Slayer level', 'slayer level'],
            ['Slayer XP', 'slayxp'],
            ['Examine', 'examine'],
        ];
        const stats = fields
            .map(([label, field]) => ({ label, value: (0, wiki_1.extractInfoboxField)(wikitext, field) }))
            .filter((e) => e.value !== null);
        if (stats.length > 0) {
            (0, formatter_1.printSection)('Stats');
            for (const { label, value } of stats) {
                (0, formatter_1.printKeyValue)(label, value);
            }
        }
    }
    (0, formatter_1.printWikiLink)(page.url);
}
async function cmdQuest(query) {
    (0, formatter_1.printHeader)('OSRS Quest', query);
    const page = await resolveWikiPage(query, query);
    if (!page) {
        (0, formatter_1.printInfo)(`No wiki page found for "${query}". Try: osrs search ${query}`);
        return;
    }
    if (page.autoCorrectFrom)
        (0, formatter_1.printAutoCorrect)(page.autoCorrectFrom, page.title);
    (0, formatter_1.printSection)('Overview');
    (0, formatter_1.printText)(page.extract.split('\n\n')[0] || page.extract.slice(0, 600));
    const wikitext = await (0, wiki_1.getPageWikitext)(page.title);
    if (wikitext) {
        const fields = [
            ['Difficulty', 'difficulty'],
            ['Quest length', 'length'],
            ['Quest series', 'series'],
            ['Developer', 'developer'],
            ['Release date', 'release'],
            ['Quest points', 'reward'],
        ];
        const meta = fields
            .map(([label, field]) => ({ label, value: (0, wiki_1.extractInfoboxField)(wikitext, field) }))
            .filter((e) => e.value !== null);
        if (meta.length > 0) {
            (0, formatter_1.printSection)('Details');
            for (const { label, value } of meta) {
                (0, formatter_1.printKeyValue)(label, value);
            }
        }
    }
    (0, formatter_1.printWikiLink)(page.url);
}
async function cmdSkill(query) {
    (0, formatter_1.printHeader)('OSRS Skill', query);
    const page = await resolveWikiPage(query, query);
    if (!page) {
        (0, formatter_1.printInfo)(`No wiki page found for "${query}". Try: osrs search ${query}`);
        return;
    }
    if (page.autoCorrectFrom)
        (0, formatter_1.printAutoCorrect)(page.autoCorrectFrom, page.title);
    (0, formatter_1.printSection)('Overview');
    const paragraphs = page.extract.split('\n\n').slice(0, 3).join('\n\n');
    (0, formatter_1.printText)(paragraphs || page.extract.slice(0, 900));
    (0, formatter_1.printWikiLink)(page.url);
}
async function cmdPrice(query) {
    (0, formatter_1.printHeader)('OSRS Price Check', query);
    const resolvedName = await resolveItemName(query);
    if (!resolvedName) {
        (0, formatter_1.printInfo)(`Item "${query}" not found in Grand Exchange.`);
        return;
    }
    const item = await (0, prices_2.findItemByName)(resolvedName);
    if (!item)
        return;
    const latest = await (0, prices_1.getLatestPrice)(item.id);
    (0, formatter_1.printSection)('Grand Exchange');
    (0, formatter_1.printKeyValue)('Item', item.name);
    (0, formatter_1.printKeyValue)('Examine', item.examine);
    (0, formatter_1.printGEBadge)(item.members);
    (0, formatter_1.printPrice)('Instant buy', latest?.high, true);
    (0, formatter_1.printPrice)('Instant sell', latest?.low);
    (0, formatter_1.printPrice)('High alch', item.highalch ?? undefined);
    (0, formatter_1.printPrice)('Low alch', item.lowalch ?? undefined);
    (0, formatter_1.printKeyValue)('Buy limit', item.limit ?? 'Unknown');
    (0, formatter_1.printKeyValue)('Last buy', formatTimestamp(latest?.highTime));
    (0, formatter_1.printKeyValue)('Last sell', formatTimestamp(latest?.lowTime));
    console.log('');
}
// ────────────────────────────────────────────────────────────────────────────
// Account + Coach commands
// ────────────────────────────────────────────────────────────────────────────
async function cmdAccount(query) {
    // Support: osrs account <username> [ironman|hardcore|ultimate]
    const parts = query.trim().split(/\s+/);
    const modeArg = parts[parts.length - 1]?.toLowerCase();
    const validModes = ['ironman', 'hardcore', 'ultimate'];
    let mode = 'normal';
    let username;
    if (validModes.includes(modeArg)) {
        mode = modeArg;
        username = parts.slice(0, -1).join(' ');
    }
    else {
        username = query.trim();
    }
    (0, formatter_1.printHeader)(`OSRS Account — ${username}`, mode !== 'normal' ? `${mode} hiscores` : 'normal hiscores');
    const stats = await (0, hiscores_1.fetchHiscores)(username, mode).catch(async () => {
        // Auto-detect mode if normal fails
        return (0, hiscores_1.fetchHiscoresAuto)(username);
    });
    (0, formatter_1.printSection)('Skills');
    const skillsToShow = hiscores_1.SKILLS.filter((s) => s !== 'Overall');
    for (const skill of skillsToShow) {
        const s = stats.skills[skill];
        if (!s || s.level <= 0)
            continue;
        const toNext = (0, hiscores_1.xpToNextLevel)(s.xp, s.level);
        const bar = s.level >= 99 ? '██████████' : '█'.repeat(Math.floor(s.level / 10)) + '░'.repeat(10 - Math.floor(s.level / 10));
        const lvlStr = String(s.level).padStart(2, ' ');
        const nextStr = s.level < 99 ? ` (+${toNext.toLocaleString('en-GB')} xp)` : ' (maxed)';
        console.log(`  \x1b[1m\x1b[36m${skill.padEnd(15)}\x1b[0m \x1b[33m${lvlStr}\x1b[0m ${bar}\x1b[2m${nextStr}\x1b[0m`);
    }
    (0, formatter_1.printSection)('Totals');
    (0, formatter_1.printKeyValue)('Total level', stats.totalLevel);
    (0, formatter_1.printKeyValue)('Total XP', stats.totalXp.toLocaleString('en-GB'));
    (0, formatter_1.printKeyValue)('Mode', stats.mode);
    console.log('');
}
async function cmdCoach(query) {
    const parts = query.trim().split(/\s+/);
    const modeArg = parts[parts.length - 1]?.toLowerCase();
    const validModes = ['ironman', 'hardcore', 'ultimate'];
    let mode = 'normal';
    let username;
    if (validModes.includes(modeArg)) {
        mode = modeArg;
        username = parts.slice(0, -1).join(' ');
    }
    else {
        username = query.trim();
    }
    (0, formatter_1.printHeader)(`OSRS Coach — ${username}`, 'Personalised progression advice');
    const stats = await (0, hiscores_1.fetchHiscores)(username, mode).catch(() => (0, hiscores_1.fetchHiscoresAuto)(username));
    const advice = (0, coach_1.analyseAccount)(stats);
    (0, formatter_1.printSection)('Overview');
    for (const line of advice.summary)
        (0, formatter_1.printKeyValue)(line.split(':')[0], line.split(':').slice(1).join(':').trim());
    if (advice.warnings.length > 0) {
        (0, formatter_1.printSection)('⚠ Warnings');
        for (const w of advice.warnings)
            console.log(`  \x1b[33m⚠  ${w}\x1b[0m`);
    }
    if (advice.priorities.length > 0) {
        (0, formatter_1.printSection)('🎯 What to do next');
        advice.priorities.slice(0, 8).forEach((p, i) => {
            console.log(`  \x1b[1m\x1b[36m${i + 1}.\x1b[0m ${p}`);
        });
    }
    else {
        console.log('\n  \x1b[32m✓ Looking strong — keep training!\x1b[0m');
    }
    if (advice.bossesAccessible.length > 0) {
        (0, formatter_1.printSection)('🐉 Bosses you can do');
        for (const b of advice.bossesAccessible)
            console.log(`  \x1b[32m✓\x1b[0m ${b}`);
    }
    if (advice.questsUnlocked.length > 0) {
        (0, formatter_1.printSection)('📜 Quests with reqs met');
        for (const q of advice.questsUnlocked)
            console.log(`  \x1b[35m✓\x1b[0m ${q}`);
    }
    console.log('');
}
// ────────────────────────────────────────────────────────────────────────────
// Flip command
// ────────────────────────────────────────────────────────────────────────────
function trendIcon(trend, pct) {
    if (trend === 'up')
        return `\x1b[32m▲ +${pct}%\x1b[0m`;
    if (trend === 'down')
        return `\x1b[31m▼ ${pct}%\x1b[0m`;
    if (trend === 'stable')
        return `\x1b[33m━ ${pct}%\x1b[0m`;
    return '\x1b[2m?\x1b[0m';
}
function gpStr(n) {
    return n.toLocaleString('en-GB') + ' gp';
}
/** Abbreviated gp for table cells — keeps values ≤ 10 chars to avoid column overflow. */
function gpShort(n) {
    if (n >= 1000000000)
        return (n / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'b gp';
    if (n >= 1000000)
        return (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'm gp';
    if (n >= 10000)
        return (n / 1000).toFixed(1).replace(/\.?0+$/, '') + 'k gp';
    return n.toLocaleString('en-GB') + ' gp';
}
function miniChart(points) {
    const prices = points
        .map((p) => p.avgHighPrice ?? p.avgLowPrice ?? 0)
        .filter((p) => p > 0)
        .slice(-24);
    if (prices.length < 2)
        return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    return prices.map((p) => bars[Math.round(((p - min) / range) * 7)]).join('');
}
/** Parse "30m" | "1h" | "4h" | "1d" into fractional hours. Returns null if not a time string. */
function parseTimeArg(s) {
    const m = s.match(/^(\d+(?:\.\d+)?)(m|h|d)$/i);
    if (!m)
        return null;
    const n = parseFloat(m[1]);
    switch (m[2].toLowerCase()) {
        case 'm': return n / 60;
        case 'h': return n;
        case 'd': return n * 24;
    }
    return null;
}
/** Parse money strings like "5m", "500k", "1.5b", "1000000" into raw gp. Returns null if invalid. */
function parseMoney(s) {
    const m = s.match(/^(\d+(?:\.\d+)?)(k|m|b)?$/i);
    if (!m)
        return null;
    const n = parseFloat(m[1]);
    switch ((m[2] ?? '').toLowerCase()) {
        case 'k': return Math.round(n * 1000);
        case 'm': return Math.round(n * 1000000);
        case 'b': return Math.round(n * 1000000000);
        default: return Math.round(n);
    }
}
function formatTimeHours(h) {
    if (h < 1)
        return `${Math.round(h * 60)}m`;
    if (h % 24 === 0)
        return `${h / 24}d`;
    return `${h}h`;
}
function formatFillTime(minutes) {
    if (minutes >= 9999)
        return 'unknown';
    if (minutes < 60)
        return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
}
function impactLabel(impact) {
    if (impact === 'high')
        return '\x1b[31mHigh — your order may move the price\x1b[0m';
    if (impact === 'medium')
        return '\x1b[33mMedium — some price pressure expected\x1b[0m';
    return '\x1b[32mLow — safe to execute without moving market\x1b[0m';
}
async function cmdFlip(args) {
    // Parse flags and positional args
    // Syntax: osrs flip [time[-money]] [item name] [--flags]
    // time examples: 1h  4h  12h  1d  30m
    // time-money examples: 1h-500k  4h-2m  12h-1.5m  1d-10m
    const flags = new Map();
    const posParts = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            flags.set(key, args[i + 1] ?? 'true');
            i++;
        }
        else {
            posParts.push(args[i]);
        }
    }
    // Extract optional time horizon (and optional budget) from positional args
    // Matches: "12h-5m", "4h-500k", "1d-1.5b", but NOT item names
    let timeHours = 4;
    let totalBudget;
    const itemParts = [];
    for (const p of posParts) {
        // Check for combined time-money: e.g. "12h-5m", "4h-500k"
        const combinedMatch = p.match(/^(\d+(?:\.\d+)?(?:m|h|d))-(\d+(?:\.\d+)?(?:k|m|b)?)$/i);
        if (combinedMatch && itemParts.length === 0) {
            const t = parseTimeArg(combinedMatch[1]);
            const b = parseMoney(combinedMatch[2]);
            if (t !== null)
                timeHours = t;
            if (b !== null)
                totalBudget = b;
            continue;
        }
        // Check for plain time arg
        const t = parseTimeArg(p);
        if (t !== null && itemParts.length === 0) {
            timeHours = t;
        }
        else {
            itemParts.push(p);
        }
    }
    const itemQuery = itemParts.join(' ').trim();
    const filters = {
        minProfit: flags.has('profit') ? Number(flags.get('profit')) : 200,
        minRoi: flags.has('roi') ? Number(flags.get('roi')) : 0.5,
        minVolume: flags.has('vol') ? Number(flags.get('vol')) : 10,
        maxBuyPrice: flags.has('budget') ? Number(flags.get('budget')) : undefined,
        f2pOnly: flags.has('f2p'),
        membersOnly: flags.has('members'),
        limit: flags.has('limit') ? Number(flags.get('limit')) : 20,
        sortBy: flags.get('sort') ?? 'score',
        timeHours,
        totalBudget,
    };
    // ── Single item deep analysis ─────────────────────────────────────────
    if (itemQuery) {
        const resolvedName = await resolveItemName(itemQuery);
        if (!resolvedName) {
            (0, formatter_1.printInfo)(`Item "${itemQuery}" not found. Try: osrs flip (no args) to see top opportunities.`);
            return;
        }
        const item = await (0, prices_2.findItemByName)(resolvedName);
        if (!item)
            return;
        const horizonLabel = formatTimeHours(timeHours);
        (0, formatter_1.printHeader)(`GE Flip Analysis — ${item.name}`, `${horizonLabel} horizon · Live price intelligence`);
        (0, formatter_1.printInfo)('Fetching price history…');
        process.stdout.write('\x1b[1A\x1b[2K');
        const d = await (0, flip_1.analyseItemFlip)(item, timeHours);
        (0, formatter_1.printSection)('Current Prices');
        (0, formatter_1.printKeyValue)('Instant buy', gpStr(d.buyPrice));
        (0, formatter_1.printKeyValue)('Instant sell', gpStr(d.sellPrice));
        (0, formatter_1.printKeyValue)('Raw spread', gpStr(d.spread));
        (0, formatter_1.printKeyValue)('GE tax (2%)', gpStr(d.tax));
        (0, formatter_1.printKeyValue)('Profit/item', gpStr(d.profit), '\x1b[32m');
        (0, formatter_1.printKeyValue)('ROI', `${d.roi.toFixed(2)}%`);
        (0, formatter_1.printSection)(`Action Plan — ${horizonLabel} Buy Window`);
        (0, formatter_1.printKeyValue)('Offer to BUY at', gpStr(d.recommendedBuyPrice), '\x1b[36m');
        (0, formatter_1.printKeyValue)('Buy window', `${horizonLabel}  (place order now, cancel at end of window)`);
        (0, formatter_1.printKeyValue)('Qty fills in', `~${d.recommendedQty.toLocaleString('en-GB')} items  (fills in ≤ ${formatFillTime(d.buyFillMinutes)} — within window)`);
        (0, formatter_1.printKeyValue)('Total investment', gpStr(d.totalInvestment), '\x1b[33m');
        (0, formatter_1.printKeyValue)('Offer to SELL at', gpStr(d.recommendedSellPrice), '\x1b[36m');
        (0, formatter_1.printKeyValue)('Sell fills in', formatFillTime(d.estimatedFillMinutes) + '  (after buy window closes)');
        (0, formatter_1.printKeyValue)('Total cycle', formatFillTime(Math.round(timeHours * 60) + d.estimatedFillMinutes));
        (0, formatter_1.printKeyValue)('Expected profit', gpStr(d.expectedProfit), '\x1b[1m\x1b[32m');
        (0, formatter_1.printKeyValue)('Market impact', impactLabel(d.marketImpact));
        (0, formatter_1.printKeyValue)('Buy limit', `${d.buyLimit.toLocaleString('en-GB')} per 4h`);
        (0, formatter_1.printSection)('Market Conditions');
        (0, formatter_1.printKeyValue)('Hourly volume', `~${d.hourlyVolume.toLocaleString('en-GB')} items/hr`);
        (0, formatter_1.printKeyValue)('Trend (5m)', trendIcon(d.trend, d.trendPct));
        (0, formatter_1.printKeyValue)('1h change', `${d.priceChange1h > 0 ? '+' : ''}${d.priceChange1h}%`);
        (0, formatter_1.printKeyValue)('24h change', `${d.priceChange24h > 0 ? '+' : ''}${d.priceChange24h}%`);
        (0, formatter_1.printKeyValue)('Volatility', `${d.volatility}%`);
        (0, formatter_1.printGEBadge)(d.members);
        if (d.timeseries.length > 1) {
            (0, formatter_1.printSection)('Price Chart (last 2h, each block = 5m)');
            const chart = miniChart(d.timeseries);
            console.log(`\n  \x1b[36m${chart}\x1b[0m`);
            const pts = d.timeseries.filter((p) => (p.avgHighPrice ?? p.avgLowPrice) !== null);
            if (pts.length >= 2) {
                const oldest = pts[0].avgHighPrice ?? pts[0].avgLowPrice ?? 0;
                const newest = pts[pts.length - 1].avgHighPrice ?? pts[pts.length - 1].avgLowPrice ?? 0;
                console.log(`  \x1b[2m${gpStr(oldest)} → ${gpStr(newest)}\x1b[0m\n`);
            }
        }
        (0, formatter_1.printSection)('Recommendation');
        console.log(`\n  ${d.recommendation}\n`);
        (0, formatter_1.printKeyValue)('Examine', d.examine);
        return;
    }
    // ── Bulk scan ─────────────────────────────────────────────────────────
    const horizonLabel = formatTimeHours(timeHours);
    const budgetLabel = totalBudget ? `  ·  budget ${gpShort(totalBudget)} (${gpShort(Math.floor(totalBudget / (filters.limit ?? 20)))} per slot)` : '';
    (0, formatter_1.printHeader)('GE Flip Opportunities', `top ${filters.limit} · ${horizonLabel} horizon · sorted by ${filters.sortBy}${budgetLabel}`);
    (0, formatter_1.printInfo)('Scanning all GE items… (this takes a moment)');
    const opps = await (0, flip_1.findFlipOpportunities)(filters);
    process.stdout.write('\x1b[1A\x1b[2K');
    if (opps.length === 0) {
        (0, formatter_1.printInfo)('No opportunities found with current filters. Try loosening --profit or --vol.');
        return;
    }
    // Action-plan table: item | Buy @ | Qty | Invest | Sell @ | Profit | ROI | Buy/Sell fill | Trend
    const col = { name: 26, buyAt: 14, qty: 7, invest: 14, sellAt: 14, profit: 12, roi: 7, fill: 10, trend: 10 };
    const divLen = col.name + col.buyAt + col.qty + col.invest + col.sellAt + col.profit + col.roi + col.fill + col.trend;
    const H = '\x1b[1m\x1b[33m';
    const R = '\x1b[0m';
    console.log(`\n${H}` +
        '  ' + 'Item'.padEnd(col.name) +
        'Buy @'.padEnd(col.buyAt) +
        'Qty'.padEnd(col.qty) +
        'Invest'.padEnd(col.invest) +
        'Sell @'.padEnd(col.sellAt) +
        'Profit'.padEnd(col.profit) +
        'ROI'.padEnd(col.roi) +
        'Buy/Sell fill'.padEnd(col.fill) + 'Trend' +
        `${R}`);
    console.log(`  \x1b[2m  Buy window = ${horizonLabel} · Qty guaranteed to fill within window · Buy/Sell fill = buy fill time / sell fill time\x1b[0m`);
    console.log('  ' + '─'.repeat(divLen));
    for (const o of opps) {
        const nameStr = o.name.slice(0, col.name - 1).padEnd(col.name);
        const buyAtStr = gpShort(o.recommendedBuyPrice).padEnd(col.buyAt);
        const qtyStr = o.recommendedQty.toLocaleString('en-GB').padEnd(col.qty);
        const investStr = gpShort(o.totalInvestment).padEnd(col.invest);
        const sellAtStr = gpShort(o.recommendedSellPrice).padEnd(col.sellAt);
        // ANSI compensation: \x1b[3Xm = 5 chars + \x1b[0m = 4 chars = 9 invisible
        const profitClr = o.expectedProfit > 100000 ? '\x1b[32m' : o.expectedProfit > 20000 ? '\x1b[33m' : '';
        const profitStr = profitClr
            ? `${profitClr}${gpShort(o.expectedProfit)}\x1b[0m`.padEnd(col.profit + 9)
            : gpShort(o.expectedProfit).padEnd(col.profit);
        const roiStr = `${o.roi.toFixed(1)}%`.padEnd(col.roi);
        // Show buy fill (≤ window) / sell fill side by side
        const buyFill = formatFillTime(o.buyFillMinutes);
        const sellFill = formatFillTime(o.estimatedFillMinutes);
        const fillStr = `${buyFill}/${sellFill}`.padEnd(col.fill);
        const trendStr = trendIcon(o.trend, o.trendPct);
        console.log(`  ${nameStr}${buyAtStr}${qtyStr}${investStr}${sellAtStr}${profitStr}${roiStr}${fillStr}${trendStr}`);
    }
    // Budget summary footer
    if (totalBudget) {
        const totalInvested = opps.reduce((s, o) => s + o.totalInvestment, 0);
        const totalProfit = opps.reduce((s, o) => s + o.expectedProfit, 0);
        const remaining = totalBudget - totalInvested;
        console.log('  ' + '─'.repeat(divLen));
        console.log(`\n  \x1b[1mBudget:\x1b[0m ${gpShort(totalInvested)} invested across ${opps.length} slots` +
            ` · \x1b[32m+${gpShort(totalProfit)} profit\x1b[0m` +
            (remaining > 0 ? ` · \x1b[2m${gpShort(remaining)} unallocated\x1b[0m` : '') +
            ` · budget was ${gpShort(totalBudget)}`);
    }
    console.log(`\n  \x1b[2mTip: osrs flip "<item>" for deep analysis  |  osrs flip 1h-500k  |  osrs flip 1d --sort profit_total\x1b[0m\n`);
}
// ────────────────────────────────────────────────────────────────────────────
function printUsage() {
    console.log(`
\x1b[1m\x1b[36mOSRS Super Dictionary\x1b[0m  ⚔  Old School RuneScape lookup tool

\x1b[1mLookup:\x1b[0m
  osrs search  <term>        Search the OSRS Wiki for anything
  osrs item    <name>        Item details + Grand Exchange price
  osrs monster <name>        Monster / NPC stats and info
  osrs quest   <name>        Quest overview and details
  osrs skill   <name>        Skill overview
  osrs price   <name>        Grand Exchange price only (fast)

\x1b[1mAccount:\x1b[0m
  osrs account <username>    Show all skill levels for a player
  osrs coach   <username>    Personalised advice on what to do next

\x1b[1mFlipping:\x1b[0m
  osrs flip                  Scan all GE items for top flip opportunities (default 4h horizon)
  osrs flip <time>           Set time horizon: 30m | 1h | 4h | 12h | 1d
  osrs flip <item>           Deep analysis: margin, action plan, trend, chart
  osrs flip 1h <item>        Deep analysis with a specific time horizon
  osrs flip --budget 500000  Filter by max buy price per item
  osrs flip --roi 2          Filter by minimum ROI %
  osrs flip --vol 50         Filter by minimum hourly volume
  osrs flip --sort roi       Sort by: score (default) | profit_total | roi | volume | profit | profit4h
  osrs flip --f2p            Free-to-play items only

\x1b[1mExamples:\x1b[0m
  osrs flip 4h
  osrs flip 1d --sort profit_total
  osrs flip "abyssal whip"
  osrs flip 1h "abyssal whip"
  osrs flip 4h --budget 1000000 --sort roi
  osrs coach Zezima
  osrs price "dragon bones"
`);
}
// ────────────────────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || (args.length === 1 && !['flip'].includes(args[0].toLowerCase()))) {
        printUsage();
        process.exit(0);
    }
    const subcommand = args[0].toLowerCase();
    const query = args.slice(1).join(' ');
    const rawArgs = args.slice(1);
    try {
        switch (subcommand) {
            case 'search':
                await cmdSearch(query);
                break;
            case 'item':
                await cmdItem(query);
                break;
            case 'monster':
                await cmdMonster(query);
                break;
            case 'quest':
                await cmdQuest(query);
                break;
            case 'skill':
                await cmdSkill(query);
                break;
            case 'price':
                await cmdPrice(query);
                break;
            case 'account':
                await cmdAccount(query);
                break;
            case 'coach':
                await cmdCoach(query);
                break;
            case 'flip':
                await cmdFlip(rawArgs);
                break;
            default:
                (0, formatter_1.printError)(`Unknown subcommand: "${subcommand}"`);
                printUsage();
                process.exit(1);
        }
    }
    catch (err) {
        (0, formatter_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map