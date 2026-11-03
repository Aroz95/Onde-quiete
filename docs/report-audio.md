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
generatore casuale con seme (ripetibile). Nessun ascolto in cuffia ancora fatto da parte mia.

### Timbro metallico e crepitio (segnalati all'ascolto, corretti)

Al primo ascolto la pioggia suonava metallica e, all'intensità minima, crepitava come un camino.
Abbassando il livello sparivano insieme il metallico e la pioggia: il difetto era nella sorgente stessa.

Cause trovate:
- ogni strato di gocce era suonato due volte, a velocità 1 e 0,971: due copie quasi uguali sommate
  creano un effetto flanger, cioè il suono metallico;
- il fondo d'acqua, il "corpo" e il vento usavano lo stesso rumore bianco a velocità diverse (stesso effetto);
- piccoli toni sinusoidali ("plink") sulle gocce, percepiti come note metalliche;
- gocce leggere rade, forti, con attacco istantaneo e molti bassi: ogni goccia era un clic con un tonfo.

Correzioni: una sola copia per sorgente, rumore separato per il vento, niente toni, gocce leggere
più fitte e morbide (attacco arrotondato) e con i bassi tagliati da un doppio filtro passa-alto.

| Misura (Pioggia leggera) | Prima | Dopo | Cosa indica |
|---|---|---|---|
| Effetto pettine | 0,44 | 0,09 | ripetizione a 0,3–25 ms: il timbro metallico |
| Picchi tonali | 14,2 dB | 1,8 dB | note che emergono tra 800 Hz e 8 kHz |
| Granularità | 13,5 dB | 5,6 dB | gocce che spiccano come clic |
| Energia sotto 500 Hz | −19,6 dB | −40,6 dB | il tonfo del crepitio (battente: −17,4 dB, il corpo dello scroscio) |

### Gocce "di grandine" (secondo ascolto, corretto)

Dopo la prima correzione il metallico era sparito, ma a ogni intensità la pioggia sembrava un
picchiettio di granelli duri, come grandine. Causa: ogni goccia era un impulso di 1–6 ms molto acuto
(brillantezza 9.800 Hz). Una goccia d'acqua su foglie o tetto è invece un "pat" morbido.
Ora ogni goccia ha attacco di 1–3 ms, coda di 6–40 ms e colore medio (1,3–5 kHz);
la maggior parte è lontana e debole, poche più vicine spiccano.

| Misura (Leggera → Battente) | Prima | Dopo |
|---|---|---|
| Brillantezza (passaggi per lo zero) | 9.810 → 8.020 Hz | 3.850 → 4.240 Hz |
| Baricentro dello spettro | — | 3.170 → 3.360 Hz |
| Energia sopra i 6 kHz | — | −9,8 → −9,0 dB |
| Energia sotto i 500 Hz | −40,6 dB (leggera) | −18,9 → −13,9 dB (la battente ha più corpo) |
| Effetto pettine / picchi tonali | 0,09 / 1,8 dB | 0,09–0,11 / 1,6–1,9 dB |

### Intensità: cambia la trama, non il volume

| Intensità | Loudness | Brillantezza | Picco/medio | Granularità |
|---|---|---|---|---|
| Leggera (0) | −15,3 LUFS | 3.850 Hz | 17,6 dB | 5,1 dB |
| Moderata (33) | −15,3 | 4.060 | 16,6 | 3,4 |
| Intensa (66) | −14,9 | 4.200 | 16,0 | 2,4 |
| Battente (100) | −14,8 | 4.240 | 14,7 | 1,9 |

La granularità misura quanto i picchi brevi (finestre da 5 ms) emergono sul livello tipico:
alta = gocce isolate, bassa = scroscio continuo. La loudness resta entro 0,5 dB grazie a una
compensazione; il guadagno della pioggia è stato alzato di 1 dB per compensare le gocce più scure.

### Tuoni: frequenza, vicinanza e potenza

