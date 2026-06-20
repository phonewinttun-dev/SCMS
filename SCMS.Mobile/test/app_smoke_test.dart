import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:scms_mobile/src/app/app.dart';
import 'package:scms_mobile/src/core/config/app_config.dart';
import 'package:scms_mobile/src/core/di/app_providers.dart';
import 'package:scms_mobile/src/core/storage/secure_token_store.dart';

class FakeTokenStore extends SecureTokenStore {
  const FakeTokenStore({this.token, this.role});

  final String? token;
  final String? role;

  @override
  Future<String?> readToken() async => token;

  @override
  Future<String?> readRefreshToken() async => 'refresh';

  @override
  Future<String?> readRole() async => role;

  @override
  Future<String?> readName() async => 'Test User';

  @override
  Future<String?> readUserId() async => '1';

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<void> clear() async {}
}

Future<void> pumpScmsApp(
  WidgetTester tester, {
  String? token,
  String? role,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(
          const AppConfig(
            flavor: AppFlavor.development,
            apiBaseUrl: 'http://localhost:5140/',
            enableNetworkLogging: false,
            connectTimeoutSeconds: 1,
            receiveTimeoutSeconds: 1,
          ),
        ),
        secureTokenStoreProvider.overrideWithValue(FakeTokenStore(token: token, role: role)),
      ],
      child: const ScmsApp(),
    ),
  );
}

void main() {
  testWidgets('shows login screen when no session is restored', (tester) async {
    await pumpScmsApp(tester);

    await tester.pumpAndSettle();

    expect(find.text('SCMS'), findsOneWidget);
    expect(find.text('Sign in to continue'), findsOneWidget);
  });

  testWidgets('shows patient shell destinations for patient role', (tester) async {
    await pumpScmsApp(tester, token: 'token', role: 'user');
    await tester.pump();

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Billing'), findsOneWidget);
    expect(find.text('Medicines'), findsNothing);
  });

  testWidgets('shows staff shell destinations for doctor role', (tester) async {
    await pumpScmsApp(tester, token: 'token', role: 'doctor');
    await tester.pump();

    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Medicines'), findsOneWidget);
    expect(find.text('Diseases'), findsOneWidget);
  });
}
