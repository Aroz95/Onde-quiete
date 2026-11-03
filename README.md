# Onde Quiete

App web che genera suoni di sottofondo per rilassarsi, concentrarsi, dormire o meditare:
battimenti binaurali, suoni della natura, toni puri e rumore colorato.
Tutto l'audio è sintetizzato in tempo reale con la Web Audio API, senza file da scaricare.

Pubblicata su GitHub Pages a ogni aggiornamento del ramo `main`.

## Suoni

Tre schede, ognuna con i suoi preset. Toccando un suono l'ascolto parte subito; durante
l'ascolto un tocco su un altro suono passa a quello senza interrompere il timer.

| Scheda | Preset | Com'è fatto |
|---|---|---|
| **Esigenze** | Relax, Concentrazione, Sonno, Meditazione, Creatività, Energia, Studio, Calma | battimento binaurale con rumore e, in alcuni, natura di fondo |
| | Solo rumore | rumore marrone |
| **Natura** | Pioggia | ambiente personalizzabile: pioggia, tuoni, vento e raffiche (vedi sotto) |
| | Onde del mare, Vento, Camino | suono della natura con eventuale rumore di fondo (diventeranno ambienti personalizzabili) |
| **Solfeggio** | 396, 432, 528, 639 Hz | tono puro con un leggero sottofondo naturale |

Ogni tessera mostra una descrizione breve generata dal mix attivo (es. "Tono calmo · Rumore rosa");
la descrizione completa è nel pannello Regola. Le descrizioni dicono com'è il suono, non che effetto avrà.

**Cuffie.** Il battimento binaurale nasce da un suono leggermente diverso in ciascun orecchio:
senza cuffie non si percepisce, e l'app lo indica con "Usa le cuffie". Gli altri suoni funzionano
anche dagli altoparlanti ("Cuffie consigliate").

## Ambiente Pioggia

La Pioggia non è un suono fisso: è un ambiente fatto di componenti regolabili dal vivo,
durante l'ascolto o in pausa, senza interrompere la sessione né il timer.

| Componente | Controlli | Cosa cambia |
|---|---|---|
| Pioggia | intensità (Leggera → Moderata → Intensa → Battente), livello | densità e trama delle gocce, corpo del fondo d'acqua; il volume resta circa lo stesso |
| Tuoni (facoltativi) | frequenza (Rari → Frequenti), distanza (Lontani → Vicini), livello | quanti tuoni arrivano; lontani gravi e lenti, vicini più chiari con lo schiocco |
| Vento (facoltativo) | forza (Brezza → Burrasca), raffiche (Rare → Frequenti), livello | corpo e ululato del vento, frequenza delle raffiche |
| Altri sottofondi | rumore colorato: colore e livello | — |

**Configurazioni rapide:** Pioggia leggera, Pioggia intensa e Temporale. Sono scorciatoie che
impostano più controlli insieme; dopo ogni parametro resta modificabile e la tessera mostra
"personalizzato". Una componente spenta nasconde i suoi controlli ma ne conserva i valori.

Tuoni e raffiche arrivano a intervalli variabili e sono programmati in anticipo nel clock audio
(90 s per i tuoni, 60 s per le raffiche): continuano anche se il JavaScript della pagina è rallentato.
In pausa quelli futuri si annullano; alla ripresa si riparte da adesso, senza recuperi in gruppo.
Se la pagina resta sospesa più a lungo dell'orizzonte, pioggia e vento continuano ma i nuovi tuoni
e raffiche aspettano che la pagina torni attiva.

Il vecchio preset Temporale è ora la configurazione rapida Temporale della Pioggia; le personalizzazioni
salvate sono state trasferite (vedi `src/environments/migration.js`).

## Cosa si regola

**Nella schermata principale**, per tutti i suoni:

- **Volume** generale.
- **Timer**: 10, 25, 45 o 60 minuti, oppure disattivato. Il pulsante mostra sempre lo stato
  ("Timer disattivato", "Timer 25 min", "Si spegne tra 14:59", "In pausa · restano 14:59").

