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