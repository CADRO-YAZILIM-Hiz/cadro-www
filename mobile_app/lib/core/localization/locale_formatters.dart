import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

const _arabicIndicDigits = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

bool isArabicLocale(BuildContext context) {
  return Localizations.localeOf(context).languageCode == 'ar';
}

String localizeDigits(BuildContext context, Object? value) {
  final text = value?.toString() ?? '';
  if (text.isEmpty || !isArabicLocale(context)) return text;
  return text
      .split('')
      .map((char) => _arabicIndicDigits[char] ?? char)
      .join();
}

String formatLocalizedNumber(
  BuildContext context,
  Object? value, {
  int? decimalDigits,
}) {
  final raw = value?.toString() ?? '0';
  final number = num.tryParse(raw);
  if (number == null) return localizeDigits(context, raw);
  final localeTag = Localizations.localeOf(context).toLanguageTag();
  final formatter = decimalDigits == null
      ? NumberFormat.decimalPattern(localeTag)
      : NumberFormat.decimalPatternDigits(
          locale: localeTag,
          decimalDigits: decimalDigits,
        );
  return localizeDigits(context, formatter.format(number));
}

String formatLocalizedDate(
  BuildContext context,
  DateTime value, {
  String pattern = 'dd MMM yyyy',
}) {
  final locale = Localizations.localeOf(context).languageCode;
  return localizeDigits(
    context,
    DateFormat(pattern, locale).format(value.toLocal()),
  );
}

String formatLocalizedDateFromRaw(
  BuildContext context,
  String? raw, {
  String pattern = 'dd MMM yyyy',
  String fallback = '-',
}) {
  if (raw == null || raw.isEmpty) return fallback;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return localizeDigits(context, raw);
  return formatLocalizedDate(context, parsed, pattern: pattern);
}

