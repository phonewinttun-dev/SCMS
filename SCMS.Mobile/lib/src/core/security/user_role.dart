import 'package:flutter/material.dart';

import '../navigation/shell_destination.dart';

/// Shared role checks and navigation rules used by the router and app shell.
class UserRole {
  const UserRole._();

  static const staffOnlyRoutePrefixes = [
    '/medicines',
    '/diseases',
    '/follow-ups',
    '/reports',
    '/ai-assistant',
  ];

  static bool isStaff(String role) {
    final normalized = role.toLowerCase();
    return normalized == 'owner' ||
        normalized == 'admin' ||
        normalized == 'doctor';
  }

  static bool isStaffOnlyRoute(String location) {
    return staffOnlyRoutePrefixes.any(location.startsWith);
  }

  static List<ScmsShellDestination> shellDestinations(String role) {
    if (isStaff(role)) {
      return const [
        ScmsShellDestination(
          path: '/dashboard',
          label: 'Dashboard',
          icon: Icons.dashboard_outlined,
          selectedIcon: Icons.dashboard,
        ),
        ScmsShellDestination(
          path: '/appointments',
          label: 'Queue',
          icon: Icons.event_available_outlined,
          selectedIcon: Icons.event_available,
        ),
        ScmsShellDestination(
          path: '/patients',
          label: 'Patients',
          icon: Icons.people_outline,
          selectedIcon: Icons.people,
        ),
        ScmsShellDestination(
          path: '/medicines',
          label: 'Medicines',
          icon: Icons.medication_outlined,
          selectedIcon: Icons.medication,
        ),
        ScmsShellDestination(
          path: '/diseases',
          label: 'Diseases',
          icon: Icons.biotech_outlined,
          selectedIcon: Icons.biotech,
        ),
        ScmsShellDestination(
          path: '/prescriptions',
          label: 'Rx',
          icon: Icons.description_outlined,
          selectedIcon: Icons.description,
        ),
        ScmsShellDestination(
          path: '/payments',
          label: 'Payments',
          icon: Icons.payments_outlined,
          selectedIcon: Icons.payments,
        ),
        ScmsShellDestination(
          path: '/follow-ups',
          label: 'Follow-ups',
          icon: Icons.event_repeat_outlined,
          selectedIcon: Icons.event_repeat,
        ),
        ScmsShellDestination(
          path: '/notifications',
          label: 'Alerts',
          icon: Icons.notifications_outlined,
          selectedIcon: Icons.notifications,
        ),
        ScmsShellDestination(
          path: '/reports',
          label: 'Reports',
          icon: Icons.bar_chart_outlined,
          selectedIcon: Icons.bar_chart,
        ),
        ScmsShellDestination(
          path: '/ai-assistant',
          label: 'AI',
          icon: Icons.auto_awesome_outlined,
          selectedIcon: Icons.auto_awesome,
        ),
      ];
    }

    return const [
      ScmsShellDestination(
        path: '/dashboard',
        label: 'Home',
        icon: Icons.dashboard_outlined,
        selectedIcon: Icons.dashboard,
      ),
      ScmsShellDestination(
        path: '/appointments',
        label: 'Queue',
        icon: Icons.event_available_outlined,
        selectedIcon: Icons.event_available,
      ),
      ScmsShellDestination(
        path: '/patients',
        label: 'Family',
        icon: Icons.people_outline,
        selectedIcon: Icons.people,
      ),
      ScmsShellDestination(
        path: '/payments',
        label: 'Billing',
        icon: Icons.payments_outlined,
        selectedIcon: Icons.payments,
      ),
      ScmsShellDestination(
        path: '/prescriptions',
        label: 'Rx',
        icon: Icons.description_outlined,
        selectedIcon: Icons.description,
      ),
      ScmsShellDestination(
        path: '/notifications',
        label: 'Alerts',
        icon: Icons.notifications_outlined,
        selectedIcon: Icons.notifications,
      ),
    ];
  }
}
