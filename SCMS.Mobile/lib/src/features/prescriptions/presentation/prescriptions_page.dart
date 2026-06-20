import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/app_providers.dart';
import '../../../core/utils/pdf_download_helper.dart';
import '../../../shared/widgets/scms_app_shell.dart';
import '../../portal/data/portal_repository.dart';

class PrescriptionsPage extends ConsumerWidget {
  const PrescriptionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prescriptionsAsync = ref.watch(portalListProvider('/Prescriptions'));

    return ScmsAppShell(
      title: 'Prescriptions',
      child: prescriptionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Unable to load prescriptions: $error')),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No prescription records found.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final item = items[index];
              final id = item['id'] ?? item['prescriptionId'];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: Text((item['diseaseName'] ?? item['patientName'] ?? 'Prescription #$id').toString()),
                  subtitle: Text((item['createdAt'] ?? item['notes'] ?? 'Prescription record').toString()),
                  trailing: IconButton(
                    tooltip: 'Open PDF',
                    icon: const Icon(Icons.picture_as_pdf_outlined),
                    onPressed: id == null
                        ? null
                        : () async {
                            final bytes = await ref.read(apiClientProvider).getBytes('/Prescriptions/$id/pdf');
                            await saveAndLaunchFile(bytes, 'prescription-$id.pdf');
                          },
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
