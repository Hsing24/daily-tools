/**
 * 工具目錄同步稽核。
 *
 * 以 src/app/app.routes.ts 的路由為唯一事實來源，交叉比對每個已上線的工具是否
 * 同步登錄到側欄目錄、首頁樹狀圖、首頁測試與 TODO.md，避免「做完卻忘記回填」。
 *
 * 對應關係靠 slug：TODO.md 與 home.html 皆以 `(slug)` 標註，例如 (word-count)。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = {
  routes: 'src/app/app.routes.ts',
  layout: 'src/app/layout/layout.ts',
  homeHtml: 'src/app/home/home.html',
  homeSpec: 'src/app/home/home.spec.ts',
  todo: 'TODO.md',
};

// 非工具頁：不需要出現在 TODO.md，但仍需登錄側欄與首頁。
const NOT_A_TOOL = new Set(['design']);

const errors = [];
const read = (key) => fs.readFileSync(path.join(ROOT, FILES[key]), 'utf8');
const fail = (file, message) => errors.push(`❌ [${file}] ${message}`);
const matchAll = (source, regex) => [...source.matchAll(regex)].map((m) => m[1]);

const routesSrc = read('routes');
const layoutSrc = read('layout');
const homeHtml = read('homeHtml');
const homeSpec = read('homeSpec');
const todoSrc = read('todo');

// --- 解析各來源 -----------------------------------------------------------

const routeSlugs = matchAll(routesSrc, /path:\s*["']([^"']*)["']/g).filter(Boolean);
const layoutSlugs = new Set(matchAll(layoutSrc, /route:\s*["']([^"']+)["']/g));

// 首頁樹狀圖：每行可能是 ✅ 已完成（含 routerLink）或 🚧 規劃中。
const homeLines = homeHtml.split('\n');
const homeDone = new Map(); // slug -> 行號
const homePlanned = new Map();
homeLines.forEach((line, index) => {
  const lineNo = index + 1;
  const link = line.match(/routerLink="\/([^"]+)"/);
  if (link) {
    homeDone.set(link[1], lineNo);
    return;
  }
  const planned = line.match(/🚧[^\n]*?\(([a-z0-9-]+)\)/);
  if (planned) {
    homePlanned.set(planned[1], lineNo);
  }
});

// TODO.md：- [x] 名稱 (slug)：說明
const todoItems = new Map(); // slug -> { done, lineNo }
todoSrc.split('\n').forEach((line, index) => {
  const item = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
  if (!item) return;
  const slug = item[2].match(/\(([a-z0-9-]+)\)/);
  if (!slug) return;
  todoItems.set(slug[1], {
    done: item[1].toLowerCase() === 'x',
    lineNo: index + 1,
  });
});

// --- 正向檢查：已上線的路由必須到處都登錄 ---------------------------------

for (const slug of routeSlugs) {
  if (!layoutSlugs.has(slug)) {
    fail(FILES.layout, `路由 /${slug} 未登錄在 toolGroups，側欄與 ⌘K 面板找不到它`);
  }

  if (!homeDone.has(slug)) {
    const plannedAt = homePlanned.get(slug);
    fail(
      FILES.homeHtml,
      plannedAt
        ? `路由 /${slug} 已上線，但第 ${plannedAt} 行仍標記為 🚧，請改為 ✅ 並補上 routerLink`
        : `路由 /${slug} 未出現在首頁樹狀圖，請補一行 ✅ 連結與說明`
    );
  }

  if (!homeSpec.includes(`'/${slug}'`) && !homeSpec.includes(`"/${slug}"`)) {
    fail(FILES.homeSpec, `路由 /${slug} 未加入首頁連結斷言，請補上 expect(links).toContain('/${slug}')`);
  }

  if (NOT_A_TOOL.has(slug)) continue;

  const todo = todoItems.get(slug);
  if (!todo) {
    fail(FILES.todo, `路由 /${slug} 已上線，但 TODO.md 找不到標註 (${slug}) 的項目，請補上並打勾`);
  } else if (!todo.done) {
    fail(FILES.todo, `第 ${todo.lineNo} 行的 (${slug}) 已經上線，請改為 - [x]`);
  }
}

// --- 反向檢查：登錄了但實際沒有路由 ---------------------------------------

const routeSet = new Set(routeSlugs);

for (const slug of layoutSlugs) {
  if (!routeSet.has(slug)) {
    fail(FILES.layout, `toolGroups 的 route: "${slug}" 在 app.routes.ts 沒有對應路由，點下去會 404`);
  }
}

for (const [slug, lineNo] of homeDone) {
  if (!routeSet.has(slug)) {
    fail(FILES.homeHtml, `第 ${lineNo} 行的 routerLink="/${slug}" 沒有對應路由，是死連結`);
  }
}

for (const [slug, todo] of todoItems) {
  if (todo.done && !routeSet.has(slug)) {
    fail(FILES.todo, `第 ${todo.lineNo} 行的 (${slug}) 標記為完成，但 app.routes.ts 沒有這條路由`);
  }
}

// --- 輸出 -----------------------------------------------------------------

console.log('🔍 開始進行工具目錄同步檢查...');

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  console.error('\n🚨 工具目錄不同步！請補齊上述檔案後再 push。');
  process.exit(1);
}

console.log(`\n✅ 工具目錄同步檢查通過！已比對 ${routeSlugs.length} 條路由。`);
process.exit(0);
