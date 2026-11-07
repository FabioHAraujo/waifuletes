# 🔮 Especificação de Integração: Personagens Míticos (Ravena-AI)

## 📌 1. Visão Geral
Personagens Míticos são criações lendárias forjadas pelos apoiadores do projeto Ravena através do Painel Web do Waifuletes.
Eles já nascem **permanentemente casados com quem os criou**, possuem cards customizados pelo criador, **não contam pontos em rankings** e carregam o emoji distintivo **🔮**.

---

## 💰 2. Concessão de Slots Míticos (Donates)
A cada **R$ 50,00** recebidos em doações ou apoios, a Ravena deve creditar 1 slot mítico para o jogador através da API do Waifuletes:

### Requisição:
- **Método:** `POST`
- **URL:** `http://waifuletes-api:3030/api/private/users/:userId/mythic-slots` (ou `http://localhost:3030/api/private/users/:userId/mythic-slots`)
- **Headers:**
  ```http
  Authorization: Bearer <SUA_API_KEY>
  Content-Type: application/json
  ```
- **Body:**
  ```json
  {
    "amount": 1,
    "reason": "DONATE_R$50",
    "donateValue": 50.00
  }
  ```
- **Exemplo de Resposta:**
  ```json
  {
    "success": true,
    "data": {
      "userId": "551199999999@s.whatsapp.net",
      "mythicSlots": 2,
      "usedSlots": 1,
      "availableSlots": 1
    }
  }
  ```

---

## 🎲 3. Comportamento nos Comandos de Chat da Ravena

### 3.1 Sorteio (`!mu-roll` / `$roll`)
- Personagens Míticos ativos entram no sorteio geral com peso equivalente à raridade **`RARE`** (aparição balanceada para a comunidade).
- Como eles **sempre já possuem dono** (`isClaimed: true`, `isMythic: true`, `owner: { id, name }`):
  - **Outro jogador sorteou:** A Ravena exibe o card de waifu casada informando que se trata de uma criação mítica de `@Criador` e entrega o **Cristal de Kakera (Zinthos)** para quem rolou.
  - **O próprio criador sorteou:** Ganha **+1 Chave (Key)** de vínculo normalmente.

### 3.2 Multi-Roll (Quadro de Múltiplos Sorteios)
- Quando um personagem Mítico aparecer no quadro de multi-roll:
  - Aplicar destaque visual com **cor especial**: **Púrpura Mágico / Violeta Fluorescente (`#a855f7` / `#9333ea`)**.
  - Exibir o emoji **🔮** ao lado do nome do personagem.

### 3.3 Harém (`!mu-harem`)
- Personagens Míticos aparecem no topo do harém com a tag **`[🔮 Mítico]`**.
- Míticos **não somam pontos** ao ranking competitivo de harém do usuário.

### 3.4 Detalhes do Personagem (`!mu-char <nome ou ID>`)
- Exibe o card do personagem destacando:
  - Raridade: `🔮 MÍTICO`
  - Criador Original: Nome do jogador que o gerou.
  - Vínculo: Casamento eterno com o criador.

### 3.5 Foto de Casamento (`!mu-foto <characterId>`)
- O criador pode solicitar a foto oficial de casamento via chat com `!mu-foto <characterId>`.
- A imagem fica disponível para seleção no Painel Web (igual às waifus convencionais).

---

## 🚫 4. Restrições e Tratamentos Especiais
1. **Criação e Edição:** Proibidas via comando de chat. A Ravena deve instruir:  
   *"🔮 Personagens Míticos são forjados exclusivamente pelo painel web! Acesse seu link via !mu-adm"*.
2. **Divórcio (`!mu-divorcio`):** Bloqueado. A API rejeitará com erro `CANNOT_DIVORCE_MYTHIC`.
3. **Wishlist (`!mu-wish`):** Bloqueado. A API rejeitará com erro `CANNOT_WISHLIST_MYTHIC`.
4. **Cobiçar / Covet (`!mu-covet`):** Bloqueado.