**Nel pannello Regola** (pulsante Regola o tocco sull'onda), solo i controlli che hanno effetto
sul tipo di suono attivo. I cursori dei singoli suoni si chiamano "Livello", per distinguerli
dal volume generale.

| Tipo | Controlli |
|---|---|
| Esigenze binaurali | battimento (0,5–40 Hz), portante (80–500 Hz), livello dell'onda; colore e livello del rumore di fondo; suono e livello della natura di fondo |
| Solo rumore | colore e livello del rumore; suono e livello della natura di fondo |
| Pioggia | vedi la sezione "Ambiente Pioggia" |
| Onde del mare, Vento, Camino | intensità; colore e livello del rumore di fondo |
| Solfeggio | livello del tono; suono e livello del sottofondo naturale |

Le modifiche valgono **solo per il preset su cui si fanno**: il preset mostra "su misura" e
**Ripristina** lo riporta ai valori originali.

## Pausa, timer e dissolvenze

- **Pausa** ferma l'audio e congela il timer: alla ripresa il conto riparte dal tempo rimasto.
  Il tempo passato in pausa non conta.
- Cambiare preset o regolazioni **non tocca il timer**. Scegliere una nuova durata sostituisce
  il tempo rimasto; "Disattivato" toglie il timer senza fermare l'audio.
- **A scadenza** il suono sfuma in **8 secondi** fino al silenzio, poi l'app torna su "Avvia".
  La dissolvenza è programmata nel clock audio, quindi avviene in orario anche se il
  JavaScript della pagina è rallentato (schermo bloccato). Il nuovo avvio usa la durata intera.
- Durata delle altre transizioni: circa 1 secondo per la pausa, 0,8 secondi tra un suono e l'altro.
- Il timer scorre solo mentre l'audio suona davvero: si ferma anche se il sistema interrompe
  l'audio o se il browser non lo avvia.

**Se l'audio non parte o si interrompe** (telefonata, altra app, browser che chiede un tocco),
il pulsante mostra "Riprendi" con un breve messaggio. Le regolazioni restano.

## Cosa viene salvato

Solo su questo dispositivo e in questo browser (memoria locale), nessun account:
regolazioni di ogni preset, configurazione di ogni ambiente naturale (con versione di schema e
validazione: un dato rovinato torna ai valori predefiniti), ultimo preset scelto, volume generale,
ultima scheda aperta. Le regolazioni della Natura sono separate da quelle di Esigenze e Solfeggio.
Il timer non viene salvato.

## Ascolto in background

L'app imposta la sessione audio come "riproduzione" (come musica e podcast), mostra titolo e
play/pausa nella schermata di blocco e tiene acceso lo schermo durante l'ascolto, dove il
browser lo consente. Riprende da sola dopo un'interruzione quando il sistema lo permette.

**Stato delle verifiche:** questi comportamenti sono stati provati in emulazione (Chromium),
**non ancora su dispositivi reali**. Su iPhone l'ascolto a schermo bloccato del Web Audio dipende
da iOS 17.5 o successivo. Chiudere l'app dal multitasking ferma sempre l'audio.
Le prove da fare sono in [docs/collaudo-dispositivi.md](docs/collaudo-dispositivi.md).

## Nota sulle prove scientifiche

Le ricerche sui battimenti binaurali danno risultati contrastanti: una meta-analisi del 2019 riporta
effetti piccoli o moderati su ansia e attenzione, mentre una revisione del 2023 non trova prove solide
che il cervello si "sintonizzi" sulla frequenza del battimento. Le frequenze Solfeggio vengono da una
tradizione olistica e gli effetti che le vengono attribuiti non sono provati. L'app è pensata come
sottofondo, non come terapia. Tieni il volume basso e non usarla alla guida.

## Accessibilità

- Pannello Regola modale: focus confinato, contenuto sottostante inerte, focus restituito alla chiusura.
- Cursori con nome e valore leggibili dagli screen reader; scelte navigabili con le frecce.
- Selezione indicata anche da testo e icone, non solo dal colore.
- Rispetta "Riduci movimento": l'onda resta ferma. L'onda è decorativa e non misura nulla.
- Utilizzabile con zoom al 200% e su schermi da 360 px.

## Sviluppo

```bash
npm install
npm run dev            # server locale
npm test               # test di unità (Node, nessuna dipendenza)
npm run build          # build di produzione in dist/
npm run test:browser   # prove nel browser (richiede Playwright, vedi sotto)
```

**Prove nel browser.** `tests/browser/` contiene uno scenario per ticket (timer, background,
dissolvenze, accessibilità, stato di riproduzione, interfaccia, animazione, reattività).
Compilano l'app con esbuild e la provano in Chromium headless con orologio simulato e guasti audio
forzati. Playwright non è una dipendenza del progetto:

```bash
npm install --no-save playwright && npx playwright install chromium
npm run test:browser            # tutti gli scenari
npm run test:browser -- oq04    # solo quelli il cui nome contiene "oq04"
```

**Misure audio.** `tools/misure-audio/` misura giunzioni dei loop, picchi, loudness e canali
di ogni preset ([istruzioni](tools/misure-audio/README.md), [ultimo report](docs/report-audio.md)).

## Pubblicazione

Ogni push su `main` avvia `.github/workflows/deploy.yml`: test di unità, build e pubblicazione su
GitHub Pages. Se un test fallisce, la versione non va online. Prima di un rilascio seguire
[docs/rilascio.md](docs/rilascio.md).

Chi ha l'app nella schermata Home vede in alto il pulsante **Aggiorna** quando esce una versione nuova.

## Struttura

```
src/
  App.jsx                    schermata principale, stato, salvataggio locale
  presets.js                 preset e bande di frequenza
  mixDescription.js          descrizioni a parole del mix attivo
  timer.js                   logica del timer (pausa, ripresa, scadenza)
  environments/              modello degli ambienti, migrazione, riepiloghi
  audio/
    useAudioEngine.js        motore audio: avvio, pausa, ripresa, background
    graph.js                 grafo Web Audio (oscillatori, rumore, natura, volumi)
    playbackState.js         stati di riproduzione e messaggi
    crossfade.js             dissolvenze incrociate tra sorgenti
    masterSchedule.js        volume generale e dissolvenza finale nel clock audio
    natureSounds.js          sintesi di pioggia, onde, vento, camino e temporale
    noiseSounds.js           rumore rosa, marrone e bianco
    bufferTools.js           chiusura dei loop, limitatore, generazione a blocchi
    background.js            sessione audio, schermata di blocco
    env/                     motore degli ambienti: pianificazione eventi, Pioggia
  components/                onda, pannello Regola, controlli rapidi, schede, icone
tests/                       test di unità
tests/browser/               prove nel browser
tools/misure-audio/          misure audio
docs/                        verifiche, collaudo dispositivi, report audio, rilascio
```
