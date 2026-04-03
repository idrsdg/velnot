import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/i18n.ts';
let content = readFileSync(filePath, 'utf8');

// Each entry: [searchString, speakerNames, speakerLabel prefix, namePlaceholder]
const langs = [
  ['Konuşmacı', 'Konuşmacı İsimleri', 'Konuşmacı', 'İsim girin...'],
  ['Speaker', 'Speaker Names', 'Speaker', 'Enter name...'],
  ['Orador', 'Nombres de Oradores', 'Orador', 'Ingrese nombre...'],  // ES
  ['说话者', '说话者姓名', '说话者', '输入名称...'],
  ['المتحدث', 'أسماء المتحدثين', 'المتحدث', 'أدخل اسمًا...'],
  ['वक्ता', 'वक्ताओं के नाम', 'वक्ता', 'नाम दर्ज करें...'],
  ['Intervenant', 'Noms des Intervenants', 'Intervenant', 'Entrez un nom...'],
  ['Sprecher', 'Sprechernamen', 'Sprecher', 'Name eingeben...'],
];

// PT Orador is same as ES — handle separately using line-by-line
// We'll track replacements done
let replacements = 0;

for (const [prefix, names, label, placeholder] of langs) {
  const searchStr = `speakerPlaceholder: (code: string) => \`${prefix} \${code}...\`,`;
  const replacement = searchStr + `\n      speakerNames: '${names}', speakerLabel: (code: string) => \`${label} \${code}\`, namePlaceholder: '${placeholder}',`;

  if (content.includes(searchStr)) {
    // Replace only first occurrence to avoid double-replacing ES/PT both using "Orador"
    const idx = content.indexOf(searchStr);
    content = content.slice(0, idx) + replacement + content.slice(idx + searchStr.length);
    replacements++;
    console.log(`✅ ${prefix}`);
  } else {
    console.log(`❌ NOT FOUND: ${prefix}`);
  }
}

// PT Orador — second occurrence
const ptSearch = `speakerPlaceholder: (code: string) => \`Orador \${code}...\`,`;
const ptReplacement = ptSearch + `\n      speakerNames: 'Nomes dos Oradores', speakerLabel: (code: string) => \`Orador \${code}\`, namePlaceholder: 'Digite o nome...',`;
if (content.includes(ptSearch)) {
  const idx = content.indexOf(ptSearch);
  content = content.slice(0, idx) + ptReplacement + content.slice(idx + ptSearch.length);
  replacements++;
  console.log('✅ PT Orador');
} else {
  console.log('❌ PT Orador not found');
}

writeFileSync(filePath, content, 'utf8');
console.log(`\nDone. ${replacements} replacements made.`);
