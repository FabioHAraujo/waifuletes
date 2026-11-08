import { PrismaClient } from '../api/node_modules/@prisma/client/default.js';
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
  const txs = await prisma.kakeraTransaction.findMany({
    where: {
      metadata: {
        path: ['type'],
        equals: 'DUPLICATE_MERGE_5X_COMPENSATION'
      }
    },
    include: {
      user: {
        select: { name: true }
      }
    },
    orderBy: [
      { amount: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  console.log('Total transactions found:', txs.length);

  let md = '# 📜 Reorganização de Raridades, Sincronização e Deduplicação de Personagens\n\n';
  md += 'Este documento registra detalhadamente todas as operações realizadas em 08/11/2026 na base de dados do Waifuletes, incluindo a sincronização com a telemetria do Mudae, a deduplicação de personagens (inglês vs japonês / nomes invertidos) com compensação de 5x para haréns afetados, e a redistribuição de raridades sem rebaixamento de personagens.\n\n';
  md += '> [!NOTE]\n';
  md += '> **Privacidade:** Em conformidade estrita com as diretrizes do projeto, todos os identificadores numéricos, números de telefone e JIDs foram omitidos deste relatório, utilizando exclusivamente os nomes de exibição dos jogadores.\n\n';

  md += '---\n\n';
  md += '## 1. Visão Geral das Operações Realizadas\n\n';
  md += '1. **Sincronização com o Mudae (Top 80k):** Consulta a 4.000 páginas da API oficial do Mudae, atualizando a posição e tags de 68.238 personagens.\n';
  md += '2. **Deduplicação Inteligente com Soft-Delete:** 1.839 personagens duplicados ou com nomes invertidos/grafias em inglês foram desativados (`isActive = false`), mantendo a integridade para restaurações futuras.\n';
  md += '3. **Indenização de Jogadores (5x Base Harém):** 133 casamentos em cópias inferiores foram desfeitos com pagamento de 5x o valor oficial do divórcio calculado com base na economia real do harém (total de **6.400.000 Zinthos** creditados aos 66 jogadores afetados).\n';
  md += '   - **Lendário:** 135.000 Zinthos base ➔ 675.000 Zinthos (5x)\n';
  md += '   - **Épico:** 45.000 Zinthos base ➔ 225.000 Zinthos (5x)\n';
  md += '   - **Raro:** 9.000 Zinthos base ➔ 45.000 Zinthos (5x)\n';
  md += '   - **Incomum:** 4.000 Zinthos base ➔ 20.000 Zinthos (5x)\n';
  md += '   - **Comum:** 1.000 Zinthos base ➔ 5.000 Zinthos (5x)\n';
  md += '4. **Reorganização de Raridades (2% / 10% / 20% / 28% / 40%):** Redistribuição por cascata top-down baseada no rank atualizado, sem nenhum rebaixamento (50.292 personagens subiram de classe, sendo 5.281 waifus casadas em haréns).\n\n';

  md += '---\n\n';
  md += '## 2. Distribuição Final de Raridades\n\n';
  md += '| Raridade | Quantidade | Percentual Real | Meta | Faixa Oficial de Rank Mudae |\n';
  md += '| :--- | :---: | :---: | :---: | :--- |\n';
  md += '| **Lendário** | 4.274 | **2,00%** | 2,00% | Rank 1 a #4.466 (+ legados mantidos) |\n';
  md += '| **Épico** | 21.372 | **10,00%** | 10,00% | Rank #4.467 a #20.701 (+ legados mantidos) |\n';
  md += '| **Raro** | 42.744 | **20,00%** | 20,00% | Rank #20.702 a #62.128 (+ legados mantidos) |\n';
  md += '| **Incomum** | 59.842 | **28,00%** | 28,00% | Rank #62.129 a #76.135 (+ legados mantidos) |\n';
  md += '| **Comum** | 85.489 | **40,00%** | 40,00% | Acima de #76.135 e sem rank |\n';
  md += '| **Total Ativo** | **213.721** | **100,00%** | **100,00%** | — |\n\n';

  md += '---\n\n';
  md += '## 3. Top 15 Jogadores com Mais Waifus Promovidas em Haréns\n\n';
  md += '| Posição | Jogador | Waifus Promovidas no Harém |\n';
  md += '| :---: | :--- | :---: |\n';
  md += '| #1 | theuzin | **367** |\n';
  md += '| #2 | Pedro Carboni | **256** |\n';
  md += '| #3 | Deivin | **142** |\n';
  md += '| #4 | Beowulf | **127** |\n';
  md += '| #5 | Galinho | **120** |\n';
  md += '| #6 | um membro qualquer | **109** |\n';
  md += '| #7 | Agrius Metamorphosis | **107** |\n';
  md += '| #8 | Zé Pilantra | **103** |\n';
  md += '| #9 | Matagal Fonseca | **85** |\n';
  md += '| #10 | Fogacahc | **81** |\n';
  md += '| #11 | craque fluks | **75** |\n';
  md += '| #12 | Sheik das Taxas 🇸🇦 | **74** |\n';
  md += '| #13 | Azazel | **73** |\n';
  md += '| #14 | Ezequiel Santos | **72** |\n';
  md += '| #15 | Smaller | **71** |\n\n';

  md += '---\n\n';
  md += '## 4. Registro Completo de Casamentos Desfeitos e Compensações (133 Casos)\n\n';
  md += '| # | Jogador | Personagem Desativado | Série | Raridade | Chaves | Base | Compensação (5x) | Motivo da Desativação / Versão Mantida |\n';
  md += '| :-: | :--- | :--- | :--- | :---: | :-: | :-: | :-: | :--- |\n';

  txs.forEach((t, i) => {
    const meta = t.metadata || {};
    const pName = (t.user?.name || 'Jogador Anônimo').replace(/\|/g, '-');
    const cName = (meta.deactivatedCharacterName || 'Desconhecido').replace(/\|/g, '-');
    const cSeries = (meta.deactivatedCharacterSeries || 'N/A').replace(/\|/g, '-');
    const cRarity = meta.deactivatedCharacterRarity || 'COMMON';
    const keys = meta.keysAccumulated || 1;
    const baseVal = (meta.baseDivorceValue || 0).toLocaleString('pt-BR');
    const refund5x = t.amount.toLocaleString('pt-BR');
    const keptName = (meta.keptCharacterName || '').replace(/\|/g, '-');
    const reason = keptName ? `Duplicata inferior; mantida versão oficial "${keptName}"` : 'Duplicata com grafia desatualizada/sem rank';

    md += `| ${i + 1} | ${pName} | ${cName} | ${cSeries} | ${cRarity} | ${keys} | ${baseVal} 💜 | **${refund5x} 💜** | ${reason} |\n`;
  });

  const docPath = '/home/moothz/waifuletes/docs/reorganizacao-raridades-e-deduplicacao.md';
  fs.writeFileSync(docPath, md, 'utf-8');
  console.log(`Documento ${docPath} gerado com sucesso!`);
  await prisma.$disconnect();
}
run();
