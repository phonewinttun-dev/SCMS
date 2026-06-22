import 'package:scms_mobile/src/core/config/app_config.dart';
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

const testAppConfig = AppConfig(
  flavor: AppFlavor.development,
  apiBaseUrl: 'http://localhost:5140/',
  enableNetworkLogging: false,
  connectTimeoutSeconds: 1,
  receiveTimeoutSeconds: 1,
);
