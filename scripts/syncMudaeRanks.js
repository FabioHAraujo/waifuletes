import { PrismaClient } from '@prisma/client';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CHECKPOINT_PATH = '/app/media/manifests/.sync_ranks_checkpoint.json';

function normalizeName(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function cleanSeriesTitle(title) {
  if (!title) return '';
  return title
    .replace(/:\s*Season\s*\d+.*$/i, '')
    .replace(/\s+Season\s*\d+.*$/i, '')
    .replace(/:\s*Part\s*\d+.*$/i, '')
    .replace(/\s+Part\s*\d+.*$/i, '')
    .replace(/:\s*The Final Season.*$/i, '')
    .replace(/\s+Final Season.*$/i, '')
    .replace(/:\s*(?:2nd|3rd|4th|5th)\s+Season.*$/i, '')
    .replace(/\s+\b(II|III|IV|V|VI)\b.*$/i, '')
    .replace(/\s+\b\d+\b$/i, '')
    .replace(/\s*OVAs?.*$/i, '')
    .replace(/\s*Specials?.*$/i, '')
    .trim() || title;
}

function normalizeSeries(series) {
  if (!series) return '';
  return cleanSeriesTitle(series)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page, maxRetries = 4) {
  const url = `https://mudae.net/api/search?currentPage=${page}&type=character`;
  const args = [
    '-s',
    url,
    '-H', `User-Agent: ${USER_AGENT}`,
    '-H', 'Accept: application/json, text/plain, */*',
    '-H', 'Referer: https://mudae.net/search?type=character',
  ];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout } = await execFileAsync('curl', args, { timeout: 15000 });
      const trimmed = stdout.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        throw new Error(`Resposta não-JSON (possível 403): ${trimmed.slice(0, 100)}`);
      }
      return JSON.parse(trimmed);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(attempt * 2000);
    }
  }
}

async function run() {
  const isApply = process.argv.includes('--apply');
  const targetChars = parseInt(process.argv[2] || '80000', 10);
  const maxPages = Math.ceil(targetChars / 20); // 4000 páginas

  console.log(`\n=================================================================`);
  console.log(`🚀 SINCRONIZADOR DE RANKS MUDAE EM TEMPO REAL`);
  console.log(`MODO: ${isApply ? '🔥 APLICAÇÃO REAL NO BANCO (--apply)' : '🔍 DRY-RUN (Apenas Simulação)'}`);
  console.log(`ALVO: Top ${targetChars.toLocaleString('pt-BR')} personagens (${maxPages} páginas)`);
  console.log(`=================================================================\n`);

  console.log('📦 Carregando catálogo ativo na memória...');
  const t0 = Date.now();
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    select: { id: true, name: true, series: true, rank: true, tags: true },
  });
  console.log(`Carregadas ${characters.length.toLocaleString('pt-BR')} waifus em ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  const indexExact = new Map();
  const indexName = new Map();
  for (const c of characters) {
    const n = normalizeName(c.name);
    const s = normalizeSeries(c.series);
    indexExact.set(`${n}::${s}`, c);
    if (!indexName.has(n)) indexName.set(n, []);
    indexName.get(n).push(c);
  }

  let matchedCount = 0;
  let updatedCount = 0;
  let notFoundCount = 0;
  const updatesToApply = [];

  const BATCH_SIZE = 500;
  const startTime = Date.now();

  for (let page = 0; page < maxPages; page++) {
    try {
      const data = await fetchPage(page);
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        console.log(`Fim dos resultados na página ${page}.`);
        break;
      }

      for (const m of data.results) {
        const n = normalizeName(m.name);
        const s = normalizeSeries(m.series);

        let match = indexExact.get(`${n}::${s}`);
        if (!match && indexName.has(n)) {
          const candidates = indexName.get(n);
          match = candidates.find((c) => {
            const cs = normalizeSeries(c.series);
            return cs.includes(s) || s.includes(cs);
          });
        }

        if (match) {
          matchedCount++;
          if (match.rank !== m.rank) {
            updatedCount++;
            const newTags = Array.isArray(match.tags) ? match.tags.filter((t) => !t.startsWith('mudae-rank:')) : [];
            newTags.push(`mudae-rank:${m.rank}`);

            updatesToApply.push({
              id: match.id,
              rank: m.rank,
              tags: newTags,
            });
            match.rank = m.rank;
          }
        } else {
          notFoundCount++;
        }
      }

      // Descarregar lote se no modo apply
      if (isApply && updatesToApply.length >= BATCH_SIZE) {
        const chunk = updatesToApply.splice(0, updatesToApply.length);
        await prisma.$transaction(
          chunk.map((item) =>
            prisma.character.update({
              where: { id: item.id },
              data: {
                rank: item.rank,
                tags: item.tags,
                updatedAt: new Date(),
              },
            })
          )
        );
      }

      if ((page + 1) % 100 === 0 || page === maxPages - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = (page + 1) / elapsed;
        const eta = (maxPages - (page + 1)) / speed;
        console.log(
          `[Página ${(page + 1).toString().padStart(4)}/${maxPages}] ` +
          `Processados: ${((page + 1) * 20).toLocaleString('pt-BR')} | ` +
          `Matches: ${matchedCount.toLocaleString('pt-BR')} | ` +
          `Ranks Atualizados: ${updatedCount.toLocaleString('pt-BR')} | ` +
          `Velocidade: ${speed.toFixed(1)} pag/s | ` +
          `ETA: ${Math.round(eta)}s`
        );
      }

      // Intervalo de 60ms para evitar rate-limit
      await sleep(60);
    } catch (e) {
      console.warn(`⚠️ Erro na página ${page}: ${e.message}. Retentando com pausa maior...`);
      await sleep(3000);
    }
  }

  // Descarregar resíduos
  if (isApply && updatesToApply.length > 0) {
    const chunk = updatesToApply.splice(0, updatesToApply.length);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.character.update({
          where: { id: item.id },
          data: {
            rank: item.rank,
            tags: item.tags,
            updatedAt: new Date(),
          },
        })
      )
    );
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=================================================================`);
  console.log(`✅ SINCRONIZAÇÃO FINALIZADA EM ${totalDuration}s!`);
  console.log(`  • Páginas processadas: ${maxPages}`);
  console.log(`  • Personagens consultados: ${(maxPages * 20).toLocaleString('pt-BR')}`);
  console.log(`  • Personagens encontrados no banco: ${matchedCount.toLocaleString('pt-BR')} (${((matchedCount / (maxPages * 20)) * 100).toFixed(1)}%)`);
  console.log(`  • Ranks sincronizados/modificados: ${updatedCount.toLocaleString('pt-BR')}`);
  console.log(`  • Não encontrados: ${notFoundCount}`);
  if (!isApply) {
    console.log(`\nℹ️ Modo Dry-Run finalizado. Para gravar no banco, execute com --apply.`);
  }
  console.log(`=================================================================\n`);

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error('❌ Falha crítica:', e);
  await prisma.$disconnect();
  process.exit(1);
});
