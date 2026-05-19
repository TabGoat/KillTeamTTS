"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchWiki = searchWiki;
exports.getPageExtract = getPageExtract;
exports.getPageWikitext = getPageWikitext;
exports.extractInfoboxField = extractInfoboxField;
const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';
async function wikiGet(params) {
    const url = new URL(WIKI_API);
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok)
        throw new Error(`Wiki API error: ${res.status} ${res.statusText}`);
    return res.json();
}
async function searchWiki(term, limit = 8) {
    const data = (await wikiGet({
        action: 'query',
        list: 'search',
        srsearch: term,
        srnamespace: '0',
        srlimit: String(limit),
        srprop: 'snippet|size|wordcount',
    }));
    return data.query.search.map((r) => ({
        title: r.title,
        snippet: r.snippet.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
        size: r.size,
        wordcount: r.wordcount,
    }));
}
async function getPageExtract(title) {
    const data = (await wikiGet({
        action: 'query',
        titles: title,
        prop: 'extracts',
        exintro: '1',
        explaintext: '1',
        redirects: '1',
    }));
    const pages = data.query.pages;
    const page = Object.values(pages)[0];
    if (!page || 'missing' in page)
        return null;
    const resolvedTitle = data.query.redirects?.[0]?.to ?? page.title;
    return {
        title: resolvedTitle,
        extract: (page.extract ?? '').trim(),
        url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
    };
}
async function getPageWikitext(title) {
    const data = (await wikiGet({
        action: 'query',
        titles: title,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        redirects: '1',
    }));
    const page = Object.values(data.query.pages)[0];
    if (!page || 'missing' in page || !page.revisions?.length)
        return null;
    return page.revisions[0].slots.main['*'];
}
/** Extract a named infobox field from raw wikitext */
function extractInfoboxField(wikitext, field) {
    const regex = new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n|]+)`, 'i');
    const match = wikitext.match(regex);
    if (!match)
        return null;
    return match[1]
        .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, '$1')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}
//# sourceMappingURL=wiki.js.map