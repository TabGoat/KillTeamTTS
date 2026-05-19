"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuzzyScore = fuzzyScore;
exports.fuzzyRank = fuzzyRank;
/** Normalise a string for fuzzy comparison */
function normalise(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
/** Generate overlapping trigrams from a string */
function trigrams(s) {
    const t = new Set();
    const padded = `  ${s}  `;
    for (let i = 0; i < padded.length - 2; i++) {
        t.add(padded.slice(i, i + 3));
    }
    return t;
}
/** Dice coefficient of two trigram sets (0–1) */
function trigramSimilarity(a, b) {
    const ta = trigrams(a);
    const tb = trigrams(b);
    if (ta.size === 0 || tb.size === 0)
        return 0;
    let shared = 0;
    for (const t of ta)
        if (tb.has(t))
            shared++;
    return (2 * shared) / (ta.size + tb.size);
}
/** How similar two individual words are (0–1) */
function wordSimilarity(a, b) {
    if (a === b)
        return 1;
    if (b.startsWith(a) || a.startsWith(b))
        return 0.9;
    // Trigram similarity for short words, with a minimum overlap check
    const sim = trigramSimilarity(a, b);
    // Penalise very short words with low overlap
    return sim;
}
/**
 * Score how well `query` matches `target`.
 * Returns a value in [0, 1] where 1 is a perfect match.
 */
function fuzzyScore(query, target) {
    const q = normalise(query);
    const t = normalise(target);
    if (!q || !t)
        return 0;
    if (t === q)
        return 1.0;
    if (t.startsWith(q))
        return 0.92;
    if (t.includes(q))
        return 0.82;
    // Word-level matching with per-word similarity scores
    const qWords = q.split(' ').filter(Boolean);
    const tWords = t.split(' ').filter(Boolean);
    // For each query word, find its best-matching target word
    const wordScores = qWords.map((qw) => {
        const best = tWords.reduce((max, tw) => Math.max(max, wordSimilarity(qw, tw)), 0);
        return best;
    });
    const avgWordScore = wordScores.reduce((sum, s) => sum + s, 0) / wordScores.length;
    const allWordsMatch = wordScores.every((s) => s >= 0.6);
    let score;
    if (allWordsMatch) {
        score = 0.65 + avgWordScore * 0.25;
    }
    else if (avgWordScore >= 0.6) {
        score = 0.50 + avgWordScore * 0.20;
    }
    else {
        // Fall back to whole-string trigram similarity
        score = trigramSimilarity(q, t) * 0.60;
    }
    // Prefer targets of similar length to the query (penalise over-long matches)
    const lengthRatio = Math.min(q.length, t.length) / Math.max(q.length, t.length);
    return score * (0.75 + 0.25 * lengthRatio);
}
/**
 * Rank `items` by fuzzy match against `query`.
 * Returns results above `threshold`, sorted best-first, capped at `limit`.
 */
function fuzzyRank(query, items, getName, threshold = 0.25, limit = 5) {
    return items
        .map((item) => ({ item, score: fuzzyScore(query, getName(item)) }))
        .filter(({ score }) => score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
//# sourceMappingURL=fuzzy.js.map