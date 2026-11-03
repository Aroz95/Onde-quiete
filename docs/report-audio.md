# Report audio (OQ-10)

Data: 3 novembre 2026. Ambiente: Chromium headless su Linux, rendering offline a 48 kHz,
con il codice dell'app ([tools/misure-audio](../tools/misure-audio/README.md)).
Le misure sono numeriche: **nessun ascolto in cuffia è stato fatto** e nessun dispositivo
mobile è stato usato. Le voci da ascoltare sono elencate in fondo.

## Anomalie trovate e corrette

| # | Anomalia | Prima | Correzione | Dopo |
|---|---|---|---|---|
| 1 | Click alla giunzione del rumore marrone, ogni 6 s | salto 6,3× oltre il 99,9° percentile dei salti normali, su entrambi i canali | il loop dei rumori viene chiuso con una dissolvenza di 80 ms, come già per la natura | 0,7× (nella norma) |
| 2 | Rumore rosa, canale destro | 1,5× oltre il 99,9° percentile | come sopra | 0,1× |
| 3 | Livelli molto diversi tra preset | escursione di loudness 9,0 dB; onde −6,5, vento −6,7, camino −7,2, solo rumore −4,7 dB dal mediano | correzione di livello per tipo di natura (`NATURE_TRIM_DB`), "Solo rumore" da 70 a 100 | escursione 3,4 dB, tutti entro ±1,8 dB dal mediano |
| 4 | Scoppiettii del camino molto sopra il resto | picco/medio 19,4 dB | limitatore morbido sopra 0,7 prima di alzare il livello | 15,3 dB |
| 5 | Interfaccia bloccata alla prima scelta del temporale | 385–530 ms di blocco unico | generazione a blocchi; nel frattempo continua il suono precedente, poi dissolvenza | 0 ms di blocco (CPU normale), 1 blocco da 126 ms con CPU rallentata 4× |
| 6 | Memoria senza limite | fino a circa 55 MB con tutti i suoni in cache | in memoria solo gli ultimi 3 suoni della natura | al massimo circa 33 MB (17 + 8 + 8) più 7 MB di rumori |

## Misure finali

### Buffer

| Suono | Generazione (ms) | Durata | Memoria | Picco/medio | Giunzione rispetto al 99,9° percentile (L / R) |
|---|---|---|---|---|---|
| Pioggia | 108 | 20 s | 7,7 MB | 14,5 dB | 0,41× / 0,30× |
| Onde | 89 | 20 s | 7,7 MB | 15,6 dB | 0,00× / 0,01× |
| Vento | 139 | 20 s | 7,7 MB | 11,8 dB | 0,08× / 0,22× |
| Camino | 78 | 20 s | 7,7 MB | 15,3 dB | 0,04× / 0,24× |
| Temporale | 453 | 45 s | 17,3 MB | 12,2 dB | 0,06× / 0,05× |
| Rumore rosa | 16 | 6 s | 2,3 MB | 12,9 dB | 0,10× / 0,09× |
| Rumore marrone | 14 | 6 s | 2,3 MB | 13,9 dB | 0,71× / 0,68× |
| Rumore bianco | 13 | 6 s | 2,3 MB | 4,8 dB | 0,77× / 0,65× |

Sotto 1× il salto alla giunzione non si distingue dai salti normali del suono stesso.
I tempi di generazione sono su desktop e calcolati a blocchi: non bloccano l'interfaccia.

### Mix completo dei preset

Nessun campione saturato in nessun preset, né al volume predefinito (70%) né al massimo.
Picco più alto: −3,9 dBFS (onde e camino al 100%).

| Preset | Picco 70% | Picco 100% | Loudness 70% | Dal mediano |
|---|---|---|---|---|
| Relax | −13,5 | −10,4 | −17,1 LUFS | +1,6 |
| Concentrazione | −14,4 | −11,5 | −17,9 | +0,8 |
| Sonno | −9,3 | −6,2 | −18,3 | +0,4 |
| Meditazione | −14,6 | −11,6 | −17,1 | +1,6 |
| Creatività | −14,4 | −11,5 | −17,8 | +0,9 |
| Energia | −17,1 | −14,0 | −18,7 | 0,0 |
| Studio | −12,5 | −9,7 | −20,4 | −1,7 |
| Calma | −12,8 | −10,6 | −17,6 | +1,1 |
| Solo rumore | −9,4 | −7,7 | −20,5 | −1,8 |
| Pioggia | −10,1 | −7,0 | −18,7 | 0,0 |
| Onde del mare | −7,0 | −3,9 | −18,4 | +0,3 |
| Vento | −7,6 | −4,5 | −20,4 | −1,7 |
| Camino | −7,0 | −3,9 | −18,7 | 0,0 |
| Temporale | −10,1 | −7,0 | −17,2 | +1,5 |
| 396 Hz | −12,1 | −9,0 | −19,1 | −0,4 |
| 432 Hz | −12,1 | −9,0 | −19,2 | −0,5 |
| 528 Hz | −14,4 | −11,2 | −20,2 | −1,5 |
| 639 Hz | −12,8 | −9,6 | −20,5 | −1,8 |

Mediano −18,7 LUFS. La loudness è senza gating: serve a confrontare i preset tra loro,
non come valore assoluto di trasmissione.

### Canali del binaurale

