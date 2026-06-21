import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/appointments/presentation/appointments_page.dart';
import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/ai_assistant/presentation/ai_assistant_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/diseases/presentation/diseases_page.dart';
import '../../features/follow_ups/presentation/follow_ups_page.dart';
import '../../features/medicines/presentation/medicines_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/patients/presentation/patients_page.dart';
import '../../features/payments/presentation/payments_page.dart';
import '../../features/prescriptions/presentation/prescriptions_page.dart';
import '../../features/reports/presentation/reports_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final session = authState.hasValue ? authState.value : null;
  final isSignedIn = session != null;
  final role = session?.role.toLowerCase() ?? 'user';
  final isStaff = role == 'owner' || role == 'admin' || role == 'doctor';
  const staffOnlyLocations = {
    '/medicines',
    '/diseases',
    '/follow-ups',
    '/reports',
    '/ai-assistant',
  };

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final signingIn = state.matchedLocation == '/login';
      final loadingSession = authState.isLoading && !authState.hasValue;

      if (loadingSession) {
        return null;
      }

      if (!isSignedIn && !signingIn) {
        return '/login';
      }

      if (isSignedIn && signingIn) {
        return '/dashboard';
      }

      if (isSignedIn && !isStaff && staffOnlyLocations.any(state.matchedLocation.startsWith)) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
      GoRoute(
        path: '/appointments',
        builder: (context, state) => const AppointmentsPage(),
      ),
      GoRoute(
        path: '/patients',
        builder: (context, state) => const PatientsPage(),
      ),
      GoRoute(
        path: '/medicines',
        builder: (context, state) => const MedicinesPage(),
      ),
      GoRoute(
        path: '/diseases',
        builder: (context, state) => const DiseasesPage(),
      ),
      GoRoute(
        path: '/prescriptions',
        builder: (context, state) => const PrescriptionsPage(),
      ),
      GoRoute(
        path: '/payments',
        builder: (context, state) => const PaymentsPage(),
      ),
      GoRoute(
        path: '/follow-ups',
        builder: (context, state) => const FollowUpsPage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsPage(),
      ),
      GoRoute(
        path: '/ai-assistant',
        builder: (context, state) => const AiAssistantPage(),
      ),
    ],
  );
});
