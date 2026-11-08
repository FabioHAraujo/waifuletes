# 📜 Reorganização de Raridades, Sincronização e Deduplicação de Personagens

Este documento registra detalhadamente todas as operações realizadas em 08/11/2026 na base de dados do Waifuletes, incluindo a sincronização com a telemetria do Mudae, a deduplicação de personagens (inglês vs japonês / nomes invertidos) com compensação de 5x para haréns afetados, e a redistribuição de raridades sem rebaixamento de personagens.

> [!NOTE]
> **Privacidade:** Em conformidade estrita com as diretrizes do projeto, todos os identificadores numéricos, números de telefone e JIDs foram omitidos deste relatório, utilizando exclusivamente os nomes de exibição dos jogadores.

---

## 1. Visão Geral das Operações Realizadas

1. **Sincronização com o Mudae (Top 80k):** Consulta a 4.000 páginas da API oficial do Mudae, atualizando a posição e tags de 68.238 personagens.
2. **Deduplicação Inteligente com Soft-Delete:** 1.839 personagens duplicados ou com nomes invertidos/grafias em inglês foram desativados (`isActive = false`), mantendo a integridade para restaurações futuras.
3. **Indenização de Jogadores (5x Base Harém):** 133 casamentos em cópias inferiores foram desfeitos com pagamento de 5x o valor oficial do divórcio calculado com base na economia real do harém (total de **6.400.000 Zinthos** creditados aos 66 jogadores afetados).
   - **Lendário:** 135.000 Zinthos base ➔ 675.000 Zinthos (5x)
   - **Épico:** 45.000 Zinthos base ➔ 225.000 Zinthos (5x)
   - **Raro:** 9.000 Zinthos base ➔ 45.000 Zinthos (5x)
   - **Incomum:** 4.000 Zinthos base ➔ 20.000 Zinthos (5x)
   - **Comum:** 1.000 Zinthos base ➔ 5.000 Zinthos (5x)
4. **Reorganização de Raridades (2% / 10% / 20% / 28% / 40%):** Redistribuição por cascata top-down baseada no rank atualizado, sem nenhum rebaixamento (50.292 personagens subiram de classe, sendo 5.281 waifus casadas em haréns).

---

## 2. Distribuição Final de Raridades

| Raridade | Quantidade | Percentual Real | Meta | Faixa Oficial de Rank Mudae |
| :--- | :---: | :---: | :---: | :--- |
| **Lendário** | 4.274 | **2,00%** | 2,00% | Rank 1 a #4.466 (+ legados mantidos) |
| **Épico** | 21.372 | **10,00%** | 10,00% | Rank #4.467 a #20.701 (+ legados mantidos) |
| **Raro** | 42.744 | **20,00%** | 20,00% | Rank #20.702 a #62.128 (+ legados mantidos) |
| **Incomum** | 59.842 | **28,00%** | 28,00% | Rank #62.129 a #76.135 (+ legados mantidos) |
| **Comum** | 85.489 | **40,00%** | 40,00% | Acima de #76.135 e sem rank |
| **Total Ativo** | **213.721** | **100,00%** | **100,00%** | — |

---

## 3. Top 15 Jogadores com Mais Waifus Promovidas em Haréns

| Posição | Jogador | Waifus Promovidas no Harém |
| :---: | :--- | :---: |
| #1 | theuzin | **367** |
| #2 | Pedro Carboni | **256** |
| #3 | Deivin | **142** |
| #4 | Beowulf | **127** |
| #5 | Galinho | **120** |
| #6 | um membro qualquer | **109** |
| #7 | Agrius Metamorphosis | **107** |
| #8 | Zé Pilantra | **103** |
| #9 | Matagal Fonseca | **85** |
| #10 | Fogacahc | **81** |
| #11 | craque fluks | **75** |
| #12 | Sheik das Taxas 🇸🇦 | **74** |
| #13 | Azazel | **73** |
| #14 | Ezequiel Santos | **72** |
| #15 | Smaller | **71** |