Relax, solo tono: 200,0 Hz a sinistra e 209,5 Hz a destra (attesi 200 e 210; lo scarto è la
risoluzione della misura su 2 s). I due canali sono separati.

### Reattività alla prima selezione (nell'app, Chromium)

| | Temporale pronto dopo | Blocco più lungo | Seconda scelta (dalla memoria) |
|---|---|---|---|
| CPU normale | 0,73 s | nessuno sopra 50 ms | 0,05 s |
| CPU rallentata 4× | 3,6 s | 126 ms (uno solo) | 0,09 s |

Durante l'attesa il suono precedente continua e l'interfaccia risponde; il temporale entra
in dissolvenza quando è pronto. Su un telefono lento l'attesa può avvicinarsi ai valori 4×.

## Da ascoltare (non verificabile con le misure)

Da fare in cuffia, a volume normale e alto, su tutti i preset e per più cicli completi:

1. **Ripetizione dei loop.** I suoni si ripetono ogni 20 s (45 s il temporale, 6 s i rumori).
   Ogni ascolto parte da un punto casuale, ma il temporale ha 4 tuoni in posizioni fisse:
   verificare se dopo qualche minuto la sequenza diventa riconoscibile.
2. **Livelli corretti.** Onde, vento e camino sono stati alzati di 6,5–7 dB: confermare che
   il camino non risulti fastidioso e che il passaggio tra preset sembri equilibrato.
3. **Limitatore morbido.** Verificare che onde e scoppiettii non suonino "schiacciati".
4. **Dissolvenze.** 0,8 s tra suoni, 8 s a fine timer: giudicare se sono gradevoli.
5. **Attesa al primo temporale** su iPhone: annotare quanto tempo passa prima che si senta.

Annotare dispositivo, cuffie, preset, durata e cosa si è sentito. Ogni anomalia va trattata
come correzione circoscritta, con misura prima e dopo usando gli script di questa cartella.

## Ambiente Pioggia (CR Ambienti naturali, NAT-03)

Misure del 3 novembre 2026 con `node tools/misure-audio/pioggia.cjs`, rendering offline a 48 kHz,
generatore casuale con seme (ripetibile). Nessun ascolto in cuffia ancora fatto.

### Intensità: cambia la trama, non il volume

| Intensità | Loudness | Brillantezza | Picco/medio | Granularità |
|---|---|---|---|---|
| Leggera (0) | −15,6 LUFS | 5.880 Hz | 20,2 dB | 13,5 dB |
| Moderata (33) | −15,6 | 6.890 | 18,2 | 6,6 |
| Intensa (66) | −15,5 | 7.480 | 17,3 | 3,5 |
| Battente (100) | −15,3 | 7.760 | 15,8 | 1,8 |

La granularità misura quanto i picchi brevi (finestre da 5 ms) emergono sul livello tipico:
alta = gocce isolate, bassa = scroscio continuo. La loudness resta entro 0,3 dB grazie a una
compensazione (senza, la Battente era 2,1 dB sopra la Leggera). Livello 75% al volume del 70%:
−18,7 LUFS, pari al mediano degli altri preset.

### Tuoni: la distanza cambia il colore, non solo il livello

| Distanza | Picco | Brillantezza | Granularità |
|---|---|---|---|
| Lontani | −16,1 dB | 87 Hz | 18,6 dB |
| Vicini | −8,7 dB | 351 Hz | 24,7 dB |

Vicini: rimbombo più chiaro, attacco rapido e schiocco iniziale. Lontani: più gravi, ovattati,
con attacco lento. In 4 minuti: 3 tuoni con frequenza "Rari", 19 con "Frequenti"; mai più di 2 sovrapposti.

### Vento

| Forza | Loudness | Brillantezza | Granularità |
|---|---|---|---|
| Brezza | −28,7 LUFS | 1.680 Hz | 3,8 dB |
| Burrasca | −21,1 LUFS | 1.940 Hz | 6,7 dB (raffiche e ululato) |

Prima della calibrazione il vento era 24 dB sotto la pioggia e quasi impercettibile: guadagno alzato di 11 dB.

### Caso peggiore

Temporale con tutto al 100% (pioggia battente, tuoni vicini e frequenti, burrasca, raffiche frequenti),
volume generale 100%: picco −0,4 dBFS, **nessun campione saturato**, picco/medio 13,5 dB (dinamica conservata).
Prima della correzione: +0,4 dBFS con 7 campioni saturati. Correzioni: raffiche di burrasca meno estreme
e arrotondamento morbido di sicurezza sopra l'80% della scala, dopo il limitatore.

### Memoria

Sorgenti della Pioggia: rumore bianco e tre strati di gocce (8 s stereo) circa 12 MB; tuoni (4 rimbombi
a 22 kHz e 3 schiocchi) circa 4 MB, preparati solo quando si accendono. Il vecchio Temporale da solo
occupava 17 MB. Le sorgenti si generano una volta e si riusano tornando alla Pioggia.

### Da ascoltare

1. Almeno 20 minuti di Pioggia leggera, intensa e Temporale: ripetitività della trama, click, picchi.
2. Leggera e Battente a volume simile: si distinguono per carattere?
3. Tuoni lontani e vicini: credibili? Lo schiocco dei vicini è fastidioso?
4. Brezza e burrasca: il vento sembra vento? Le raffiche sono naturali?
5. Spegnere tuoni e vento durante l'ascolto: le dissolvenze sono gradevoli?
