# Jevil Fight Web

**Play the Jevil secret boss fight from Deltarune Chapter 1 in your browser.**

**Play it here:** https://jevil-fight-web.vercel.app/

A fan recreation of the Jevil fight ("CHAOS, CHAOS!") from Deltarune Chapter 1, written in plain HTML5 canvas and JavaScript with no build step and no dependencies. The rules and numbers come from the game's decompiled logic, not from guesses:

- All 16 Jevil attacks, with a practice mode to train each one by its number in the game code.
- FIGHT with the timing bars, ACT, Hypnosis and Pacify, Rude Buster (including the hidden bonus for pressing Z before the blast lands), Heal Prayer and DEFEND.
- TP from grazing bullets, the full battle inventory (12 items), ReviveMint, downed party members and turn-start healing.
- Jevil's dialogue, the carousel that spins faster as Jevil gets more excited, the target marker on attacks and the heart-break game over.
- English by default, with an optional Brazilian Portuguese fan translation (LANGUAGE option on the title screen, or `?lang=pt`).
- Keyboard and touch controls, volume slider.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move / choose |
| Z or Enter | Confirm |
| X or Shift | Back (hold while dodging to move slowly) |
| M | Music on/off |

## Two builds

- **`index.html`** (the hosted one) uses original pixel art drawn for this project, so it contains no files from the game. Open it directly or host the folder anywhere. It is deployed on Vercel (`vercel.json` sets the cache headers, `.vercelignore` keeps `local/` out of the deploy).
- **`local/`** is the same fight drawn with the sprites, sounds and music from **your own copy** of DELTARUNE. Those files are not in this repository. Extract them yourself:

  ```sh
  cd local
  python3 ferramentas/extract.py /path/to/DELTARUNE/chapter1_windows/data.win assets ferramentas/lista_assets.txt
  ./jogar.sh   # serves http://127.0.0.1:8766
  ```

  `ferramentas/` also has the small GameMaker `data.win` readers used to study the game code (`dis.py` disassembles scripts by name).

## Disclaimer

This is an unofficial, non-commercial fan project. DELTARUNE, Jevil and all related characters belong to Toby Fox. It is not affiliated with or endorsed by Toby Fox or Fangamer. Please buy the game: https://deltarune.com

---

### Português

Luta contra o Jevil (boss secreto do capítulo 1 de Deltarune) no navegador, recriada a partir da lógica do jogo: os 16 ataques, ACT, Hypnosis, Rude Buster, itens, graze e TP. O jogo abre em inglês; escolha **IDIOMA: PORTUGUES** na tela de título ou use `?lang=pt`. A pasta `local/` usa os arquivos da sua própria cópia do jogo, que você extrai com `ferramentas/extract.py` e que nunca vão para o repositório.