---

## 4. Registro Completo de Casamentos Desfeitos e Compensações (133 Casos)

| # | Jogador | Personagem Desativado | Série | Raridade | Chaves | Base | Compensação (5x) | Motivo da Desativação / Versão Mantida |
| :-: | :--- | :--- | :--- | :---: | :-: | :-: | :-: | :--- |
| 1 | theuzin | Kaguya Shinomiya | Kaguya-sama: Love is War | LEGENDARY | 1 | 135.000 💜 | **675.000 💜** | Duplicata inferior; mantida versão oficial "Kaguya Shinomiya" |
| 2 | theuzin | Kei Shirogane | Kaguya-sama: Love is War | LEGENDARY | 1 | 135.000 💜 | **675.000 💜** | Duplicata inferior; mantida versão oficial "Kei Shirogane" |
| 3 | um membro qualquer | Vanitas | The Case Study of Vanitas | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Vanitas" |
| 4 | theuzin | Supergirl (Kara Zor-El) | DC | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Supergirl (Matrix)" |
| 5 | Agrius Metamorphosis | Artoria Pendragon (Lancer) | Fate/Grand Order | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Artoria Pendragon" |
| 6 | ~Lucas | Artoria Pendragon (Lancer Alter) | Fate/Grand Order | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Artoria Pendragon" |
| 7 | Galinho | Xuan Fu | Honkai: Star Rail | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Fu Xuan" |
| 8 | any | Jack Sparrow | Pirates of the Caribbean | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Jack Sparrow" |
| 9 | july a mais mais | Sam Winchester | Supernatural | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Sam Winchester" |
| 10 | theuzin | Android 21 (Good) | Dragon Ball FighterZ | EPIC | 1 | 45.000 💜 | **225.000 💜** | Duplicata inferior; mantida versão oficial "Android 21 (Evil)" |
| 11 | Agrius Metamorphosis | Merlin {F/P} | Fate/Grand Order Arcade | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Merlin {FGO}" |
| 12 | ­Kaio Gabriel | Robin (Carrie Kelley) | DC | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Robin (Damian Wayne)" |
| 13 | Agrius Metamorphosis | Hakuno Kishinami | Fate/Extra | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Hakuno Kishinami (F)" |
| 14 | ＫＡＨ 愛 | Hulk (Robbie Banner) | Marvel | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Hulk" |
| 15 | like JENNIE | Supergirl (Fusion) | DC | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Supergirl (Matrix)" |
| 16 | theuzin | Okita Souji (Alter) | Fate/KOHA-ACE | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Okita Souji" |
| 17 | imperator luidelhus | Batman (Wayne Williams) | DC | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Batman (Bruce Wayne)" |
| 18 | gatinhacomunista | Kaiba (Plant) | Kaiba | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Kaiba" |
| 19 | Agrius Metamorphosis | Ishtar {F/SF} | Fate/strange Fake | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Ishtar" |
| 20 | Bonow | Gin | Detective Conan | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Gin {Conan}" |
| 21 | Beowulf | Alastor | Hazbin Hotel | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Alastor" |
| 22 | Bonow | Venom (Alea Bell) | Marvel | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Venom" |
| 23 | vitamon (Ramon) | Miyamoto Musashi {F/SR} | Fate/Samurai Remnant | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Miyamoto Musashi" |
| 24 | Beowulf | Zuko | Avatar: The Last Airbender | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Zuko" |
| 25 | any | Law Trafalgar | ONE PIECE | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Trafalgar Law" |
| 26 | Agrius Metamorphosis | Rin Tohsaka {Kaleid} | Fate/Kaleid Liner PRISMA☆ILLYA | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Rin Tohsaka" |
| 27 | Beowulf | Kakashi Hatake | Naruto | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Kakashi Hatake" |
| 28 | venus | Bum Yoon | Killing Stalking | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Yoon Bum" |
| 29 | craque fluks | Noriaki Kakyouin | JoJo's Bizarre Adventure | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Noriaki Kakyoin" |
| 30 | Beowulf | Varka | Genshin Impact | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Varka" |
| 31 | theuzin | Ramiris | That Time I Got Reincarnated as a Slime | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Ramiris" |
| 32 | muuuuutiz | Ai Hayasaka | Kaguya-sama: Love is War | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Ai Hayasaka" |
| 33 | mor do café | Ken Ryuuguji | Tokyo Revengers | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Ken Ryuuguuji" |
| 34 | Anjinha | Damon Salvatore | The Vampire Diaries | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Damon Salvatore" |
| 35 | perna preta | Robin Nico | ONE PIECE | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Nico Robin" |
| 36 | Livvy | Trunks | Dragon Ball Z | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Trunks (Present)" |
| 37 | theuzin | Kyouko Kirigiri | Danganronpa | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Kyoko Kirigiri" |
| 38 | july a mais mais | Guang Lu | Link Click | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Lu Guang" |
| 39 | Pisca Mitadas | Mikatan Narugino | PUNCH LINE | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Narugino Mikatan" |
| 40 | Zé Pilantra | Seol Hong | Cheese in the Trap | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Hong Seol" |
| 41 | Kairon | Spider Demon (Older Sister) | Kimetsu no Yaiba | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Spider Demon (Mother)" |
| 42 | theuzin | Sirin (CV) | Honkai Impact 3rd | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Sirin" |
| 43 | um membro qualquer | Sirin (ELF) | Honkai Impact 3rd | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Sirin" |
| 44 | Pedro Carboni | Black Widow (Yelena Belova) | Marvel | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Black Widow (Natalia Romanova)" |
| 45 | Pedro Carboni | Doflamingo Donquixote | ONE PIECE | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Donquixote Doflamingo" |
| 46 | craque fluks | Sesshoumaru | InuYasha | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Sesshomaru" |
| 47 | Beowulf | Mafuyu Satou | Given | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Mafuyu Satou" |
| 48 | july a mais mais | Seishirou Nagi | BLUE LOCK | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Seishiro Nagi" |
| 49 | Beowulf | Toph Beifong | Avatar: The Last Airbender | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Toph Beifong" |
| 50 | Beowulf | Naruto Uzumaki | Naruto | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Naruto Uzumaki" |
| 51 | theuzin | Miko Iino | Kaguya-sama: Love is War | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Miko Iino" |
| 52 | Anjinha | Dean Winchester | Supernatural | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Dean Winchester" |
| 53 | Beowulf | Komano Manato | Zenless Zone Zero | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Komano Manato" |
| 54 | 𝓛𝓲𝓿𝓲𝓪 | Sousuke Aizen | Bleach | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Sōsuke Aizen" |
| 55 | Pedro Carboni | Herzha | FANDELTALES | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Herzha" |
| 56 | Fogacahc | Enterprise (Royal Navy) | Azur Lane | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Enterprise" |
| 57 | Livvy | Yuuta Rokkaku | Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! | RARE | 1 | 9.000 💜 | **45.000 💜** | Duplicata inferior; mantida versão oficial "Yuta Rokkaku" |
| 58 | Luiza Kriese | Green Lantern (John Stewart) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 59 | Guilherme V. | Green Lantern (Katma Tui) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 60 | Almôndegas suíças | Ginger | GANGSTA. | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Ginger {Gangsta}" |
| 61 | Fogacahc | Black Panther (T'Chaka) | Marvel | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Black Panther (T'Chanda)" |
| 62 | july a mais mais | Edward | SHADOWS HOUSE | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Edward {SH}" |
| 63 | Pedro Carboni | Hornet | AZUR LANE | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Hornet {AL}" |
| 64 | Lucas | Kurumi | Lycoris Recoil | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kurumi {LR}" |
| 65 | Madu Leme | Eris | Isekai Quartet | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Eris {KS}" |
| 66 | craque fluks | Aura | Frieren: Beyond Journey’s End | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Aura {SnF}" |
| 67 | O++ | Reverse-Flash (Daniel West) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Reverse-Flash (Eobard Thawne)" |
| 68 | reis do cego | Yuan Zhu | Zenless Zone Zero | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Zhu Yuan" |
| 69 | deser | Aphrodite | Record of Ragnarok | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Aphrodite {RoR}" |
| 70 | Zero Heydrich | Shura | Rurouni Kenshin | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Shura {RK}" |
| 71 | Cronos | Monroe | Valkyrie Drive: Mermaid | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Monroe {VDM}" |
| 72 | Vitoria | Doctor Fate (Hector Hall) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Doctor Fate (Khalid Nassour)" |
| 73 | @Ota_luizz | Wolverine (Gwen Howlett) | Marvel | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Wolverine (James Howlett)" |
| 74 | Agrius Metamorphosis | The Flash (Avery Ho) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "The Flash (Jason Garrick)" |
| 75 | Pedro Carboni | Irene Adler | Moriarty the Patriot | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Irene Adler" |
| 76 | theuzin | Mei Raiden | Honkai Impact 3rd | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Raiden Mei" |
| 77 | Pisca Mitadas | Weather Report (Stand) | JoJo's Bizarre Adventure: Stone Ocean | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Weather Report" |
| 78 | Zé Pilantra | Kirisame | B: The Beginning | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kirisame {B}" |
| 79 | Yuuta | Huntress (Helena Wayne) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Huntress (Helena Bertinelli)" |
| 80 | @Ota_luizz | Washington {AL} | Azur Lane | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Washington" |
| 81 | Sheik das Taxas 🇸🇦 | Kyouko Kasuga | Deadman Wonderland | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kyoko Kasuga" |
| 82 | Ketty💞 | Wulong Lei | Tekken | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Lei Wulong" |
| 83 | capitão Broxa | Kisara Tendo | Black Bullet | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kisara Tendou" |
| 84 | Bonow | Izumi Sena | LOVE STAGE!! | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Izumi Sena {LS}" |
| 85 | Christian | Yakumo Murai | Blue Period | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Murai Yakumo" |
| 86 | theuzin | Luviagelita Edelfelt {Kaleid} | Fate/Kaleid Liner PRISMA☆ILLYA | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Luviagelita Edelfelt" |
| 87 | lunático em zibai | Black Canary (Olivia Queen) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Black Canary (Dinah Drake Lance)" |
| 88 | Lucas Primo | Hawkgirl (Kendra Munoz-Saunders) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Hawkgirl (Kendra Saunders)" |
| 89 | Deivin | Batwoman (Helena Alfreda Wayne) | DC | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Batwoman (Kate Kane)" |
| 90 | Pedro Carboni | Tomoko Higashikata {JJL} | JoJo's Bizarre Adventure: JoJolion | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Tomoko Higashikata" |
| 91 | Lucas Guedes | Komachi Hikigaya | My Teen Romantic Comedy SNAFU | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Komachi Hikigaya" |
| 92 | Beowulf | Ryotarou Dojima | Persona | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Ryotaro Dojima" |
| 93 | Fogacahc | Porunga (Demon Realm) | Dragon Ball DAIMA | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Porunga" |
| 94 | Ezequiel Santos | Akane Tendou | Ranma ½ | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Akane Tendo" |
| 95 | Big Boss | Guillotine | Goddess of Victory: NIKKE | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Guillotine {NIKKE}" |
| 96 | Cauã | Kasumi Tendou | Ranma ½ | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kasumi Tendo" |
| 97 | Pedro Carboni | Hayato Hayama | My Teen Romantic Comedy SNAFU | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Hayato Hayama" |
| 98 | Christian | Ghost Rider (Salvador Romero) | Marvel | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Ghost Rider (Johnny Blaze)" |
| 99 | july a mais mais | Hongniang | The Apothecary Diaries | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Hongniang" |
| 100 | ★𝙲𝚊𝚖𝚒★ | Sara Azuma | Sarazanmai | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Azuma Sara" |
| 101 | theuzin | Youko Inari | Kemono Jihen | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Yoko Inari" |
| 102 | theuzin | Toyomi Fujiwara | Kaguya-sama: Love is War | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Toyomi Fujiwara" |
| 103 | Douglas | Kid Eustass | ONE PIECE | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Eustass Kid" |
| 104 | Deivin | Derieri | The Seven Deadly Sins: Dragon's Judgement | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Derieri" |
| 105 | Matagal Fonseca | Chloé d'Apchier | The Case Study of Vanitas | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Chloé D'Apchier" |
| 106 | Beowulf | Jin Qian | Link Click | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Qian Jin" |
| 107 | isa | Kikunojou | ONE PIECE | UNCOMMON | 1 | 4.000 💜 | **20.000 💜** | Duplicata inferior; mantida versão oficial "Kikunojo" |
| 108 | Livvy | Charles-Henri Sanson {Innocent} | Innocent | COMMON | 2 | 2.000 💜 | **10.000 💜** | Duplicata inferior; mantida versão oficial "Charles-Henri Sanson" |
| 109 | ~Lucas | Aika | Ane wa Yanmama Junyuu-chuu | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Aika {AYJ}" |
| 110 | Matheus antonio | Yuriko {Gnosia} | Gnosia | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Yuriko" |
| 111 | Gabriel Oliveira | White Tiger (Angela Del Toro) | Marvel | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "White Tiger (Ava Ayala)" |
| 112 | amicista | Byakko | MARRIAGETOXIN | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Byakko {MT}" |
| 113 | Fogacahc | Green Lantern (B'dg) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 114 | Fogacahc | Green Lantern (Aa) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 115 | craque fluks | Green Lantern (Ch'p) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 116 | Kboom | Green Lantern (Iorl) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 117 | Fogacahc | Green Lantern (Reemuz) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 118 | Miguel Alves | Darkstar (Lotta) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Darkstar (Munchukk)" |
| 119 | Beowulf | Galahad (Alter) | Fate/Requiem | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Galahad" |
| 120 | Hobbit | Gladiator {SC} | Supercrooks | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Gladiator" |
| 121 | Cirsa Oliveira | Red Lantern (Fury-6) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Red Lantern (Atrocitus)" |
| 122 | Mr. Ban | Turing (Original) | Girls' Frontline: Neural Cloud | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Turing {PNC}" |
| 123 | Pedro Carboni | Journey {WSJ} | General Mascots | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Journey {WSJ}" |
| 124 | Fogacahc | Yellow Lantern (Snap Trap) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Yellow Lantern (Thaal Sinestro)" |
| 125 | Fogacahc | Yellow Lantern (Dez Trevius) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Yellow Lantern (Thaal Sinestro)" |
| 126 | Ketty💞 | The Flash (John Fox) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "The Flash (Jason Garrick)" |
| 127 | Fogacahc | Roberto Gomez Bolaños | Actors & Actresses | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Roberto Gomez Bolaños" |
| 128 | capitão Broxa | Kanoe (Girl) | The Story of How I Split Up and TS In a Different World | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Kanoe (Futanari)" |
| 129 | imperator luidelhus | Firestorm (Jefferson Jackson) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Firestorm (Jason Rusch)" |
| 130 | Pedro | Bat-Man (Wang Baixi) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Man-Bat (Kirk Langstrom)" |
| 131 | Pedro Carboni | Punisher (Lynn Michaels) | Marvel | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Punisher (Frank Castle)" |
| 132 | ＫＡＨ 愛 | Tupac {GI} | Genshin Impact | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Tupac" |
| 133 | Emily | Rag Doll (Peter Merkel) | DC | COMMON | 1 | 1.000 💜 | **5.000 💜** | Duplicata inferior; mantida versão oficial "Rag Doll (Peter Merkel, Jr.)" |
