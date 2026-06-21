import '../../portal/presentation/portal_resource_page.dart';

class FollowUpsPage extends PortalResourcePage {
  const FollowUpsPage({super.key})
      : super(
          title: 'Follow-ups',
          path: '/FollowUps',
          titleKeys: const ['patientName', 'recommendation', 'status'],
          subtitleKeys: const ['dueAt', 'status'],
        );
}
