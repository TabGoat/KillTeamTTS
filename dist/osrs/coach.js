"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseAccount = analyseAccount;
function lvl(stats, skill) {
    return stats.skills[skill]?.level ?? 1;
}
function combatLevel(stats) {
    const base = 0.25 * (lvl(stats, 'Defence') + lvl(stats, 'Hitpoints') + Math.floor(lvl(stats, 'Prayer') / 2));
    const melee = 0.325 * (lvl(stats, 'Attack') + lvl(stats, 'Strength'));
    const range = 0.325 * Math.floor(3 * lvl(stats, 'Ranged') / 2);
    const mage = 0.325 * Math.floor(3 * lvl(stats, 'Magic') / 2);
    return Math.floor(base + Math.max(melee, range, mage));
}
function analyseAccount(stats) {
    const cb = combatLevel(stats);
    const suggestions = [];
    const warnings = [];
    const questsUnlocked = [];
    const bossesAccessible = [];
    const atk = lvl(stats, 'Attack');
    const str = lvl(stats, 'Strength');
    const def = lvl(stats, 'Defence');
    const hp = lvl(stats, 'Hitpoints');
    const pray = lvl(stats, 'Prayer');
    const mage = lvl(stats, 'Magic');
    const range = lvl(stats, 'Ranged');
    const slay = lvl(stats, 'Slayer');
    const mine = lvl(stats, 'Mining');
    const smith = lvl(stats, 'Smithing');
    const fish = lvl(stats, 'Fishing');
    const cook = lvl(stats, 'Cooking');
    const wc = lvl(stats, 'Woodcutting');
    const fm = lvl(stats, 'Firemaking');
    const agil = lvl(stats, 'Agility');
    const herb = lvl(stats, 'Herblore');
    const rc = lvl(stats, 'Runecraft');
    const farm = lvl(stats, 'Farming');
    const craft = lvl(stats, 'Crafting');
    const hunt = lvl(stats, 'Hunter');
    const cons = lvl(stats, 'Construction');
    const thiev = lvl(stats, 'Thieving');
    const fletch = lvl(stats, 'Fletching');
    // ── Combat priorities ─────────────────────────────────────────────────────
    if (atk < 60)
        suggestions.push({ priority: 1, text: `Train Attack to 60 — unlocks Dragon weapons (currently ${atk})` });
    if (str < 60)
        suggestions.push({ priority: 2, text: `Train Strength to 60 for better damage output (currently ${str})` });
    if (def < 40)
        suggestions.push({ priority: 3, text: `Train Defence to 40 — unlocks Rune armour (currently ${def})` });
    if (hp < 40)
        suggestions.push({ priority: 4, text: `Your Hitpoints (${hp}) are low — do more combat training` });
    if (pray < 43)
        suggestions.push({ priority: 5, text: `Train Prayer to 43 for Protect from Melee/Magic/Missiles (currently ${pray})` });
    if (mage < 55)
        suggestions.push({ priority: 6, text: `Train Magic to 55 for High Alchemy — great passive gp (currently ${mage})` });
    if (range < 60)
        suggestions.push({ priority: 7, text: `Train Ranged to 60 for Adamant bow / blue dhide (currently ${range})` });
    // ── Slayer ────────────────────────────────────────────────────────────────
    if (slay < 75 && cb >= 70)
        suggestions.push({ priority: 8, text: `Train Slayer — you're combat level ${cb}, Slayer ${slay} is falling behind` });
    if (slay >= 85)
        suggestions.push({ priority: 90, text: `Great Slayer level (${slay}) — consider Abyssal demons, Nechryaels, or Gargoyles for GP` });
    // ── Skilling priorities ───────────────────────────────────────────────────
    if (agil < 60 && cb >= 80)
        suggestions.push({ priority: 9, text: `Train Agility to 60 for energy restore and shortcut access (currently ${agil})` });
    if (herb < 38 && cb >= 60)
        suggestions.push({ priority: 10, text: `Train Herblore to 38 for restore potions — important for bossing (currently ${herb})` });
    if (herb < 45 && cb >= 70)
        suggestions.push({ priority: 11, text: `Train Herblore to 45 for Super Attack/Strength potions (currently ${herb})` });
    if (herb >= 70 && farm < 32)
        suggestions.push({ priority: 12, text: `Train Farming to 32 to grow your own herbs — synergises with Herblore ${herb}` });
    if (rc < 44 && mage >= 55)
        suggestions.push({ priority: 13, text: `Train Runecraft to 44 for Nature runes (for High Alchemy) — currently ${rc}` });
    // ── Quest unlocks ─────────────────────────────────────────────────────────
    if (atk >= 40 && def >= 25 && mine >= 10 && smith >= 10)
        questsUnlocked.push('Recipe for Disaster (partial) — Goblin generals');
    if (atk >= 65 && def >= 65 && str >= 65 && hp >= 65 && range >= 65 && mage >= 65)
        questsUnlocked.push('Dragon Slayer II (combat reqs met)');
    if (agil >= 10 && thiev >= 25 && herb >= 5 && farm >= 9)
        questsUnlocked.push('Fairytale I — Growing Pains (reqs met)');
    if (mine >= 60 && smith >= 70)
        questsUnlocked.push("Mourning's End Part II (skilling reqs met)");
    if (wc >= 36 && agil >= 36 && str >= 10)
        questsUnlocked.push('Tree Gnome Village (reqs met)');
    if (cook >= 40 && fish >= 40)
        questsUnlocked.push('Recipe for Disaster — Skrach Uglogwee (reqs met)');
    if (craft >= 10 && cook >= 10)
        questsUnlocked.push('Rune Mysteries (no reqs)');
    if (mine >= 15)
        questsUnlocked.push('Doric\'s Quest (reqs met)');
    // ── Boss access ───────────────────────────────────────────────────────────
    if (cb >= 70 && slay >= 1)
        bossesAccessible.push('Barrows (recommended 100+ cb)');
    if (cb >= 85 && def >= 70)
        bossesAccessible.push('God Wars Dungeon (GWD)');
    if (slay >= 85)
        bossesAccessible.push('Abyssal Sire (85 Slayer req)');
    if (slay >= 93)
        bossesAccessible.push('Cerberus (93 Slayer req)');
    if (slay >= 91)
        bossesAccessible.push('Alchemical Hydra (95 Slayer req — almost there)');
    if (slay >= 95)
        bossesAccessible.push('Alchemical Hydra (95 Slayer req)');
    if (cb >= 100 && pray >= 43)
        bossesAccessible.push('Vorkath (post-Dragon Slayer II)');
    if (mage >= 75 && range >= 75 && atk >= 75)
        bossesAccessible.push('Zulrah (recommended 75+ combat stats)');
    if (agil >= 55 && hunt >= 53)
        bossesAccessible.push('Tempoross (skilling boss)');
    if (mine >= 60 && smith >= 50)
        bossesAccessible.push('Blast Furnace (profitable smithing)');
    if (cb >= 60 && cb < 80)
        bossesAccessible.push('Scurrius — great mid-level boss for pet + supplies');
    if (cb >= 80 && cb < 100)
        bossesAccessible.push('Dagannoth Kings (recommended ~90+ cb)');
    // ── Warnings ──────────────────────────────────────────────────────────────
    if (cook < fish)
        warnings.push(`You fish (${fish}) more than you cook (${cook}) — burn rate may be high, train Cooking`);
    if (fm < wc)
        warnings.push(`Woodcutting (${wc}) outpaces Firemaking (${fm}) — consider burning some logs`);
    if (hp < Math.max(atk, str, def) - 10)
        warnings.push(`Hitpoints (${hp}) is very low for your combat stats — train combat more evenly`);
    if (pray < 31 && cb >= 50)
        warnings.push(`Prayer (${pray}) is low — get Litany of power (31 Pray) before bossing`);
    // Sort by priority
    const sorted = suggestions.sort((a, b) => a.priority - b.priority);
    const summary = [
        `Combat level: ${cb}`,
        `Total level: ${stats.totalLevel}`,
        `Total XP: ${stats.totalXp.toLocaleString('en-GB')}`,
    ];
    return {
        combatLevel: cb,
        summary,
        priorities: sorted.map((s) => s.text),
        questsUnlocked,
        bossesAccessible,
        warnings,
    };
}
//# sourceMappingURL=coach.js.map