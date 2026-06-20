import '../../portal/presentation/portal_resource_page.dart';

class DiseasesPage extends PortalResourcePage {
  const DiseasesPage({super.key})
      : super(
          title: 'Diseases',
          path: '/Diseases',
          titleKeys: const ['name', 'diseaseName'],
          subtitleKeys: const ['description'],
        );
}
