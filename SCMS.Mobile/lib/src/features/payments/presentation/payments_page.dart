import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/utils/pdf_download_helper.dart';
import '../../../shared/widgets/scms_app_shell.dart';
import '../../auth/application/auth_controller.dart';
import '../../dashboard/application/dashboard_controller.dart';
import '../../dashboard/data/dashboard_repository.dart';
import '../../portal/presentation/portal_resource_page.dart';

class PaymentsPage extends ConsumerWidget {
  const PaymentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).value?.role.toLowerCase() ?? 'user';
    final isStaff = role == 'owner' || role == 'admin' || role == 'doctor';
    if (isStaff) {
      return const PortalResourcePage(
        title: 'Payments',
        path: '/Payments',
        titleKeys: ['patientName', 'appointmentCode'],
        subtitleKeys: ['paymentStatus', 'amount'],
      );
    }

    final dashboardAsync = ref.watch(patientDashboardProvider);
    return ScmsAppShell(
      title: 'Billing',
      child: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Unable to load billing: $error')),
        data: (dashboard) {
          final invoices = dashboard.outstandingBalances;
          if (invoices.isEmpty) {
            return const Center(child: Text('No unpaid invoices.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: invoices.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final invoice = invoices[index];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.payments_outlined),
                  title: Text(invoice.appointmentCode),
                  subtitle: Text('${invoice.amount.toStringAsFixed(0)} MMK | ${invoice.paymentStatus}'),
                  trailing: Wrap(
                    spacing: 4,
                    children: [
                      IconButton(
                        tooltip: 'Open invoice',
                        icon: const Icon(Icons.picture_as_pdf_outlined),
                        onPressed: () async {
                          final bytes = await ref.read(apiClientProvider).getBytes('/Payments/${invoice.id}/invoice/pdf');
                          await saveAndLaunchFile(bytes, 'invoice-${invoice.id}.pdf');
                        },
                      ),
                      IconButton(
                        tooltip: 'Submit proof',
                        icon: const Icon(Icons.upload_file_outlined),
                        onPressed: () => _showProofDialog(context, ref, invoice.id, invoice.appointmentId, invoice.amount),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showProofDialog(
    BuildContext context,
    WidgetRef ref,
    int paymentId,
    int appointmentId,
    double amount,
  ) async {
    final controller = TextEditingController();
    var method = 'kbzpay';
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Payment proof #$paymentId'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: method,
              decoration: const InputDecoration(labelText: 'Payment method'),
              items: const [
                DropdownMenuItem(value: 'kbzpay', child: Text('KBZPay')),
                DropdownMenuItem(value: 'wavepay', child: Text('WavePay')),
                DropdownMenuItem(value: 'bank-transfer', child: Text('Bank transfer')),
              ],
              onChanged: (value) => method = value ?? method,
            ),
            TextField(
              controller: controller,
              decoration: const InputDecoration(labelText: 'Hosted screenshot URL'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              await ref.read(dashboardRepositoryProvider).submitPaymentProof(
                    appointmentId: appointmentId,
                    paymentMethod: method,
                    amount: amount,
                    screenshotUrl: controller.text.trim(),
                  );
              ref.invalidate(patientDashboardProvider);
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    controller.dispose();
  }
}
