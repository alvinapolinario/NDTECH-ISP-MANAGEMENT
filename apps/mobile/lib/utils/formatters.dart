import 'package:intl/intl.dart';

final currencyFormat = NumberFormat.currency(locale: 'en_PH', symbol: 'PHP ');

String formatMoney(num value) => currencyFormat.format(value);

String formatDate(String? value) {
  if (value == null || value.isEmpty) return '—';
  try {
    return DateFormat('MMM d, yyyy').format(DateTime.parse(value));
  } catch (_) {
    return value;
  }
}

String formatLongDate(DateTime date) {
  return DateFormat('EEEE, MMMM d, yyyy').format(date);
}

String formatDateTime(DateTime date) {
  return DateFormat('MMM d, yyyy h:mm a').format(date);
}

String titleCase(String value) {
  return value
      .replaceAll('_', ' ')
      .split(' ')
      .map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}
