using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;

namespace SCMS.Database.Seeding
{
    public class MassDatabaseSeeder
    {
        private readonly AppDbContext _context;
        private static readonly string YyyyMmDdFormat = "yyyy-MM-dd";
        private static readonly string YyyyMmDdCompactFormat = "yyyyMMdd";

        public MassDatabaseSeeder(AppDbContext context)
        {
            _context = context;
        }

        public async Task Seed1YearDataAsync()
        {
            Console.WriteLine("--------------------------------------------------");
            Console.WriteLine("Starting Mass Database Seeder...");
            Console.WriteLine("Generating 1 year of realistic clinical data...");
            Console.WriteLine("--------------------------------------------------");

            // 1. Wipe database cleanly depending on provider
            var provider = _context.Database.ProviderName ?? string.Empty;
            if (provider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) || provider.Contains("PostgreSql", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(@"
                        DO $$ DECLARE
                            r RECORD;
                        BEGIN
                            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                                EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
                            END LOOP;
                            FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                                EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
                            END LOOP;
                        END $$;
                    ");
                }
                catch
                {
                    // Fallback to table deletion in order
                    await CleanTablesViaEfAsync();
                }
            }
            else
            {
                // SQLite clean reset
                await _context.Database.EnsureDeletedAsync();
                await _context.Database.EnsureCreatedAsync();
            }

            // Load base seed data if seed.realworld.sql exists
            var seedFilePath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "..", "seed.realworld.sql");
            if (System.IO.File.Exists(seedFilePath) && !provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var sql = await System.IO.File.ReadAllTextAsync(seedFilePath);
                    var connection = _context.Database.GetDbConnection();
                    var shouldClose = connection.State != System.Data.ConnectionState.Open;
                    if (shouldClose) await connection.OpenAsync();

                    try
                    {
                        await using var command = connection.CreateCommand();
                        command.CommandText = sql;
                        await command.ExecuteNonQueryAsync();
                    }
                    finally
                    {
                        if (shouldClose) await connection.CloseAsync();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Base SQL seed note: {ex.Message}");
                }
            }

            // Seed configuration
            int numPatients = 200;
            int daysToSimulate = 365;
            var random = new Random(42); // Deterministic seed for reproducible testing

