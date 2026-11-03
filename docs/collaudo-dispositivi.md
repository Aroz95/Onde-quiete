# Collaudo su dispositivi reali

Questa checklist copre i comportamenti che dipendono dal sistema operativo e dal browser
(ticket OQ-02, con ricollaudo di OQ-01 e OQ-05). Non si possono verificare in emulazione:
vanno provati sui dispositivi, annotando l'esito.

**Regola:** nel README e nell'app si dichiara supportato solo ciò che risulta ✅ qui,
con dispositivo e versione. La presenza di un'API nel browser non basta.

## Già verificato in emulazione

Verificato il 3 novembre 2026 in Chromium headless, con orologio simulato e stati forzati.
Gli scenari sono in `tests/browser/scenari/` e si rieseguono con `npm run test:browser`:

| Scenario | Esito |
|---|---|
| Timer 25 min, pausa dopo 10, un'ora di pausa: restano 15 min | ✅ |
| Cambio preset e regolazioni non toccano il timer | ✅ |
| Avvio rifiutato dal browser: "Riprendi" e messaggio, mai "Pausa" | ✅ |
| Pausa durante un avvio lento: l'avvio tardivo viene ignorato | ✅ |
| Timer scaduto a pagina nascosta: al rientro sessione chiusa, nessuna ripartenza | ✅ |
| Interruzione di sistema dopo la scadenza: sessione chiusa, non "in pausa · 0:00" | ✅ |
| Pausa dell'utente non annullata da rientro, focus o pageshow | ✅ |
| Blocco schermo riacquisito al rientro, rilasciato in pausa e a fine sessione | ✅ |
| Dissolvenza finale programmata nel clock audio (rendering offline): 0,9% alla scadenza | ✅ |

## Dispositivi da provare

Compilare una colonna per dispositivo. Esito: ✅ funziona · ⚠️ funziona con limiti (descrivere) · ❌ non funziona.

| | iPhone · Safari | iPhone · app nella Home | Android · Chrome | Desktop · Chrome | Desktop · Safari |
|---|---|---|---|---|---|
| Modello e versione del sistema | | | | | |
| Versione del browser | | | | | |
| Data e chi ha provato | | | | | |
| 1. Avvio da un preset | | | | | |
| 2. Schermo bloccato: l'audio continua per 5 min | | | | | |
| 3. Timer 10 min a schermo bloccato: si spegne in orario, con dissolvenza | | | | | |
| 4. Rientro dopo la scadenza: pulsante "Avvia", nessuna ripartenza | | | | | |
| 5. Altra app che riproduce audio, poi ritorno | | | | | |
| 6. Telefonata o sveglia durante l'ascolto | | | | | |
| 7. Dopo l'interruzione: ripresa automatica o "Riprendi" con messaggio | | | | | |
| 8. Pausa, blocco schermo, sblocco: resta in pausa | | | | | |
| 9. Schermo acceso durante l'ascolto (non si spegne da solo) | | | | | |
| 10. Schermo libero di spegnersi dopo pausa o fine timer | | | | | |
| 11. Controlli nella schermata di blocco: play/pausa coerenti | | | | | |
| 12. Interruttore silenzioso attivo (solo iPhone): l'audio si sente | | | | — | — |
| 13. Cambio scheda del browser e ritorno | | | | | |
| 14. Pausa a metà timer, attesa, ripresa: il residuo riparte da dove era | | | | | |
| 15. Cambio tra suoni della natura e colori del rumore: nessuno stacco brusco | | | | | |
| 16. Scorrendo fino in fondo, l'ultima tessera e la nota restano sopra la barra | | | | | |
| 17. VoiceOver: pannello Regola letto come finestra, cursori con nome e valore | | | | — | |

### Come eseguire i passi

- **2–4:** imposta 10′ dal pannello Regola, avvia, blocca lo schermo. Annota l'ora di avvio e
  quella in cui il suono finisce. La dissolvenza finale dura 8 secondi.
- **5–7:** durante l'ascolto apri un video o un brano in un'altra app, oppure fatti chiamare.
  Annota se al ritorno l'audio riprende da solo o se compare il messaggio con "Riprendi".
- **9–10:** lascia l'app aperta senza toccarla, oltre il tempo di spegnimento automatico
  dello schermo impostato nel telefono.

## Percorso minimo di regressione

Da ripetere su almeno un dispositivo prima di ogni rilascio:

1. Apri l'app → scegli un preset → regola volume e mix.
2. Imposta il timer → metti in pausa → riprendi: il residuo è corretto.
3. Cambia preset: il timer continua.
4. Passa in background → rientra: lo stato è coerente.
5. Attendi lo spegnimento: dissolvenza, poi pulsante "Avvia".
6. Chiudi e riapri l'app: preset, regolazioni e volume sono quelli lasciati.

## Limiti noti

- **iPhone:** la riproduzione a schermo bloccato del Web Audio dipende dalla sessione audio
  di tipo "playback", introdotta in iOS 17.5. Sulle versioni precedenti l'audio può
  fermarsi quando lo schermo si blocca. Da confermare con le prove sopra.
- **Timer a pagina sospesa:** lo spegnimento è programmato nel clock audio e avviene in
  orario anche se il JavaScript è fermo. L'interfaccia e la schermata di blocco si
  aggiornano invece solo quando la pagina torna attiva.
- **Chiusura dal multitasking:** chiudere l'app dal selettore delle app ferma sempre l'audio.
