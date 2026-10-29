# Jevil (versão local)

Luta contra o Jevil (DELTARUNE, capítulo 1) com os sprites, fontes, sons e a música da sua cópia do jogo.
Uso pessoal e local apenas. A pasta `assets/` tem arquivos do jogo, fica no `.gitignore` e nunca deve ser publicada.

- Jogar: `./jogar.sh` (abre http://127.0.0.1:8766). Abrir o `index.html` direto também funciona no Firefox.
- Setas movem, Z confirma, X volta (segurado no desvio, anda devagar), M liga/desliga a música.
- No título: **Lutar** ou **Treinar ataque** (os 16 ataques, numerados como no código do jogo).

Como é feito:
- `index.html` é a mesma luta da versão publicada (regras, roteiro e os 16 ataques tirados do código do jogo).
- `local.js` troca o desenho pelos sprites do jogo: corpo do Jevil (dança, cansado, sombras, cabeça na corrente),
  fundo do carrossel (`obj_jokerbg_triangle_real`), grupo, interface (`obj_battlecontroller`), barra de TP, FIGHT,
  números de dano, balas, bombas, cavalos, foices e lasers. Também usa os sons e a música `joker.ogg`.
- `ferramentas/extract.py` + `ferramentas/lista_assets.txt` extraem de novo os assets:
  `python3 ferramentas/extract.py ~/.local/share/Steam/steamapps/common/DELTARUNE/chapter1_windows/data.win assets ferramentas/lista_assets.txt`
  (a música vem de `DELTARUNE/mus/joker.ogg`, copiada para `assets/snd/mus_joker.ogg`).
