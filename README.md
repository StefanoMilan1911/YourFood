# YourFood
Da ora per ogni modifica fai solo questo, dalla cartella YourFood:

bash
git add .
git commit -m "modifica"
git push

Calcoli nel codice:
Basale (Mifflin-St Jeor): 10 × kg + 6,25 × cm − 5 × età, poi +5 uomo o −161 donna.
Calorie base: basale × PAL, con PAL 1,2 / 1,3 / 1,4.
Sport: (MET − 1) × kg × ore.
Mantenimento: calorie base + sport.
Obiettivo: mantenimento × (1 + surplus), arrotondato a 10 kcal.
Proteine: 1,8 g × kg.
Grassi: il maggiore tra 25% dell’obiettivo ÷ 9 e 0,8 g × kg.
Carboidrati: (obiettivo − proteine × 4 − grassi × 9) ÷ 4.
Porzione: valori ogni 100 g × grammi ÷ 100.
Calorie non scritte: 4 × proteine + 4 × carboidrati + 9 × grassi.
Totali del giorno: somma degli alimenti, con mg e µg convertiti prima di sommare.
Ripartizione calorie: proteine × 4, carboidrati × 4 e grassi × 9, ognuno diviso per la somma dei tre.

L’app sommava il basale e poi BMR × (PAL − 1), e il totale è uguale a BMR × PAL. Con 70 kg, 175 cm, 18 anni e PAL 1,3 vengono 1.709 + 513 = 2.221 kcal, come 1.709 × 1,3. Il basale non veniva perso. Quello che confondeva era la riga “Vita di tutti i giorni”, che mostrava solo la parte extra. Ora il riepilogo mostra Calorie base (basale 1.709 × 1,3) = 2.221, poi sport e surplus, come nella formula che proponi. L’obiettivo resta 2.440 kcal.

BMR + BMR(PAL - 1) = BMR(1 + PAL- 1) = BMR * PAL

Acqua_layout commit
Cosa è cambiato

Obiettivi: al posto di “Fabbisogno” c’è Acqua. Mostra una tabella con acqua consigliata e numero di bicchieri per ogni tipo di giornata. Sotto ci sono le tue misure: quanti ml è il tuo bicchiere (default 200) e la tua borraccia (default 500).
Oggi → Acqua: una nuova sezione con la quantità consigliata di oggi, che segue la giornata che hai scelto. Ogni volta che bevi scegli Bicchiere, Borraccia o All’occhio e indichi quanti. Per “All’occhio” scrivi i ml o scegli una scorciatoia: un sorso (50), qualche sorso (150), una bella bevuta (300), tanta (500). Le bevute sono in elenco e puoi cancellarle. L’acqua compare anche nel Riepilogo, accanto ai macro.
Altri valori di oggi: ogni valore mostra quanto hai assunto e il riferimento giornaliero, per esempio “Calcio 240 / 950 mg”, con una barra. Per zuccheri, grassi saturi, sale e sodio il riferimento è un massimo (“1 / max 5 g”). I valori senza riferimento, come quelli che inventi tu, restano senza barra. Il riferimento cambia in base a sesso e calorie del giorno, ma non all’età.

Da sapere

I riferimenti vengono dalle tabelle LARN. I valori delle vitamine sono quelli che ho letto nelle tabelle IEO Smartfood, che riportano i LARN. La lettura del PDF era un po’ confusa per alcune voci, per esempio riboflavina, B12 e potassio, quindi considerali indicativi.
Fibre (25 g) e il tetto del sodio (2 g) li ho presi da quanto ricordavo dei LARN, senza ritrovarli nelle tabelle.
L’acqua è una stima mia: circa 30 ml per kg di peso, più 400, 600 o 800 ml per ogni ora di sport secondo l’intensità. Per te a 70 kg viene 2,1 L a riposo e 3,3 L con piscina e pesi. Non l’ho trovata in una fonte, quindi è un’indicazione di massima.
I riferimenti si riconoscono dal nome. Con “Calcio”, “Vitamina C” o “Fibre” funziona, e anche con alcuni sinonimi come “Folati” o “Tiamina”. Con un nome strano il valore si vede ma senza riferimento.