import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

enum ConnectionMode { online, offline, checking }

class ConnectivityService {
  ConnectivityService() {
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      _updateFromResults(results);
    });
  }

  final _controller = StreamController<ConnectionMode>.broadcast();
  late final StreamSubscription<List<ConnectivityResult>> _subscription;
  ConnectionMode _mode = ConnectionMode.checking;

  Stream<ConnectionMode> get stream => _controller.stream;
  ConnectionMode get mode => _mode;

  Future<ConnectionMode> refresh() async {
    final results = await Connectivity().checkConnectivity();
    return _updateFromResults(results);
  }

  ConnectionMode _updateFromResults(List<ConnectivityResult> results) {
    final hasNetwork = results.any((result) => result != ConnectivityResult.none);
    _mode = hasNetwork ? ConnectionMode.online : ConnectionMode.offline;
    _controller.add(_mode);
    return _mode;
  }

  void dispose() {
    _subscription.cancel();
    _controller.close();
  }
}
