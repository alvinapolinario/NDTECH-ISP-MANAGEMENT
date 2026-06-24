import 'package:flutter/material.dart';

import '../services/printer_service.dart';
import '../theme/app_theme.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  final _printer = PrinterService.instance;
  List<PrinterDevice> _devices = [];
  bool _loading = true;
  bool _connected = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await _printer.init();
      final enabled = await _printer.isBluetoothEnabled();
      if (!enabled) {
        setState(() {
          _devices = [];
          _connected = false;
          _error = 'Turn on Bluetooth, then pair your PT210 in Android settings.';
        });
        return;
      }

      _devices = await _printer.getPairedDevices();
      _connected = await _printer.isConnected();
    } catch (caught) {
      _error = caught.toString().replaceFirst('Exception: ', '');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectDevice(PrinterDevice device) async {
    try {
      await _printer.saveDevice(device);
      await _printer.connect(device);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('PT210 ready: ${device.name}'),
          backgroundColor: AppColors.emerald,
        ),
      );
      await _load();
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught.toString()), backgroundColor: AppColors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final saved = _printer.savedDevice;

    return Scaffold(
      appBar: AppBar(
        title: const Text('PT210 Printer'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bluetooth thermal printer',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Pair your PT210 once in Android Bluetooth settings, then select it here. '
                    'Receipts print on 58mm paper using ESC/POS.',
                    style: TextStyle(color: AppColors.slate500, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  _InfoLine('Saved printer', saved?.name ?? 'Not selected'),
                  _InfoLine('MAC address', saved?.macAddress ?? '—'),
                  _InfoLine('Connection', _connected ? 'Connected' : 'Not connected'),
                ],
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.red)),
          ],
          const SizedBox(height: 16),
          const Text(
            'Paired devices',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          const SizedBox(height: 8),
          if (_loading)
            const Center(child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ))
          else if (_devices.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'No paired Bluetooth printers found. Pair PT210 in phone settings, then tap refresh.',
                style: TextStyle(color: AppColors.slate500),
              ),
            )
          else
            ..._devices.map(
              (device) => Card(
                child: ListTile(
                  leading: const Icon(Icons.print_outlined, color: AppColors.violet),
                  title: Text(device.name),
                  subtitle: Text(device.macAddress),
                  trailing: saved?.macAddress == device.macAddress
                      ? const Icon(Icons.check_circle, color: AppColors.emerald)
                      : null,
                  onTap: () => _selectDevice(device),
                ),
              ),
            ),
          if (saved != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                await _printer.clearDevice();
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Saved printer cleared')),
                );
                await _load();
              },
              child: const Text('Clear saved printer'),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.slate500)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
