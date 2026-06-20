import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/home_widgets.dart';
import '../../../shared/widgets/scms_app_shell.dart';
import '../../auth/application/auth_controller.dart';
import '../application/patients_controller.dart';
import '../domain/patient_models.dart';

class PatientsPage extends ConsumerStatefulWidget {
  const PatientsPage({super.key});

  @override
  ConsumerState<PatientsPage> createState() => _PatientsPageState();
}

class _PatientsPageState extends ConsumerState<PatientsPage> {
  int? _selectedPatientId;
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final session = authState.hasValue ? authState.value : null;
    final isStaff = session?.role == 'owner' || session?.role == 'doctor' || session?.role == 'admin';

    final patientsAsync = ref.watch(patientsListProvider);

    return ScmsAppShell(
      title: isStaff ? 'Patients & EMR' : 'Family records',
      child: patientsAsync.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: CircularProgressIndicator(),
          ),
        ),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 40),
                const SizedBox(height: 12),
                Text('Error loading patients: $err'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => ref.invalidate(patientsListProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (patientsList) {
          if (patientsList.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No patient profiles found.'),
              ),
            );
          }

          // Default selection if not set
          if (isStaff) {
            final filtered = patientsList
                .where((p) => p.name.toLowerCase().contains(_searchQuery.toLowerCase()))
                .toList();

            _selectedPatientId ??= filtered.isNotEmpty ? filtered.first.patientId : null;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                _StaffPatientSearch(
                  onSearchChanged: (query) {
                    setState(() {
                      _searchQuery = query;
                      _selectedPatientId = null; // Reset selection to pick first filtered
                    });
                  },
                ),
                const SizedBox(height: 18),
                if (filtered.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text('No matching patients found'),
                    ),
                  )
                else ...[
                  const SectionHeader(title: 'Patient profiles found'),
                  SizedBox(
                    height: 50,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemBuilder: (context, index) {
                        final p = filtered[index];
                        final selected = _selectedPatientId == p.patientId;

                        return ChoiceChip(
                          label: Text(p.name),
                          selected: selected,
                          onSelected: (val) {
                            if (val) {
                              setState(() => _selectedPatientId = p.patientId);
                            }
                          },
                        );
                      },
                      separatorBuilder: (context, index) => const SizedBox(width: 8),
                      itemCount: filtered.length,
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (_selectedPatientId != null)
                    _StaffPatientWorkspace(patientId: _selectedPatientId!),
                ],
              ],
            );
          } else {
            // Patient view
            _selectedPatientId ??= patientsList.first.patientId;
            final selectedProfile =
                patientsList.firstWhere((p) => p.patientId == _selectedPatientId, orElse: () => patientsList.first);

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                _FamilyProfileSelector(
                  patientsList: patientsList,
                  selectedId: _selectedPatientId!,
                  onSelected: (id) => setState(() => _selectedPatientId = id),
                ),
                const SizedBox(height: 18),
                _PatientRecordsWorkspace(profile: selectedProfile),
              ],
            );
          }
        },
      ),
    );
  }
}

class _StaffPatientSearch extends StatelessWidget {
  const _StaffPatientSearch({required this.onSearchChanged});

  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          onChanged: onSearchChanged,
          decoration: const InputDecoration(
            hintText: 'Search patients by name...',
            prefixIcon: Icon(Icons.search),
          ),
        ),
      ],
    );
  }
}

class _FamilyProfileSelector extends StatelessWidget {
  const _FamilyProfileSelector({
    required this.patientsList,
    required this.selectedId,
    required this.onSelected,
  });

  final List<PatientProfileResponse> patientsList;
  final int selectedId;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Family profiles'),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemBuilder: (context, index) {
              final p = patientsList[index];
              final selected = selectedId == p.patientId;
              final colors = Theme.of(context).colorScheme;

