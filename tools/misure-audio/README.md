# Misure audio

Script usati per il ticket OQ-10. Generano i suoni con il codice dell'app e li misurano
in Chromium con un `OfflineAudioContext`, quindi senza riprodurli.

Cosa misurano:

- **buffer**: tempo di generazione, durata, memoria, rapporto picco/medio, salto alla giunzione
  del loop confrontato con la distribuzione dei salti normali tra campioni;
- **mix di ogni preset** al volume del 70% e del 100%: picco, livello medio, campioni saturati;
- **canali del binaurale**: frequenza misurata a sinistra e a destra;
- **loudness** con pesatura K (ITU-R BS.1770, senza gating), per confrontare i preset tra loro.

## Come eseguirle

Servono `esbuild` e `playwright` con Chromium (non sono dipendenze del progetto):

```bash
npx esbuild tools/misure-audio/misure.js --bundle --outfile=tools/misure-audio/bundle.js
node tools/misure-audio/esegui.cjs
```

I risultati del 3 novembre 2026 sono in [docs/report-audio.md](../../docs/report-audio.md).

## Ambiente Pioggia

`pioggia.js` misura l'ambiente Pioggia: carattere e loudness alle quattro intensità, tuoni lontani
e vicini, brezza e burrasca, caso peggiore attraverso il grafo dell'app.

```bash
npx esbuild tools/misure-audio/pioggia.js --bundle --outfile=tools/misure-audio/bundle-pioggia.js
node tools/misure-audio/pioggia.cjs                     # tutte le misure
node tools/misure-audio/pioggia.cjs intensita,peggiore  # solo alcune (anche: timbro, potenza)
```
