import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../errors/app_exception.dart';
import '../storage/secure_token_store.dart';
import 'auth_interceptor.dart';

class ApiClient {
  ApiClient({required AppConfig config, required SecureTokenStore tokenStore})
    : _dio = Dio(
        BaseOptions(
          baseUrl: config.apiBaseUrl,
          connectTimeout: Duration(seconds: config.connectTimeoutSeconds),
          receiveTimeout: Duration(seconds: config.receiveTimeoutSeconds),
          headers: const {
            Headers.acceptHeader: Headers.jsonContentType,
            Headers.contentTypeHeader: Headers.jsonContentType,
          },
        ),
      ) {
    _dio.interceptors.add(AuthInterceptor(tokenStore));

    if (config.enableNetworkLogging) {
      _dio.interceptors.add(
        LogInterceptor(requestBody: true, responseBody: true),
      );
    }
  }

  final Dio _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) {
    return _guard(() => _dio.get<T>(_apiPath(path), queryParameters: queryParameters));
  }

  Future<Response<T>> post<T>(String path, {Object? data}) {
    return _guard(() => _dio.post<T>(_apiPath(path), data: data));
  }

  Future<Response<T>> put<T>(String path, {Object? data}) {
    return _guard(() => _dio.put<T>(_apiPath(path), data: data));
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) {
    return _guard(() => _dio.patch<T>(_apiPath(path), data: data));
  }

  Future<Response<T>> delete<T>(String path) {
    return _guard(() => _dio.delete<T>(_apiPath(path)));
  }

  Future<Uint8List> getBytes(String path) async {
    try {
      final response = await _dio.get<List<int>>(
        _apiPath(path),
        options: Options(responseType: ResponseType.bytes),
      );
      final list = response.data;
      if (list == null) {
        throw const AppException('Empty file returned from server');
      }
      return Uint8List.fromList(list);
    } on DioException catch (error) {
      throw AppException(
        error.response?.statusMessage ??
            error.message ??
            'Network request failed',
        statusCode: error.response?.statusCode,
      );
    }
  }

  Future<Response<T>> _guard<T>(Future<Response<T>> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw AppException(
        error.response?.statusMessage ??
            error.message ??
            'Network request failed',
        statusCode: error.response?.statusCode,
      );
    }
  }

  String _apiPath(String path) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return normalized.toLowerCase().startsWith('/api/') ? normalized : '/api$normalized';
  }
}
