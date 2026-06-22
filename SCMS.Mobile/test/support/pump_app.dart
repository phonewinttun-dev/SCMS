import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:scms_mobile/src/app/app.dart';
import 'package:scms_mobile/src/core/config/app_config.dart';
import 'package:scms_mobile/src/core/di/app_providers.dart';
import 'package:scms_mobile/src/shared/widgets/scms_app_shell.dart';

import 'fake_token_store.dart';

Future<void> pumpScmsApp(
  WidgetTester tester, {
  String? token,
  String? role,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(testAppConfig),
        secureTokenStoreProvider.overrideWithValue(
          FakeTokenStore(token: token, role: role),
        ),
      ],
      child: const ScmsApp(),
    ),
  );
}

Future<void> pumpShell(
  WidgetTester tester, {
  required String role,
}) async {
  final router = GoRouter(
    initialLocation: '/dashboard',
    routes: [
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const ScmsAppShell(
          title: 'Dashboard',
          child: SizedBox.shrink(),
        ),
      ),
      GoRoute(
        path: '/medicines',
        builder: (context, state) => const ScmsAppShell(
          title: 'Medicines',
          child: SizedBox.shrink(),
        ),
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        secureTokenStoreProvider.overrideWithValue(
          FakeTokenStore(token: 'token', role: role),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
}
