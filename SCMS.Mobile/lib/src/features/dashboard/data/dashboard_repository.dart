import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/scms_api_response.dart';
import '../domain/dashboard_models.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});

class DashboardRepository {
  const DashboardRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<DoctorDashboardResponse> getDoctorDashboard() async {
    final response = await _apiClient.get('/Dashboards/dashboard');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to load doctor dashboard',
    );

    return DoctorDashboardResponse.fromJson(
      ScmsApiResponse.requireData(
        body,
        message: 'No data returned for doctor dashboard',
      ),
    );
  }

  Future<PatientDashboardResponse> getPatientDashboard() async {
    final response = await _apiClient.get('/Dashboards/patient-dashboard');
    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to load patient dashboard',
    );

    return PatientDashboardResponse.fromJson(
      ScmsApiResponse.requireData(
        body,
        message: 'No data returned for patient dashboard',
      ),
    );
  }

  Future<void> submitPaymentProof({
    required int appointmentId,
    required String paymentMethod,
    required double amount,
    required String screenshotUrl,
  }) async {
    final response = await _apiClient.post(
      '/Payments/manual-proof',
      data: {
        'appointmentId': appointmentId,
        'paymentMethod': paymentMethod,
        'amount': amount,
        'screenshotUrl': screenshotUrl,
      },
    );

    final body = ScmsApiResponse.parseBody(response.data);
    ScmsApiResponse.ensureSuccess(
      body,
      fallbackMessage: 'Failed to submit payment proof',
    );
  }

  Future<Uint8List> downloadPrescriptionPdf(int prescriptionId) async {
    return _apiClient.getBytes('/Prescriptions/$prescriptionId/pdf');
  }

  Future<Uint8List> downloadInvoicePdf(int paymentId) async {
    return _apiClient.getBytes('/Payments/$paymentId/invoice/pdf');
  }
}
