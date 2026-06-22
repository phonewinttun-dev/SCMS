import 'package:flutter_test/flutter_test.dart';

import 'support/pump_app.dart';

void main() {
  testWidgets('shows login screen when no session is restored', (tester) async {
    await pumpScmsApp(tester);

    await tester.pumpAndSettle();

    expect(find.text('Smart Clinic Management'), findsOneWidget);
    expect(find.textContaining('Sign in to continue'), findsOneWidget);
  });

  testWidgets('shows patient shell destinations for patient role', (tester) async {
    await pumpShell(tester, role: 'user');
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Billing'), findsOneWidget);
    expect(find.text('Medicines'), findsNothing);
  });

  testWidgets('shows staff shell destinations for doctor role', (tester) async {
    await pumpShell(tester, role: 'doctor');
    await tester.pumpAndSettle();

    expect(find.text('Dashboard'), findsAtLeastNWidgets(1));
    expect(find.text('Medicines'), findsOneWidget);
    expect(find.text('Diseases'), findsOneWidget);
  });
}
