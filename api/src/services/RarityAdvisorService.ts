import { config } from '../config.js';
import type { SuggestionNotifyData } from './TelegramNotificationService.js';
import type { Redis } from 'ioredis';

export interface RarityAdvisorEvaluation {
  response: string;
  systemPrompt: string;
  userPrompt: string;
  searchedQueries: string[];
  evaluatedAt: string;
  mudaeRank?: number | null;
}

export class RarityAdvisorService {
  private url: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.url = config.HYPERION_LLM_URL;
    this.apiKey = config.HYPERION_LLM_KEY;
    this.model = config.HYPERION_LLM_MODEL;
  }

  /**
   * Realiza busca na web usando DuckDuckGo HTML e extrai resumos textuais
   */
  async searchWeb(query: string): Promise<string> {
    if (!query || typeof query !== 'string') {
      return 'Nenhum termo de pesquisa fornecido.';
    }

    const cleanQuery = query.trim();
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`DuckDuckGo retornou HTTP ${res.status}`);
      }

      const html = await res.text();
      const regex = /<a[^>]+class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      let match: RegExpExecArray | null;
      const snippets: string[] = [];

      while ((match = regex.exec(html)) !== null && snippets.length < 4) {
        const cleaned = match[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .trim();
        if (cleaned) {
          snippets.push(cleaned);
        }
      }

      if (snippets.length > 0) {
        return snippets.map((s, idx) => `[${idx + 1}] ${s}`).join('\n\n');
      }
    } catch (err: any) {
      console.warn(`[RarityAdvisor] Busca DuckDuckGo falhou (${err?.message || err}). Tentando Wikipedia...`);
    }

    // Fallback: Wikipedia OpenSearch API
    try {
      const wikiUrl = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&namespace=0&format=json`;
      const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(5000) });
      if (wikiRes.ok) {
        const wikiData = (await wikiRes.json()) as any[];
        const titles = wikiData[1] || [];
        const descs = wikiData[2] || [];
        if (titles.length > 0) {
          return titles.map((t: string, i: number) => `[Wiki] ${t}: ${descs[i] || 'Sem descrição'}`).join('\n');
        }
      }
    } catch (_) {}

    return 'Nenhum resultado relevante encontrado na pesquisa web.';
  }

  /**
   * Avalia a sugestão de raridade usando o modelo Hyperion Gemma 4 12B com ferramenta de busca web
   * e regras oficiais de Rank do Mudae (1-4466 = Lendário [2%], 4467-20701 = Épico [10%], 20702-62128 = Raro [20%], 62129-76135 = Incomum [28%], Acima de 76135 = Comum [40%])
   */
  async evaluateRaritySuggestion(data: SuggestionNotifyData, redis?: Redis): Promise<RarityAdvisorEvaluation | null> {
    if (!this.url || !this.model) {
      return null;
    }

    const charName = data.character?.name || data.characterName || 'Desconhecido';
    const series = data.character?.series || data.series || 'Desconhecida';
    const currentRarity = data.currentRarity || data.character?.baseRarity || 'COMMON';
    const suggestedRarity = data.suggestedRarity || 'COMMON';
    const reason = (data.reason || '').trim();
    const suggesterName = data.userName || 'Usuário Anônimo';
    const isMarried = Boolean(data.isMarriedToSuggester);
    const mudaeRank = data.character?.rank;

    let rankInfo = 'Não informado no banco de dados local (pesquise na web se necessário)';
    if (mudaeRank && mudaeRank > 0) {
      if (mudaeRank <= 4466) {
        rankInfo = `#${mudaeRank} (Top ~4.466 ➔ Regra Oficial: LENDÁRIO)`;
      } else if (mudaeRank <= 20701) {
        rankInfo = `#${mudaeRank} (4.467 a 20.701 ➔ Regra Oficial: ÉPICO)`;
      } else if (mudaeRank <= 62128) {
        rankInfo = `#${mudaeRank} (20.702 a 62.128 ➔ Regra Oficial: RARO)`;
      } else if (mudaeRank <= 76135) {
        rankInfo = `#${mudaeRank} (62.129 a 76.135 ➔ Regra Oficial: INCOMUM)`;
      } else {
        rankInfo = `#${mudaeRank} (Acima de 76.135 ➔ Regra Oficial: COMUM)`;
      }
    }

    const systemPrompt = `Você é um analista perito em cultura pop, animes, games e moderação de raridade para o jogo de coleção Waifuletes.

TABELA OFICIAL DE RARIDADES E DIRETRIZES DE RANK MUDAE:
- LEGENDARY (🟡 Lendário): O topo absoluto da cultura pop/anime/jogos mundiais, figuras lendárias históricas com fandom global massivo.
  👉 REGRA DE OURO MUDAE: Personagens no TOP 4.466 do Mudae (Rank 1 a 4466) SÃO OBRIGATORIAMENTE LENDÁRIOS (2% do catálogo).
- EPIC (🟣 Épico): Protagonistas muito famosos, ícones consagrados, líderes de grandes obras populares.
  👉 REGRA DE OURO MUDAE: Personagens com Rank Mudae entre 4467 e 20701 SÃO OBRIGATORIAMENTE ÉPICOS (10% do catálogo).
- RARE (🔵 Raro): Protagonistas de obras menores/médias ou personagens principais de suporte em obras populares.
  👉 REGRA DE OURO MUDAE: Personagens com Rank Mudae entre 20702 e 62128 SÃO OBRIGATORIAMENTE RAROS (20% do catálogo).
- UNCOMMON (🟢 Incomum): Personagens secundários/coadjuvantes conhecidos em suas obras (Rank Mudae 62129 a 76135).
- COMMON (⚪ Comum): Figurantes, personagens de fundo, NPCs irrelevantes ou obras ultra-obscuras (Rank > 76135).

SUA MISSÃO:
1. CONSIDERE O RANK DO MUDAE DO PERSONAGEM:
   - Se o Rank Mudae estiver informado no chamado, aplique com rigor as faixas oficiais:
     • 1 a 4466: Recomende LEGENDARY.
     • 4467 a 20701: Recomende EPIC.
     • 20702 a 62128: Recomende RARE.
     • 62129 a 76135: Recomende UNCOMMON.
     • Acima de 76135: Recomende COMMON.
   - Se o rank não estiver informado no banco de dados local, você PODE e DEVE usar a ferramenta web_search pesquisando pelo personagem e seu rank/popularidade no bot Mudae (ex: "[Nome] mudae rank" ou "[Nome] [série] mudae") ou sua fama geral.
2. CHECAGEM FACTUAL DE ALEGAÇÕES (FATO VS EXAGERO/MENTIRA):
   - Pesquise a verdadeira relevância do personagem, protagonismo, popularidade e biografia.
   - Descubra se o motivo alegado pelo usuário é FATO comprovado ou se o usuário está MENTINDO / EXAGERANDO (ex: inventando feitos, fingindo que um coadjuvante é protagonista supremo, ou minimizando um ícone mundial).
${isMarried ? '3. ⚠️ ATENÇÃO CRÍTICA: O usuário que fez o pedido é CASADO com esse personagem no jogo! Verifique com rigor redobrado se há viés de interesse próprio para valorizar sua própria waifu.' : ''}
4. Emita seu parecer técnico objetivo em formato HTML para o Telegram e Painel Admin, seguindo RIGOROSAMENTE esta estrutura:
🤖 <b>Parecer da IA (Gemma 4 12B)</b>:

🎯 <b>Veredito:</b> [PROCEDENTE | EXAGERO | FALSO/MENTIRA]
🏆 <b>Rank Mudae:</b> [Ex: #842 (Top 4.466 -> Lendário) | #12500 (4.467-20.701 -> Épico) | #35000 (20.702-62.128 -> Raro) | #70000 (62.129-76.135 -> Incomum) | Acima de 76.135 / Não encontrado (Comum)]
🔍 <b>Fatos Apurados:</b> (1 a 2 frases factuais sobre quem realmente é o personagem e seu papel na obra)
⚖️ <b>Checagem da Alegação:</b> (Análise se o motivo do usuário confere ou se está distorcido/falso)
💡 <b>Raridade Recomendada:</b> [COMMON | UNCOMMON | RARE | EPIC | LEGENDARY] (breve explicação alinhada ao rank do Mudae e à relevância)`;

    const userPrompt = `Personagem: ${charName}
Série/Origem: ${series}
Raridade Atual: ${currentRarity}
Raridade Sugerida pelo Usuário: ${suggestedRarity}
Rank Mudae (Waifuletes/Mudae): ${rankInfo}
Motivo alegado pelo usuário: "${reason || '(Nenhum motivo fornecido)'}"
Sugerido por: ${suggesterName}
Usuário é casado com o personagem?: ${isMarried ? 'SIM (Possível conflito de interesse)' : 'NÃO'}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description:
            'Pesquisa na web por informações biográficas, relevância, popularidade, papel na trama e rank no bot Mudae (ex: "[Nome] mudae rank" ou "[Nome] [série]").',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Termo de pesquisa (ex: "Rem Re:Zero mudae rank" ou "Goku Dragon Ball mudae kakera")',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    const searchedQueries: string[] = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      // Chamada inicial
      const res1 = await fetch(`${this.url}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: 2048,
          temperature: 0.7,
          repetition_penalty: 1.15,
          frequency_penalty: 0.2,
          presence_penalty: 0.2,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res1.ok) {
        const errText = await res1.text();
        console.warn(`[RarityAdvisor] vLLM retornou HTTP ${res1.status}: ${errText}`);
        return null;
      }

      const data1 = (await res1.json()) as any;
      const choice1 = data1.choices?.[0];
      if (!choice1?.message) {
        return null;
      }

      // Se o modelo invocou ferramentas de busca
      if (choice1.message.tool_calls && choice1.message.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: choice1.message.content || null,
          tool_calls: choice1.message.tool_calls,
        });

        for (const tc of choice1.message.tool_calls) {
          let query = `${charName} ${series}`;
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            if (args.query) query = args.query;
          } catch (_) {}

          searchedQueries.push(query);
          const searchResult = await this.searchWeb(query);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function?.name || 'web_search',
            content: searchResult,
          });
        }

        // Segunda chamada com os resultados da busca
        const res2 = await fetch(`${this.url}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: 2048,
            temperature: 0.7,
            repetition_penalty: 1.15,
            frequency_penalty: 0.2,
            presence_penalty: 0.2,
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (!res2.ok) {
          return null;
        }

        const data2 = (await res2.json()) as any;
        const rawContent = data2.choices?.[0]?.message?.content?.trim() || null;
        const cleaned = rawContent ? this.cleanModelResponse(rawContent) : null;
        if (!cleaned) return null;

        const evaluation: RarityAdvisorEvaluation = {
          response: cleaned,
          systemPrompt,
          userPrompt,
          searchedQueries,
          evaluatedAt: new Date().toISOString(),
          mudaeRank: mudaeRank || null,
        };

        if (redis && data.id) {
          try {
            await redis.set(`suggestion:ai:${data.id}`, JSON.stringify(evaluation), 'EX', 30 * 86400);
          } catch (_) {}
        }

        return evaluation;
      }

      // Se o modelo já respondeu diretamente
      const rawContent = choice1.message.content?.trim() || null;
      const cleaned = rawContent ? this.cleanModelResponse(rawContent) : null;
      if (!cleaned) return null;

      const evaluation: RarityAdvisorEvaluation = {
        response: cleaned,
        systemPrompt,
        userPrompt,
        searchedQueries,
        evaluatedAt: new Date().toISOString(),
        mudaeRank: mudaeRank || null,
      };

      if (redis && data.id) {
        try {
          await redis.set(`suggestion:ai:${data.id}`, JSON.stringify(evaluation), 'EX', 30 * 86400);
        } catch (_) {}
      }

      return evaluation;
    } catch (err: any) {
      console.error('[RarityAdvisor] Erro na análise de raridade por LLM:', err?.message || err);
      return null;
    }
  }

  /**
   * Remove tokens residuais de thought e tags internas de canais do modelo
   */
  private cleanModelResponse(raw: string): string {
    return raw
      .replace(/<\|?channel\|?>thought[\s\S]*?<\|?channel\|?>/gi, '')
      .replace(/<\|?channel\|?>thought/gi, '')
      .replace(/<\|?channel\|?>/gi, '')
      .replace(/<\|.*?\|>/gi, '')
      .replace(/<\|.*?>/gi, '')
      .replace(/<.*?\|>/gi, '')
      .trim();
  }
}
