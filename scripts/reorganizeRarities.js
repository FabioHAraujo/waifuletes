import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RARITY_ORDER = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

async function run() {
  const isApply = process.argv.includes('--apply');

  console.log(`\n=================================================================`);
  console.log(`🚀 REORGANIZAÇÃO TOTAL DE RARIDADES (Waifuletes)`);
  console.log(`MODO: ${isApply ? '🔥 APLICAÇÃO REAL (--apply)' : '🔍 DRY-RUN (Apenas Simulação)'}`);
  console.log(`METAS: Lendário 2% | Épico 10% | Raro 20% | Incomum 28% | Comum 40%`);
  console.log(`REGRA: Zero Downgrades (Cascata Top-Down baseada no Rank Mudae atualizado)`);
  console.log(`=================================================================\n`);

  console.log('📦 Carregando personagens ativos e casamentos...');
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      series: true,
      baseRarity: true,
      rank: true,
      claimCount: true,
      likeCount: true,
      haremEntries: {
        select: {
          id: true,
          userId: true,
          keys: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  const total = characters.length;
  console.log(`Total de personagens ativos: ${total.toLocaleString('pt-BR')}`);

  // Metas exatas
  const targetCounts = {
    LEGENDARY: Math.round(total * 0.02),
    EPIC: Math.round(total * 0.10),
    RARE: Math.round(total * 0.20),
    UNCOMMON: Math.round(total * 0.28),
    COMMON: total - (
      Math.round(total * 0.02) +
      Math.round(total * 0.10) +
      Math.round(total * 0.20) +
      Math.round(total * 0.28)
    ),
  };

  console.log(`\nMetas em unidades:`);
  for (const [r, tgt] of Object.entries(targetCounts)) {
    const pct = ((tgt / total) * 100).toFixed(2);
    console.log(`  • ${r.padEnd(10)}: ${tgt.toLocaleString('pt-BR').padStart(6)} (${pct}%)`);
  }

  // Simular atribuição em cascata Top-Down
  const assigned = characters.map(c => ({
    ...c,
    finalRarity: c.baseRarity,
    assignedInStep: null,
  }));

  // 1. LENDÁRIO
  const existingLegendary = assigned.filter(c => c.finalRarity === 'LEGENDARY');
  const neededLegendary = targetCounts.LEGENDARY - existingLegendary.length;

  const candidatesForLegendary = assigned
    .filter(c => RARITY_ORDER[c.finalRarity] < RARITY_ORDER.LEGENDARY)
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.likeCount - a.likeCount;
    });

  const promotedToLegendary = candidatesForLegendary.slice(0, neededLegendary);
  const cutoffLegendary = promotedToLegendary[promotedToLegendary.length - 1]?.rank;
  for (const c of promotedToLegendary) {
    c.finalRarity = 'LEGENDARY';
    c.assignedInStep = 'UPGRADE_LEGENDARY';
  }

  // 2. ÉPICO
  const existingEpic = assigned.filter(c => c.finalRarity === 'EPIC');
  const neededEpic = targetCounts.EPIC - existingEpic.length;

  const candidatesForEpic = assigned
    .filter(c => RARITY_ORDER[c.finalRarity] < RARITY_ORDER.EPIC)
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.likeCount - a.likeCount;
    });

  const promotedToEpic = candidatesForEpic.slice(0, neededEpic);
  const cutoffEpic = promotedToEpic[promotedToEpic.length - 1]?.rank;
  for (const c of promotedToEpic) {
    c.finalRarity = 'EPIC';
    c.assignedInStep = 'UPGRADE_EPIC';
  }

  // 3. RARO
  const existingRare = assigned.filter(c => c.finalRarity === 'RARE');
  const neededRare = targetCounts.RARE - existingRare.length;

  const candidatesForRare = assigned
    .filter(c => RARITY_ORDER[c.finalRarity] < RARITY_ORDER.RARE)
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.likeCount - a.likeCount;
    });

  const promotedToRare = candidatesForRare.slice(0, neededRare);
  const cutoffRare = promotedToRare[promotedToRare.length - 1]?.rank;
  for (const c of promotedToRare) {
    c.finalRarity = 'RARE';
    c.assignedInStep = 'UPGRADE_RARE';
  }

  // 4. INCOMUM
  const existingUncommon = assigned.filter(c => c.finalRarity === 'UNCOMMON');
  const neededUncommon = targetCounts.UNCOMMON - existingUncommon.length;

  const candidatesForUncommon = assigned
    .filter(c => RARITY_ORDER[c.finalRarity] < RARITY_ORDER.UNCOMMON)
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.likeCount - a.likeCount;
    });

  const promotedToUncommon = candidatesForUncommon.slice(0, neededUncommon);
  const cutoffUncommon = promotedToUncommon[promotedToUncommon.length - 1]?.rank;
  for (const c of promotedToUncommon) {
    c.finalRarity = 'UNCOMMON';
    c.assignedInStep = 'UPGRADE_UNCOMMON';
  }

  // 5. Estatísticas de Mudança & Beneficiados
  let totalUpgraded = 0;
  let marriedUpgradedCount = 0;
  const userBenefits = new Map(); // userId -> { name, upgradesCount, details: [] }
  const marriedUpgradesList = [];

  for (const c of assigned) {
    if (RARITY_ORDER[c.finalRarity] > RARITY_ORDER[c.baseRarity]) {
      totalUpgraded++;
      const isMarried = c.haremEntries && c.haremEntries.length > 0;
      if (isMarried) {
        marriedUpgradedCount++;
        for (const entry of c.haremEntries) {
          const uId = entry.userId;
          const uName = entry.user?.name || uId;
          if (!userBenefits.has(uId)) {
            userBenefits.set(uId, { name: uName, count: 0, items: [] });
          }
          const uData = userBenefits.get(uId);
          uData.count++;
          uData.items.push({
            charName: c.name,
            charSeries: c.series,
            from: c.baseRarity,
            to: c.finalRarity,
            rank: c.rank,
          });

          marriedUpgradesList.push({
            userName: uName,
            userId: uId,
            charName: c.name,
            charSeries: c.series,
            from: c.baseRarity,
            to: c.finalRarity,
            rank: c.rank,
          });
        }
      }
    }
  }

  console.log(`\n📊 RESULTADO DA DISTRIBUIÇÃO & CORTES CALCULADOS:`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`  • Corte para LENDÁRIO (Top 2%):  Rank <= #${cutoffLegendary}`);
  console.log(`  • Corte para ÉPICO (Top 10%):    Rank <= #${cutoffEpic}`);
  console.log(`  • Corte para RARO (Top 20%):     Rank <= #${cutoffRare}`);
  console.log(`  • Corte para INCOMUM (Top 28%):  Rank <= #${cutoffUncommon}`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`  • Total de Personagens Upgradados: ${totalUpgraded.toLocaleString('pt-BR')} (${((totalUpgraded/total)*100).toFixed(2)}%)`);
  console.log(`  • Total de Rebaixamentos:          0 (0,00%)`);
  console.log(`  • Total de WAIFUS CASADAS que subiram de classe: ${marriedUpgradedCount}`);

  // Ranking de Jogadores mais beneficiados
  const topBenefitedUsers = Array.from(userBenefits.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  console.log(`\n🏆 TOP 15 JOGADORES MAIS BENEFICIADOS (MAIS WAIFUS UPGRADADAS):`);
  topBenefitedUsers.forEach((u, i) => {
    console.log(`  #${(i + 1).toString().padStart(2)} ${u.name.padEnd(25)}: ${u.count} waifus subiram de classe!`);
    u.items.slice(0, 3).forEach(it => {
      console.log(`      ↳ ${it.charName} (${it.from} ➔ ${it.to}) [Rank #${it.rank ?? 'N/A'}]`);
    });
  });

  if (isApply) {
    console.log(`\n⏳ Aplicando atualizações no PostgreSQL em transação atômica...`);
    const startTime = Date.now();

    const [resLeg, resEpic, resRare, resUnc] = await prisma.$transaction([
      prisma.$executeRawUnsafe(`
        UPDATE characters
        SET "baseRarity" = 'LEGENDARY', "updatedAt" = NOW()
        WHERE "isActive" = true
          AND rank IS NOT NULL AND rank <= ${cutoffLegendary}
          AND "baseRarity" IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC')
      `),
      prisma.$executeRawUnsafe(`
        UPDATE characters
        SET "baseRarity" = 'EPIC', "updatedAt" = NOW()
        WHERE "isActive" = true
          AND rank IS NOT NULL AND rank > ${cutoffLegendary} AND rank <= ${cutoffEpic}
          AND "baseRarity" IN ('COMMON', 'UNCOMMON', 'RARE')
      `),
      prisma.$executeRawUnsafe(`
        UPDATE characters
        SET "baseRarity" = 'RARE', "updatedAt" = NOW()
        WHERE "isActive" = true
          AND rank IS NOT NULL AND rank > ${cutoffEpic} AND rank <= ${cutoffRare}
          AND "baseRarity" IN ('COMMON', 'UNCOMMON')
      `),
      prisma.$executeRawUnsafe(`
        UPDATE characters
        SET "baseRarity" = 'UNCOMMON', "updatedAt" = NOW()
        WHERE "isActive" = true
          AND rank IS NOT NULL AND rank > ${cutoffRare} AND rank <= ${cutoffUncommon}
          AND "baseRarity" = 'COMMON'
      `),
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalUpdated = resLeg + resEpic + resRare + resUnc;

    console.log(`\n✅ SUCESSO ABSOLUTO! Operação concluída em ${duration}s.`);
    console.log(`  - Lendários promovidos: ${resLeg.toLocaleString('pt-BR')}`);
    console.log(`  - Épicos promovidos:     ${resEpic.toLocaleString('pt-BR')}`);
    console.log(`  - Raros promovidos:      ${resRare.toLocaleString('pt-BR')}`);
    console.log(`  - Incomuns promovidos:   ${resUnc.toLocaleString('pt-BR')}`);
    console.log(`  - Total de registros atualizados: ${totalUpdated.toLocaleString('pt-BR')}`);
  } else {
    console.log(`\nℹ️ Modo Dry-Run finalizado. Para aplicar no banco, execute com --apply.`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error('❌ Falha crítica:', e);
  await prisma.$disconnect();
  process.exit(1);
});
