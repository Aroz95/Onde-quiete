# Controlli prima del rilascio

Da seguire prima di unire a `main` una modifica che tocca audio, timer o interfaccia.
Allegare al rilascio (descrizione del commit o della pull request) l'esito di ogni passo.

## 1. Automatici

| Passo | Comando | Dove |
|---|---|---|
| Test di unità | `npm test` | in locale e nel workflow di pubblicazione |
| Build di produzione | `npm run build` | in locale e nel workflow di pubblicazione |
| Prove nel browser | `npm run test:browser` | in locale (serve Playwright) |
| Misure audio, se cambia un suono | `node tools/misure-audio/esegui.cjs` | in locale |

Il workflow blocca la pubblicazione se test o build falliscono. Le prove nel browser e le misure
audio non girano nel workflow: vanno eseguite a mano e il riepilogo va allegato.

## 2. Percorso minimo di regressione, su un dispositivo

1. Apri l'app → scegli un preset → regola volume e mix.
2. Imposta il timer → metti in pausa → riprendi: il residuo è corretto.
3. Cambia preset: il timer continua.
4. Passa in background → rientra: lo stato è coerente.
5. Attendi lo spegnimento: dissolvenza di 8 secondi, poi pulsante "Avvia".
6. Chiudi e riapri l'app: preset, regolazioni e volume sono quelli lasciati.

## 3. Collaudo dispositivi

Per modifiche ad audio, background o timer: le prove di
[collaudo-dispositivi.md](collaudo-dispositivi.md) almeno su iPhone (Safari e app nella Home).
Aggiornare la tabella e [verifica-ticket.md](verifica-ticket.md) con dispositivo, versione ed esito.

## 4. Documentazione

- README e testi nell'app descrivono gli stessi comportamenti.
- Nessun browser o dispositivo dichiarato supportato senza un collaudo che lo confermi.

## Comportamenti di riferimento

Valori definiti nel codice e verificati dai test; se si cambiano, aggiornare README e test.

| Comportamento | Valore | Dove | Test |
|---|---|---|---|
| Dissolvenza finale del timer | 8 s fino al silenzio (< 2% alla scadenza) | `FINAL_FADE_S` in `src/audio/masterSchedule.js` | `tests/masterSchedule.test.js` |
| Pausa | costante di tempo 0,25 s (silenzio in circa 1 s) | `halt` in `src/audio/useAudioEngine.js` | `tests/browser/scenari/oq05-stato.cjs` |
| Cambio tra suoni | dissolvenza a potenza costante di 0,8 s | `CROSSFADE_S` in `src/audio/crossfade.js` | `tests/crossfade.test.js` |
| Avvio senza risposta | dopo 4 s conta come fallito | `RESUME_TIMEOUT_MS` | `tests/browser/scenari/oq05-stato.cjs` |
| Suoni della natura in memoria | ultimi 3 usati | `NATURE_CACHE_SIZE` | — |
