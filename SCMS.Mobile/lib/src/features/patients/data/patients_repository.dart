import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_client.dart';
import '../domain/patient_models.dart';

final patientsRepositoryProvider = Provider<PatientsRepository>((ref) {
  return PatientsRepository(ref.watch(apiClientProvider));
});

class PatientsRepository {
  const PatientsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<PatientProfileResponse>> getPatientProfiles() async {
    final response = await _apiClient.get('/Patients');
    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Failed to load patients');
    }

    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) {
      return [];
    }

    final items = data['items'] as List<dynamic>? ?? [];
    return items
        .map((e) => PatientProfileResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PatientProfileResponse> addPatientProfile(PatientProfileRequest request) async {
    final response = await _apiClient.post(
      '/Patients',
      data: request.toJson(),
    );

    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Failed to add patient profile');
    }

    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw const AppException('No data returned from profile creation');
    }

    return PatientProfileResponse.fromJson(data);
  }

  Future<PatientProfileResponse> getPatientProfileById(int id) async {
    final response = await _apiClient.get('/Patients/patients/$id');
    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Failed to load patient detail');
    }

    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw const AppException('No data returned for patient detail');
    }

    return PatientProfileResponse.fromJson(data);
  }

  Future<List<dynamic>> getPatientHistory(int id) async {
    final response = await _apiClient.get('/Patients/$id/history');
    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Failed to load patient history');
    }

    final data = body['data'];
    if (data is Map<String, dynamic>) {
      return data['timeline'] as List<dynamic>? ?? [];
    }

    return data as List<dynamic>? ?? [];
  }

  Future<Map<String, dynamic>> getMedicalSummary(int id) async {
    final response = await _apiClient.get('/Patients/$id/summary');
    final body = response.data as Map<String, dynamic>?;
    if (body == null) {
      throw const AppException('Empty response from server');
    }

    final isSuccess = body['isSuccess'] as bool? ?? false;
    if (!isSuccess) {
      throw AppException(body['message'] as String? ?? 'Failed to load medical summary');
    }

    return body['data'] as Map<String, dynamic>? ?? {};
  }
}
