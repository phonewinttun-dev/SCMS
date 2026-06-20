import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:signalr_netcore/signalr_client.dart';

import '../../../core/realtime/signalr_service.dart';
import '../../../shared/widgets/home_widgets.dart';
import '../../../shared/widgets/scms_app_shell.dart';
import '../../auth/application/auth_controller.dart';
import '../application/appointments_controller.dart';
import '../domain/appointment_models.dart';

class AppointmentsPage extends ConsumerStatefulWidget {
  const AppointmentsPage({super.key});

  @override
  ConsumerState<AppointmentsPage> createState() => _AppointmentsPageState();
}

class _AppointmentsPageState extends ConsumerState<AppointmentsPage> {
  HubConnection? _queueConnection;

  @override
  void initState() {
    super.initState();
    _connectQueueHub();
  }

  Future<void> _connectQueueHub() async {
    final connection = ref.read(signalRServiceProvider).queueHub();
    connection.on('QueueUpdated', (_) {
      ref.read(appointmentsControllerProvider.notifier).fetchAppointments();
    });

    try {
      await connection.start();
      await connection.invoke('WatchClinicQueue');
      _queueConnection = connection;
    } catch (_) {
      // Realtime is additive; polling/manual refresh still works.
    }
  }

  @override
  void dispose() {
    _queueConnection?.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final session = authState.hasValue ? authState.value : null;
    final isStaff = session?.role == 'owner' || session?.role == 'doctor' || session?.role == 'admin';

    final state = ref.watch(appointmentsControllerProvider);
    final notifier = ref.read(appointmentsControllerProvider.notifier);

    final ranges = const ['Day', 'Week', 'Month'];
    final statuses = const ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

    final rangeIndex = ranges.indexOf(state.selectedRange).clamp(0, 2);
    final statusIndex = statuses.indexOf(state.selectedStatus).clamp(0, 4);

    return ScmsAppShell(
      title: isStaff ? 'Appointments' : 'Book & queue',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (isStaff)
            _StaffAppointmentTools(
              rangeIndex: rangeIndex,
              onCallNext: () async {
                try {
                  await notifier.callNext();
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Called next patient in queue')),
                  );
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              },
            )
          else
            _PatientBookingPanel(
              onBook: (patientId, datetime, notes) async {
                try {
                  await notifier.book(patientId, datetime, notes: notes);
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Appointment booked successfully!')),
                  );
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              },
            ),
          const SizedBox(height: 18),
          _SegmentedRange(
            selectedIndex: rangeIndex,
            onChanged: (index) => notifier.changeRange(ranges[index]),
            labels: ranges,
          ),
          const SizedBox(height: 12),
          _StatusFilters(
            selectedIndex: statusIndex,
            onChanged: (index) => notifier.changeStatus(statuses[index]),
            labels: statuses,
          ),
          const SizedBox(height: 18),
          if (state.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ),
            )
          else if (state.errorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 40),
                    const SizedBox(height: 12),
                    Text('Error: ${state.errorMessage}'),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => notifier.fetchAppointments(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          else if (state.appointments.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Text('No appointments found for this selection'),
              ),
            )
          else ...[
            SectionHeader(title: isStaff ? 'Schedule queue' : 'Your appointments'),
            for (final appointment in state.appointments) ...[
              if (isStaff)
                _StaffAppointmentCard(
                  appointment: appointment,
                  onApprove: () async {
                    await notifier.updateStatus(appointment.id, 'confirmed');
                  },
                  onCancel: () async {
                    await notifier.updateStatus(appointment.id, 'cancelled');
                  },
                )
              else
                _PatientAppointmentCard(
                  appointment: appointment,
                ),
              const SizedBox(height: 10),
            ],
          ]
        ],
      ),
    );
  }
}

class _StaffAppointmentTools extends StatelessWidget {
  const _StaffAppointmentTools({
    required this.rangeIndex,
    required this.onCallNext,
  });

