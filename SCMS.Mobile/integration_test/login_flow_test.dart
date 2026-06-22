import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:scms_mobile/src/app/bootstrap.dart';

import 'support/test_config.dart';

Future<void> launchFunctionalApp(WidgetTester tester) async {
  await bootstrap(config: functionalTestConfig);
  await tester.pumpAndSettle(const Duration(seconds: 3));
}

Future<void> signInAsPatient(WidgetTester tester) async {
  await tester.enterText(
    find.byKey(const Key('login_email_field')),
    demoPatientEmail,
  );
  await tester.enterText(
    find.byKey(const Key('login_password_field')),
    demoPatientPassword,
  );
  await tester.tap(find.byKey(const Key('login_submit_button')));
  await tester.pumpAndSettle(const Duration(seconds: 5));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('patient can sign in and reach the home dashboard', (tester) async {
    await launchFunctionalApp(tester);

    expect(find.text('Smart Clinic Management'), findsOneWidget);
    await signInAsPatient(tester);

    expect(find.text('Home'), findsWidgets);
    expect(find.text('Billing'), findsWidgets);
    expect(find.text('Medicines'), findsNothing);
  });
}
