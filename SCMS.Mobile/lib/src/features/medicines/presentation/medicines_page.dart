import '../../portal/presentation/portal_resource_page.dart';

class MedicinesPage extends PortalResourcePage {
  const MedicinesPage({super.key})
      : super(
          title: 'Medicines',
          path: '/Medicines',
          titleKeys: const ['name', 'medicineName'],
          subtitleKeys: const ['categoryName', 'description'],
        );
}
