import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:scms_mobile/src/app/bootstrap.dart';

import 'support/test_config.dart';

Future<void> signIn(
  WidgetTester tester, {
  required String email,
  required String password,
}) async {
  await tester.enterText(find.byKey(const Key('login_email_field')), email);
  await tester.enterText(find.byKey(const Key('login_password_field')), password);
  await tester.tap(find.byKey(const Key('login_submit_button')));
  await tester.pumpAndSettle(const Duration(seconds: 5));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('doctor shell exposes staff navigation items', (tester) async {
    await bootstrap(config: functionalTestConfig);
    await tester.pumpAndSettle(const Duration(seconds: 3));

    await signIn(
      tester,
      email: demoDoctorEmail,
      password: demoDoctorPassword,
    );

    expect(find.text('Dashboard'), findsWidgets);
    expect(find.text('Medicines'), findsWidgets);
    expect(find.text('Diseases'), findsWidgets);
  });
}
