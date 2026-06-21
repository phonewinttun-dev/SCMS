import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_token_store.dart';
import '../domain/auth_session.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStore: ref.watch(secureTokenStoreProvider),
  );
});

class AuthRepository {
  const AuthRepository({
    required ApiClient apiClient,
    required SecureTokenStore tokenStore,
  }) : _apiClient = apiClient,
       _tokenStore = tokenStore;

  final ApiClient _apiClient;
  final SecureTokenStore _tokenStore;

  Future<AuthSession?> restoreSession() async {
    final token = await _tokenStore.readToken();
    final refreshToken = await _tokenStore.readRefreshToken();
    final role = await _tokenStore.readRole();
    final name = await _tokenStore.readName();
    final userIdStr = await _tokenStore.readUserId();

    if (token == null || token.isEmpty || role == null) {
      return null;
    }

    return AuthSession(
      accessToken: token,
      refreshToken: refreshToken ?? '',
      email: '', // Not strictly needed for restored sessions
      name: name ?? '',
      userId: int.tryParse(userIdStr ?? '') ?? 0,
      role: role,
    );
  }

  Future<AuthSession> signIn({
    required String emailOrMobile,
    required String password,
  }) async {
    final response = await _apiClient.post('/Auth/login', data: {
      'emailOrMobile': emailOrMobile,
      'password': password,
    });

    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Login failed');
    }

    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw const AppException('No data returned from login');
    }

    final accessToken = data['accessToken'] as String? ?? '';
    final refreshToken = data['refreshToken'] as String? ?? '';
    final user = data['user'] as Map<String, dynamic>? ?? {};
    final userId = user['userId'] as int? ?? 0;
    final name = user['name'] as String? ?? '';
    final roles = user['roles'] as List<dynamic>? ?? [];
    final role = roles.isNotEmpty ? roles[0].toString().toLowerCase() : 'user';

    await _tokenStore.saveToken(accessToken);
    await _tokenStore.saveRefreshToken(refreshToken);
    await _tokenStore.saveRole(role);
    await _tokenStore.saveName(name);
    await _tokenStore.saveUserId(userId.toString());

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      email: emailOrMobile,
      name: name,
      userId: userId,
      role: role,
    );
  }

  /// Register a new patient account.
  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? mobileNo,
  }) async {
    final response = await _apiClient.post('/Auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
      if (mobileNo != null && mobileNo.isNotEmpty) 'mobileNo': mobileNo,
    });

    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(
        body['message'] as String? ?? 'Registration failed',
      );
    }
  }

  Future<void> signOut() {
    return _tokenStore.clear();
  }

  ApiClient get apiClient => _apiClient;
}
