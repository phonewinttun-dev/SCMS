import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/navigation/shell_destination.dart';
import '../../core/security/user_role.dart';
import '../../features/auth/application/auth_controller.dart';

class ScmsAppShell extends ConsumerWidget {
  const ScmsAppShell({
    required this.title,
    required this.child,
    super.key,
    this.actions,
  });

  final String title;
  final Widget child;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final role = authState.value?.role.toLowerCase() ?? 'user';
    final destinations = UserRole.shellDestinations(role);
    final selectedIndex = _selectedIndex(context, destinations);
    final bottomDestinations = destinations.take(5).toList();
    final bottomIndex = selectedIndex >= 0 && selectedIndex < bottomDestinations.length ? selectedIndex : 0;

    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      drawer: NavigationDrawer(
        selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
        onDestinationSelected: (index) {
          Navigator.of(context).pop();
          context.go(destinations[index].path);
        },
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(28, 20, 16, 12),
            child: Text('SCMS Portal', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          for (final item in destinations)
            NavigationDrawerDestination(
              icon: Icon(item.icon),
              selectedIcon: Icon(item.selectedIcon),
              label: Text(item.label),
            ),
        ],
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: bottomIndex,
        onDestinationSelected: (index) {
          context.go(bottomDestinations[index].path);
        },
        destinations: [
          for (final item in bottomDestinations)
            NavigationDestination(
              icon: Icon(item.icon),
              selectedIcon: Icon(item.selectedIcon),
              label: item.label,
            ),
        ],
      ),
    );
  }

  int _selectedIndex(BuildContext context, List<ScmsShellDestination> destinations) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = destinations.indexWhere((item) => location.startsWith(item.path));
    return index < 0 ? 0 : index;
  }
}
