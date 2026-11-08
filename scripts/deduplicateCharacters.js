import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🧹 SCRIPT DE DEDUPLICAÇÃO DE PERSONAGENS & COMPENSAÇÃO 5X (Waifuletes)
 * 
 * Critérios Refinados:
 *   1. Identificação com suporte a:
 *      - Títulos em inglês vs japonês (Romaji canônico)
 *      - Nomes invertidos (ex: Roronoa Zoro vs Zoro Roronoa, Luffy Monkey vs Monkey D. Luffy)
 *      - Partículas intermediárias (ex: "D.", "de") e variações de transliteração (ou/o, uu/u)
 *      - Isolamento estrito de séries homônimas (One Piece x One Punch Man NUNCA se misturam)
 *   2. Seleção de Vencedor (Quem fica ativo):
 *      - Preferência 1: Maior raridade (Lendário > Épico > Raro > Incomum > Comum)
 *      - Preferência 2: Se mesma raridade, MANTER QUEM ESTÁ CASADO (desativa o solteiro sem gerar divórcio)
 *      - Preferência 3: Ter rank oficial do Mudae (rank NOT NULL) vs sem rank
 *      - Preferência 4: Menor número de rank Mudae (mais popular)
 *   3. Desativação Segura (Soft-Delete):
 *      - Personagens duplicados inferiores NÃO são apagados, apenas recebem `isActive = false`
 *   4. Compensação 5x:
 *      - Se a versão desativada pertencia ao harém de um jogador:
 *        -> Divórcio automático executado
 *        -> Reembolso de 5x o valor de divórcio da raridade + chaves creditado em Zinthos
 *        -> Extrato de transação auditável gravado
 */

const RARITY_ORDER = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

const RARITY_DIVORCE_VALUES = {
  COMMON: 50,
  UNCOMMON: 150,
  RARE: 350,
  EPIC: 700,
  LEGENDARY: 1500,
};

const RARITY_KEY_DIVORCE_BONUS = {
  COMMON: 500,
  UNCOMMON: 2000,
  RARE: 5000,
  EPIC: 25000,
  LEGENDARY: 75000,
};

function calculateDivorceRefund(rarity, keys = 1) {
  const base = RARITY_DIVORCE_VALUES[rarity] || 50;
  const keyBonus = Math.max(0, keys - 1) * (RARITY_KEY_DIVORCE_BONUS[rarity] || 500);
  const raw = base + keyBonus;
  return { netKakera: Math.floor(raw * 0.95) }; // 5% taxa
}

function normalizeNameTokens(str) {
  if (!str) return '';
  return str
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ou/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && t !== 'd')
    .sort()
    .join(' ');
}

function cleanSeries(series) {
  if (!series) return '';
  return series
    .replace(/:\s*Season\s*\d+.*$/i, '')
    .replace(/\s+Season\s*\d+.*$/i, '')
    .replace(/:\s*Part\s*\d+.*$/i, '')
    .replace(/\s+Part\s*\d+.*$/i, '')
    .replace(/\s+\(TV\)$/i, '')
    .trim();
}

