import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/scms_api_response.dart';
import '../../../core/di/app_providers.dart';
import '../../../core/network/api_client.dart';
import '../domain/appointment_models.dart';

final appointmentsRepositoryProvider = Provider<AppointmentsRepository>((ref) {
  return AppointmentsRepository(ref.watch(apiClientProvider));
});

class AppointmentsRepository {
  const AppointmentsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AppointmentDetailsResponse>> getAppointments({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int? patientId,
  }) async {
    final queryParameters = <String, dynamic>{};
    if (startDate != null) {
      queryParameters['startDate'] = startDate.toIso8601String();
    }
    if (endDate != null) {
      queryParameters['endDate'] = endDate.toIso8601String();
    }
    if (status != null && status.isNotEmpty && status.toLowerCase() != 'all') {
      queryParameters['status'] = status.toLowerCase();
    }
    if (patientId != null) {
      queryParameters['patientId'] = patientId;
    }

    final response = await _apiClient.get(
      '/Appointments',
      queryParameters: queryParameters,
    );

    return ScmsApiResponse.parsePaginatedItems(
      ScmsApiResponse.parseBody(response.data),
      AppointmentDetailsResponse.fromJson,
      failureMessage: 'Failed to load appointments',
    );
  }

  Future<AppointmentDetailsResponse> bookAppointment(BookAppointmentRequest request) async {
    final response = await _apiClient.post(
      '/Appointments',
      data: request.toJson(),
    );

    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to book appointment',
    );

    return AppointmentDetailsResponse.fromJson(
      ScmsApiResponse.requireData(
        body,
        message: 'No data returned from appointment booking',
      ),
    );
  }

  Future<void> updateAppointmentStatus(int id, String status, {String? notes}) async {
    final response = await _apiClient.patch(
      '/Appointments/$id/status',
      data: {
        'status': status.toLowerCase(),
        'notes': notes,
      },
    );

    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to update status',
    );
  }

  Future<void> rescheduleAppointment(int id, DateTime newDatetime, {String? notes}) async {
    final response = await _apiClient.post(
      '/Appointments/$id/reschedule',
      data: {
        'newDatetime': newDatetime.toIso8601String(),
        'notes': notes,
      },
    );

    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to reschedule appointment',
    );
  }

  Future<void> callNextPatient() async {
    final response = await _apiClient.post('/Appointments/call-next');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to call next patient',
    );
  }

  ApiClient get apiClient => _apiClient;
}
