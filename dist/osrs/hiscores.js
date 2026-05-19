"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILLS = void 0;
exports.fetchHiscores = fetchHiscores;
exports.fetchHiscoresAuto = fetchHiscoresAuto;
exports.xpToNextLevel = xpToNextLevel;
const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';
exports.SKILLS = [
    'Overall', 'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
    'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
    'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
    'Thieving', 'Slayer', 'Farming', 'Runecraft', 'Hunter', 'Construction',
];
const HISCORE_URLS = {
    normal: 'https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws',
    ironman: 'https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.ws',
    hardcore: 'https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.ws',
    ultimate: 'https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.ws',
};
async function fetchHiscores(username, mode = 'normal') {
    const url = `${HISCORE_URLS[mode]}?player=${encodeURIComponent(username)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 404)
        throw new Error(`Player "${username}" not found on the ${mode} hiscores.`);
    if (!res.ok)
        throw new Error(`Hiscores API error: ${res.status} ${res.statusText}`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    const skills = {};
    for (let i = 0; i < exports.SKILLS.length && i < lines.length; i++) {
        const parts = lines[i].split(',');
        const rank = parseInt(parts[0], 10);
        const level = parseInt(parts[1], 10);
        const xp = parseInt(parts[2], 10);
        skills[exports.SKILLS[i]] = { skill: exports.SKILLS[i], rank, level, xp };
    }
    const overall = skills['Overall'];
    return {
        username,
        mode,
        skills: skills,
        totalLevel: overall.level,
        totalXp: overall.xp,
    };
}
/** Try all modes and return the first successful result (normal first) */
async function fetchHiscoresAuto(username) {
    const modes = ['normal', 'ironman', 'hardcore', 'ultimate'];
    for (const mode of modes) {
        try {
            return await fetchHiscores(username, mode);
        }
        catch {
            // try next mode
        }
    }
    throw new Error(`Player "${username}" not found on any hiscores.`);
}
function xpToNextLevel(xp, level) {
    // XP table: level L requires floor(sum(floor(l + 300 * 2^(l/7)) / 4)) for l=1..L-1
    function xpForLevel(l) {
        let points = 0;
        for (let i = 1; i < l; i++) {
            points += Math.floor(i + 300 * Math.pow(2, i / 7));
        }
        return Math.floor(points / 4);
    }
    if (level >= 99)
        return 0;
    return xpForLevel(level + 1) - xp;
}
//# sourceMappingURL=hiscores.js.map