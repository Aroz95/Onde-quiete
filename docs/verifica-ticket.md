# Verifica dei ticket

Per ogni criterio di accettazione: come è stato verificato e cosa manca.

**Legenda**
- **Unità**: test automatico in `tests/`, eseguito da `npm test` e dal workflow di pubblicazione.
- **Browser**: prova scriptata in Chromium headless (orologio simulato, stati audio forzati),
  in `tests/browser/scenari/`, eseguita con `npm run test:browser`.
- **Misura**: rendering audio offline in Chromium, con valori numerici.
- **Dispositivo**: da provare sul telefono con [collaudo-dispositivi.md](collaudo-dispositivi.md). ⏳ = non ancora fatto.

Un criterio è chiuso solo quando tutte le verifiche necessarie sono fatte.
Per i comportamenti di iOS (schermo bloccato, interruzioni, sessione audio) l'emulazione non basta.

## OQ-01 Tempo residuo in pausa

| Criterio | Unità | Browser | Dispositivo |
|---|---|---|---|
| 25 min, pausa dopo 10 → circa 15 residui | ✅ | ✅ | ⏳ |
| La pausa non consuma il residuo | ✅ | ✅ (1 ora) | ⏳ |
| Cambio preset e regolazioni non toccano il timer | — | ✅ | ⏳ |
| A scadenza audio spento, stato inattivo | ✅ | ✅ | ⏳ |
| Nuovo avvio usa la durata intera | ✅ | ✅ | ⏳ |
| Test a tempo controllato | ✅ 13 test | ✅ | — |

## OQ-02 Timer, interruzioni, background

| Criterio | Unità | Browser / Misura | Dispositivo |
|---|---|---|---|
| Collaudo su iPhone, app nella Home, Android, desktop | — | — | ⏳ |
| Blocco schermo, cambio scheda, rientro, interruzione | — | ✅ simulati | ⏳ |
| Sessione scaduta non riparte al rientro | ✅ | ✅ | ⏳ |
| Pausa dell'utente non annullata dal recupero | ✅ | ✅ | ⏳ |
| Blocco schermo riacquisito e rilasciato | — | ✅ (finto) | ⏳ |
| Dissolvenza finale in orario a pagina sospesa | ✅ | ✅ misura: 0,9% alla scadenza | ⏳ |
| Limiti riportati per dispositivo e versione | — | — | ⏳ |

## OQ-03 Transizioni tra le sorgenti

| Criterio | Unità | Misura | Dispositivo |
|---|---|---|---|
| Cambio tra suoni della natura senza stacco | ✅ | ✅ salto 1,3× contro 4,15× prima | ⏳ ascolto |
| Cambio tra colori del rumore graduale | ✅ | ✅ | ⏳ ascolto |
| Cambi ripetuti senza sorgenti residue | ✅ | ✅ 1 sorgente dopo 4 cambi | — |
| Nessun picco durante la sovrapposizione | ✅ curve | ✅ entro +1,4 dB | ⏳ ascolto a volume alto |
| Pausa o fine durante una transizione | — | ✅ nessun errore | ⏳ |

## OQ-04 Accessibilità del pannello Regola

| Criterio | Browser | Dispositivo |
|---|---|---|
| Tab e Maiusc+Tab restano nel pannello | ✅ 40 + 40 pressioni | — |
| Contenuto sottostante non attivabile né esposto | ✅ inert + aria-hidden | ⏳ VoiceOver |
| Focus torna al pulsante di apertura | ✅ Regola, onda, sfondo | — |
| Etichette e valori comprensibili | ✅ albero di accessibilità | ⏳ VoiceOver |
| Zoom 200% e viewport stretto | ✅ 195×422 px | ⏳ |
| Chiusura ripristina lo scorrimento | ✅ | ⏳ |

## OQ-05 Stato di riproduzione

| Criterio | Unità | Browser | Dispositivo |
|---|---|---|---|
| Avvio fallito non lascia "Pausa" | ✅ | ✅ | ⏳ |
| Interruzione recuperabile con azione chiara | ✅ | ✅ | ⏳ telefonata reale |
| Tocchi rapidi senza stati contraddittori | ✅ | ✅ | ⏳ |
| Schermata di blocco coerente | — | ✅ media session | ⏳ |

