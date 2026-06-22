import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/scms_api_response.dart';
import '../domain/patient_models.dart';

final patientsRepositoryProvider = Provider<PatientsRepository>((ref) {
  return PatientsRepository(ref.watch(apiClientProvider));
});

class PatientsRepository {
  const PatientsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<PatientProfileResponse>> getPatientProfiles() async {
    final response = await _apiClient.get('/Patients');
    return ScmsApiResponse.parsePaginatedItems(
      ScmsApiResponse.parseBody(response.data),
      PatientProfileResponse.fromJson,
      failureMessage: 'Failed to load patients',
    );
  }

  Future<PatientProfileResponse> addPatientProfile(PatientProfileRequest request) async {
    final response = await _apiClient.post(
      '/Patients',
      data: request.toJson(),
    );

    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to add patient profile',
    );

    return PatientProfileResponse.fromJson(
      ScmsApiResponse.requireData(
        body,
        message: 'No data returned from profile creation',
      ),
    );
  }

  Future<PatientProfileResponse> getPatientProfileById(int id) async {
    final response = await _apiClient.get('/Patients/patients/$id');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to load patient detail',
    );

    return PatientProfileResponse.fromJson(
      ScmsApiResponse.requireData(
        body,
        message: 'No data returned for patient detail',
      ),
    );
  }

  Future<List<dynamic>> getPatientHistory(int id) async {
    final response = await _apiClient.get('/Patients/$id/history');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to load patient history',
    );

    final data = body['data'];
    if (data is Map<String, dynamic>) {
      return data['timeline'] as List<dynamic>? ?? [];
    }

    return data as List<dynamic>? ?? [];
  }

  Future<Map<String, dynamic>> getMedicalSummary(int id) async {
    final response = await _apiClient.get('/Patients/$id/summary');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to load medical summary',
    );

    return ScmsApiResponse.optionalData(body) ?? {};
  }
}