Scale più ampie su richiesta: frequenza in 5 passi (Rarissimi → Continui, media da 5 minuti a 7 s),
vicinanza in 5 passi (Lontanissimi → Vicinissimi), nuova **potenza** in 4 passi (Deboli → Violenti),
distinta dal livello: cambia durata, rombo grave e schiocco. I tuoni violenti aggiungono un secondo
rotolio sovrapposto. Al massimo 3 tuoni sovrapposti, distanziati di almeno 4 s.

(La tabella aggiornata dei tuoni isolati è qui sotto, dopo la ricostruzione.)

#### Tuoni ricostruiti (terzo ascolto: "si sentono poco i bassi")

Diagnosi misurata: circa due terzi dell'energia di un tuono violento stava **sotto i 60 Hz**,
dove telefoni e auricolari non riproducono nulla. Quel sottobasso inudibile in più faceva lavorare
il limitatore, che abbassava tutto il mix. Sull'altoparlante di un telefono il tuono violento superava
la pioggia di appena 1,9 dB.

Il tuono ora è fatto così:
- **Colpo e rimbombi:** un colpo principale, poi 3–6 rimbombi irregolari, con un tremolio disordinato (il brontolio).
- **Bande di frequenza:** energia a 60–80 Hz (fondo), 140–190 Hz (corpo) e 380–540 Hz (voce ruvida). Sotto i 32 Hz si taglia.
- **Saturazione morbida:** cresce con potenza e vicinanza. Aggiunge armoniche al rombo, così il basso si percepisce anche su altoparlanti piccoli.
- **Schiocco dei vicini:** è una lacerazione di piccoli crepitii seguita dal colpo secco.
- **Pioggia e vento:** durante un tuono potente si abbassano di qualche dB, fino a −8 dB per un violento vicinissimo a livello pieno, poi tornano al loro livello. Con i tuoni a livello zero non succede nulla.

| Tuono violento vicinissimo | Sotto 60 Hz | 60–250 Hz | 250 Hz–1 kHz | Sopra 1 kHz |
|---|---|---|---|---|
| Prima | −1,7 dB | −5,1 | −19,4 | −23,7 |
| Dopo | −12,9 dB | −2,9 | −5,9 | −7,6 |

Quanto il tuono (vicinanza 75%) supera la pioggia intensa nel mix completo, volume 70%:

| Potenza | Prima, orecchio | Prima, telefono | Dopo, orecchio | Dopo, telefono |
|---|---|---|---|---|
| Moderati (40) | 0,8 dB | 0,6 dB | 3,2 dB | 3,6 dB |
| Forti (75) | 5,3 | 2,0 | 7,6 | 8,1 |
| Violenti (100) | 8,3 | 1,9 | 11,0 | 11,0 |

"Orecchio" usa la pesatura K. "Telefono" toglie in più tutto ciò che sta sotto i 150 Hz.

#### Mix e tuoni "che fanno paura" (quarto ascolto)

- **Mix distanze e Mix potenze** (Uguali, Vari, Misti): ogni tuono si allontana dalla scelta in modo
  casuale. Con "Uguali" sono tutti come scelto; con "Misti" ognuno ha una vicinanza (o potenza)
  qualsiasi. Verifica: tuoni lontani con mix "Uguali", 0 schiocchi su 15; con "Misti", 6 su 15.
  Il Temporale parte con entrambi i mix su "Vari"; i Temporali salvati prima prendono i mix dalla
  configurazione rapida e non risultano personalizzati.
- **Violenti e vicinissimi:** solo quando un tuono è insieme molto potente e molto vicino:
  - **Impatto:** un colpo iniziale fino a 2,5 volte il rombo e una saturazione più spinta, quindi un suono più denso.
  - **Schiocco:** più forte e al centro, su entrambe le orecchie.
  - **Pioggia e vento:** nel colpo scendono fino a −20 dB e risalgono lentamente.

| Tuono nel mix (pioggia intensa, volume 70%) | Sopra la pioggia (orecchio) | Sopra la pioggia (telefono) | Mezzo secondo più forte |
|---|---|---|---|
| Moderati vicini | 6,8 dB | 6,9 dB | −12,1 dB |
| Forti vicini | 12,1 | 11,7 | −6,8 |
| Violenti vicini | 15,8 | 14,8 | −3,1 |
| Violenti vicinissimi | 17,6 | 17,1 | −1,4 |