## OQ-06, 07, 08, 11 Interfaccia (ramo `revisione-interfaccia`)

| Criterio | Unità | Browser | Dispositivo |
|---|---|---|---|
| Volume generale senza aprire Regola | — | ✅ | ⏳ |
| Timer raggiungibile e stato sempre leggibile; conto alla rovescia mostrato una volta | — | ✅ | ⏳ |
| Volume generale distinto dai livelli | — | ✅ "Volume" / "Livello" | — |
| Ogni preset descritto senza Hz; descrizioni brevi distinte per scheda | ✅ | — | — |
| Nessuna descrizione cita un suono spento | ✅ | — | — |
| Cuffie contestuali (binaurale sì, altri consigliate) | ✅ | ✅ | — |
| 360, 390, 768, 1440 px senza sovrapposizioni né scorrimento laterale | — | ✅ | ⏳ |
| Tutti i contenuti portabili sopra la barra inferiore | — | ✅ ≥ 37 px di margine, con indicatore Home simulato | ⏳ scorrendo |
| Selezione non solo a colori | — | ✅ testo, spunta, barretta | — |
| Avvio al tocco comprensibile | — | ✅ | — |

## OQ-09 Movimento e consumo dell'animazione

| Criterio | Browser | Dispositivo |
|---|---|---|
| In pausa nessun ciclo di disegno | ✅ 0 fotogrammi in 1,5 s (60/s in ascolto) | — |
| Movimento ridotto: niente tremolii né oscillazioni | ✅ immagine identica dopo 1,5 s | ⏳ Riduci movimento di iOS |
| Preferenza cambiata durante la sessione | ✅ in entrambi i sensi | — |
| Ritorno in primo piano ripristina l'onda | ✅ | ⏳ |
| Rotazione, altezza e densità dei pixel senza deformazioni | ✅ 390↔844 px, altezza, 1×→3× | ⏳ rotazione reale |
| La grafica non tocca l'audio | ✅ audio attivo con onda ferma o pagina nascosta | — |

## OQ-10 Qualità sonora, loop e prestazioni

Dettagli in [report-audio.md](report-audio.md).

| Criterio | Misura | Dispositivo / ascolto |
|---|---|---|
| Report con anomalie riproducibili | ✅ 6 anomalie, script in `tools/misure-audio` | ⏳ ascolto |
| Nessun click alle giunzioni | ✅ tutti gli 8 loop sotto il 99,9° percentile (prima: marrone 6,3×) | ⏳ ascolto |
| Livelli del mix complessivo | ✅ escursione da 9,0 a 3,4 dB, nessuna saturazione | ⏳ ascolto |
| Picchi di temporale e camino | ✅ camino picco/medio da 19,4 a 15,3 dB | ⏳ ascolto |
| Reattività alla prima selezione | ✅ nessun blocco a CPU normale, 126 ms a 4× | ⏳ iPhone |
| Correzioni circoscritte con prima/dopo | ✅ tabella nel report | — |

## OQ-12 Documentazione e controlli di rilascio

| Criterio | Esito |
|---|---|
| README e testi nell'app descrivono gli stessi comportamenti | ✅ README riscritto e confrontato con i testi dell'app |
| Ogni controllo documentato è disponibile nel contesto indicato | ✅ tabella per categoria nel README, verificata sul codice |
| Durata della dissolvenza finale definita e verificata, diversa dallo stop | ✅ 8 s (`FINAL_FADE_S`), misurata; la pausa sfuma in circa 1 s |
| Build di produzione riuscita | ✅ GitHub Actions: tutte le pubblicazioni del 3 novembre riuscite (test + build Vite) |
| Test significativi per timer e stati | ✅ 50 test di unità e 86 verifiche nel browser; contro-prova con due difetti introdotti di proposito: rilevati entrambi (6 test e 11 verifiche falliti), poi ripristinati |
| Evidenze di accessibilità, responsive e dispositivi | ✅ emulazione · ⏳ dispositivi |

