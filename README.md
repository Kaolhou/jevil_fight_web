# Jevil Fight Web

**Play the Jevil secret boss fight from Deltarune Chapter 1 in your browser.**

**Play it here:** https://jevil-fight-web.vercel.app/

A fan recreation of the Jevil fight ("CHAOS, CHAOS!") from Deltarune Chapter 1, in plain HTML5 canvas and JavaScript with no build step. It uses the game's own sprites, fonts, sounds and music, and the rules and numbers come from the game's decompiled logic, not from guesses:

- All 16 Jevil attacks, with a practice mode to train each one by its number in the game code.
- FIGHT with the one-button attack bars, ACT, Hypnosis and Pacify, Rude Buster (including the hidden bonus for pressing Z while the blast flies), Heal Prayer and DEFEND.
- TP from grazing bullets, the full battle inventory (12 items), ReviveMint, downed party members and turn-start healing.
- Jevil's dialogue, the carousel that spins faster as Jevil gets more excited, the target marker on attacks and the heart-break game over.
- English by default, with an optional Brazilian Portuguese fan translation (LANGUAGE option on the title screen, or `?lang=pt`).
- Keyboard and touch controls, volume slider, loading screen while the assets download.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move / choose |
| Z or Enter | Confirm |
| X or Shift | Back (hold while dodging to move slowly) |
| M | Music on/off |

## How it is built

- `index.html` has the whole fight: rules, script, the 16 attacks and a fallback drawing with plain shapes.
- `local.js` replaces that drawing with the game's sprites from `assets/` (`meta.js` holds sprite sizes, origins and font glyphs) and plays the game's sounds and music.
- `ferramentas/` has the small GameMaker `data.win` readers used to study the game and to extract `assets/` again:

  ```sh
  python3 ferramentas/extract.py /path/to/DELTARUNE/chapter1_windows/data.win assets ferramentas/lista_assets.txt
  ./jogar.sh   # serves http://127.0.0.1:8766
  ```

- Deployed on Vercel: `vercel.json` sets the cache headers and `.vercelignore` leaves the tools out of the deploy.

## Disclaimer

This is an unofficial, non-commercial fan project. DELTARUNE, Jevil, all related characters, art, sounds and music belong to Toby Fox. It is not affiliated with or endorsed by Toby Fox or Fangamer. If you are a rights holder and want something removed, open an issue. Please buy the game: https://deltarune.com

---

### Português

Luta contra o Jevil (boss secreto do capítulo 1 de Deltarune) no navegador, com a arte, os sons e a música do jogo e as regras tiradas do código: os 16 ataques, ACT, Hypnosis, Rude Buster, itens, graze e TP. O jogo abre em inglês; escolha **IDIOMA: PORTUGUES** na tela de título ou use `?lang=pt`.
