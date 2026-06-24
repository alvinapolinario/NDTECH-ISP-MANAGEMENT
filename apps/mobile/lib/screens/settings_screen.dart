import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../models/auth_qr_payload.dart';
import '../providers/collector_app_state.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import '../utils/receipt_factory.dart';
import '../widgets/receipt_preview_card.dart';
import '../widgets/template_widgets.dart';
import 'auth_qr_scan_screen.dart';
import 'printer_settings_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, this.requiredSetup = false});

  final bool requiredSetup;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _apiUrlController = TextEditingController();
  final _authTokenController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _loading = true;
  bool _saving = false;
  bool _testing = false;
  bool _testPrinting = false;
  bool _obscureToken = true;
  String? _testMessage;
  bool? _testSuccess;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _apiUrlController.dispose();
    _authTokenController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final state = context.read<CollectorAppState>();
    await state.loadSettings();
    await PrinterService.instance.init();

    final savedToken = await state.readAuthToken();
    _apiUrlController.text = state.settings.apiBaseUrl;
    _authTokenController.text = savedToken ?? '';

    if (mounted) setState(() => _loading = false);
  }

  Future<void> _scanQrCode() async {
    final payload = await Navigator.of(context).push<AuthQrPayload>(
      MaterialPageRoute(builder: (_) => const AuthQrScanScreen()),
    );

    if (payload == null || !mounted) return;

    setState(() {
      _apiUrlController.text = payload.apiBaseUrl;
      _authTokenController.text = payload.authToken;
      _testMessage = null;
      _testSuccess = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('QR scanned. Review settings and tap Save.'),
        backgroundColor: AppColors.emerald,
      ),
    );
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _testing = true;
      _testMessage = null;
      _testSuccess = null;
    });

    final state = context.read<CollectorAppState>();
    final result = await state.testConnection(
      apiBaseUrl: _apiUrlController.text,
      authToken: _authTokenController.text,
    );

    if (!mounted) return;
    setState(() {
      _testing = false;
      _testSuccess = result.success;
      _testMessage = result.userName == null
          ? result.message
          : '${result.message}\nAuthenticated as ${result.userName}';
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    final state = context.read<CollectorAppState>();

    try {
      await state.saveSettings(
        apiBaseUrl: _apiUrlController.text,
        authToken: _authTokenController.text,
      );

      if (!mounted) return;

      if (widget.requiredSetup) {
        await state.bootstrap();
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Settings saved'),
          backgroundColor: AppColors.emerald,
        ),
      );

      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(caught.toString()),
          backgroundColor: AppColors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset settings?'),
        content: const Text(
          'This restores the default API URL and clears the saved auth token.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Reset')),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final state = context.read<CollectorAppState>();
    await state.resetSettings();
    await _load();

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings reset to default')),
    );
  }

  Future<void> _testPrintReceipt() async {
    setState(() => _testPrinting = true);

    final state = context.read<CollectorAppState>();
    final receipt = buildTestPaymentReceipt(
      collectorName: state.user?.name ?? 'Test Collector',
    );

    try {
      await PrinterService.instance.printReceipt(receipt);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Test receipt sent to PT210'),
          backgroundColor: AppColors.emerald,
        ),
      );
    } catch (caught) {
      if (!mounted) return;
      final message = caught.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppColors.red,
          action: message.contains('No PT210')
              ? SnackBarAction(
                  label: 'Setup',
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
                  ),
                )
              : null,
        ),
      );
    } finally {
      if (mounted) setState(() => _testPrinting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final state = context.watch<CollectorAppState>();
    final testReceipt = buildTestPaymentReceipt(
      collectorName: state.user?.name ?? 'Test Collector',
    );
    final savedPrinter = PrinterService.instance.savedDevice;

    return PopScope(
      canPop: !widget.requiredSetup,
      child: Scaffold(
        appBar: widget.requiredSetup
            ? null
            : AppBar(
                title: const Text('Settings'),
                automaticallyImplyLeading: true,
              ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.requiredSetup) ...[
              const SizedBox(height: 24),
              const Center(child: NdtechLogo(size: 112)),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  'NDTECH Collector',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.violetDark,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Connect this device to your office',
                  style: TextStyle(color: AppColors.slate500, fontSize: 14),
                ),
              ),
              const SizedBox(height: 24),
              Card(
                color: AppColors.violet.withValues(alpha: 0.06),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Set up this device',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Scan the QR code from your admin, or enter the API URL and auth token manually.',
                        style: TextStyle(color: AppColors.slate500, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _scanQrCode,
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Scan setup QR'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'API URL',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _apiUrlController,
                            keyboardType: TextInputType.url,
                            decoration: const InputDecoration(
                              labelText: 'API base URL',
                              hintText: 'http://192.168.1.10:4000',
                              helperText: 'No trailing slash',
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'API URL is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Auth token',
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                              ),
                              if (!widget.requiredSetup)
                                TextButton.icon(
                                  onPressed: _scanQrCode,
                                  icon: const Icon(Icons.qr_code_scanner, size: 18),
                                  label: const Text('Scan QR'),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _authTokenController,
                            obscureText: _obscureToken,
                            decoration: InputDecoration(
                              labelText: 'Bearer token',
                              hintText: 'ndt_…',
                              helperText: 'Sent as Authorization: Bearer <token>',
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureToken
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined,
                                ),
                                onPressed: () => setState(() => _obscureToken = !_obscureToken),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Auth token is required';
                              }
                              return null;
                            },
                          ),
                          if (_testMessage != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: _testSuccess == true
                                    ? AppColors.emeraldLight
                                    : AppColors.redLight,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                _testMessage!,
                                style: TextStyle(
                                  color: _testSuccess == true ? AppColors.emerald : AppColors.red,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: _testing ? null : _testConnection,
                            icon: _testing
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.wifi_tethering),
                            label: Text(_testing ? 'Testing…' : 'Test connection'),
                          ),
                          const SizedBox(height: 10),
                          FilledButton(
                            onPressed: _saving ? null : _save,
                            child: _saving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Text(widget.requiredSetup ? 'Save and continue' : 'Save settings'),
                          ),
                          if (!widget.requiredSetup) ...[
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _reset,
                              child: Text('Reset to default (${AppConfig.defaultApiBaseUrl})'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.print_outlined, color: AppColors.violet),
                title: const Text('PT210 Bluetooth printer'),
                subtitle: Text(
                  savedPrinter == null
                      ? 'Pair and select your receipt printer'
                      : 'Saved: ${savedPrinter.name}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
                  );
                  await PrinterService.instance.init();
                  if (mounted) setState(() {});
                },
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Test receipt print',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Preview matches the PT210 layout used after payment collection. '
                      'Use this to verify paper, alignment, and Bluetooth before going on route.',
                      style: TextStyle(color: AppColors.slate500, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    ReceiptPreviewCard(receipt: testReceipt),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _testPrinting ? null : _testPrintReceipt,
                      icon: _testPrinting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.receipt_long),
                      label: Text(_testPrinting ? 'Printing…' : 'Print test receipt'),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
                        );
                        await PrinterService.instance.init();
                        if (mounted) setState(() {});
                      },
                      icon: const Icon(Icons.bluetooth),
                      label: const Text('Printer settings'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
