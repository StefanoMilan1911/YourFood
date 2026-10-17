/* Alimenti comuni, valori ogni 100 g (o 100 ml) di parte edibile.
   Riga: [parte, cottura, kcal, proteine, carboidrati, grassi, fibre, flag]
   flag 's' = valore STIMATO da me (friggitrice ad aria, olio aggiunto, impanature): controllalo.
   Gli altri valori sono quelli che ricordo dalle tabelle USDA e CREA: vanno comunque verificati. */
const COMMON=[];
(function(){
const C='Carne',P='Pesce',U='Uova e latticini',G='Cereali e patate',L='Legumi',V='Verdure',R='Frutta',A='Altro';
const cr='crudo',pia='alla piastra',fo='al forno',bo='bollito',ar='in friggitrice ad aria',pa='in padella con olio',fr='fritto impanato',ct='cotto';
function F(n,cat,un,rows,tip){COMMON.push({id:'c'+COMMON.length,n,cat,un,tip:tip||'',v:rows.map(r=>({cut:r[0],how:r[1],k:r[2],p:r[3],c:r[4],f:r[5],fib:r[6]||0,est:r[7]==='s'}))});}
/* Carne */
F('Pollo',C,'g',[
 ['petto, senza pelle',cr,120,22.5,0,2.6],['petto, senza pelle',pia,165,31,0,3.6],['petto, senza pelle',fo,160,30,0,3.5],['petto, senza pelle',bo,151,29,0,3.2],
 ['petto, senza pelle',ar,170,32,0,3.8,0,'s'],['petto, senza pelle',pa,190,30,0,7.5,0,'s'],['petto, senza pelle',fr,255,27,9,12,0,'s'],
 ['coscia, senza pelle',cr,121,19.7,0,4.1],['coscia, senza pelle',fo,179,24.8,0,8.2],['coscia, senza pelle',pia,185,25,0,9,0,'s'],['coscia, senza pelle',ar,190,25,0,9.5,0,'s'],['coscia, senza pelle',fr,270,22,10,16,0,'s'],
 ['coscia, con pelle',cr,211,16.7,0,15.3],['coscia, con pelle',fo,225,24,0,14],['coscia, con pelle',ar,235,24,0,15,0,'s'],
 ['fuso (parte bassa della zampa), senza pelle',cr,116,20,0,3.6],['fuso (parte bassa della zampa), senza pelle',fo,155,24.2,0,5.7],
 ['fuso (parte bassa della zampa), con pelle',fo,190,24,0,9.5],['fuso (parte bassa della zampa), con pelle',ar,200,24,0,10.5,0,'s'],['fuso (parte bassa della zampa), con pelle',fr,260,20,10,15,0,'s'],
 ['ali, con pelle',cr,191,17.5,0,13],['ali, con pelle',fo,250,26,0,16],['ali, con pelle',ar,260,26,0,17,0,'s'],['ali, con pelle',fr,320,24,10,20,0,'s']
],'Peso a crudo e peso a cotto sono diversi: scegli la riga che corrisponde a come pesi.');
F('Tacchino, petto',C,'g',[['',cr,105,24,0,1],['',pia,135,30,0,1.5],['',fo,135,30,0,1],['',ar,140,31,0,1.5,0,'s'],['',fr,230,24,9,11,0,'s']]);
F('Manzo',C,'g',[
 ['fesa (magro)',cr,120,21.5,0,3.5],['fesa (magro)',pia,170,29,0,5.5],
 ['controfiletto',cr,160,21,0,8],['controfiletto',pia,215,29,0,10.5],
 ['macinato magro',cr,175,20,0,10],['macinato magro',pa,220,26,0,12.5]]);
F('Maiale, lonza',C,'g',[['',cr,140,21,0,6],['',pia,190,29,0,7.5]]);
F('Salumi',C,'g',[['bresaola','',150,32,0,2],['prosciutto crudo','',270,27,0,18],['prosciutto cotto','',215,19,0.5,15]]);
/* Pesce */
F('Salmone',P,'g',[['',cr,208,20,0,13],['',fo,206,22,0,12.4],['',pia,215,23,0,13],['',ar,215,23,0,13,0,'s'],['',pa,245,22,0,17,0,'s']]);
F('Tonno',P,'g',[['fresco',cr,110,24,0,1],['fresco',pia,140,29,0,1.5],['in scatola al naturale (sgocciolato)','',103,23,0,1],['sott\'olio (sgocciolato)','',190,26,0,9]]);
F('Merluzzo',P,'g',[['',cr,82,18,0,0.7],['',fo,105,23,0,0.9],['',bo,90,20,0,0.8],['',fr,200,16,11,10,0,'s']]);
F('Orata',P,'g',[['',cr,100,19,0,2.5],['',fo,125,23,0,3.5],['',pia,125,23,0,3.5]]);
F('Gamberi',P,'g',[['',cr,85,18,0.5,1],['',ct,99,24,0.2,0.3]]);
/* Uova e latticini */
F('Uovo',U,'g',[['intero',cr,143,12.6,0.7,9.5],['intero',bo,155,13,1.1,10.6],['intero',pa,196,13.6,0.8,14.8,0,'s'],['albume',cr,52,11,0.7,0.2],['tuorlo',cr,322,16,3.6,27]],'Un uovo medio senza guscio pesa circa 50 g.');
F('Yogurt greco',U,'g',[['0% grassi','',59,10,3.6,0.4],['intero','',97,9,4,5]]);
F('Yogurt bianco',U,'g',[['magro','',40,4,5.5,0.2],['intero','',61,3.8,4.7,3.2]]);
F('Skyr',U,'g',[['','',63,11,4,0.2]]);
F('Latte',U,'ml',[['intero','',64,3.3,4.8,3.6],['parzialmente scremato','',46,3.4,5,1.6],['scremato','',35,3.4,5,0.1]]);
F('Ricotta vaccina',U,'g',[['','',146,8.8,3.5,10.9]]);
F('Fiocchi di latte',U,'g',[['','',98,11,3.4,4.3]]);
F('Mozzarella',U,'g',[['','',253,18,0.5,19.5]]);
F('Parmigiano',U,'g',[['','',387,33.5,0,28]]);
/* Cereali e patate */
F('Riso bianco',G,'g',[['',cr,360,7,79,0.6,1],['',bo,130,2.7,28,0.3,0.4]],'Crudo: peso da secco. Bollito: peso dopo la cottura (circa 2,5 volte il crudo).');
F('Riso integrale',G,'g',[['',cr,350,7.5,74,2.5,3.5],['',bo,123,2.7,25.6,1,1.6]]);
F('Pasta di semola',G,'g',[['',cr,350,12,72,1.5,3],['',bo,158,5.8,31,0.9,1.8]],'Crudo: peso da secca. Bollita: peso dopo la cottura (circa 2,2 volte la secca).');
F('Pasta integrale',G,'g',[['',cr,340,13,66,2.5,8],['',bo,150,6,29,1,4.5]]);
F('Patata',G,'g',[['',cr,77,2,17,0.1,2.2],['',bo,87,1.9,20,0.1,1.8],['',fo,93,2.5,21,0.1,2.2],['',ar,130,2.8,24,3,2.2,'s'],['',fr,312,3.4,41,15,3.8]]);
F('Patata dolce',G,'g',[['',cr,86,1.6,20,0.1,3],['',bo,76,1.4,18,0.1,2.5],['',fo,90,2,21,0.2,3.3],['',ar,125,2,24,3,3.3,'s']]);
F('Pane',G,'g',[['bianco','',265,9,49,3.2,2.7],['integrale','',235,9.5,42,3,6]]);
F('Fiocchi d\'avena',G,'g',[['',cr,370,13,60,7,10],['',ct,70,2.5,12,1.5,1.7]],'Cotti: in acqua, senza latte né zucchero.');
/* Legumi */
F('Ceci',L,'g',[['secchi','',364,19,61,6,17],['cotti','',164,8.9,27,2.6,7.6],['in scatola (sgocciolati)','',120,7,18,2.5,5]]);
F('Lenticchie',L,'g',[['secche','',352,25,60,1.1,11],['cotte','',116,9,20,0.4,7.9]]);
F('Fagioli',L,'g',[['cotti','',127,8.7,23,0.5,6.4],['in scatola (sgocciolati)','',90,6,14,0.5,5.5]]);
F('Tofu',L,'g',[['','',76,8,1.9,4.8,0.3]]);
F('Tempeh',L,'g',[['','',192,20,7.6,11,0]]);
/* Verdure */
F('Broccoli',V,'g',[['',cr,34,2.8,7,0.4,2.6],['',ct,35,2.4,7.2,0.4,3.3]]);
F('Zucchine',V,'g',[['',cr,17,1.2,3.1,0.3,1],['',ct,20,1.2,3.5,0.4,1],['',pa,60,1.3,3,4.5,1,'s']]);
F('Spinaci',V,'g',[['',cr,23,2.9,3.6,0.4,2.2],['',ct,23,3,3.8,0.3,2.4]]);
F('Carote',V,'g',[['',cr,41,0.9,9.6,0.2,2.8],['',ct,35,0.8,8.2,0.2,3]]);
F('Pomodori',V,'g',[['','',18,0.9,3.9,0.2,1.2]]);
F('Insalata',V,'g',[['','',15,1.4,2.9,0.2,1.3]]);
F('Funghi champignon',V,'g',[['',cr,22,3.1,3.3,0.3,1]]);
F('Peperoni',V,'g',[['',cr,31,1,6,0.3,2.1]]);
/* Frutta */
F('Banana',R,'g',[['','',89,1.1,22.8,0.3,2.6]],'Peso della parte edibile, senza buccia.');
F('Mela',R,'g',[['','',52,0.3,13.8,0.2,2.4]]);
F('Pera',R,'g',[['','',57,0.4,15,0.1,3.1]]);
F('Arancia',R,'g',[['','',47,0.9,11.8,0.1,2.4]]);
F('Uva',R,'g',[['','',69,0.7,18,0.2,0.9]]);
F('Fragole',R,'g',[['','',32,0.7,7.7,0.3,2]]);
F('Mirtilli',R,'g',[['','',57,0.7,14.5,0.3,2.4]]);
F('Avocado',R,'g',[['','',160,2,8.5,14.7,6.7]]);
/* Altro */
F('Mandorle',A,'g',[['','',579,21,22,50,12]]);
F('Noci',A,'g',[['','',654,15,14,65,6.7]]);
F('Arachidi',A,'g',[['','',567,26,16,49,8.5]]);
F('Burro di arachidi',A,'g',[['','',588,25,20,50,6]]);
F('Olio extravergine d\'oliva',A,'g',[['','',900,0,0,100,0]],'Un cucchiaio sono circa 13 g.');
F('Cioccolato fondente 70%',A,'g',[['','',598,7.8,46,43,11]]);
F('Miele',A,'g',[['','',304,0.3,82,0,0]]);
F('Proteine in polvere (whey)',A,'g',[['valori tipici','',380,80,6,5,0,'s']],'Cambia molto da marca a marca: meglio usare l\'etichetta del tuo barattolo.');
})();
const COMMON_CATS=['Carne','Pesce','Uova e latticini','Cereali e patate','Legumi','Verdure','Frutta','Altro'];