## CR Ambienti naturali — prima tappa: Pioggia

Pioggia completa (NAT-01, NAT-02, NAT-03, NAT-05) da ascoltare e validare prima di estendere
il modello a Mare, Vento e Camino (NAT-04). Scenari in `tests/browser/scenari/nat0*.cjs`,
test di unità in `tests/environments.test.js` e `tests/scheduler.test.js`.

| Criterio | Unità | Browser / misura | Dispositivo / ascolto |
|---|---|---|---|
| **NAT-01** Ogni ambiente ha una configurazione indipendente | ✅ | ✅ | — |
| Dati assenti, parziali o non validi recuperati | ✅ | ✅ dati rovinati | — |
| Temporale ricondotto a Pioggia | ✅ | ✅ | — |
| Esigenze e Solfeggio non cambiano modificando Natura | ✅ | ✅ Studio | — |
| Migrazione con Pioggia e Temporale entrambi personalizzati | ✅ precedenza al selezionato | ✅ | — |
| **NAT-02** Attivazione e disattivazione senza stacchi | — | ✅ coda da −27,6 a −114 dB in 1 s | ⏳ ascolto |
| Cambi rapidi senza accumulo né componenti obsolete | — | ✅ 10–15 sorgenti; caricamento tardivo ignorato | — |
| Pausa, ripresa e fine timer su tutte le componenti | ✅ | ✅ | ⏳ iPhone |
| Nessun evento arretrato alla ripresa | ✅ | ✅ dopo 120 s di pausa | — |
| Mix più impegnativo senza saturazione, interfaccia reattiva | — | ✅ −0,5 dBFS, blocco massimo 61 ms | ⏳ iPhone |
| **NAT-03** Leggera e battente diverse per carattere a livello simile | — | ✅ granularità 5,6 → 1,4 dB, loudness ±0,3 dB | ⏳ ascolto |
| Timbro naturale, senza metallico né crepitio (segnalazione all'ascolto) | — | ✅ pettine 0,44 → 0,09; picchi tonali 14,2 → 1,8 dB | ⏳ riascolto |
| Tuoni e vento indipendenti | ✅ | ✅ | — |
| Frequenza, distanza e livello dei tuoni distinti | ✅ | ✅ 3 → 19 tuoni; 99 → 425 Hz | ⏳ ascolto |
| Burrasca non cambia pioggia né volume generale | ✅ | ✅ | — |
| Leggera → temporale → leggera senza interrompere il timer | — | ✅ | ⏳ |
| Configurazione ritrovata riaprendo l'app | — | ✅ | ⏳ |
| **NAT-05** Dalla tessera ai controlli pertinenti | — | ✅ | — |
| Componenti spente senza parametri, valori conservati | ✅ | ✅ | — |
| Slider con componente e valore comprensibile | — | ✅ "Intensità, pioggia: Battente" | ⏳ VoiceOver |
| Riepiloghi e "Personalizzato" seguono la configurazione | ✅ | ✅ | — |
| Modifiche in pausa non avviano l'audio | — | ✅ | — |
| Focus confinato, tastiera, ritorno del focus | — | ✅ | ⏳ VoiceOver |
| 360 e 390 px senza scorrimento orizzontale, comandi raggiungibili | — | ✅ | ⏳ |
| **NAT-04** Mare, Vento, Camino | — | — | da fare dopo la validazione della Pioggia |
| **NAT-06** Ascolto 20 min per ambiente, collaudo iPhone | — | — | ⏳ |

## Riepilogo dello stato

Tutti i criteri verificabili in emulazione sono soddisfatti. **Nessun criterio è ancora verificato
su un dispositivo reale.** Restano da fare:

1. Prove su iPhone (Safari e app nella Home) della [checklist](collaudo-dispositivi.md), in particolare
   pausa e ripresa del timer, schermo bloccato, cambi di suono, dissolvenza finale, scorrimento sopra la barra.
2. Ascolto in cuffia dei punti elencati in [report-audio.md](report-audio.md).
3. VoiceOver su iPhone per il pannello Regola.