              return SizedBox(
                width: 156,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => onSelected(p.patientId),
                  child: Card(
                    color: selected
                        ? colors.primaryContainer
                        : colors.surfaceContainerHighest.withValues(alpha: 0.55),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: selected ? colors.primary : colors.outlineVariant,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            p.gender?.toLowerCase() == 'female'
                                ? Icons.elderly_woman_outlined
                                : Icons.account_circle_outlined,
                            color: selected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                          ),
                          const Spacer(),
                          Text(
                            p.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(p.gender ?? 'Unknown'),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemCount: patientsList.length,
          ),
        ),
      ],
    );
  }
}

class _StaffPatientWorkspace extends ConsumerWidget {
  const _StaffPatientWorkspace({required this.patientId});

  final int patientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).colorScheme;

    final detailAsync = ref.watch(patientDetailProvider(patientId));
    final historyAsync = ref.watch(patientHistoryProvider(patientId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, s) => Text('Error loading detail: $err'),
          data: (p) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionHeader(title: 'Selected patient'),
              FeatureCard(
                icon: Icons.person_outline,
                title: '${p.name} (${p.gender ?? "Unknown"})',
                subtitle: 'DOB: ${p.dateOfBirth ?? "Unknown"} | Blood: ${p.bloodType ?? "N/A"}',
                trailing: StatusPill(label: p.mobileNo ?? 'No Phone'),
              ),
              const SizedBox(height: 16),
              if (p.allergies != null && p.allergies!.isNotEmpty) ...[
                FeatureCard(
                  icon: Icons.warning_amber,
                  title: 'Allergy warning',
                  subtitle: p.allergies!,
                  trailing: StatusPill(
                    label: 'Important',
                    color: colors.error,
                    icon: Icons.priority_high,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Address details', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Text(p.actualAddress ?? 'No address recorded'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
        const SectionHeader(title: 'Medical timeline history'),
        historyAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, s) => Text('Error loading history: $err'),
          data: (history) {
            if (history.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Text('No historical visits found.'),
              );
            }

            return Column(
              children: [
                for (final item in history) ...[
                  Builder(builder: (context) {
                    final entry = item as Map<String, dynamic>;
                    final date = DateTime.tryParse(entry['date']?.toString() ?? '');
                    return FeatureCard(
                      icon: Icons.history,
                      title: entry['title']?.toString() ?? entry['type']?.toString() ?? 'Clinical event',
                      subtitle: '${date != null ? DateFormat('MMM dd, yyyy').format(date) : "Unknown date"} - ${entry['description'] ?? ""}',
                      trailing: const Icon(Icons.chevron_right),
                    );
                  }),
                  const SizedBox(height: 10),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}

class _PatientRecordsWorkspace extends ConsumerWidget {
  const _PatientRecordsWorkspace({required this.profile});

  final PatientProfileResponse profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).colorScheme;

    final historyAsync = ref.watch(patientHistoryProvider(profile.patientId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Record summary'),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.summarize_outlined, color: colors.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Medical details summary',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusPill(label: 'Allergies: ${profile.allergies ?? "None recorded"}'),
                    StatusPill(label: 'Chronics: ${profile.chronicConditions ?? "None recorded"}'),
                    StatusPill(label: 'Surgeries: ${profile.pastSurgeries ?? "None recorded"}'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        const SectionHeader(title: 'Clinical timeline history'),
        historyAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, s) => Text('Error loading history: $err'),
          data: (history) {
            if (history.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Text('No historical visits found.'),
              );
            }

            return Column(
              children: [
                for (final item in history) ...[
                  Builder(builder: (context) {
                    final entry = item as Map<String, dynamic>;
                    final date = DateTime.tryParse(entry['date']?.toString() ?? '');
                    return FeatureCard(
                      icon: Icons.event_note_outlined,
                      title: entry['title']?.toString() ?? entry['type']?.toString() ?? 'Clinical event',
                      subtitle: '${date != null ? DateFormat('MMM dd, yyyy').format(date) : "Unknown date"} - ${entry['description'] ?? ""}',
                      trailing: const Icon(Icons.chevron_right),
                    );
                  }),
                  const SizedBox(height: 10),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}
