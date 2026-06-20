import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/scms_app_shell.dart';
import '../data/portal_repository.dart';

class PortalResourcePage extends ConsumerWidget {
  const PortalResourcePage({
    required this.title,
    required this.path,
    required this.titleKeys,
    this.subtitleKeys = const [],
    super.key,
  });

  final String title;
  final String path;
  final List<String> titleKeys;
  final List<String> subtitleKeys;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncItems = ref.watch(portalListProvider(path));

    return ScmsAppShell(
      title: title,
      child: asyncItems.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Unable to load $title: $error', textAlign: TextAlign.center),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('No $title records found.'),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(portalListProvider(path)),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return Card(
                  child: ListTile(
                    title: Text(_firstValue(item, titleKeys, fallback: '$title #${index + 1}')),
                    subtitle: Text(_firstValue(item, subtitleKeys, fallback: _summary(item))),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  static String _firstValue(Map<String, dynamic> item, List<String> keys, {required String fallback}) {
    for (final key in keys) {
      final value = item[key];
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString();
      }
    }
    return fallback;
  }

  static String _summary(Map<String, dynamic> item) {
    final values = item.entries
        .where((entry) => entry.value != null)
        .take(3)
        .map((entry) => '${entry.key}: ${entry.value}')
        .join(' | ');
    return values.isEmpty ? 'Open details in web portal for full workflow.' : values;
  }
}
