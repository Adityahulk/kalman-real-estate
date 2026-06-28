import 'package:intl/intl.dart';

final _money = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final _date = DateFormat('dd-MM-yyyy');

String money(num value) => _money.format(value);

String shortDate(DateTime value) => _date.format(value);

String amountInWords(int amount) {
  if (amount == 0) return 'Zero rupees only';
  final units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  final tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  String underHundred(int n) {
    if (n < 20) return units[n];
    final rest = n % 10;
    return '${tens[n ~/ 10]}${rest == 0 ? '' : ' ${units[rest]}'}';
  }

  String underThousand(int n) {
    final hundred = n ~/ 100;
    final rest = n % 100;
    if (hundred == 0) return underHundred(rest);
    return '${units[hundred]} Hundred${rest == 0 ? '' : ' ${underHundred(rest)}'}';
  }

  final parts = <String>[];
  var remaining = amount;
  final crore = remaining ~/ 10000000;
  remaining %= 10000000;
  final lakh = remaining ~/ 100000;
  remaining %= 100000;
  final thousand = remaining ~/ 1000;
  remaining %= 1000;

  if (crore > 0) parts.add('${underThousand(crore)} Crore');
  if (lakh > 0) parts.add('${underThousand(lakh)} Lakh');
  if (thousand > 0) parts.add('${underThousand(thousand)} Thousand');
  if (remaining > 0) parts.add(underThousand(remaining));
  return '${parts.join(' ')} rupees only';
}
