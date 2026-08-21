import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const dist = fileURLToPath(new URL('./dist/', import.meta.url));
const index = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [];

for (const source of [index, ...findFiles(dist)]) {
  for (const match of source.matchAll(/(?:src|href|url)=["'(]?([^"')\s]+)|(?:src|href)=([^\s>]+)/g)) {
    const value = match[1] || match[2];
    if (value.startsWith('./')) files.push(value.slice(2).split(/[?#]/)[0]);
  }
}

const imageReferences = [];
for (const source of findFiles(dist)) {
  const content = readFileSync(join(dist, source), 'utf8');
  for (const match of content.matchAll(/(?:\.\/)?assets\/cat-tarot\/[A-Za-z0-9_./-]+\.(?:png|jpe?g)/g)) {
    imageReferences.push(match[0].replace(/^\.\//, ''));
  }
}

const expectedImages = [
  'assets/cat-tarot/cover_optimized.png',
  ...Array.from({ length: 78 }, (_, index) => {
    const cardId = String(index).padStart(2, '0');
    const names = ['The_Fool', 'The_Magician', 'The_High_Priestess', 'The_Empress', 'The_Emperor', 'The_Hierophant', 'The_Lovers', 'The_Chariot', 'Strength', 'The_Hermit', 'Wheel_of_Fortune', 'Justice', 'The_Hanged_Man', 'Death', 'Temperance', 'The_Devil', 'The_Tower', 'The_Star', 'The_Moon', 'The_Sun', 'Judgement', 'The_World', 'Ace_of_Wands', 'Two_of_Wands', 'Three_of_Wands', 'Four_of_Wands', 'Five_of_Wands', 'Six_of_Wands', 'Seven_of_Wands', 'Eight_of_Wands', 'Nine_of_Wands', 'Ten_of_Wands', 'Page_of_Wands', 'Knight_of_Wands', 'Queen_of_Wands', 'King_of_Wands', 'Ace_of_Cups', 'Two_of_Cups', 'Three_of_Cups', 'Four_of_Cups', 'Five_of_Cups', 'Six_of_Cups', 'Seven_of_Cups', 'Eight_of_Cups', 'Nine_of_Cups', 'Ten_of_Cups', 'Page_of_Cups', 'Knight_of_Cups', 'Queen_of_Cups', 'King_of_Cups', 'Ace_of_Swords', 'Two_of_Swords', 'Three_of_Swords', 'Four_of_Swords', 'Five_of_Swords', 'Six_of_Swords', 'Seven_of_Swords', 'Eight_of_Swords', 'Nine_of_Swords', 'Ten_of_Swords', 'Page_of_Swords', 'Knight_of_Swords', 'Queen_of_Swords', 'King_of_Swords', 'Ace_of_Pentacles', 'Two_of_Pentacles', 'Three_of_Pentacles', 'Four_of_Pentacles', 'Five_of_Pentacles', 'Six_of_Pentacles', 'Seven_of_Pentacles', 'Eight_of_Pentacles', 'Nine_of_Pentacles', 'Ten_of_Pentacles', 'Page_of_Pentacles', 'Knight_of_Pentacles', 'Queen_of_Pentacles', 'King_of_Pentacles'];
    return `assets/cat-tarot/cards_optimized/${cardId}_${names[index]}.jpg`;
  }),
  ...Array.from({ length: 5 }, (_, index) => `assets/cat-tarot/gallery-extra/Extra_${String(index).padStart(2, '0')}_optimized.jpg`),
];
const unique = [...new Set([...files, ...imageReferences, ...expectedImages])];
const missing = unique.filter((file) => !existsSync(join(dist, file)));
const rootAbsoluteReferences = findFiles(dist)
  .filter((file) => /\.(?:js|css|html)$/.test(file))
  .filter((file) => /["'(]\/assets\//.test(readFileSync(join(dist, file), 'utf8')));

if (rootAbsoluteReferences.length || missing.length) {
  console.error(JSON.stringify({ rootAbsoluteReferences, missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ checkedReferences: unique.length, checkedImages: imageReferences.length, rootAbsoluteReferences: [], missing: [] }, null, 2));

function findFiles(directory) {
  const output = [];
  const entries = readdirRecursive(directory);
  for (const entry of entries) {
    const name = relative(directory, entry).replaceAll('\\', '/');
    if (/\.(?:js|css|html)$/.test(name)) output.push(name);
  }
  return output;
}

function readdirRecursive(directory) {
  const output = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) output.push(...readdirRecursive(path));
    else output.push(path);
  }
  return output;
}
