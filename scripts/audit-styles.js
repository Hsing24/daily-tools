const fs = require('fs');
const path = require('path');

const SRC_APP_DIR = path.join(__dirname, '../src/app');
const FORBIDDEN_PROPERTIES = [
  'display', 'position', 'flex', 'grid', 'justify-content', 'align-items',
  'margin', 'padding', 'background-color', 'color', 'font-size', 'font-family',
  'font-weight', 'line-height', 'border', 'width', 'height'
];

let hasError = false;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.css')) {
      checkCssFile(fullPath);
    } else if (file.endsWith('.html')) {
      checkHtmlFile(fullPath);
    }
  }
}

function checkCssFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  // 規則1：元件 CSS 檔案行數限制 (容許最多 15 行，以保留動畫或過渡等)
  if (lines.length > 15) {
    console.error(`❌ [CSS 違規] 檔案行數 (${lines.length} 行) 超過限制 (最多 15 行): ${filePath}`);
    hasError = true;
  }

  // 規則2：禁止包含常規佈局與裝飾屬性 (應使用 Master CSS)
  for (const line of lines) {
    // 移除註解
    const cleanLine = line.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
    if (!cleanLine) continue;

    for (const prop of FORBIDDEN_PROPERTIES) {
      // 匹配 "prop:" 形式，且必須是屬性開頭（避免誤判包含此單字的 class 名稱或註解）
      const regex = new RegExp(`^${prop}\\s*:`, 'i');
      if (regex.test(cleanLine)) {
        console.error(`❌ [CSS 違規] 元件 CSS 含有應由 Master CSS 代替的屬性 "${prop}": \`${cleanLine}\` 在 ${filePath}`);
        hasError = true;
      }
    }
  }
}

function checkHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // 規則3：禁止使用 inline style="..."，但排除 Angular [style.xxx] 或 dynamic style binding
  if (/\sstyle\s*=\s*['"]/i.test(content)) {
    console.error(`❌ [HTML 違規] 偵測到 inline style 定義，請使用 Master CSS: ${filePath}`);
    hasError = true;
  }
}

console.log('🔍 開始進行專案樣式合規檢查...');
scanDirectory(SRC_APP_DIR);

if (hasError) {
  console.error('\n🚨 樣式稽核未通過！請將樣式重構為 Master CSS。');
  process.exit(1);
} else {
  console.log('\n✅ 樣式稽核通過！所有元件皆符合 Master CSS 規範。');
  process.exit(0);
}
