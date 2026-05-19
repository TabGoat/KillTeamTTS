const USER_AGENT = 'OSRS-SuperDictionary/1.0 (github.com/copilot-cli)';

export const SKILLS = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
  'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
  'Thieving', 'Slayer', 'Farming', 'Runecraft', 'Hunter', 'Construction',
] as const;

export type SkillName = typeof SKILLS[number];

export interface SkillStat {
  skill: SkillName;
  rank: number;
  level: number;
  xp: number;
}

export interface AccountStats {
  username: string;
  mode: AccountMode;
  skills: Record<SkillName, SkillStat>;
  totalLevel: number;
  totalXp: number;
}

export type AccountMode = 'normal' | 'ironman' | 'hardcore' | 'ultimate';

const HISCORE_URLS: Record<AccountMode, string> = {
  normal:   'https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws',
  ironman:  'https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.ws',
  hardcore: 'https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.ws',
  ultimate: 'https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.ws',
};

export async function fetchHiscores(username: string, mode: AccountMode = 'normal'): Promise<AccountStats> {
  const url = `${HISCORE_URLS[mode]}?player=${encodeURIComponent(username)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (res.status === 404) throw new Error(`Player "${username}" not found on the ${mode} hiscores.`);
  if (!res.ok) throw new Error(`Hiscores API error: ${res.status} ${res.statusText}`);

  const text = await res.text();
  const lines = text.trim().split('\n');

  const skills: Partial<Record<SkillName, SkillStat>> = {};
  for (let i = 0; i < SKILLS.length && i < lines.length; i++) {
    const parts = lines[i].split(',');
    const rank  = parseInt(parts[0], 10);
    const level = parseInt(parts[1], 10);
    const xp    = parseInt(parts[2], 10);
    skills[SKILLS[i]] = { skill: SKILLS[i], rank, level, xp };
  }

  const overall = skills['Overall']!;
  return {
    username,
    mode,
    skills: skills as Record<SkillName, SkillStat>,
    totalLevel: overall.level,
    totalXp: overall.xp,
  };
}

/** Try all modes and return the first successful result (normal first) */
export async function fetchHiscoresAuto(username: string): Promise<AccountStats> {
  const modes: AccountMode[] = ['normal', 'ironman', 'hardcore', 'ultimate'];
  for (const mode of modes) {
    try {
      return await fetchHiscores(username, mode);
    } catch {
      // try next mode
    }
  }
  throw new Error(`Player "${username}" not found on any hiscores.`);
}

export function xpToNextLevel(xp: number, level: number): number {
  // XP table: level L requires floor(sum(floor(l + 300 * 2^(l/7)) / 4)) for l=1..L-1
  function xpForLevel(l: number): number {
    let points = 0;
    for (let i = 1; i < l; i++) {
      points += Math.floor(i + 300 * Math.pow(2, i / 7));
    }
    return Math.floor(points / 4);
  }
  if (level >= 99) return 0;
  return xpForLevel(level + 1) - xp;
}
