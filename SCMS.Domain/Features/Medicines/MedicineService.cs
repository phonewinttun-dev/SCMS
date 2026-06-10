using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Medicines;
using SCMS.Shared;
using SCMS.Domain.Features.Photo;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.Medicines
{
    public class MedicineService
    {
        private readonly AppDbContext _context;
        private readonly PhotoService? _photoService;
        private readonly NotificationService? _notificationService;
        private const int LowStockThreshold = 20;

        public MedicineService(AppDbContext context, NotificationService? notificationService = null, PhotoService? photoService = null)
        {
            _context = context;
            _notificationService = notificationService;
            _photoService = photoService;
        }

        public async Task<PagedResult<MedicineSearchResponse>> SearchMedicinesAsync(string? query, PaginationRequest paginationRequest)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            
            var baseQuery = _context.TblMedicines
                .Include(m => m.Category)
                .Include(m => m.TblMedicineBatches)
                .Where(m => m.DeleteFlag != true);

            if (!string.IsNullOrEmpty(query))
            {
                var q = query.ToLower().Trim();
                baseQuery = baseQuery.Where(m => m.Name.ToLower().Contains(q) || (m.Description != null && m.Description.ToLower().Contains(q)));
            }

            var totalCount = await baseQuery.CountAsync();
            var medicines = await baseQuery
                .OrderBy(m => m.Name)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = new List<MedicineSearchResponse>();

            foreach (var m in medicines)
            {
                // Filter out expired batches
                var activeBatches = m.TblMedicineBatches
                    .Where(b => b.DeleteFlag != true && b.Status == "active" && b.ExpiryDate > today && b.Quantity > 0)
                    .OrderBy(b => b.ExpiryDate) // FIFO ordering by default
                    .Select(b => new BatchInfoResponse
                    {
                        Id = b.Id,
                        BatchNo = b.BatchNo,
                        Quantity = b.Quantity,
                        ExpiryDate = b.ExpiryDate,
                        ReceivedDate = b.ReceivedDate,
                        SupplierName = b.SupplierName,
                        Status = b.Status
                    })
                    .ToList();

                var totalStock = activeBatches.Sum(b => b.Quantity);
                var nearExpiry = activeBatches.Any(b => b.ExpiryDate <= today.AddDays(30));
                var lowStock = totalStock < LowStockThreshold;

                list.Add(new MedicineSearchResponse
                {
                    MedicineId = m.MedicineId,
                    CategoryId = m.CategoryId,
                    CategoryName = m.Category?.Name,
                    Name = m.Name,
                    Description = m.Description,
                    ImageUrl = m.ImageUrl,
                    ImageId = null,
                    UnitPrice = m.UnitPrice,
                    TotalStock = totalStock,
                    ActiveBatches = activeBatches,
                    HasLowStockWarning = lowStock,
                    HasNearExpiryWarning = nearExpiry
                });
            }

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<MedicineSearchResponse>.Success(list, pagination);
        }

        public async Task<Result> QuarantineExpiredBatchesAsync()
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            
            // Find active batches that have passed expiry date
            var expiredBatches = await _context.TblMedicineBatches
                .Where(b => b.Status == "active" && b.ExpiryDate <= today && b.DeleteFlag != true)
                .ToListAsync();

            if (expiredBatches.Count == 0)
            {
                return Result.Success("No new expired batches found to quarantine.");
            }

            foreach (var batch in expiredBatches)
            {
                batch.Status = "quarantined";
                batch.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Result.Success($"Quarantined {expiredBatches.Count} expired batch(es) successfully.");
        }

        public async Task<PagedResult<InventoryAlertResponse>> GetInventoryAlertsAsync(PaginationRequest paginationRequest)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var thirtyDaysFromNow = today.AddDays(30);

            // Fetch active medicine batches
            var activeBatches = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .Where(b => b.Status == "active" && b.ExpiryDate > today && b.DeleteFlag != true)
                .ToListAsync();

            var alerts = new List<InventoryAlertResponse>();

            // Group by medicine to evaluate total stock
            var grouped = activeBatches.GroupBy(b => b.MedId);

            foreach (var group in grouped)
            {
                var medId = group.Key;
                var batches = group.ToList();
                var medName = batches.First().Med?.Name ?? "Unknown";

                var totalStock = batches.Sum(b => b.Quantity);
                if (totalStock < LowStockThreshold)
                {
                    alerts.Add(new InventoryAlertResponse
                    {
                        MedicineId = medId,
                        MedicineName = medName,
                        CurrentQuantity = totalStock,
                        AlertType = "Low Stock",
                        Message = $"Total stock for {medName} is low ({totalStock} remaining, threshold is {LowStockThreshold})."
                    });
                }

                // Check individual batches for expiry
                foreach (var b in batches)
                {
                    if (b.ExpiryDate <= thirtyDaysFromNow)
                    {
                        alerts.Add(new InventoryAlertResponse
                        {
                            MedicineId = medId,
                            MedicineName = medName,
                            BatchId = b.Id,
                            BatchNo = b.BatchNo,
                            CurrentQuantity = b.Quantity,
                            ExpiryDate = b.ExpiryDate,
                            AlertType = "Nearing Expiry",
                            Message = $"Batch {b.BatchNo} of {medName} is expiring on {b.ExpiryDate:dd-MM-yyyy} (in {(b.ExpiryDate.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow).Days} days)."
                        });
                    }
                }
            }

            var totalCount = alerts.Count;
            var pagedAlerts = alerts
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToList();

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<InventoryAlertResponse>.Success(pagedAlerts, pagination);
        }

        public async Task CreateInventoryAlertNotificationsAsync()
        {
            var alerts = await GetInventoryAlertsAsync(new PaginationRequest { PageNumber = 1, PageSize = 100 });
            if (!alerts.IsSuccess)
            {
                return;
            }

            foreach (var alert in alerts.Data)
            {
                var title = alert.AlertType == "Low Stock" ? "Low Stock Alert" : "Batch Nearing Expiry";
                var recentExists = await _context.TblNotifications.AnyAsync(n =>
                    n.UserId == null &&
                    n.Title == title &&
                    n.Description == alert.Message &&
                    n.CreatedAt >= DateTime.UtcNow.AddHours(-24) &&
                    n.DeleteFlag != true);

                if (recentExists)
                {
                    continue;
                }

                if (_notificationService != null)
                {
                    await _notificationService.CreateNotificationAsync(null, title, alert.Message, "/inventory");
                }
                else
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = null,
                        Title = title,
                        Description = alert.Message,
                        ActionRoute = "/inventory",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                    await _context.SaveChangesAsync();
                }
            }
        }

        // ────────────────────────────────────────────────────────────────
        // Medicine Batch CRUD
        // ────────────────────────────────────────────────────────────────

        private static readonly HashSet<string> AllowedBatchStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active", "expired", "disposed", "quarantined"
        };

        public async Task<PagedResult<BatchDetailResponse>> GetBatchesAsync(
            string? query,
            string? status,
            int? medicineId,
            string? sortBy,
            bool sortDescending,
            PaginationRequest paginationRequest)
        {
            var baseQuery = _context.TblMedicineBatches
                .Include(b => b.Med)
                .Where(b => b.DeleteFlag != true);

            // Filter by medicine id
            if (medicineId.HasValue)
            {
                baseQuery = baseQuery.Where(b => b.MedId == medicineId.Value);
            }

            // Filter by status
            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.ToLower().Trim();
                baseQuery = baseQuery.Where(b => b.Status == s);
            }

            // Search by medicine name or batch number
            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.ToLower().Trim();
                baseQuery = baseQuery.Where(b =>
                    b.BatchNo.ToLower().Contains(q) ||
                    b.Med.Name.ToLower().Contains(q) ||
                    (b.SupplierName != null && b.SupplierName.ToLower().Contains(q)));
            }

            // Sorting
            baseQuery = (sortBy?.ToLower()) switch
            {
                "medicinename" => sortDescending
                    ? baseQuery.OrderByDescending(b => b.Med.Name)
                    : baseQuery.OrderBy(b => b.Med.Name),
                "expirydate" => sortDescending
                    ? baseQuery.OrderByDescending(b => b.ExpiryDate)
                    : baseQuery.OrderBy(b => b.ExpiryDate),
                "quantity" => sortDescending
                    ? baseQuery.OrderByDescending(b => b.Quantity)
                    : baseQuery.OrderBy(b => b.Quantity),
                "status" => sortDescending
                    ? baseQuery.OrderByDescending(b => b.Status)
                    : baseQuery.OrderBy(b => b.Status),
                "batchno" => sortDescending
                    ? baseQuery.OrderByDescending(b => b.BatchNo)
                    : baseQuery.OrderBy(b => b.BatchNo),
                _ => baseQuery.OrderBy(b => b.Med.Name).ThenBy(b => b.ExpiryDate)
            };

            var totalCount = await baseQuery.CountAsync();
            var batches = await baseQuery
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = batches.Select(MapToBatchDetail).ToList();
            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<BatchDetailResponse>.Success(list, pagination);
        }

        public async Task<Result<BatchDetailResponse>> GetBatchByIdAsync(int id)
        {
            var batch = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .FirstOrDefaultAsync(b => b.Id == id && b.DeleteFlag != true);

            if (batch == null)
            {
                return Result<BatchDetailResponse>.Failure("Batch not found.");
            }

            return Result<BatchDetailResponse>.Success(MapToBatchDetail(batch));
        }

        public async Task<Result<BatchDetailResponse>> CreateBatchAsync(CreateBatchRequest request)
        {
            // Validate medicine exists
            var medicine = await _context.TblMedicines
                .FirstOrDefaultAsync(m => m.MedicineId == request.MedId && m.DeleteFlag != true);

            if (medicine == null)
            {
                return Result<BatchDetailResponse>.Failure("Medicine not found.");
            }

            // Validate expiry date is after manufacture date
            if (request.ExpiryDate <= request.ManufactureDate)
            {
                return Result<BatchDetailResponse>.Failure("Expiry date must be after manufacture date.");
            }

            // Validate no duplicate batch number for same medicine
            var duplicateExists = await _context.TblMedicineBatches
                .AnyAsync(b => b.MedId == request.MedId && b.BatchNo == request.BatchNo && b.DeleteFlag != true);

            if (duplicateExists)
            {
                return Result<BatchDetailResponse>.Failure($"A batch with number '{request.BatchNo}' already exists for this medicine.");
            }

            // Validate status
            var batchStatus = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status.ToLower().Trim();
            if (!AllowedBatchStatuses.Contains(batchStatus))
            {
                return Result<BatchDetailResponse>.Failure("Invalid batch status. Allowed values: active, expired, disposed.");
            }

            // Validate quantity
            if (request.Quantity < 0)
            {
                return Result<BatchDetailResponse>.Failure("Quantity cannot be negative.");
            }

            var batch = new TblMedicineBatch
            {
                MedId = request.MedId,
                BatchNo = request.BatchNo,
                Quantity = request.Quantity,
                ExpiryDate = request.ExpiryDate,
                ReceivedDate = request.ReceivedDate ?? request.ManufactureDate,
                SupplierName = request.SupplierName ?? request.Manufacturer,
                Status = batchStatus,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblMedicineBatches.Add(batch);
            await _context.SaveChangesAsync();

            // Reload with navigation
            await _context.Entry(batch).Reference(b => b.Med).LoadAsync();

            // Audit log
            Console.WriteLine($"[AUDIT] Batch CREATED: Id={batch.Id}, BatchNo={batch.BatchNo}, MedId={batch.MedId}, Quantity={batch.Quantity}, Status={batch.Status}, At={DateTime.UtcNow:O}");

            return Result<BatchDetailResponse>.Success(MapToBatchDetail(batch), "Batch created successfully.");
        }

        public async Task<Result<BatchDetailResponse>> UpdateBatchAsync(int id, UpdateBatchRequest request)
        {
            var batch = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .FirstOrDefaultAsync(b => b.Id == id && b.DeleteFlag != true);

            if (batch == null)
            {
                return Result<BatchDetailResponse>.Failure("Batch not found.");
            }

            // Validate medicine exists
            var medicine = await _context.TblMedicines
                .FirstOrDefaultAsync(m => m.MedicineId == request.MedId && m.DeleteFlag != true);

            if (medicine == null)
            {
                return Result<BatchDetailResponse>.Failure("Medicine not found.");
            }

            // Validate expiry date is after manufacture date
            if (request.ExpiryDate <= request.ManufactureDate)
            {
                return Result<BatchDetailResponse>.Failure("Expiry date must be after manufacture date.");
            }

            // Validate no duplicate batch number for same medicine (exclude self)
            var duplicateExists = await _context.TblMedicineBatches
                .AnyAsync(b => b.MedId == request.MedId && b.BatchNo == request.BatchNo && b.Id != id && b.DeleteFlag != true);

            if (duplicateExists)
            {
                return Result<BatchDetailResponse>.Failure($"A batch with number '{request.BatchNo}' already exists for this medicine.");
            }

            // Validate status
            var batchStatus = string.IsNullOrWhiteSpace(request.Status) ? batch.Status : request.Status.ToLower().Trim();
            if (!AllowedBatchStatuses.Contains(batchStatus))
            {
                return Result<BatchDetailResponse>.Failure("Invalid batch status. Allowed values: active, expired, disposed.");
            }

            // Validate quantity
            if (request.Quantity < 0)
            {
                return Result<BatchDetailResponse>.Failure("Quantity cannot be negative.");
            }

            // Audit - record old values
            Console.WriteLine($"[AUDIT] Batch UPDATE: Id={batch.Id}, OldBatchNo={batch.BatchNo}, OldQty={batch.Quantity}, OldStatus={batch.Status}, At={DateTime.UtcNow:O}");

            batch.MedId = request.MedId;
            batch.BatchNo = request.BatchNo;
            batch.Quantity = request.Quantity;
            batch.ExpiryDate = request.ExpiryDate;
            batch.ReceivedDate = request.ReceivedDate ?? request.ManufactureDate;
            batch.SupplierName = request.SupplierName ?? request.Manufacturer;
            batch.Status = batchStatus;
            batch.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload nav property in case MedId changed
            await _context.Entry(batch).Reference(b => b.Med).LoadAsync();

            Console.WriteLine($"[AUDIT] Batch UPDATED: Id={batch.Id}, NewBatchNo={batch.BatchNo}, NewQty={batch.Quantity}, NewStatus={batch.Status}, At={DateTime.UtcNow:O}");

            return Result<BatchDetailResponse>.Success(MapToBatchDetail(batch), "Batch updated successfully.");
        }

        public async Task<Result> DeleteBatchAsync(int id, bool force = false)
        {
            var batch = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .FirstOrDefaultAsync(b => b.Id == id && b.DeleteFlag != true);

            if (batch == null)
            {
                return Result.Failure("Batch not found.");
            }

            // Check for active prescriptions referencing this batch
            // Active = prescription item linked to this batch where the parent prescription's
            // appointment is NOT completed or cancelled
            var activeAllocationExists = await _context.TblPrescriptionItems
                .Where(pi => pi.MedicineBatchId == id && pi.DeleteFlag != true)
                .AnyAsync(pi => pi.Prescription.Appointment.Status != "completed"
                             && pi.Prescription.Appointment.Status != "cancelled");

            if (activeAllocationExists)
            {
                return Result.Failure("Cannot delete this batch. It is allocated to active prescription(s). Complete or cancel the related appointment(s) first.");
            }

            // Check for any historical prescriptions
            var hasHistoricalAllocations = await _context.TblPrescriptionItems
                .AnyAsync(pi => pi.MedicineBatchId == id && pi.DeleteFlag != true);

            if (hasHistoricalAllocations && !force)
            {
                return Result.Failure("WARNING: This batch has been used in past prescriptions. Deleting it will not remove prescription history, but the batch will no longer appear in reports. Send the request with force=true to proceed.");
            }

            // Soft delete
            batch.DeleteFlag = true;
            batch.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AUDIT] Batch DELETED: Id={batch.Id}, BatchNo={batch.BatchNo}, MedId={batch.MedId}, Force={force}, At={DateTime.UtcNow:O}");

            return Result.Success("Batch deleted successfully.");
        }

        private static BatchDetailResponse MapToBatchDetail(TblMedicineBatch batch)
        {
            return new BatchDetailResponse
            {
                Id = batch.Id,
                MedId = batch.MedId,
                MedicineName = batch.Med?.Name ?? "Unknown",
                BatchNo = batch.BatchNo,
                Quantity = batch.Quantity,
                ExpiryDate = batch.ExpiryDate,
                ManufactureDate = batch.ReceivedDate ?? default,
                ReceivedDate = batch.ReceivedDate,
                SupplierName = batch.SupplierName,
                Manufacturer = batch.SupplierName ?? string.Empty,
                Status = batch.Status
            };
        }

        // ────────────────────────────────────────────────────────────────
        // Medicine CRUD
        // ────────────────────────────────────────────────────────────────

        public async Task<Result<List<MedicineCategoryResponse>>> GetCategoriesAsync()
        {
            var categories = await _context.TblMedicineCategories
                .Select(c => new MedicineCategoryResponse
                {
                    Id = c.Id,
                    Name = c.Name
                })
                .OrderBy(c => c.Name)
                .ToListAsync();

            return Result<List<MedicineCategoryResponse>>.Success(categories);
        }

        public async Task<Result<MedicineSearchResponse>> CreateMedicineAsync(CreateMedicineRequest request, IFormFile? imageFile)
        {
            if (request.CategoryId.HasValue)
            {
                var categoryExists = await _context.TblMedicineCategories.AnyAsync(c => c.Id == request.CategoryId.Value);
                if (!categoryExists)
                {
                    return Result<MedicineSearchResponse>.Failure("Category not found.");
                }
            }

            var duplicateExists = await _context.TblMedicines
                .AnyAsync(m => m.Name.ToLower() == request.Name.ToLower() && m.DeleteFlag != true);
            if (duplicateExists)
            {
                return Result<MedicineSearchResponse>.Failure($"A medicine named '{request.Name}' already exists.");
            }

            string? imageUrl = null;
            string? imageId = null;

            if (imageFile != null && imageFile.Length > 0)
            {
                if (_photoService == null)
                {
                    return Result<MedicineSearchResponse>.Failure("Photo service is not configured.");
                }

                var uploadResult = await _photoService.UploadPhotoAsync(imageFile);
                if (!uploadResult.IsSuccess || uploadResult.Data == null)
                {
                    return Result<MedicineSearchResponse>.Failure(uploadResult.Message ?? "Failed to upload photo.");
                }

                imageUrl = uploadResult.Data.Url;
                imageId = uploadResult.Data.PublicId;
            }

            var medicine = new TblMedicine
            {
                CategoryId = request.CategoryId,
                Name = request.Name,
                Description = request.Description,
                ImageUrl = imageUrl,
                UnitPrice = request.UnitPrice,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblMedicines.Add(medicine);
            await _context.SaveChangesAsync();

            if (medicine.CategoryId.HasValue)
            {
                await _context.Entry(medicine).Reference(m => m.Category).LoadAsync();
            }

            var response = new MedicineSearchResponse
            {
                MedicineId = medicine.MedicineId,
                CategoryId = medicine.CategoryId,
                CategoryName = medicine.Category?.Name,
                Name = medicine.Name,
                Description = medicine.Description,
                ImageUrl = medicine.ImageUrl,
                ImageId = null,
                UnitPrice = medicine.UnitPrice,
                TotalStock = 0,
                ActiveBatches = new(),
                HasLowStockWarning = true,
                HasNearExpiryWarning = false
            };

            return Result<MedicineSearchResponse>.Success(response, "Medicine created successfully.");
        }

        public async Task<Result<MedicineSearchResponse>> UpdateMedicineAsync(int id, UpdateMedicineRequest request, IFormFile? imageFile)
        {
            var medicine = await _context.TblMedicines
                .Include(m => m.Category)
                .Include(m => m.TblMedicineBatches)
                .FirstOrDefaultAsync(m => m.MedicineId == id && m.DeleteFlag != true);

            if (medicine == null)
            {
                return Result<MedicineSearchResponse>.Failure("Medicine not found.");
            }

            if (request.CategoryId.HasValue)
            {
                var categoryExists = await _context.TblMedicineCategories.AnyAsync(c => c.Id == request.CategoryId.Value);
                if (!categoryExists)
                {
                    return Result<MedicineSearchResponse>.Failure("Category not found.");
                }
            }

            var duplicateExists = await _context.TblMedicines
                .AnyAsync(m => m.Name.ToLower() == request.Name.ToLower() && m.MedicineId != id && m.DeleteFlag != true);
            if (duplicateExists)
            {
                return Result<MedicineSearchResponse>.Failure($"A medicine named '{request.Name}' already exists.");
            }

            if (request.RemoveImage || (imageFile != null && imageFile.Length > 0))
            {
                if (!string.IsNullOrWhiteSpace(medicine.ImageUrl))
                {
                    if (_photoService == null)
                    {
                        return Result<MedicineSearchResponse>.Failure("Photo service is not configured.");
                    }
                    var publicId = ExtractPublicIdFromUrl(medicine.ImageUrl);
                    if (!string.IsNullOrWhiteSpace(publicId))
                    {
                        await _photoService.DeletePhotoAsync(publicId);
                    }
                }

                medicine.ImageUrl = null;
            }

            if (imageFile != null && imageFile.Length > 0)
            {
                if (_photoService == null)
                {
                    return Result<MedicineSearchResponse>.Failure("Photo service is not configured.");
                }

                var uploadResult = await _photoService.UploadPhotoAsync(imageFile);
                if (!uploadResult.IsSuccess || uploadResult.Data == null)
                {
                    return Result<MedicineSearchResponse>.Failure(uploadResult.Message ?? "Failed to upload photo.");
                }

                medicine.ImageUrl = uploadResult.Data.Url;
            }

            medicine.CategoryId = request.CategoryId;
            medicine.Name = request.Name;
            medicine.Description = request.Description;
            medicine.UnitPrice = request.UnitPrice;
            medicine.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (medicine.CategoryId.HasValue)
            {
                await _context.Entry(medicine).Reference(m => m.Category).LoadAsync();
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var activeBatches = medicine.TblMedicineBatches
                .Where(b => b.DeleteFlag != true && b.Status == "active" && b.ExpiryDate > today && b.Quantity > 0)
                .OrderBy(b => b.ExpiryDate)
                .Select(b => new BatchInfoResponse
                {
                    Id = b.Id,
                    BatchNo = b.BatchNo,
                    Quantity = b.Quantity,
                    ExpiryDate = b.ExpiryDate,
                    ReceivedDate = b.ReceivedDate,
                    SupplierName = b.SupplierName,
                    Status = b.Status
                })
                .ToList();

            var totalStock = activeBatches.Sum(b => b.Quantity);
            var nearExpiry = activeBatches.Any(b => b.ExpiryDate <= today.AddDays(30));
            var lowStock = totalStock < LowStockThreshold;

            var response = new MedicineSearchResponse
            {
                MedicineId = medicine.MedicineId,
                CategoryId = medicine.CategoryId,
                CategoryName = medicine.Category?.Name,
                Name = medicine.Name,
                Description = medicine.Description,
                ImageUrl = medicine.ImageUrl,
                ImageId = null,
                UnitPrice = medicine.UnitPrice,
                TotalStock = totalStock,
                ActiveBatches = activeBatches,
                HasLowStockWarning = lowStock,
                HasNearExpiryWarning = nearExpiry
            };

            return Result<MedicineSearchResponse>.Success(response, "Medicine updated successfully.");
        }

        public async Task<Result> DeleteMedicineAsync(int id)
        {
            var medicine = await _context.TblMedicines
                .Include(m => m.TblMedicineBatches)
                .FirstOrDefaultAsync(m => m.MedicineId == id && m.DeleteFlag != true);

            if (medicine == null)
            {
                return Result.Failure("Medicine not found.");
            }

            var activeAllocationExists = await _context.TblPrescriptionItems
                .Where(pi => pi.MedicineBatch.MedId == id && pi.DeleteFlag != true)
                .AnyAsync(pi => pi.Prescription.Appointment.Status != "completed"
                             && pi.Prescription.Appointment.Status != "cancelled");

            if (activeAllocationExists)
            {
                return Result.Failure("Cannot delete this medicine. It is allocated to active prescription(s). Complete or cancel the related appointment(s) first.");
            }

            if (!string.IsNullOrWhiteSpace(medicine.ImageUrl))
            {
                if (_photoService != null)
                {
                    var publicId = ExtractPublicIdFromUrl(medicine.ImageUrl);
                    if (!string.IsNullOrWhiteSpace(publicId))
                    {
                        await _photoService.DeletePhotoAsync(publicId);
                    }
                }
            }

            medicine.DeleteFlag = true;
            medicine.UpdatedAt = DateTime.UtcNow;

            foreach (var batch in medicine.TblMedicineBatches)
            {
                batch.DeleteFlag = true;
                batch.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Result.Success("Medicine and its batches deleted successfully.");
        }
        private string? ExtractPublicIdFromUrl(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            try
            {
                var uri = new Uri(url);
                var segments = uri.Segments;
                if (segments.Length > 0)
                {
                    var lastSegment = segments[^1];
                    var dotIndex = lastSegment.LastIndexOf('.');
                    if (dotIndex > 0)
                    {
                        return lastSegment[..dotIndex];
                    }
                    return lastSegment;
                }
            }
            catch {}
            return null;
        }
    }
}

