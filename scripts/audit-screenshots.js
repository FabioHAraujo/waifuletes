#!/usr/bin/env node
/**
 * Auditoria visual automatizada do frontend do Waifuletes (Playwright).
 *
 * Serve os arquivos estáticos LOCAIS de `api/public/` e encaminha apenas
 * requisições GET públicas para um Hub remoto (somente leitura). O painel
 * `/user/:id` usa um fixture sintético (modo dono) montado com personagens
 * reais do catálogo do Hub, pois publicIds não são expostos publicamente (PII).
 * Requisições de mutação (POST/PUT/PATCH/DELETE) NUNCA chegam ao Hub.
 *
 * Uso:
 *   npm i -D playwright && npx playwright install chromium
 *   node scripts/audit-screenshots.js --out screenshots/before
 *
 * Opções:
 *   --out <dir>        Diretório de saída (padrão: screenshots/current)
 *   --hub <url>        Hub de leitura (padrão: $AUDIT_HUB_URL ou https://waifuletes.moothz.com)
 *   --only <filtro>    Captura somente páginas cujo nome contenha o filtro
 *   --full             Captura a página inteira (fullPage) em vez da dobra
 *   --vp <nome>        Captura somente um viewport (mobile-small, mobile-std, tablet, desktop)
 *
 * Variável opcional PLAYWRIGHT_MODULE aponta para um módulo playwright fora do repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../api/public');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT_DIR = path.resolve(process.cwd(), getArg('--out', 'screenshots/current'));
const HUB = getArg('--hub', process.env.AUDIT_HUB_URL || 'https://waifuletes.moothz.com').replace(/\/+$/, '');
const ONLY = getArg('--only', '');
const FULL_PAGE = args.includes('--full');
const VP_FILTER = getArg('--vp', '');
const ORIGIN = 'http://waifuletes.local';
const FIXTURE_ID = 'audit-fixture';

const VIEWPORTS = [
  { name: 'mobile-small', width: 360, height: 740, mobile: true },
  { name: 'mobile-std', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1280, height: 800, mobile: false },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'catalogo', path: '/catalogo' },
  { name: 'character', path: '/character/bmo' },
  { name: 'user-catalogo', path: `/user/${FIXTURE_ID}#catalogo` },
  { name: 'user-harem', path: `/user/${FIXTURE_ID}#harem` },
  { name: 'user-wishlist', path: `/user/${FIXTURE_ID}#harem/wishlist` },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
};

function pageFileFor(pathname) {
  if (pathname === '/') return 'index.html';
  if (pathname === '/catalogo' || pathname === '/waifinder') return 'catalogo.html';
  if (/^\/(character|char)\/[^/]+$/.test(pathname)) return 'character.html';
  if (pathname === '/user' || /^\/user\/[^/]+$/.test(pathname)) return 'user.html';
  if (pathname === '/admin') return 'admin.html';
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (abs.startsWith(PUBLIC_DIR) && fs.existsSync(abs) && fs.statSync(abs).isFile()) return rel;
  return null;
}

async function buildFixture() {
  const res = await fetch(`${HUB}/characters?limit=40&page=1`);
  const json = await res.json();
  const chars = json?.data?.data || [];
  const now = new Date().toISOString();
  const harem = chars.slice(0, 28).map((c, i) => ({
    id: `fx-harem-${i}`,
    character: { ...c, owner: undefined },
    keys: (i * 7) % 23,
    isFavorite: i % 9 === 0,
    isSoulmate: false,
    claimedAt: now,
    collectionId: null,
    collection: null,
    pinnedPhoto: null,
    note: null,
    unseenCovetsCount: 0,
    totalCovetsCount: i % 4,
  }));
  const wishlist = chars.slice(28, 40).map((c, i) => ({
    id: `fx-wish-${i}`,
    isStarWish: i < 2,
    addedAt: now,
    isMarried: i % 3 === 0,
    marriedTo: i % 3 === 0 ? 'Fulano' : null,
    marriedToPublicId: null,
    isMarriedToSelf: false,
    isForSale: i % 5 === 0,
    wishlistCount: c.wishlistCount || 0,
    character: c,
  }));
  return {
    success: true,
    data: {
      isAdmin: true,
      publicId: FIXTURE_ID,
      name: 'Usuário de Auditoria Visual',
      haremName: 'Harém Auditado',
      haremPrivate: false,
      kakera: 123456,
      mythicSlots: 1,
      expiresIn: 3600,
      isPersistent: false,
      unreadNotificationsCount: 3,
      harem,
      totalHarem: harem.length,
      collections: [],
      wishlist,
      covetedCharacterIds: [],
      inventory: null,
    },
  };
}

async function installRoutes(context, fixture) {
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());

    if (url.origin !== ORIGIN) {
      // Recursos externos (CDNs, imagens do Hub): libera somente GET
      return req.method() === 'GET' ? route.continue() : route.abort();
    }

    const method = req.method();
    const p = url.pathname;

    if (method !== 'GET' && method !== 'HEAD') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }

    if (p === `/api/web/user/${FIXTURE_ID}`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    }
    if (p.startsWith(`/api/web/user/${FIXTURE_ID}/`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    }

    const file = pageFileFor(p);
    if (file && !p.startsWith('/api/')) {
      const abs = path.join(PUBLIC_DIR, file);
      return route.fulfill({
        status: 200,
        contentType: MIME[path.extname(abs)] || 'application/octet-stream',
        body: fs.readFileSync(abs),
      });
    }

    // Demais GETs (catálogo, leaderboard, mídia) vão para o Hub somente leitura
    try {
      const upstream = await fetch(`${HUB}${p}${url.search}`, { headers: { Accept: req.headers()['accept'] || '*/*' } });
      const body = Buffer.from(await upstream.arrayBuffer());
      return route.fulfill({
        status: upstream.status,
        contentType: upstream.headers.get('content-type') || 'application/octet-stream',
        body,
      });
    } catch {
      return route.fulfill({ status: 502, body: '' });
    }
  });
}

