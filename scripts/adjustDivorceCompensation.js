import { PrismaClient } from '../api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

const BASE_DIVORCE_VALUES = {
  COMMON: 1000,
  UNCOMMON: 4000,
  RARE: 9000,
  EPIC: 45000,
  LEGENDARY: 135000,
};

async function run() {
  const isApply = process.argv.includes('--apply');

  console.log(`\n=================================================================`);
  console.log(`💰 AJUSTE DE COMPENSAÇÃO DE DIVÓRCIO (5X BASE HARÉM)`);
  console.log(`MODO: ${isApply ? '🔥 APLICAÇÃO REAL (--apply)' : '🔍 SIMULAÇÃO (Dry-Run)'}`);
  console.log(`VALORES BASE DE DIVÓRCIO:`);
  console.log(`- Lendário: 135.000 Zinthos  ➔  5x = 675.000 Zinthos`);
  console.log(`- Épico:     45.000 Zinthos  ➔  5x = 225.000 Zinthos`);
  console.log(`- Raro:       9.000 Zinthos  ➔  5x =  45.000 Zinthos`);
  console.log(`- Incomum:    4.000 Zinthos  ➔  5x =  20.000 Zinthos`);
  console.log(`- Comum:      1.000 Zinthos  ➔  5x =   5.000 Zinthos`);
  console.log(`=================================================================\n`);

  const txs = await prisma.kakeraTransaction.findMany({
    where: {
      metadata: {
        path: ['type'],
        equals: 'DUPLICATE_MERGE_5X_COMPENSATION',
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          kakera: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total de transações de compensação encontradas: ${txs.length}\n`);

  let totalPreviousPaid = 0;
  let totalNewTarget = 0;
  let totalDiffToCredit = 0;

  const userAdjustments = new Map();

  for (const t of txs) {
    const meta = t.metadata || {};
    const rarity = meta.deactivatedCharacterRarity || 'COMMON';
    const keys = Math.max(1, Number(meta.keysAccumulated) || 1);
    const baseUnit = BASE_DIVORCE_VALUES[rarity] || 1000;
    const baseValue = baseUnit * keys;
    const target5x = baseValue * 5;
    const diff = target5x - t.amount;

    totalPreviousPaid += t.amount;
    totalNewTarget += target5x;
    totalDiffToCredit += diff;

    if (!userAdjustments.has(t.userId)) {
      userAdjustments.set(t.userId, {
        userId: t.userId,
        userName: t.user?.name || 'Desconhecido',
        currentBalance: t.user?.kakera || 0,
        totalDiff: 0,
        transactions: [],
      });
    }

    const u = userAdjustments.get(t.userId);
    u.totalDiff += diff;
    u.transactions.push({
      txId: t.id,
      rarity,
      charName: meta.deactivatedCharacterName,
      keys,
      previousAmount: t.amount,
      newAmount: target5x,
      diff,
    });
  }

  console.log(`📊 Estatísticas Gerais:`);
  console.log(`- Total já pago anteriormente: ${totalPreviousPaid.toLocaleString('pt-BR')} Zinthos`);
  console.log(`- Total corrigido (5x oficial): ${totalNewTarget.toLocaleString('pt-BR')} Zinthos`);
  console.log(`- Total a creditar aos jogadores: ${totalDiffToCredit.toLocaleString('pt-BR')} Zinthos`);
  console.log(`- Jogadores afetados: ${userAdjustments.size}`);

  console.log(`\n🏆 Maiores ajustes por jogador:`);
  const sortedUsers = Array.from(userAdjustments.values()).sort((a, b) => b.totalDiff - a.totalDiff);
  for (const u of sortedUsers.slice(0, 10)) {
    console.log(`- ${u.userName}: +${u.totalDiff.toLocaleString('pt-BR')} Zinthos (${u.transactions.length} waifus) | Saldo Atual: ${u.currentBalance.toLocaleString('pt-BR')}`);
  }

  if (isApply) {
    console.log(`\n🚀 Aplicando alterações no banco de dados em transação única...`);
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar saldo de cada usuário
      for (const u of userAdjustments.values()) {
        await tx.user.update({
          where: { id: u.userId },
          data: { kakera: { increment: u.totalDiff } },
        });
      }

      // 2. Atualizar registros em kakera_transactions
      for (const u of userAdjustments.values()) {
        for (const t of u.transactions) {
          const original = txs.find((x) => x.id === t.txId);
          const meta = original?.metadata || {};

          await tx.kakeraTransaction.update({
            where: { id: t.txId },
            data: {
              amount: t.newAmount,
              metadata: {
                ...meta,
                baseDivorceValue: BASE_DIVORCE_VALUES[t.rarity] * t.keys,
                compensationAmount: t.newAmount,
                adjustedFromPreviousAmount: t.previousAmount,
                adjustmentDifferenceCredited: t.diff,
                adjustedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    }, {
      maxWait: 60000,
      timeout: 120000,
    });

    console.log(`\n✅ Sucesso! Todos os 133 divórcios foram recalculados e os saldos creditados.`);
  } else {
    console.log(`\n💡 Para aplicar as correções no banco, execute com --apply`);
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
