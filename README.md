# Onde Quiete

App web in React che genera battimenti binaurali e rumore colorato per rilassarsi, concentrarsi, dormire o meditare.

## Funzioni

- **9 preset per esigenza**: Relax, Concentrazione, Sonno, Meditazione, Creatività, Energia, Studio, Calma, Solo rumore
- **5 suoni della natura**: Pioggia, Onde del mare, Vento, Camino, Temporale, sintetizzati in tempo reale
- **4 frequenze Solfeggio**: 396, 432, 528 e 639 Hz come toni puri con un leggero sottofondo naturale
- **Battimenti binaurali**: due sinusoidi a frequenze leggermente diverse, una per orecchio (delta, theta, alfa, beta, gamma). Con battimento a 0 Hz si ottiene un tono puro
- **Rumore colorato**: rosa, marrone o bianco
- **Controlli fini**: battimento, frequenza, volume di tono, natura e rumore, volume generale

Tono, natura e rumore si possono mescolare liberamente.
- **Timer** con spegnimento in dissolvenza (10, 25, 45, 60 minuti)
- Tiene lo schermo acceso durante la riproduzione, dove il browser lo consente

L'audio è generato in tempo reale con la Web Audio API: nessun file audio da scaricare.

> Usa le cuffie: senza, l'effetto binaurale non si percepisce. Tieni il volume basso e non usarla alla guida.

## Nota sulle prove scientifiche

Le ricerche sui battimenti binaurali danno risultati contrastanti: una meta-analisi del 2019 riporta effetti piccoli o moderati su ansia e attenzione, mentre una revisione del 2023 non trova prove solide che il cervello si "sintonizzi" sulla frequenza del battimento. Le frequenze Solfeggio vengono da una tradizione olistica e gli effetti che le vengono attribuiti non sono provati. L'app è pensata come sottofondo per rilassarsi o concentrarsi, non come terapia.

## Sviluppo

```bash
npm install
npm run dev      # server locale
npm run build    # build di produzione in dist/
```

## Pubblicazione

Ogni push su `main` avvia il workflow `.github/workflows/deploy.yml`, che pubblica la build su GitHub Pages.
La prima volta va attivato in **Settings → Pages → Source: GitHub Actions**.

## Struttura

```
src/
  App.jsx                 interfaccia e stato
  presets.js              preset e bande di frequenza
  audio/useAudioEngine.js motore Web Audio (oscillatori, rumore, natura, volumi)
  audio/natureSounds.js   sintesi di pioggia, onde, vento, camino e temporale
  components/Scope.jsx    oscilloscopio animato
  components/Slider.jsx   cursore con etichetta e valore
  styles.css
```
