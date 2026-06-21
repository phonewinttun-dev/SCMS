import '../../portal/presentation/portal_resource_page.dart';

class AiAssistantPage extends PortalResourcePage {
  const AiAssistantPage({super.key})
      : super(
          title: 'AI Assistant',
          path: '/mcp/tools',
          titleKeys: const ['name'],
          subtitleKeys: const ['description'],
        );
}
