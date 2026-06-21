import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signalr_netcore/signalr_client.dart';

import '../../../core/realtime/signalr_service.dart';
import '../../../shared/widgets/scms_app_shell.dart';
import '../../portal/data/portal_repository.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  HubConnection? _connection;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  Future<void> _connect() async {
    final connection = ref.read(signalRServiceProvider).notificationsHub();
    connection.on('ReceiveNotification', (_) {
      ref.invalidate(portalListProvider('/Notifications'));
    });

    try {
      await connection.start();
      _connection = connection;
    } catch (_) {
      // Notification polling still works through pull-to-refresh.
    }
  }

  @override
  void dispose() {
    _connection?.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(portalListProvider('/Notifications'));
    return ScmsAppShell(
      title: 'Notifications',
      child: notificationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Unable to load notifications: $error')),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No notifications.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(portalListProvider('/Notifications')),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text((item['title'] ?? 'Notification').toString()),
                    subtitle: Text((item['description'] ?? item['createdAt'] ?? '').toString()),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