            // Vocabulary for Myanmar names
            var maleTitles = new[] { "U", "Ko", "Mg" };
            var femaleTitles = new[] { "Daw", "Ma" };
            var nameParts = new[] { "Aung", "Moe", "Tun", "Phyu", "Zaw", "Lin", "Hlaing", "Min", "Khant", "Kyaw", "Swar", "Thuzar", "Aye", "Myat", "Khaing", "Wai", "Nyi", "Naing", "Soe", "Win", "Htut", "Lwin", "Thiha", "Zayar", "Thein", "Phyo", "Zin", "Thant", "Hein" };
            var symptoms = new[] { "Fever and chills", "Headache and fatigue", "Stomach ache and acid reflux", "Routine health checkup", "Follow-up hypertension visit", "Cough and sore throat", "Body ache and muscle stiffness", "Skin allergy and rash", "High blood pressure check" };
            var paymentMethods = new[] { "Cash", "OnlinePayment" };
            var bloodTypes = new[] { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-" };
            var allergiesPool = new[] { "None Known", "Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "Peanuts", "Dust mites", "Paracetamol" };
            var chronicConditionsPool = new[] { "None", "Hypertension", "Type 2 Diabetes", "Asthma", "Hyperlipidemia", "Chronic Gastritis", "Allergic Rhinitis" };

            string GenerateName(bool isMale)
            {
                var title = isMale ? maleTitles[random.Next(maleTitles.Length)] : femaleTitles[random.Next(femaleTitles.Length)];
                int partsCount = random.Next(1, 4);
                var parts = new List<string>();
                for (int i = 0; i < partsCount; i++)
                {
                    string part;
                    do { part = nameParts[random.Next(nameParts.Length)]; } while (parts.Contains(part));
                    parts.Add(part);
                }
                return $"{title} {string.Join(" ", parts)}";
            }

            // 1. Ensure Staff Accounts Exist
            var existingAdmin = await _context.TblUsers.FirstOrDefaultAsync(u => u.Email == "admin@scms.demo");
            if (existingAdmin == null)
            {
                var adminUser = new TblUser
                {
                    Name = "Dr. Thandar (Chief Medical Officer)",
                    Email = "admin@scms.demo",
                    MobileNo = "09770000001",
                    PasswordHash = "demo-password-hash",
                    CreatedAt = DateTime.UtcNow.AddYears(-2),
                    UpdatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                adminUser.TblUserRoles.Add(new TblUserRole { Role = "owner" });
                adminUser.TblUserRoles.Add(new TblUserRole { Role = "admin" });
                _context.TblUsers.Add(adminUser);
            }

            var existingDoctor = await _context.TblUsers.FirstOrDefaultAsync(u => u.Email == "doctor@scms.demo");
            if (existingDoctor == null)
            {
                var docUser = new TblUser
                {
                    Name = "Dr. Kyaw Zin (Consultant Physician)",
                    Email = "doctor@scms.demo",
                    MobileNo = "09770000002",
                    PasswordHash = "demo-password-hash",
                    CreatedAt = DateTime.UtcNow.AddYears(-2),
                    UpdatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                docUser.TblUserRoles.Add(new TblUserRole { Role = "doctor" });
                _context.TblUsers.Add(docUser);
            }
            await _context.SaveChangesAsync();

            // 2. Generate Patients and Users
            var newUsers = new List<TblUser>();
            var newPatients = new List<TblPatient>();
            var userGenderMap = new Dictionary<string, bool>();

            for (int i = 0; i < numPatients; i++)
            {
                bool isMale = i % 2 == 0;
                var fullName = GenerateName(isMale);
                var email = $"patient_{i + 1:D4}@example.com";
                var mobile = $"097{8000000 + i:D7}";
                var createdDate = DateTime.UtcNow.AddDays(-random.Next(daysToSimulate, daysToSimulate + 100));

                userGenderMap[email] = isMale;

                var user = new TblUser
                {
                    Name = fullName,
                    Email = email,
                    MobileNo = mobile,
                    PasswordHash = "demo-password-hash",
                    CreatedAt = createdDate,
                    UpdatedAt = createdDate,
                    DeleteFlag = false
                };
                user.TblUserRoles.Add(new TblUserRole { Role = "user" });
                newUsers.Add(user);
            }

            Console.WriteLine($"Creating {numPatients} users and patient profiles...");
            await _context.TblUsers.AddRangeAsync(newUsers);
            await _context.SaveChangesAsync();

            foreach (var user in newUsers)
            {
                bool isMale = userGenderMap.GetValueOrDefault(user.Email!, false);
                var dob = DateTime.UtcNow.AddYears(-random.Next(10, 75)).AddDays(-random.Next(0, 365));

                var patient = new TblPatient
                {
                    UserId = user.UserId,
                    Name = user.Name,
                    MobileNo = user.MobileNo,
                    Email = user.Email,
                    DateOfBirth = DateOnly.FromDateTime(dob),
                    Gender = isMale ? "male" : "female",
                    BloodType = bloodTypes[random.Next(bloodTypes.Length)],
                    Address = "Yangon, Myanmar",
                    Allergies = allergiesPool[random.Next(allergiesPool.Length)],
                    ChronicConditions = chronicConditionsPool[random.Next(chronicConditionsPool.Length)],
                    PastSurgeries = random.NextDouble() > 0.8 ? "Appendectomy (2020)" : "None",
                    FamilyHistory = random.NextDouble() > 0.7 ? "Family history of Type 2 Diabetes and Hypertension" : "No known significant family history",
                    VaccinationHistory = "COVID-19 (3 doses), Hepatitis B, Influenza (annual)",
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.CreatedAt,
                    DeleteFlag = false
                };
                newPatients.Add(patient);
            }

            await _context.TblPatients.AddRangeAsync(newPatients);
            await _context.SaveChangesAsync();

            // 3. Generate 30 Diseases
            Console.WriteLine("Creating 30 clinical diseases...");
            var diseaseNames = new[]
            {
                "Hypertension", "Type 2 Diabetes", "Asthma", "Bronchitis", "Pneumonia",
                "Gastritis", "Peptic Ulcer", "Urinary Tract Infection", "Dengue Fever", "Malaria",
                "Typhoid Fever", "Tuberculosis", "Hepatitis B", "Hepatitis A", "Chickenpox",
                "Influenza", "COVID-19", "Migraine", "Osteoarthritis", "Rheumatoid Arthritis",
                "Anemia", "Conjunctivitis", "Otitis Media", "Sinusitis", "Tonsillitis",
                "Eczema", "Psoriasis", "Allergic Rhinitis", "Vertigo", "Gout"
            };
            var diseaseDescriptions = new[]
            {
                "Elevated arterial blood pressure requiring continuous lifestyle and pharmacological management",
                "Chronic metabolic disorder characterized by hyperglycemia and insulin resistance",
                "Chronic airway inflammation with bronchial hyperresponsiveness and reversible airflow obstruction",
                "Inflammation of the mucous membrane in the bronchial tubes",
                "Infection that inflames air sacs in one or both lungs which may fill with fluid",
                "Inflammation, irritation, or erosion of the lining of the stomach",
                "Painful sores in the stomach lining or small intestine",
                "Bacterial infection affecting any part of the urinary tract",
                "Mosquito-borne tropical disease caused by the dengue virus",
                "Life-threatening disease caused by parasites that are transmitted through the bites of infected female Anopheles mosquitoes",
                "Bacterial infection caused by Salmonella typhi",
                "Potentially serious infectious disease that mainly affects the lungs",
                "Serious liver infection caused by the hepatitis B virus",
                "Highly contagious liver infection caused by the hepatitis A virus",
                "Highly contagious viral infection causing an itchy, blister-like rash on the skin",
                "Common viral infection that attacks respiratory system",
                "Contagious respiratory illness caused by SARS-CoV-2",
                "Neurological condition characterized by intense, debilitating headaches",
                "Most common form of arthritis caused by protective cartilage wearing down",
                "Chronic autoimmune inflammatory disorder affecting joints",
                "Condition marked by a deficiency of red blood cells or of hemoglobin in the blood",
                "Inflammation or infection of the outer membrane of the eyeball and the inner eyelid",
                "Inflammation or infection of the middle ear",
                "Inflammation or swelling of the tissue lining the sinuses",
                "Inflammation of the pharyngeal tonsils usually caused by viral or bacterial infection",
                "Condition where patches of skin become inflamed, itchy, red, cracked, and rough",
                "Skin disorder that causes skin cells to multiply up to 10 times faster than normal",
                "Inflammation of the inside of the nose caused by an allergen",
                "Sensation of feeling off balance or experiencing a spinning sensation",
                "Common and complex form of arthritis characterized by sudden, severe attacks of pain"
            };

            var existingDiseases = await _context.TblDiseases.Select(d => d.Name).ToListAsync();
            for (int i = 0; i < diseaseNames.Length; i++)
            {
                if (existingDiseases.Contains(diseaseNames[i])) continue;
                _context.TblDiseases.Add(new TblDisease
                {
                    Name = diseaseNames[i],
                    Description = diseaseDescriptions[i],
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
            }
            await _context.SaveChangesAsync();

            // 4. Generate Medicine Catalog & Batches
            Console.WriteLine("Creating medicines and inventory batches...");
            var medCategories = new[] { "Antibiotics", "Analgesics", "Antihypertensives", "Antidiabetics", "Antihistamines", "Gastrointestinal", "Vitamins & Minerals" };
            var existingCats = await _context.TblMedicineCategories.ToListAsync();
            if (existingCats.Count == 0)
            {
                foreach (var cat in medCategories)
                {
                    _context.TblMedicineCategories.Add(new TblMedicineCategory { Name = cat });
                }
                await _context.SaveChangesAsync();
                existingCats = await _context.TblMedicineCategories.ToListAsync();
            }

            var medPrefixes = new[] { "Amoxi", "Para", "Cetra", "Metro", "Aspi", "Ibu", "Ome", "Vita", "Dexam", "Lorat", "Amlodi", "Metfor", "Atorva", "Cipro", "Azithro" };
            var medSuffixes = new[] { "cillin", "cetamol", "zine", "nidazole", "rin", "profen", "prazole", "min", "thasone", "dine", "pine", "min", "statin", "floxacin", "mycin" };

            var extraMedicines = new List<TblMedicine>();
            for (int i = 0; i < 50; i++)
            {
                var name = $"{medPrefixes[random.Next(medPrefixes.Length)]}{medSuffixes[random.Next(medSuffixes.Length)]} {random.Next(1, 10) * 100}mg";
                var category = existingCats[random.Next(existingCats.Count)];
                extraMedicines.Add(new TblMedicine
                {
                    CategoryId = category.Id,
                    Name = name,
                    Description = $"Standard pharmaceutical grade {name}",
                    UnitPrice = random.Next(5, 50) * 100,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
            }
            await _context.TblMedicines.AddRangeAsync(extraMedicines);
            await _context.SaveChangesAsync();

            var allMedicines = await _context.TblMedicines.ToListAsync();
            var batches = new List<TblMedicineBatch>();
            foreach (var med in allMedicines)
            {
                for (int b = 1; b <= 3; b++)
                {
                    batches.Add(new TblMedicineBatch
                    {
                        MedId = med.MedicineId,
                        BatchNo = $"BAT-{med.MedicineId:D3}-{b:D2}",
                        Quantity = random.Next(50, 500),
                        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(random.Next(3, 24))),
                        ReceivedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-random.Next(1, 6))),
                        SupplierName = "Myanmar Mega Pharmacy Distribution Co., Ltd",
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }
            }
            await _context.TblMedicineBatches.AddRangeAsync(batches);
            await _context.SaveChangesAsync();

            // 5. Generate 1 Year of Clinical Timeline (Appointments, Prescriptions, Payments, FollowUps)
            var allDiseases = await _context.TblDiseases.ToListAsync();
            var startDate = DateTime.UtcNow.AddDays(-daysToSimulate).Date;
            var endDate = DateTime.UtcNow.Date;

            Console.WriteLine($"Simulating appointments, vitals, prescriptions, and payments from {startDate.ToString(YyyyMmDdFormat)} to {endDate.ToString(YyyyMmDdFormat)}...");

            int appointmentCounter = 0;
            var appointmentsToSave = new List<TblAppointment>();

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                int apptsToday = random.Next(4, 10);
                for (int i = 0; i < apptsToday; i++)
                {
                    appointmentCounter++;
                    var patient = newPatients[random.Next(newPatients.Count)];
                    var time = date.AddHours(8).AddMinutes(i * 20);

                    var randomSuffix = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..4];
                    var appointmentCode = $"APT-{date.ToString(YyyyMmDdCompactFormat)}-{(i + 1):D3}-{randomSuffix}";

                    string status = "completed";
                    if (date > DateTime.UtcNow.Date)
                    {
                        status = random.NextDouble() > 0.5 ? "confirmed" : "pending";
                    }
                    else if (random.NextDouble() > 0.92)
                    {
                        status = "cancelled";
                    }

                    var appt = new TblAppointment
                    {
                        AppointmentCode = appointmentCode,
                        PatientId = patient.PatientId,
                        Datetime = time,
                        Status = status,
                        Notes = symptoms[random.Next(symptoms.Length)],
                        CreatedAt = time.AddDays(-random.Next(1, 5)),
                        UpdatedAt = time
                    };

                    appointmentsToSave.Add(appt);
                }
            }

            await _context.TblAppointments.AddRangeAsync(appointmentsToSave);
            await _context.SaveChangesAsync();

            // 6. Generate Clinical Artifacts for Completed Appointments
            var completedAppts = await _context.TblAppointments
                .Where(a => a.Status == "completed")
                .ToListAsync();

            Console.WriteLine($"Generating clinical records for {completedAppts.Count} completed consultations...");

            int chunkSize = 250;
            for (int i = 0; i < completedAppts.Count; i += chunkSize)
            {
                var chunk = completedAppts.Skip(i).Take(chunkSize).ToList();
                var prescriptions = new List<TblPrescription>();
                var payments = new List<TblPayment>();
                var followUps = new List<TblFollowUp>();

                foreach (var appt in chunk)
                {
                    var disease = allDiseases[random.Next(allDiseases.Count)];
                    var weight = random.Next(45, 85) + Math.Round(random.NextDouble(), 1);
                    var height = random.Next(150, 180);
                    var bmi = Math.Round(weight / Math.Pow(height / 100.0, 2), 2);

                    var rx = new TblPrescription
                    {
                        AppointmentId = appt.Id,
                        PatientId = appt.PatientId,
                        DiseaseId = disease.Id,
                        WeightKg = weight,
                        BloodPressureSystolic = random.Next(110, 145),
                        BloodPressureDiastolic = random.Next(70, 95),
                        TemperatureC = 36.5 + Math.Round(random.NextDouble() * 1.5, 1),
                        PulseBpm = random.Next(68, 92),
                        Spo2Percent = random.Next(96, 100),
                        HeightCm = height,
                        Bmi = bmi,
                        Notes = $"Consultation note for {disease.Name}. Patient presented with {appt.Notes}.",
                        LabTestRequests = random.NextDouble() > 0.7 ? "Complete Blood Count (CBC), Fasting Blood Glucose" : null,
                        CreatedAt = appt.Datetime.AddMinutes(15),
                        UpdatedAt = appt.Datetime.AddMinutes(15),
                        DeleteFlag = false
                    };

                    // Add 1-3 prescription line items
                    int medItemsCount = random.Next(1, 4);
                    for (int m = 0; m < medItemsCount; m++)
                    {
                        var med = allMedicines[random.Next(allMedicines.Count)];
                        var rxItem = new TblPrescriptionItem
                        {
                            MedicineId = med.MedicineId,
                            Dosage = "1 tablet",
                            Days = random.Next(5, 14),
                            Quantity = random.Next(10, 30),
                            Instruction = "Take orally after meal twice daily",
                            CreatedAt = rx.CreatedAt,
                            DeleteFlag = false
                        };
                        rx.TblPrescriptionItems.Add(rxItem);
                    }
                    prescriptions.Add(rx);

                    // Add Payment
                    decimal[] exactAmounts = { 10000m, 15000m, 20000m, 25000m, 35000m, 50000m };
                    decimal amount = exactAmounts[random.Next(exactAmounts.Length)];
                    payments.Add(new TblPayment
                    {
                        AppointmentId = appt.Id,
                        Amount = amount,
                        Tax = amount * 0.05m,
                        Charges = 0,
                        PaymentMethod = paymentMethods[random.Next(paymentMethods.Length)],
                        PaymentStatus = "paid",
                        PaymentScreenshot = "/uploads/payments/demo-receipt.png",
                        TransactionRef = "661073",
                        PaidAt = appt.Datetime.AddMinutes(20),
                        UpdatedAt = appt.Datetime.AddMinutes(20)
                    });

                    // Follow up
                    if (random.NextDouble() > 0.65)
                    {
                        followUps.Add(new TblFollowUp
                        {
                            PatientId = appt.PatientId,
                            AppointmentId = appt.Id,
                            DueAt = appt.Datetime.AddDays(random.Next(7, 28)),
                            Recommendation = $"Follow-up assessment for {disease.Name} response.",
                            Status = "pending",
                            CreatedAt = appt.Datetime,
                            UpdatedAt = appt.Datetime,
                            DeleteFlag = false
                        });
                    }
                }

                await _context.TblPrescriptions.AddRangeAsync(prescriptions);
                await _context.TblPayments.AddRangeAsync(payments);
                await _context.TblFollowUps.AddRangeAsync(followUps);
                await _context.SaveChangesAsync();
            }

            Console.WriteLine("--------------------------------------------------");
            Console.WriteLine("Universal Mass Database Seeder completed successfully!");
            Console.WriteLine($"Total Patients: {numPatients}, Total Appointments: {appointmentCounter}");
            Console.WriteLine("--------------------------------------------------");
        }

        private async Task CleanTablesViaEfAsync()
        {
            _context.TblPrescriptionItemSchedules.RemoveRange(_context.TblPrescriptionItemSchedules);
            _context.TblPrescriptionItems.RemoveRange(_context.TblPrescriptionItems);
            _context.TblPrescriptions.RemoveRange(_context.TblPrescriptions);
            _context.TblPayments.RemoveRange(_context.TblPayments);
            _context.TblFollowUps.RemoveRange(_context.TblFollowUps);
            _context.TblNotifications.RemoveRange(_context.TblNotifications);
            _context.TblAppointments.RemoveRange(_context.TblAppointments);
            _context.TblMedicineBatches.RemoveRange(_context.TblMedicineBatches);
            _context.TblMedicines.RemoveRange(_context.TblMedicines);
            _context.TblDiseases.RemoveRange(_context.TblDiseases);
            _context.TblPatients.RemoveRange(_context.TblPatients);
            _context.TblUserTokens.RemoveRange(_context.TblUserTokens);
            _context.TblUserRoles.RemoveRange(_context.TblUserRoles);
            _context.TblUsers.RemoveRange(_context.TblUsers);
            await _context.SaveChangesAsync();
        }
    }
}
