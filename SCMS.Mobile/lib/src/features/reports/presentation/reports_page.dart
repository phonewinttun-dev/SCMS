import '../../portal/presentation/portal_resource_page.dart';

class ReportsPage extends PortalResourcePage {
  const ReportsPage({super.key})
      : super(
          title: 'Reports',
          path: '/Reports/business-summary',
          titleKeys: const ['reportTitle', 'period', 'month'],
          subtitleKeys: const ['totalRevenue', 'totalAppointments'],
        );
}
