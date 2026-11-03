# Onde Quiete

App web in React che genera battimenti binaurali e rumore colorato per rilassarsi, concentrarsi, dormire o meditare.

## Funzioni

- **9 preset**: Relax, Concentrazione, Sonno, Meditazione, Creatività, Energia, Studio, Calma, Solo rumore
- **Battimenti binaurali**: due sinusoidi a frequenze leggermente diverse, una per orecchio (delta, theta, alfa, beta, gamma)
- **Rumore colorato**: rosa, marrone o bianco, miscelabile con il tono
- **Controlli fini**: battimento, frequenza portante, volume tono, volume rumore, volume generale
- **Timer** con spegnimento in dissolvenza (10, 25, 45, 60 minuti)
- Tiene lo schermo acceso durante la riproduzione, dove il browser lo consente

L'audio è generato in tempo reale con la Web Audio API: nessun file audio da scaricare.

> Usa le cuffie: senza, l'effetto binaurale non si percepisce. Tieni il volume basso e non usarla alla guida.

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
  audio/useAudioEngine.js motore Web Audio (oscillatori, rumore, volumi)
  components/Scope.jsx    oscilloscopio animato
  components/Slider.jsx   cursore con etichetta e valore
  styles.css
```
