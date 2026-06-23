import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pumps frames until [finder] matches or [timeout] elapses.
///
/// Prefer this over [WidgetTester.pumpAndSettle] after login — the loading
/// spinner animates forever and would hang [pumpAndSettle].
Future<void> pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  Duration step = const Duration(milliseconds: 250),
  Duration timeout = const Duration(seconds: 30),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(step);
    if (finder.evaluate().isNotEmpty) {
      return;
    }
  }
  fail('Timed out after ${timeout.inSeconds}s waiting for $finder');
}
