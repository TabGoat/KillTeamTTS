const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

const WIDTH = 72;

function pad(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}

export function printHeader(title: string, subtitle?: string): void {
  const bar = '═'.repeat(WIDTH);
  console.log(`\n${C.bold}${C.cyan}╔${bar}╗${C.reset}`);
  const titleLine = pad(` ⚔  ${title}`, WIDTH);
  console.log(`${C.bold}${C.cyan}║${C.white}${titleLine}${C.cyan}║${C.reset}`);
  if (subtitle) {
    const subLine = pad(`    ${subtitle}`, WIDTH);
    console.log(`${C.bold}${C.cyan}║${C.dim}${subLine}${C.cyan}║${C.reset}`);
  }
  console.log(`${C.bold}${C.cyan}╚${bar}╝${C.reset}`);
}

export function printSection(title: string): void {
  const bar = '─'.repeat(WIDTH);
  console.log(`\n${C.bold}${C.yellow}┌${bar}┐${C.reset}`);
  console.log(`${C.bold}${C.yellow}│${C.white} ${title.toUpperCase()}${' '.repeat(WIDTH - title.length - 1)}${C.yellow}│${C.reset}`);
  console.log(`${C.bold}${C.yellow}└${bar}┘${C.reset}`);
}

export function printKeyValue(key: string, value: string | number | null | undefined, colour = C.white): void {
  if (value === null || value === undefined || value === '') return;
  const k = `${C.bold}${C.cyan}${pad(String(key), 22)}${C.reset}`;
  const v = `${colour}${value}${C.reset}`;
  console.log(`  ${k}  ${v}`);
}

export function printText(text: string, indent = 2): void {
  const prefix = ' '.repeat(indent);
  const maxLine = WIDTH - indent;
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.length === 0) { console.log(''); continue; }
    let remaining = line;
    while (remaining.length > maxLine) {
      const cut = remaining.lastIndexOf(' ', maxLine);
      const idx = cut > 0 ? cut : maxLine;
      console.log(`${prefix}${C.dim}${remaining.slice(0, idx)}${C.reset}`);
      remaining = remaining.slice(idx + 1);
    }
    if (remaining) console.log(`${prefix}${C.dim}${remaining}${C.reset}`);
  }
}

export function printSearchResult(title: string, snippet: string, index: number): void {
  console.log(`\n  ${C.bold}${C.yellow}${index}. ${C.cyan}${title}${C.reset}`);
  if (snippet) console.log(`     ${C.dim}${snippet}${C.reset}`);
}

export function printPrice(label: string, gp: number | null | undefined, highlight = false): void {
  if (gp === null || gp === undefined) return;
  const formatted = gp.toLocaleString('en-GB') + ' gp';
  const colour = highlight ? `${C.bold}${C.green}` : C.green;
  printKeyValue(label, formatted, colour);
}

export function printGEBadge(membersOnly: boolean): void {
  if (membersOnly) {
    console.log(`\n  ${C.bgGreen}${C.bold} Members Item ${C.reset}`);
  } else {
    console.log(`\n  ${C.dim}[ Free-to-play ]${C.reset}`);
  }
}

export function printWikiLink(url: string): void {
  console.log(`\n  ${C.dim}🔗  ${url}${C.reset}\n`);
}

export function printDidYouMean(suggestions: string[]): void {
  if (suggestions.length === 0) return;
  console.log(`\n  ${C.bold}${C.yellow}Did you mean?${C.reset}`);
  for (let i = 0; i < suggestions.length; i++) {
    console.log(`    ${C.dim}${i + 1}.${C.reset} ${C.cyan}${suggestions[i]}${C.reset}`);
  }
  console.log('');
}

export function printAutoCorrect(original: string, corrected: string): void {
  console.log(`  ${C.dim}~ Auto-corrected "${original}" → ${C.reset}${C.bold}${C.cyan}${corrected}${C.reset}\n`);
}

export function printError(msg: string): void {
  console.error(`\n  ${C.bold}${C.red}✖  ${msg}${C.reset}\n`);
}

export function printInfo(msg: string): void {
  console.log(`\n  ${C.dim}ℹ  ${msg}${C.reset}\n`);
}
