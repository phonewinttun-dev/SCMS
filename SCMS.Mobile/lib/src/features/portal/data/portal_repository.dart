import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/scms_api_response.dart';

final portalRepositoryProvider = Provider<PortalRepository>((ref) {
  return PortalRepository(ref.watch(apiClientProvider));
});

final portalListProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, path) {
  return ref.watch(portalRepositoryProvider).list(path);
});

class PortalRepository {
  const PortalRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> list(String path) async {
    final response = await _apiClient.get(path);
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(body, fallbackMessage: 'Request failed');

    final data = body['data'];
    final items = data is List
        ? data
        : data is Map<String, dynamic> && data['items'] is List
            ? data['items'] as List
            : data is Map<String, dynamic>
                ? [data]
                : const [];

    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }
}
