import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/payment_receipt.dart';
import 'receipt_builder.dart';

class PrinterDevice {
  const PrinterDevice({required this.name, required this.macAddress});

  final String name;
  final String macAddress;
}

class PrinterService {
  PrinterService._();
  static final PrinterService instance = PrinterService._();

  static const _macKey = 'pt210_printer_mac';
  static const _nameKey = 'pt210_printer_name';

  String? _savedMac;
  String? _savedName;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _savedMac = prefs.getString(_macKey);
    _savedName = prefs.getString(_nameKey);
  }

  PrinterDevice? get savedDevice {
    if (_savedMac == null || _savedMac!.isEmpty) return null;
    return PrinterDevice(
      name: _savedName ?? 'PT210 Printer',
      macAddress: _savedMac!,
    );
  }

  Future<bool> isBluetoothEnabled() => PrintBluetoothThermal.bluetoothEnabled;

  Future<List<PrinterDevice>> getPairedDevices() async {
    final list = await PrintBluetoothThermal.pairedBluetooths;
    return list
        .map(
          (item) => PrinterDevice(
            name: item.name,
            macAddress: item.macAdress,
          ),
        )
        .toList();
  }

  Future<void> saveDevice(PrinterDevice device) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_macKey, device.macAddress);
    await prefs.setString(_nameKey, device.name);
    _savedMac = device.macAddress;
    _savedName = device.name;
  }

  Future<void> clearDevice() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_macKey);
    await prefs.remove(_nameKey);
    _savedMac = null;
    _savedName = null;
  }

  Future<bool> isConnected() => PrintBluetoothThermal.connectionStatus;

  Future<void> connect(PrinterDevice device) async {
    final enabled = await isBluetoothEnabled();
    if (!enabled) {
      throw Exception('Bluetooth is turned off. Enable Bluetooth to use PT210.');
    }

    if (await isConnected()) {
      return;
    }

    final connected = await PrintBluetoothThermal.connect(
      macPrinterAddress: device.macAddress,
    );

    if (!connected) {
      throw Exception(
        'Could not connect to ${device.name}. Pair PT210 in Android settings first.',
      );
    }
  }

  Future<void> printReceipt(PaymentReceipt receipt, {PrinterDevice? device}) async {
    final target = device ?? savedDevice;
    if (target == null) {
      throw Exception(
        'No PT210 printer selected. Open Printer settings and choose your device.',
      );
    }

    await connect(target);
    final bytes = await ReceiptBuilder.buildEscPosBytes(receipt);
    final success = await PrintBluetoothThermal.writeBytes(bytes);
    if (!success) {
      throw Exception('Print failed. Check PT210 paper and Bluetooth connection.');
    }
  }
}