  final int rangeIndex;
  final VoidCallback onCallNext;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const StatusPill(label: 'Today', icon: Icons.calendar_today),
                const Spacer(),
                Text(
                  rangeIndex == 0
                      ? 'Daily Overview'
                      : rangeIndex == 1
                          ? 'Weekly Overview'
                          : 'Monthly Overview',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Manage approvals, reschedules, completions, and the live queue.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                QuickAction(
                  icon: Icons.skip_next,
                  label: 'Call next',
                  onPressed: onCallNext,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PatientBookingPanel extends StatefulWidget {
  const _PatientBookingPanel({required this.onBook});

  final Function(int patientId, DateTime datetime, String? notes) onBook;

  @override
  State<_PatientBookingPanel> createState() => _PatientBookingPanelState();
}

class _PatientBookingPanelState extends State<_PatientBookingPanel> {
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Card(
      color: colors.primaryContainer,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Book an appointment',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: colors.onPrimaryContainer,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Choose a family member, share a brief reason, and get queue timing after confirmation.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colors.onPrimaryContainer.withValues(alpha: 0.78),
                  ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: () => _showBookModal(context),
                  icon: const Icon(Icons.add),
                  label: const Text('New booking'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showBookModal(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Book Appointment',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              // Simulating patient profile selection
              const Text('Patient ID: 42 (Aung Min)'),
              const SizedBox(height: 16),
              TextField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Symptom/Reason',
                  hintText: 'e.g. Fever, cough, follow-up',
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  widget.onBook(
                    42, // Aung Min's seeded ID
                    DateTime.now().add(const Duration(days: 1)), // Book for tomorrow
                    _notesController.text.trim(),
                  );
                  _notesController.clear();
                },
                child: const Text('Confirm Booking'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}

class _SegmentedRange extends StatelessWidget {
  const _SegmentedRange({
    required this.selectedIndex,
    required this.onChanged,
    required this.labels,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<int>(
      segments: [
        for (var index = 0; index < labels.length; index++)
          ButtonSegment(value: index, label: Text(labels[index])),
      ],
      selected: {selectedIndex},
      onSelectionChanged: (values) => onChanged(values.first),
    );
  }
}

class _StatusFilters extends StatelessWidget {
  const _StatusFilters({
    required this.selectedIndex,
    required this.onChanged,
    required this.labels,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final selected = selectedIndex == index;

          return ChoiceChip(
            label: Text(labels[index]),
            selected: selected,
            onSelected: (_) => onChanged(index),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemCount: labels.length,
      ),
    );
  }
}

class _StaffAppointmentCard extends StatelessWidget {
  const _StaffAppointmentCard({
    required this.appointment,
    required this.onApprove,
    required this.onCancel,
  });

  final AppointmentDetailsResponse appointment;
  final VoidCallback onApprove;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final timeStr = DateFormat('hh:mm a').format(appointment.datetime);
    final isPending = appointment.status.toLowerCase() == 'pending';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: FeatureCard(
        icon: Icons.event_note_outlined,
        title: '$timeStr - ${appointment.patientName}',
        subtitle: '${appointment.notes ?? "No notes"} - token #${appointment.tokenNumber}',
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            StatusPill(
              label: appointment.status,
              color: appointment.status.toLowerCase() == 'pending'
                  ? colors.tertiary
                  : appointment.status.toLowerCase() == 'cancelled'
                      ? colors.error
                      : colors.primary,
            ),
            if (isPending) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 4,
                children: [
                  IconButton(
                    onPressed: onApprove,
                    icon: Icon(
                      Icons.check_circle_outline,
                      size: 20,
                      color: colors.primary,
                    ),
                  ),
                  IconButton(
                    onPressed: onCancel,
                    icon: Icon(Icons.close, size: 20, color: colors.error),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PatientAppointmentCard extends StatelessWidget {
  const _PatientAppointmentCard({required this.appointment});

  final AppointmentDetailsResponse appointment;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final dateStr = DateFormat('MMM dd, hh:mm a').format(appointment.datetime);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: FeatureCard(
        icon: Icons.medical_services_outlined,
        title: '$dateStr - ${appointment.clinicDoctorName}',
        subtitle: '${appointment.patientName} - ${appointment.notes ?? "No notes"}',
        trailing: StatusPill(
          label: appointment.status,
          color: appointment.status.toLowerCase() == 'confirmed' ? colors.primary : colors.tertiary,
        ),
      ),
    );
  }
}