Il colpo di un tuono violento vicinissimo arriva a −1,4 dB dal massimo digitale già al volume
del 70%: è il limite fisico dell'uscita. Oltre si può solo aumentare il contrasto,
abbassando il livello della pioggia o del vento. Caso peggiore: −0,5 dBFS, nessun campione saturato.

Tuoni isolati, livello 70%, misurati dall'arrivo (prima dell'impatto dei violenti vicinissimi):

| Tuono | Picco | Baricentro | Durata |
|---|---|---|---|
| Lontanissimi | −15,2 dB | 113 Hz | 10,1 s |
| Lontani | −9,9 | 263 | 9,4 |
| Medi | −6,7 | 455 | 8,7 |
| Vicini | −3,7 | 694 | 8,2 |
| Vicinissimi | +0,6 | 932 | 7,8 |
| Medi deboli | −11,7 | 540 | 4,8 |
| Medi violenti | +0,7 | 319 | 14,6 |
| Vicinissimi violenti | +10,3 | 662 | 13,5 |

I picchi sopra 0 dB riguardano il tuono da solo, prima del limitatore. Nell'app, il caso peggiore
(tutto al massimo, volume 100%) resta a −0,5 dBFS senza campioni saturati.
L'arrotondamento di sicurezza ora lavora senza sovracampionamento: con i tuoni violenti il filtro di
ricampionamento superava il massimo di 0,2 dB.

In 4 minuti: 1 tuono con "Rarissimi", 35 con "Continui". I dati salvati prima di questa versione
ricevono la potenza predefinita (Moderati) e conservano gli altri valori.

### Vento

| Forza | Loudness | Brillantezza | Granularità |
|---|---|---|---|
| Brezza | −28,7 LUFS | 1.870 Hz | 4,1 dB |
| Burrasca | −20,6 LUFS | 2.140 Hz | 8,1 dB (raffiche e ululato) |

Prima della calibrazione il vento era 24 dB sotto la pioggia e quasi impercettibile: guadagno alzato di 11 dB.

### Caso peggiore

Temporale con tutto al 100% (pioggia battente, tuoni vicini e frequenti, burrasca, raffiche frequenti),
volume generale 100%, ora con tuoni continui, vicinissimi e violenti: picco −0,5 dBFS, **nessun campione saturato**,
picco −0,5 dBFS dopo la ricostruzione dei tuoni; picco/medio 11 dB circa (dinamica conservata), 22 sorgenti attive (tuoni sovrapposti con doppio rotolio).
Prima della correzione: +0,4 dBFS con 7 campioni saturati. Correzioni: raffiche di burrasca meno estreme
e arrotondamento morbido di sicurezza sopra l'80% della scala, dopo il limitatore.

### Memoria

Sorgenti della Pioggia: rumore del fondo (8 s), rumore del vento (9 s) e tre strati di gocce (12, 10 e 8 s,
che insieme si ripetono solo ogni 2 minuti), stereo, circa 18 MB; tuoni (4 rimbombi
a 22 kHz e 3 schiocchi) circa 4 MB, preparati solo quando si accendono. Il vecchio Temporale da solo
occupava 17 MB. Le sorgenti si generano una volta e si riusano tornando alla Pioggia.

### Da ascoltare

0. Le gocce suonano come acqua e non più come grandine, a ogni intensità?
1. Almeno 20 minuti di Pioggia leggera, intensa e Temporale: ripetitività della trama, click, picchi.
2. Leggera e Battente a volume simile: si distinguono per carattere?
3. Tuoni lontani e vicini: credibili? Lo schiocco dei vicini è fastidioso?
4. Brezza e burrasca: il vento sembra vento? Le raffiche sono naturali?
5. Spegnere tuoni e vento durante l'ascolto: le dissolvenze sono gradevoli?
