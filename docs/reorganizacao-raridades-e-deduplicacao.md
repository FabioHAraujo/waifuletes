# 📜 Reorganização de Raridades, Sincronização e Deduplicação de Personagens

Este documento registra detalhadamente todas as operações realizadas em 08/11/2026 na base de dados do Waifuletes, incluindo a sincronização com a telemetria do Mudae, a deduplicação de personagens (inglês vs japonês / nomes invertidos) com compensação de 5x para haréns afetados, e a redistribuição de raridades sem rebaixamento de personagens.

> [!NOTE]
> **Privacidade:** Em conformidade estrita com as diretrizes do projeto, todos os identificadores numéricos, números de telefone e JIDs foram omitidos deste relatório, utilizando exclusivamente os nomes de exibição dos jogadores.

---

## 1. Visão Geral das Operações Realizadas

1. **Sincronização com o Mudae (Top 80k):** Consulta a 4.000 páginas da API oficial do Mudae, atualizando a posição e tags de 68.238 personagens.
2. **Deduplicação Inteligente com Soft-Delete:** 1.839 personagens duplicados ou com nomes invertidos/grafias em inglês foram desativados (`isActive = false`), mantendo a integridade para restaurações futuras.
3. **Indenização de Jogadores (5x):** 133 casamentos em cópias inferiores foram desfeitos com pagamento de 5x o valor oficial do divórcio (total de **162.855 Zinthos** injetados aos jogadores).
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
| 1 | theuzin | Kaguya Shinomiya | Kaguya-sama: Love is War | LEGENDARY | 1 | 1.425 💜 | **7.125 💜** | Duplicata inferior; mantida versão oficial "Kaguya Shinomiya" |
| 2 | theuzin | Kei Shirogane | Kaguya-sama: Love is War | LEGENDARY | 1 | 1.425 💜 | **7.125 💜** | Duplicata inferior; mantida versão oficial "Kei Shirogane" |
| 3 | um membro qualquer | Vanitas | The Case Study of Vanitas | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Vanitas" |
| 4 | theuzin | Supergirl (Kara Zor-El) | DC | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Supergirl (Matrix)" |
| 5 | Agrius Metamorphosis | Artoria Pendragon (Lancer) | Fate/Grand Order | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Artoria Pendragon" |
| 6 | ~Lucas | Artoria Pendragon (Lancer Alter) | Fate/Grand Order | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Artoria Pendragon" |
| 7 | Galinho | Xuan Fu | Honkai: Star Rail | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Fu Xuan" |
| 8 | any | Jack Sparrow | Pirates of the Caribbean | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Jack Sparrow" |
| 9 | july a mais mais | Sam Winchester | Supernatural | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Sam Winchester" |
| 10 | theuzin | Android 21 (Good) | Dragon Ball FighterZ | EPIC | 1 | 665 💜 | **3.325 💜** | Duplicata inferior; mantida versão oficial "Android 21 (Evil)" |
| 11 | Livvy | Charles-Henri Sanson {Innocent} | Innocent | COMMON | 2 | 522 💜 | **2.610 💜** | Duplicata inferior; mantida versão oficial "Charles-Henri Sanson" |
| 12 | Agrius Metamorphosis | Merlin {F/P} | Fate/Grand Order Arcade | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Merlin {FGO}" |
| 13 | ­Kaio Gabriel | Robin (Carrie Kelley) | DC | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Robin (Damian Wayne)" |
| 14 | Agrius Metamorphosis | Hakuno Kishinami | Fate/Extra | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Hakuno Kishinami (F)" |
| 15 | ＫＡＨ 愛 | Hulk (Robbie Banner) | Marvel | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Hulk" |
| 16 | like JENNIE | Supergirl (Fusion) | DC | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Supergirl (Matrix)" |
| 17 | theuzin | Okita Souji (Alter) | Fate/KOHA-ACE | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Okita Souji" |
| 18 | imperator luidelhus | Batman (Wayne Williams) | DC | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Batman (Bruce Wayne)" |
| 19 | gatinhacomunista | Kaiba (Plant) | Kaiba | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Kaiba" |
| 20 | Agrius Metamorphosis | Ishtar {F/SF} | Fate/strange Fake | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Ishtar" |
| 21 | Bonow | Gin | Detective Conan | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Gin {Conan}" |
| 22 | Beowulf | Alastor | Hazbin Hotel | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Alastor" |
| 23 | Bonow | Venom (Alea Bell) | Marvel | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Venom" |
| 24 | vitamon (Ramon) | Miyamoto Musashi {F/SR} | Fate/Samurai Remnant | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Miyamoto Musashi" |
| 25 | Beowulf | Zuko | Avatar: The Last Airbender | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Zuko" |
| 26 | any | Law Trafalgar | ONE PIECE | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Trafalgar Law" |
| 27 | Agrius Metamorphosis | Rin Tohsaka {Kaleid} | Fate/Kaleid Liner PRISMA☆ILLYA | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Rin Tohsaka" |
| 28 | Beowulf | Kakashi Hatake | Naruto | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Kakashi Hatake" |
| 29 | venus | Bum Yoon | Killing Stalking | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Yoon Bum" |
| 30 | craque fluks | Noriaki Kakyouin | JoJo's Bizarre Adventure | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Noriaki Kakyoin" |
| 31 | Beowulf | Varka | Genshin Impact | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Varka" |
| 32 | theuzin | Ramiris | That Time I Got Reincarnated as a Slime | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Ramiris" |
| 33 | muuuuutiz | Ai Hayasaka | Kaguya-sama: Love is War | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Ai Hayasaka" |
| 34 | mor do café | Ken Ryuuguji | Tokyo Revengers | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Ken Ryuuguuji" |
| 35 | Anjinha | Damon Salvatore | The Vampire Diaries | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Damon Salvatore" |
| 36 | perna preta | Robin Nico | ONE PIECE | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Nico Robin" |
| 37 | Livvy | Trunks | Dragon Ball Z | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Trunks (Present)" |
| 38 | theuzin | Kyouko Kirigiri | Danganronpa | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Kyoko Kirigiri" |
| 39 | july a mais mais | Guang Lu | Link Click | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Lu Guang" |
| 40 | Pisca Mitadas | Mikatan Narugino | PUNCH LINE | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Narugino Mikatan" |
| 41 | Zé Pilantra | Seol Hong | Cheese in the Trap | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Hong Seol" |
| 42 | Kairon | Spider Demon (Older Sister) | Kimetsu no Yaiba | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Spider Demon (Mother)" |
| 43 | theuzin | Sirin (CV) | Honkai Impact 3rd | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Sirin" |
| 44 | um membro qualquer | Sirin (ELF) | Honkai Impact 3rd | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Sirin" |
| 45 | Pedro Carboni | Black Widow (Yelena Belova) | Marvel | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Black Widow (Natalia Romanova)" |
| 46 | Pedro Carboni | Doflamingo Donquixote | ONE PIECE | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Donquixote Doflamingo" |
| 47 | craque fluks | Sesshoumaru | InuYasha | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Sesshomaru" |
| 48 | Beowulf | Mafuyu Satou | Given | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Mafuyu Satou" |
| 49 | july a mais mais | Seishirou Nagi | BLUE LOCK | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Seishiro Nagi" |
| 50 | Beowulf | Toph Beifong | Avatar: The Last Airbender | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Toph Beifong" |
| 51 | Beowulf | Naruto Uzumaki | Naruto | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Naruto Uzumaki" |
| 52 | theuzin | Miko Iino | Kaguya-sama: Love is War | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Miko Iino" |
| 53 | Anjinha | Dean Winchester | Supernatural | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Dean Winchester" |
| 54 | Beowulf | Komano Manato | Zenless Zone Zero | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Komano Manato" |
| 55 | 𝓛𝓲𝓿𝓲𝓪 | Sousuke Aizen | Bleach | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Sōsuke Aizen" |
| 56 | Pedro Carboni | Herzha | FANDELTALES | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Herzha" |
| 57 | Fogacahc | Enterprise (Royal Navy) | Azur Lane | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Enterprise" |
| 58 | Livvy | Yuuta Rokkaku | Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! | RARE | 1 | 332 💜 | **1.660 💜** | Duplicata inferior; mantida versão oficial "Yuta Rokkaku" |
| 59 | Luiza Kriese | Green Lantern (John Stewart) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 60 | Guilherme V. | Green Lantern (Katma Tui) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 61 | Almôndegas suíças | Ginger | GANGSTA. | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Ginger {Gangsta}" |
| 62 | Fogacahc | Black Panther (T'Chaka) | Marvel | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Black Panther (T'Chanda)" |
| 63 | july a mais mais | Edward | SHADOWS HOUSE | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Edward {SH}" |
| 64 | Pedro Carboni | Hornet | AZUR LANE | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Hornet {AL}" |
| 65 | Lucas | Kurumi | Lycoris Recoil | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kurumi {LR}" |
| 66 | Madu Leme | Eris | Isekai Quartet | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Eris {KS}" |
| 67 | craque fluks | Aura | Frieren: Beyond Journey’s End | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Aura {SnF}" |
| 68 | O++ | Reverse-Flash (Daniel West) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Reverse-Flash (Eobard Thawne)" |
| 69 | reis do cego | Yuan Zhu | Zenless Zone Zero | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Zhu Yuan" |
| 70 | deser | Aphrodite | Record of Ragnarok | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Aphrodite {RoR}" |
| 71 | Zero Heydrich | Shura | Rurouni Kenshin | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Shura {RK}" |
| 72 | Cronos | Monroe | Valkyrie Drive: Mermaid | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Monroe {VDM}" |
| 73 | Vitoria | Doctor Fate (Hector Hall) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Doctor Fate (Khalid Nassour)" |
| 74 | @Ota_luizz | Wolverine (Gwen Howlett) | Marvel | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Wolverine (James Howlett)" |
| 75 | Agrius Metamorphosis | The Flash (Avery Ho) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "The Flash (Jason Garrick)" |
| 76 | Pedro Carboni | Irene Adler | Moriarty the Patriot | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Irene Adler" |
| 77 | theuzin | Mei Raiden | Honkai Impact 3rd | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Raiden Mei" |
| 78 | Pisca Mitadas | Weather Report (Stand) | JoJo's Bizarre Adventure: Stone Ocean | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Weather Report" |
| 79 | Zé Pilantra | Kirisame | B: The Beginning | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kirisame {B}" |
| 80 | Yuuta | Huntress (Helena Wayne) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Huntress (Helena Bertinelli)" |
| 81 | @Ota_luizz | Washington {AL} | Azur Lane | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Washington" |
| 82 | Sheik das Taxas 🇸🇦 | Kyouko Kasuga | Deadman Wonderland | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kyoko Kasuga" |
| 83 | Ketty💞 | Wulong Lei | Tekken | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Lei Wulong" |
| 84 | capitão Broxa | Kisara Tendo | Black Bullet | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kisara Tendou" |
| 85 | Bonow | Izumi Sena | LOVE STAGE!! | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Izumi Sena {LS}" |
| 86 | Christian | Yakumo Murai | Blue Period | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Murai Yakumo" |
| 87 | theuzin | Luviagelita Edelfelt {Kaleid} | Fate/Kaleid Liner PRISMA☆ILLYA | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Luviagelita Edelfelt" |
| 88 | lunático em zibai | Black Canary (Olivia Queen) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Black Canary (Dinah Drake Lance)" |
| 89 | Lucas Primo | Hawkgirl (Kendra Munoz-Saunders) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Hawkgirl (Kendra Saunders)" |
| 90 | Deivin | Batwoman (Helena Alfreda Wayne) | DC | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Batwoman (Kate Kane)" |
| 91 | Pedro Carboni | Tomoko Higashikata {JJL} | JoJo's Bizarre Adventure: JoJolion | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Tomoko Higashikata" |
| 92 | Lucas Guedes | Komachi Hikigaya | My Teen Romantic Comedy SNAFU | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Komachi Hikigaya" |
| 93 | Beowulf | Ryotarou Dojima | Persona | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Ryotaro Dojima" |
| 94 | Fogacahc | Porunga (Demon Realm) | Dragon Ball DAIMA | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Porunga" |
| 95 | Ezequiel Santos | Akane Tendou | Ranma ½ | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Akane Tendo" |
| 96 | Big Boss | Guillotine | Goddess of Victory: NIKKE | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Guillotine {NIKKE}" |
| 97 | Cauã | Kasumi Tendou | Ranma ½ | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kasumi Tendo" |
| 98 | Pedro Carboni | Hayato Hayama | My Teen Romantic Comedy SNAFU | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Hayato Hayama" |
| 99 | Christian | Ghost Rider (Salvador Romero) | Marvel | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Ghost Rider (Johnny Blaze)" |
| 100 | july a mais mais | Hongniang | The Apothecary Diaries | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Hongniang" |
| 101 | ★𝙲𝚊𝚖𝚒★ | Sara Azuma | Sarazanmai | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Azuma Sara" |
| 102 | theuzin | Youko Inari | Kemono Jihen | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Yoko Inari" |
| 103 | theuzin | Toyomi Fujiwara | Kaguya-sama: Love is War | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Toyomi Fujiwara" |
| 104 | Douglas | Kid Eustass | ONE PIECE | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Eustass Kid" |
| 105 | Deivin | Derieri | The Seven Deadly Sins: Dragon's Judgement | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Derieri" |
| 106 | Matagal Fonseca | Chloé d'Apchier | The Case Study of Vanitas | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Chloé D'Apchier" |
| 107 | Beowulf | Jin Qian | Link Click | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Qian Jin" |
| 108 | isa | Kikunojou | ONE PIECE | UNCOMMON | 1 | 142 💜 | **710 💜** | Duplicata inferior; mantida versão oficial "Kikunojo" |
| 109 | ~Lucas | Aika | Ane wa Yanmama Junyuu-chuu | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Aika {AYJ}" |
| 110 | Matheus antonio | Yuriko {Gnosia} | Gnosia | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Yuriko" |
| 111 | Gabriel Oliveira | White Tiger (Angela Del Toro) | Marvel | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "White Tiger (Ava Ayala)" |
| 112 | amicista | Byakko | MARRIAGETOXIN | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Byakko {MT}" |
| 113 | Fogacahc | Green Lantern (B'dg) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 114 | Fogacahc | Green Lantern (Aa) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 115 | craque fluks | Green Lantern (Ch'p) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 116 | Kboom | Green Lantern (Iorl) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 117 | Fogacahc | Green Lantern (Reemuz) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Green Lantern (Hal Jordan)" |
| 118 | Miguel Alves | Darkstar (Lotta) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Darkstar (Munchukk)" |
| 119 | Beowulf | Galahad (Alter) | Fate/Requiem | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Galahad" |
| 120 | Hobbit | Gladiator {SC} | Supercrooks | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Gladiator" |
| 121 | Cirsa Oliveira | Red Lantern (Fury-6) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Red Lantern (Atrocitus)" |
| 122 | Mr. Ban | Turing (Original) | Girls' Frontline: Neural Cloud | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Turing {PNC}" |
| 123 | Pedro Carboni | Journey {WSJ} | General Mascots | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Journey {WSJ}" |
| 124 | Fogacahc | Yellow Lantern (Snap Trap) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Yellow Lantern (Thaal Sinestro)" |
| 125 | Fogacahc | Yellow Lantern (Dez Trevius) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Yellow Lantern (Thaal Sinestro)" |
| 126 | Ketty💞 | The Flash (John Fox) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "The Flash (Jason Garrick)" |
| 127 | Fogacahc | Roberto Gomez Bolaños | Actors & Actresses | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Roberto Gomez Bolaños" |
| 128 | capitão Broxa | Kanoe (Girl) | The Story of How I Split Up and TS In a Different World | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Kanoe (Futanari)" |
| 129 | imperator luidelhus | Firestorm (Jefferson Jackson) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Firestorm (Jason Rusch)" |
| 130 | Pedro | Bat-Man (Wang Baixi) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Man-Bat (Kirk Langstrom)" |
| 131 | Pedro Carboni | Punisher (Lynn Michaels) | Marvel | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Punisher (Frank Castle)" |
| 132 | ＫＡＨ 愛 | Tupac {GI} | Genshin Impact | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Tupac" |
| 133 | Emily | Rag Doll (Peter Merkel) | DC | COMMON | 1 | 47 💜 | **235 💜** | Duplicata inferior; mantida versão oficial "Rag Doll (Peter Merkel, Jr.)" |
