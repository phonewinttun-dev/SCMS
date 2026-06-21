import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';

class ScmsShellDestination {
  const ScmsShellDestination({
    required this.path,
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String path;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

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
    final destinations = _destinationsFor(role);
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

  static List<ScmsShellDestination> _destinationsFor(String role) {
    final isStaff = role == 'owner' || role == 'admin' || role == 'doctor';
    if (isStaff) {
      return const [
        ScmsShellDestination(path: '/dashboard', label: 'Dashboard', icon: Icons.dashboard_outlined, selectedIcon: Icons.dashboard),
        ScmsShellDestination(path: '/appointments', label: 'Queue', icon: Icons.event_available_outlined, selectedIcon: Icons.event_available),
        ScmsShellDestination(path: '/patients', label: 'Patients', icon: Icons.people_outline, selectedIcon: Icons.people),
        ScmsShellDestination(path: '/medicines', label: 'Medicines', icon: Icons.medication_outlined, selectedIcon: Icons.medication),
        ScmsShellDestination(path: '/diseases', label: 'Diseases', icon: Icons.biotech_outlined, selectedIcon: Icons.biotech),
        ScmsShellDestination(path: '/prescriptions', label: 'Rx', icon: Icons.description_outlined, selectedIcon: Icons.description),
        ScmsShellDestination(path: '/payments', label: 'Payments', icon: Icons.payments_outlined, selectedIcon: Icons.payments),
        ScmsShellDestination(path: '/follow-ups', label: 'Follow-ups', icon: Icons.event_repeat_outlined, selectedIcon: Icons.event_repeat),
        ScmsShellDestination(path: '/notifications', label: 'Alerts', icon: Icons.notifications_outlined, selectedIcon: Icons.notifications),
        ScmsShellDestination(path: '/reports', label: 'Reports', icon: Icons.bar_chart_outlined, selectedIcon: Icons.bar_chart),
        ScmsShellDestination(path: '/ai-assistant', label: 'AI', icon: Icons.auto_awesome_outlined, selectedIcon: Icons.auto_awesome),
      ];
    }

    return const [
      ScmsShellDestination(path: '/dashboard', label: 'Home', icon: Icons.dashboard_outlined, selectedIcon: Icons.dashboard),
      ScmsShellDestination(path: '/appointments', label: 'Queue', icon: Icons.event_available_outlined, selectedIcon: Icons.event_available),
      ScmsShellDestination(path: '/patients', label: 'Family', icon: Icons.people_outline, selectedIcon: Icons.people),
      ScmsShellDestination(path: '/payments', label: 'Billing', icon: Icons.payments_outlined, selectedIcon: Icons.payments),
      ScmsShellDestination(path: '/prescriptions', label: 'Rx', icon: Icons.description_outlined, selectedIcon: Icons.description),
      ScmsShellDestination(path: '/notifications', label: 'Alerts', icon: Icons.notifications_outlined, selectedIcon: Icons.notifications),
    ];
  }

  int _selectedIndex(BuildContext context, List<ScmsShellDestination> destinations) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = destinations.indexWhere((item) => location.startsWith(item.path));
    return index < 0 ? 0 : index;
  }
}
