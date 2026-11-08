import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpeza de dados de teste na base de dados...');

  const testUsers = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: 'test-user-1' } },
        {
          OR: [
            {
              name: {
                in: [
                  'Test User',
                  'Roll Tester',
                  'Outro Jogador Teste',
                  'Daily Tester',
                  'Tester',
                  'Concurrent Tester',
                  'Jogador Harem Teste',
                  'RollTester',
                  'test_validation_user',
                  'Seed Init User',
                  'Jogador Web Teste',
                  'Jogador Teste Já Lendário',
                  'Jogador Novas Features',
                  'Jogador Teste',
                  'Jogador Teste Casamentos',
                ],
              },
            },
            { id: { startsWith: 'test_' } },
            { id: { startsWith: 'another_user_' } },
            { id: { startsWith: 'seed_' } },
            { id: { startsWith: 'roll_tester_' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      harem: { select: { characterId: true } },
    },
  });

  const testUserIds = testUsers.map((u) => u.id);
  const characterIds = Array.from(new Set(testUsers.flatMap((u) => u.harem.map((h) => h.characterId))));

  console.log(`Encontrados ${testUsers.length} usuários de teste e ${characterIds.length} personagens casados.`);

  let freedMarriages = 0;
  let deletedUsers = 0;
  let deletedSuggestions = 0;
  let deletedGroups = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Desfaz casamentos e atualiza claimCount dos personagens
    if (characterIds.length > 0) {
      await tx.$executeRaw`
        UPDATE characters
        SET "claimCount" = GREATEST(0, "claimCount" - 1)
        WHERE id = ANY(${characterIds})
      `;
    }

    if (testUserIds.length > 0) {
      const haremRes = await tx.haremEntry.deleteMany({ where: { userId: { in: testUserIds } } });
      freedMarriages = haremRes.count;

      await tx.soulmate.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.wishlistEntry.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.userNotification.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.userCollection.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.characterInvestment.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.kakeraTransaction.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.userGroup.deleteMany({ where: { userId: { in: testUserIds } } });
      const userRes = await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
      deletedUsers = userRes.count;
    }

    // 2. Apaga sugestões de teste
    const suggRes = await tx.characterSuggestion.deleteMany({
      where: {
        OR: [
          ...(testUserIds.length > 0 ? [{ userId: { in: testUserIds } }] : []),
          { reason: { contains: 'debounce', mode: 'insensitive' } },
          { suggestedName: { contains: 'debounce', mode: 'insensitive' } },
          { reason: { contains: 'Sugestão para validar', mode: 'insensitive' } },
          { reason: { contains: 'Sugestão de teste', mode: 'insensitive' } },
        ],
      },
    });
    deletedSuggestions = suggRes.count;

    // 3. Apaga grupos de teste
    const grpRes = await tx.group.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'test_' } },
          { id: { startsWith: 'group_roll_tester_' } },
          { id: 'test-group-1' },
        ],
      },
    });
    deletedGroups = grpRes.count;
  });

  console.log('✅ Limpeza concluída com sucesso:');
  console.log(`- Usuários de teste deletados: ${deletedUsers}`);
  console.log(`- Casamentos de teste desfeitos (personagens liberados): ${freedMarriages}`);
  console.log(`- Sugestões de teste apagadas: ${deletedSuggestions}`);
  console.log(`- Grupos de teste apagados: ${deletedGroups}`);
}

main()
  .catch((err) => {
    console.error('❌ Erro durante a limpeza:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
