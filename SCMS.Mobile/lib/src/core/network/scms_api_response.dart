import '../errors/app_exception.dart';

/// Parses the standard SCMS API envelope: `{ isSuccess, message, data }`.
class ScmsApiResponse {
  const ScmsApiResponse._();

  static Map<String, dynamic> parseBody(
    dynamic raw, {
    String emptyMessage = 'Empty response from server',
  }) {
    final body = raw as Map<String, dynamic>?;
    if (body == null) {
      throw AppException(emptyMessage);
    }
    return body;
  }

  static void ensureSuccess(
    Map<String, dynamic> body, {
    String fallbackMessage = 'Request failed',
  }) {
    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? fallbackMessage);
    }
  }

  static Map<String, dynamic> requireData(
    Map<String, dynamic> body, {
    String message = 'No data returned',
  }) {
    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw AppException(message);
    }
    return data;
  }

  static Map<String, dynamic>? optionalData(Map<String, dynamic> body) {
    return body['data'] as Map<String, dynamic>?;
  }

  static List<T> parsePaginatedItems<T>(
    Map<String, dynamic> body,
    T Function(Map<String, dynamic> json) fromJson, {
    String failureMessage = 'Request failed',
  }) {
    ensureSuccess(body, fallbackMessage: failureMessage);
    final data = optionalData(body);
    if (data == null) {
      return [];
    }

    final items = data['items'] as List<dynamic>? ?? [];
    return items
        .map((item) => fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
