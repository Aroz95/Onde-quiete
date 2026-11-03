# Verifica dei ticket

Per ogni criterio di accettazione: come è stato verificato e cosa manca.

**Legenda**
- **Unità**: test automatico in `tests/`, eseguito da `npm test` e dal workflow di pubblicazione.
- **Browser**: prova scriptata in Chromium headless (orologio simulato, stati audio forzati).
  Gli script sono stati eseguiti durante lo sviluppo ma non sono ancora nel repository (vedi OQ-12).
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

## Da fare per il rilascio

1. Prove su iPhone (Safari e app nella Home) della [checklist](collaudo-dispositivi.md), in particolare:
   pausa e ripresa del timer, schermo bloccato, cambi di suono, dissolvenza finale, scorrimento sopra la barra.
2. Portare gli script di prova nel browser nel repository, perché siano ripetibili (OQ-12).