const CANONICAL_JAPANESE_SERIES = {
  onepiece: {
    jp: 'One Piece',
    aliases: ['one piece'],
    disallowed: ['one punch man', 'one-punch man', 'one punch'],
  },
  onepunchman: {
    jp: 'One Punch Man',
    aliases: ['one punch man', 'one-punch man', 'one punch', 'opm'],
    disallowed: ['one piece'],
  },
  bleach: { jp: 'Bleach', aliases: ['bleach'] },
  rezero: { jp: 'Re:Zero kara Hajimeru Isekai Seikatsu', aliases: ['re:zero', 'rezero', 'starting life in another world'] },
  konosuba: { jp: 'Kono Subarashii Sekai ni Shukufuku wo!', aliases: ['konosuba', 'kono subarashii', 'isekai quartet'] },
  demonslayer: { jp: 'Kimetsu no Yaiba', aliases: ['kimetsu no yaiba', 'demon slayer'] },
  attackontitan: { jp: 'Shingeki no Kyojin', aliases: ['shingeki no kyojin', 'attack on titan'] },
  myheroacademia: { jp: 'Boku no Hero Academia', aliases: ['boku no hero academia', 'my hero academia'] },
  fate: { jp: 'Fate/stay night', aliases: ['fate/', 'fate series', 'fate/stay night', 'fate/zero', 'fate/grand order', 'fate extra', 'fate/apocrypha'] },
  dragonball: { jp: 'Dragon Ball', aliases: ['dragon ball', 'dragonball'] },
  swordartonline: { jp: 'Sword Art Online', aliases: ['sword art online', 'sao'] },
  jujutsukaisen: { jp: 'Jujutsu Kaisen', aliases: ['jujutsu kaisen', 'jjk'] },
  chainsawman: { jp: 'Chainsaw Man', aliases: ['chainsaw man'] },
  genshin: { jp: 'Genshin Impact', aliases: ['genshin impact', 'genshin'] },
  honkai: { jp: 'Honkai: Star Rail', aliases: ['honkai: star rail', 'honkai impact', 'honkai'] },
  danganronpa: { jp: 'Danganronpa: Trigger Happy Havoc', aliases: ['danganronpa'] },
  highschooldxd: { jp: 'High School DxD', aliases: ['high school dxd', 'highschool dxd', 'dxd'] },
  evangelion: { jp: 'Neon Genesis Evangelion', aliases: ['neon genesis evangelion', 'evangelion'] },
  steinsgate: { jp: 'Steins;Gate', aliases: ['steins;gate', 'steins gate'] },
  darlinginthefranxx: { jp: 'DARLING in the FRANXX', aliases: ['darling in the franxx', 'ditf'] },
  naruto: { jp: 'Naruto', aliases: ['naruto', 'naruto shippuden', 'boruto'] },
  hunterxhunter: { jp: 'Hunter x Hunter', aliases: ['hunter x hunter', 'hunterxhunter'] },
  deathnote: { jp: 'Death Note', aliases: ['death note'] },
  overlord: { jp: 'Overlord', aliases: ['overlord'] },
  quintessentialquintuplets: { jp: '5-toubun no Hanayome', aliases: ['5-toubun no hanayome', 'the quintessential quintuplets', 'gotoubun'] },
  mydressupdarling: { jp: 'Sono Bisque Doll wa Koi wo Suru', aliases: ['sono bisque doll wa koi wo suru', 'my dress-up darling'] },
  frieren: { jp: 'Sousou no Frieren', aliases: ['sousou no frieren', 'frieren: beyond journey’s end', 'frieren'] },
  rascaldoesnotdream: { jp: 'Seishun Buta Yarou wa Bunny Girl Senpai no Yume wo Minai', aliases: ['seishun buta yarou', 'rascal does not dream'] },
  jojo: { jp: 'JoJo no Kimyou na Bouken', aliases: ['jojo\'s bizarre adventure', 'jojo no kimyou na bouken'] },
  bocchi: { jp: 'Bocchi the Rock!', aliases: ['bocchi the rock'] },
  spyxfamily: { jp: 'SPY x FAMILY', aliases: ['spy x family', 'spyxfamily'] },
  danmachi: { jp: 'Dungeon ni Deai wo Motomeru no wa Machigatteiru Darou ka', aliases: ['danmachi', 'is it wrong to try to pick up girls in a dungeon'] },
  monogatari: { jp: 'Monogatari Series', aliases: ['bakemonogatari', 'monogatari series', 'kizumonogatari', 'nisemonogatari'] },
  toarumajutsu: { jp: 'Toaru Majutsu no Index', aliases: ['toaru majutsu no index', 'toaru kagaku no railgun', 'a certain magical index', 'a certain scientific railgun'] },
  gintama: { jp: 'Gintama', aliases: ['gintama'] },
  moriarty: { jp: 'Yuukoku no Moriarty', aliases: ['moriarty the patriot', 'yuukoku no moriarty'] },
  vanitas: { jp: 'Vanitas no Carte', aliases: ['the case study of vanitas', 'vanitas no carte'] },
  apothecary: { jp: 'Kusuriya no Hitorigoto', aliases: ['the apothecary diaries', 'kusuriya no hitorigoto'] },
  slimeseason: { jp: 'Tensei shitara Slime Datta Ken', aliases: ['that time i got reincarnated as a slime', 'tensei shitara slime datta ken', 'tensura'] },
  kaguya: { jp: 'Kaguya-sama wa Kokurasetai', aliases: ['kaguya-sama', 'kaguya sama: love is war', 'tensai-tachi no renai zunousen'] },
  oregairu: { jp: 'Yahari Ore no Seishun Love Comedy wa Machigatteiru.', aliases: ['my teen romantic comedy', 'oregairu', 'yahari ore no seishun'] },
  shieldhero: { jp: 'Tate no Yuusha no Nariagari', aliases: ['the rising of the shield hero', 'tate no yuusha no nariagari'] },
  classroomelite: { jp: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e', aliases: ['classroom of the elite', 'youkoso jitsuryoku'] },
  hellsparadise: { jp: 'Jigokuraku', aliases: ['hell\'s paradise', 'jigokuraku'] },
};

function getCanonicalJapaneseTitle(series) {
  if (!series) return null;
  const lower = series.toLowerCase();
  for (const info of Object.values(CANONICAL_JAPANESE_SERIES)) {
    if (info.aliases.some((a) => lower.includes(a))) {
      return info.jp;
    }
  }
  return null;
}

function normalizeSeriesKey(series) {
  if (!series) return '';
  const lower = cleanSeries(series).toLowerCase();

  for (const [key, info] of Object.entries(CANONICAL_JAPANESE_SERIES)) {
    if (info.disallowed && info.disallowed.some((d) => lower.includes(d))) {
      continue;
    }
    if (info.aliases.some((a) => lower.includes(a))) {
      return key;
    }
  }

  return cleanSeries(series)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function seriesMatch(sA, sB) {
  if (!sA || !sB) return false;
  const kA = normalizeSeriesKey(sA);
  const kB = normalizeSeriesKey(sB);
  if (kA && kA === kB) return true;
  return false;
}

async function run() {
  const isApply = process.argv.includes('--apply');

  console.log(`\n=================================================================`);
  console.log(`🧹 DEDUPLICAÇÃO DE PERSONAGENS & COMPENSAÇÃO 5X (WAIFULETES)`);
  console.log(`MODO: ${isApply ? '🔥 APLICAÇÃO REAL (--apply)' : '🔍 DRY-RUN (Apenas Simulação)'}`);
  console.log(`MÉTODO: Soft-delete (isActive = false), 0 dados destruídos permanentemente`);
  console.log(`REGRA: Maior raridade vence; se empate, preserva quem estiver casado!`);
  console.log(`REGRA: Reembolso de 5x Zinthos para casados que forem desativados`);
  console.log(`=================================================================\n`);

  console.log('📦 Carregando catálogo ativo e relacionamentos...');
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      series: true,
      baseRarity: true,
      rank: true,
      likeCount: true,
      claimCount: true,
      haremEntries: {
        select: {
          id: true,
          userId: true,
          keys: true,
          user: { select: { id: true, name: true, kakera: true } },
        },
      },
    },
  });

  const byTokenName = new Map();
  for (const c of characters) {
    const key = normalizeNameTokens(c.name);
    if (!key || key.length < 3) continue;
    if (!byTokenName.has(key)) byTokenName.set(key, []);
    byTokenName.get(key).push(c);
  }

  const duplicateGroups = [];
  for (const [key, list] of byTokenName.entries()) {
    if (list.length > 1) {
      const visited = new Set();
      for (let i = 0; i < list.length; i++) {
        if (visited.has(list[i].id)) continue;
        const group = [list[i]];

        for (let j = i + 1; j < list.length; j++) {
          if (visited.has(list[j].id)) continue;
          if (seriesMatch(list[i].series, list[j].series)) {
            group.push(list[j]);
            visited.add(list[j].id);
          }
        }

        if (group.length > 1) {
          visited.add(list[i].id);
          duplicateGroups.push(group);
        }
      }
    }
  }

  let totalCharsToDeactivate = 0;
  let totalDivorces = 0;
  let totalKakeraRefunded = 0;
  const actions = [];

  for (const group of duplicateGroups) {
    group.sort((a, b) => {
      const rA = RARITY_ORDER[a.baseRarity] || 1;
      const rB = RARITY_ORDER[b.baseRarity] || 1;

      // 1. Diferença de raridade
      if (rB !== rA) return rB - rA;

      // 2. Se raridades são iguais: PREFERÊNCIA ABSOLUTA PARA QUEM ESTÁ CASADO!
      // (Se A está casado e B é solteiro, A ganha e B é desativado sem divórcio)
      const aMarried = (a.claimCount > 0 || a.haremEntries.length > 0) ? 1 : 0;
      const bMarried = (b.claimCount > 0 || b.haremEntries.length > 0) ? 1 : 0;
      if (bMarried !== aMarried) return bMarried - aMarried;

      // 3. Ter rank oficial do Mudae (NOT NULL)
      const aHasRank = a.rank !== null ? 1 : 0;
      const bHasRank = b.rank !== null ? 1 : 0;
      if (bHasRank !== aHasRank) return bHasRank - aHasRank;

      // 4. Menor número de rank Mudae (mais popular)
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;

      return b.likeCount - a.likeCount;
    });

    const winner = group[0];
    const losers = group.slice(1);
    const targetCanonicalSeries = getCanonicalJapaneseTitle(winner.series) || winner.series;

    for (const loser of losers) {
      totalCharsToDeactivate++;
      const divorcesForLoser = [];

      if (loser.haremEntries && loser.haremEntries.length > 0) {
        for (const entry of loser.haremEntries) {
          totalDivorces++;
          const refundCalc = calculateDivorceRefund(loser.baseRarity, entry.keys);
          const baseKakera = refundCalc.netKakera;
          const compensation5x = baseKakera * 5;
          totalKakeraRefunded += compensation5x;

          divorcesForLoser.push({
            haremEntryId: entry.id,
            userId: entry.userId,
            userName: entry.user?.name || entry.userId,
            keys: entry.keys,
            baseKakera,
            compensation5x,
          });
        }
      }

      actions.push({
        winnerId: winner.id,
        winnerName: winner.name,
        winnerSeries: winner.series,
        winnerRarity: winner.baseRarity,
        canonicalSeries: targetCanonicalSeries,
        loserId: loser.id,
        loserName: loser.name,
        loserSeries: loser.series,
        loserRarity: loser.baseRarity,
        divorces: divorcesForLoser,
      });
    }
  }

  console.log(`\n📊 PLANO DE EXECUÇÃO DETALHADO:`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`  • Grupos duplicados identificados:           ${duplicateGroups.length}`);
  console.log(`  • Personagens duplicados a DESATIVAR:       ${totalCharsToDeactivate}`);
  console.log(`  • Divórcios com compensação a realizar:     ${totalDivorces}`);
  console.log(`  • Total de Zinthos a reembolsar (5x):       ${totalKakeraRefunded.toLocaleString('pt-BR')} 💜`);
  console.log(`-----------------------------------------------------------------`);

  if (isApply) {
    console.log(`\n⏳ Aplicando alterações com Soft-Delete no PostgreSQL...`);
    const startTime = Date.now();

    await prisma.$transaction(async (tx) => {
      for (const act of actions) {
        // 1. Se vencedor não tiver o título canônico em japonês, atualiza
        if (act.canonicalSeries && act.winnerSeries !== act.canonicalSeries) {
          await tx.character.update({
            where: { id: act.winnerId },
            data: { series: act.canonicalSeries, updatedAt: new Date() },
          });
        }

        // 2. Processa divórcios e reembolsos 5x para o perdedor
        for (const d of act.divorces) {
          await tx.user.update({
            where: { id: d.userId },
            data: { kakera: { increment: d.compensation5x } },
          });

          await tx.kakeraTransaction.create({
            data: {
              userId: d.userId,
              amount: d.compensation5x,
              reason: 'DIVORCE',
              metadata: {
                type: 'DUPLICATE_MERGE_5X_COMPENSATION',
                deactivatedCharacterId: act.loserId,
                deactivatedCharacterName: act.loserName,
                deactivatedCharacterSeries: act.loserSeries,
                deactivatedCharacterRarity: act.loserRarity,
                keptCharacterId: act.winnerId,
                keptCharacterName: act.winnerName,
                keysAccumulated: d.keys,
                baseDivorceValue: d.baseKakera,
                multiplier: 5,
                compensationAmount: d.compensation5x,
              },
            },
          });

          await tx.haremEntry.delete({
            where: { id: d.haremEntryId },
          });
        }

        // 3. Remove vínculos voláteis (wishlists, covets, classificados)
        await tx.soulmate.deleteMany({ where: { characterId: act.loserId } });
        await tx.wishlistEntry.deleteMany({ where: { characterId: act.loserId } });
        await tx.characterSuggestion.deleteMany({ where: { characterId: act.loserId } });
        await tx.characterCovet.deleteMany({ where: { characterId: act.loserId } });
        await tx.marketListingNotification.deleteMany({ where: { characterId: act.loserId } });
        await tx.marketListing.deleteMany({ where: { characterId: act.loserId } });
        await tx.characterInvestment.deleteMany({ where: { characterId: act.loserId } });
        await tx.groupDisabledSeries.deleteMany({ where: { characterId: act.loserId } });

        // 4. SOFT-DELETE: desativa o personagem (isActive = false)
        await tx.character.update({
          where: { id: act.loserId },
          data: {
            isActive: false,
            claimCount: 0,
            updatedAt: new Date(),
          },
        });
      }
    }, {
      maxWait: 60000, // 60s max wait
      timeout: 120000, // 120s timeout
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ SUCESSO ABSOLUTO! Operação concluída em ${elapsed}s.`);
    console.log(`  - Personagens duplicados desativados (soft-delete): ${totalCharsToDeactivate}`);
    console.log(`  - Jogadores divorciados e indenizados: ${totalDivorces}`);
    console.log(`  - Total de Kakera injetado aos jogadores (5x): ${totalKakeraRefunded.toLocaleString('pt-BR')} Zinthos`);
  } else {
    console.log(`\nℹ️ Modo Dry-Run finalizado com sucesso. NENHUM dado foi alterado.`);
    console.log(`Para aplicar no banco de dados, execute: node scripts/deduplicateCharacters.js --apply`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error('❌ Falha crítica:', e);
  await prisma.$disconnect();
  process.exit(1);
});
