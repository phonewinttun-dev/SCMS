import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signalr_netcore/signalr_client.dart';

import '../config/app_config.dart';
import '../di/app_providers.dart';
import '../storage/secure_token_store.dart';

final signalRServiceProvider = Provider<SignalRService>((ref) {
  return SignalRService(
    config: ref.watch(appConfigProvider),
    tokenStore: ref.watch(secureTokenStoreProvider),
  );
});

class SignalRService {
  const SignalRService({
    required AppConfig config,
    required SecureTokenStore tokenStore,
  })  : _config = config,
        _tokenStore = tokenStore;

  final AppConfig _config;
  final SecureTokenStore _tokenStore;

  HubConnection queueHub() => _build('/hubs/queue');

  HubConnection notificationsHub() => _build('/hubs/notifications');

  HubConnection _build(String hubPath) {
    final root = _config.apiBaseUrl
        .replaceFirst(RegExp(r'/api/?$', caseSensitive: false), '')
        .replaceFirst(RegExp(r'/$'), '');

    return HubConnectionBuilder()
        .withUrl(
          '$root$hubPath',
          options: HttpConnectionOptions(
            accessTokenFactory: () async => await _tokenStore.readToken() ?? '',
          ),
        )
        .withAutomaticReconnect()
        .build();
  }
}
