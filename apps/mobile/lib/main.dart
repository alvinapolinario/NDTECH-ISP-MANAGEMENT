import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import 'config/app_config.dart';
import 'providers/collector_app_state.dart';
import 'screens/main_shell.dart';
import 'screens/permissions_gate_screen.dart';
import 'screens/settings_screen.dart';
import 'services/api_service.dart';
import 'services/app_settings_service.dart';
import 'services/connectivity_service.dart';
import 'services/local_database.dart';
import 'services/permissions_service.dart';
import 'services/printer_service.dart';
import 'theme/app_theme.dart';
import 'widgets/template_widgets.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const CollectorApp());
}

class CollectorApp extends StatefulWidget {
  const CollectorApp({super.key});

  @override
  State<CollectorApp> createState() => _CollectorAppState();
}

class _CollectorAppState extends State<CollectorApp> {
  late final FlutterSecureStorage _storage;
  late final AppSettingsService _settings;
  late final ApiService _api;
  late final ConnectivityService _connectivity;
  late final CollectorAppState _appState;

  @override
  void initState() {
    super.initState();
    _storage = const FlutterSecureStorage();
    _settings = AppSettingsService(_storage);
    _api = ApiService(_storage, _settings);
    _connectivity = ConnectivityService();
    _appState = CollectorAppState(
      api: _api,
      settings: _settings,
      db: LocalDatabase.instance,
      connectivity: _connectivity,
    )..bootstrap();
    PrinterService.instance.init();
  }

  @override
  void dispose() {
    _connectivity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _appState,
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        home: const _RootGate(),
      ),
    );
  }
}

class _RootGate extends StatefulWidget {
  const _RootGate();

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  bool _checkingPermissions = true;
  bool _permissionsGranted = false;
  bool _skippedPermissions = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final granted = await PermissionsService.allGranted();
    if (!mounted) return;
    setState(() {
      _checkingPermissions = false;
      _permissionsGranted = granted;
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<CollectorAppState>();

    if (state.bootstrapping || _checkingPermissions) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              NdtechLogo(size: 96),
              SizedBox(height: 24),
              CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    if (!_permissionsGranted && !_skippedPermissions) {
      return PermissionsGateScreen(
        onGranted: () => setState(() => _permissionsGranted = true),
        onContinueAnyway: () => setState(() => _skippedPermissions = true),
      );
    }

    if (state.user == null) {
      return const SettingsScreen(requiredSetup: true);
    }

    return const MainShell();
  }
}
