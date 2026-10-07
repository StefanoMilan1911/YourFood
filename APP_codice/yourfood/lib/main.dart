import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// YourFood: l'app web (assets/web) dentro una WebView.
///
/// Salvataggio dati, a due livelli:
/// 1. la pagina salva nel localStorage della WebView (come nel browser);
/// 2. ogni salvataggio viene copiato anche qui, in SharedPreferences,
///    tramite il canale JavaScript "YourFoodNative".
/// Se il localStorage risulta vuoto all'avvio, la copia nativa viene rimessa
/// nella pagina con window.yourfoodRestore().

const Color kBackground = Color(0xFFECF2F2);
const String kPrefsKey = 'yourfood_state_v1';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: kBackground,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  final prefs = await SharedPreferences.getInstance();
  runApp(YourFoodApp(prefs: prefs));
}

class YourFoodApp extends StatelessWidget {
  const YourFoodApp({super.key, required this.prefs});

  final SharedPreferences prefs;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YourFood',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF0A7C85),
        useMaterial3: true,
      ),
      home: WebShell(prefs: prefs),
    );
  }
}

class WebShell extends StatefulWidget {
  const WebShell({super.key, required this.prefs});

  final SharedPreferences prefs;

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(kBackground)
      // La pagina chiama YourFoodNative.postMessage(json) a ogni salvataggio.
      ..addJavaScriptChannel(
        'YourFoodNative',
        onMessageReceived: (JavaScriptMessage message) {
          widget.prefs.setString(kPrefsKey, message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(onPageFinished: (_) => _restoreIfNeeded()),
      )
      ..loadFlutterAsset('assets/web/index.html');
  }

  /// Rimette nella pagina i dati salvati nativamente.
  /// La pagina li usa solo se il suo localStorage e' vuoto.
  Future<void> _restoreIfNeeded() async {
    final saved = widget.prefs.getString(kPrefsKey);
    if (saved == null || saved.isEmpty) return;
    await _controller.runJavaScript(
      'window.yourfoodRestore && window.yourfoodRestore(${jsonEncode(saved)});',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackground,
      body: SafeArea(child: WebViewWidget(controller: _controller)),
    );
  }
}