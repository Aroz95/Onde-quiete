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