async function measure(page, viewportWidth) {
  return page.evaluate((vw) => {
    const doc = document.documentElement;
    const overflowers = [];
    const width = Math.max(doc.scrollWidth, document.body.scrollWidth);
    if (width > vw) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
          overflowers.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`);
          if (overflowers.length >= 5) break;
        }
      }
    }
    const tabs = [...document.querySelectorAll('.retro-tabs:not(.hidden)')].filter((t) => t.offsetParent !== null);
    const tabRows = tabs.map((t) => new Set([...t.querySelectorAll('.retro-tab')].filter((b) => b.offsetParent !== null).map((b) => Math.round(b.getBoundingClientRect().top))).size);
    const grid = [...document.querySelectorAll('.waifu-grid')].find((g) => g.offsetParent !== null && g.children.length > 1);
    const gridCols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null;
    const imgs = [...document.querySelectorAll('.waifu-card img')];
    return {
      scrollWidth: width,
      innerWidth: vw,
      horizontalOverflow: width > vw,
      overflowers,
      tabRows,
      gridCols,
      cardImages: imgs.length,
      lazyImages: imgs.filter((i) => i.loading === 'lazy').length,
    };
  }, viewportWidth);
}

async function main() {
  let playwright;
  try {
    playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
  } catch {
    console.error('❌ Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
  const { chromium } = playwright.default || playwright;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`📸 Hub de leitura: ${HUB}`);
  const fixture = await buildFixture();
  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS.filter((v) => !VP_FILTER || v.name === VP_FILTER)) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      await context.addInitScript((t) => {
        try { localStorage.setItem('waifu_theme', t); } catch (_) {}
      }, theme);
      await installRoutes(context, fixture);

      for (const pg of PAGES) {
        if (ONLY && !pg.name.includes(ONLY)) continue;
        const page = await context.newPage();
        const [base, hash] = pg.path.split('#');
        const url = `${ORIGIN}${base}${theme === 'dark' ? '?theme=dark' : ''}${hash ? '#' + hash : ''}`;
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        } catch {
          // networkidle pode estourar com polling; segue com o que carregou
        }
        await page.waitForTimeout(800);
        const metrics = await measure(page, vp.width);
        const file = `${pg.name}--${vp.name}--${theme}.png`;
        await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: FULL_PAGE });
        report.push({ page: pg.name, viewport: vp.name, theme, file, ...metrics });
        console.log(`${metrics.horizontalOverflow ? '⚠️ ' : '✅'} ${file} scrollW=${metrics.scrollWidth}/${metrics.innerWidth} tabsRows=${JSON.stringify(metrics.tabRows)} gridCols=${metrics.gridCols} lazy=${metrics.lazyImages}/${metrics.cardImages}${metrics.overflowers.length ? ' overflow:' + metrics.overflowers.join(',') : ''}`);
        await page.close();
      }
      await context.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n📁 ${report.length} capturas salvas em ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
