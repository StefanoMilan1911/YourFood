# YourFood: progetto Flutter per l'APK

L'app web (HTML, CSS, JS) gira dentro una WebView. Flutter fa solo da contenitore e da salvataggio nativo.

```
yourfood_flutter/
  lib/main.dart          codice Flutter
  assets/web/index.html  struttura della pagina
  assets/web/style.css   grafica
  assets/web/app.js      logica, calcoli, salvataggio
```

## Passi

1. Crea un progetto vuoto (solo Android) e entraci:

   ```
   flutter create --platforms=android --org com.stefano yourfood
   cd yourfood
   ```

2. Aggiungi le due librerie:

   ```
   flutter pub add webview_flutter shared_preferences
   ```

3. Sostituisci `lib/main.dart` con quello di questa cartella e copia dentro il progetto la cartella `assets/web/` (con i 3 file).

4. In `pubspec.yaml`, sotto la riga `flutter:` (con questi spazi davanti), aggiungi:

   ```yaml
   flutter:
     uses-material-design: true
     assets:
       - assets/web/
   ```

5. In `android/app/src/main/AndroidManifest.xml`, subito sopra `<application`, aggiungi il permesso internet. Serve solo per i font Google. Senza, l'app funziona lo stesso con un font di sistema.

   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   ```

   Nella stessa riga `<application` puoi cambiare `android:label="yourfood"` in `android:label="YourFood"`, che è il nome sotto l'icona.

6. Prova sul telefono collegato col cavo, poi crea l'APK:

   ```
   flutter run
   flutter build apk --release
   ```

   L'APK è in `build/app/outputs/flutter-apk/app-release.apk`. Copialo sul telefono e installalo. Android ti chiederà di permettere l'installazione da fonti sconosciute.

## Salvataggio dei dati

- La pagina salva nel localStorage della WebView, sul telefono.
- Ogni salvataggio viene copiato anche in SharedPreferences da `lib/main.dart`. Se la WebView perde i suoi dati, all'avvio la pagina li recupera da lì.
- I dati restano sul telefono. Non c'è sincronizzazione con altri dispositivi.
- Se disinstalli l'app o fai "Cancella dati" dalle impostazioni Android, si perde tutto. Il backup di Android può a volte ripristinarli, ma non è garantito.

## Dove modificare le cose

- Alimenti: lista `FOODS` in `assets/web/app.js`.
- Formule: funzione `calc` e tabella `MET` in `assets/web/app.js`.
- Colori e font: `assets/web/style.css`, blocchi `:root` all'inizio.
- Dopo ogni modifica ai file in `assets/web/` rilancia `flutter run` o rifai la build.
