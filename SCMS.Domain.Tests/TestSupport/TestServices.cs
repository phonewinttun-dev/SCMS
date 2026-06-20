using SCMS.Domain.Features.Appointments;
using SCMS.Domain.Features.Notifications;
using SCMS.Domain.Features.Patients;
using SCMS.Domain.Features.Prescriptions;

namespace SCMS.Domain.Tests.TestSupport;

public static class TestServices
{
    public static AppointmentsService CreateAppointmentsService(TestDatabase db)
        => new(db.Context, new NotificationService(db.Context));

    public static PatientService CreatePatientService(TestDatabase db)
        => new(
            db.Context,
            CreateAppointmentsService(db),
            new PrescriptionService(db.Context));
}
