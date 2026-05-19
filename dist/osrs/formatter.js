"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHeader = printHeader;
exports.printSection = printSection;
exports.printKeyValue = printKeyValue;
exports.printText = printText;
exports.printSearchResult = printSearchResult;
exports.printPrice = printPrice;
exports.printGEBadge = printGEBadge;
exports.printWikiLink = printWikiLink;
exports.printDidYouMean = printDidYouMean;
exports.printAutoCorrect = printAutoCorrect;
exports.printError = printError;
exports.printInfo = printInfo;
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
function pad(s, w) {
    return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}
function printHeader(title, subtitle) {
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
function printSection(title) {
    const bar = '─'.repeat(WIDTH);
    console.log(`\n${C.bold}${C.yellow}┌${bar}┐${C.reset}`);
    console.log(`${C.bold}${C.yellow}│${C.white} ${title.toUpperCase()}${' '.repeat(WIDTH - title.length - 1)}${C.yellow}│${C.reset}`);
    console.log(`${C.bold}${C.yellow}└${bar}┘${C.reset}`);
}
function printKeyValue(key, value, colour = C.white) {
    if (value === null || value === undefined || value === '')
        return;
    const k = `${C.bold}${C.cyan}${pad(String(key), 22)}${C.reset}`;
    const v = `${colour}${value}${C.reset}`;
    console.log(`  ${k}  ${v}`);
}
function printText(text, indent = 2) {
    const prefix = ' '.repeat(indent);
    const maxLine = WIDTH - indent;
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.length === 0) {
            console.log('');
            continue;
        }
        let remaining = line;
        while (remaining.length > maxLine) {
            const cut = remaining.lastIndexOf(' ', maxLine);
            const idx = cut > 0 ? cut : maxLine;
            console.log(`${prefix}${C.dim}${remaining.slice(0, idx)}${C.reset}`);
            remaining = remaining.slice(idx + 1);
        }
        if (remaining)
            console.log(`${prefix}${C.dim}${remaining}${C.reset}`);
    }
}
function printSearchResult(title, snippet, index) {
    console.log(`\n  ${C.bold}${C.yellow}${index}. ${C.cyan}${title}${C.reset}`);
    if (snippet)
        console.log(`     ${C.dim}${snippet}${C.reset}`);
}
function printPrice(label, gp, highlight = false) {
    if (gp === null || gp === undefined)
        return;
    const formatted = gp.toLocaleString('en-GB') + ' gp';
    const colour = highlight ? `${C.bold}${C.green}` : C.green;
    printKeyValue(label, formatted, colour);
}
function printGEBadge(membersOnly) {
    if (membersOnly) {
        console.log(`\n  ${C.bgGreen}${C.bold} Members Item ${C.reset}`);
    }
    else {
        console.log(`\n  ${C.dim}[ Free-to-play ]${C.reset}`);
    }
}
function printWikiLink(url) {
    console.log(`\n  ${C.dim}🔗  ${url}${C.reset}\n`);
}
function printDidYouMean(suggestions) {
    if (suggestions.length === 0)
        return;
    console.log(`\n  ${C.bold}${C.yellow}Did you mean?${C.reset}`);
    for (let i = 0; i < suggestions.length; i++) {
        console.log(`    ${C.dim}${i + 1}.${C.reset} ${C.cyan}${suggestions[i]}${C.reset}`);
    }
    console.log('');
}
function printAutoCorrect(original, corrected) {
    console.log(`  ${C.dim}~ Auto-corrected "${original}" → ${C.reset}${C.bold}${C.cyan}${corrected}${C.reset}\n`);
}
function printError(msg) {
    console.error(`\n  ${C.bold}${C.red}✖  ${msg}${C.reset}\n`);
}
function printInfo(msg) {
    console.log(`\n  ${C.dim}ℹ  ${msg}${C.reset}\n`);
}
//# sourceMappingURL=formatter.js.map