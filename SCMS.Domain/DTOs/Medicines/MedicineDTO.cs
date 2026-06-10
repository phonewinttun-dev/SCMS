using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace SCMS.Domain.DTOs.Medicines
{
    public class BatchDetailResponse
        {
            public int Id { get; set; }
            public int MedId { get; set; }
            public string MedicineName { get; set; } = null!;
            public string BatchNo { get; set; } = null!;
            public int Quantity { get; set; }
            public DateOnly ExpiryDate { get; set; }
            public DateOnly ManufactureDate { get; set; }
            public DateOnly? ReceivedDate { get; set; }
            public string? SupplierName { get; set; }
            public string Manufacturer { get; set; } = null!;
            public string Status { get; set; } = null!; // active / expired / disposed
        }

    public class BatchInfoResponse
        {
            public int Id { get; set; }
            public string BatchNo { get; set; } = null!;
            public int Quantity { get; set; }
            public DateOnly ExpiryDate { get; set; }
            public DateOnly? ReceivedDate { get; set; }
            public string? SupplierName { get; set; }
            public string Status { get; set; } = null!; // active / expired / disposed
        }

    public class CreateBatchRequest
        {
            public int MedId { get; set; }
            public string BatchNo { get; set; } = null!;
            public int Quantity { get; set; }
            public DateOnly ExpiryDate { get; set; }
            public DateOnly ManufactureDate { get; set; }
            public DateOnly? ReceivedDate { get; set; }
            public string? SupplierName { get; set; }
            public string Manufacturer { get; set; } = null!;
            public string Status { get; set; } = "active"; // default active
        }

    public class CreateMedicineRequest
        {
            [Required(ErrorMessage = "Name is required.")]
            [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
            public string Name { get; set; } = null!;

            public string? Description { get; set; }

            public int? CategoryId { get; set; }

            [Range(0.0, double.MaxValue, ErrorMessage = "Unit price cannot be negative.")]
            public decimal UnitPrice { get; set; }
        }

    public class InventoryAlertResponse
        {
            public int MedicineId { get; set; }
            public string MedicineName { get; set; } = null!;
            public int? BatchId { get; set; }
            public string? BatchNo { get; set; }
            public int CurrentQuantity { get; set; }
            public DateOnly? ExpiryDate { get; set; }
            public string AlertType { get; set; } = null!; // Low Stock / Nearing Expiry
            public string Message { get; set; } = null!;
        }

    public class MedicineCategoryResponse
        {
            public int Id { get; set; }
            public string Name { get; set; } = null!;
        }

    public class MedicineSearchResponse
        {
            public int MedicineId { get; set; }
            public int? CategoryId { get; set; }
            public string? CategoryName { get; set; }
            public string Name { get; set; } = null!;
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public string? ImageId { get; set; }
            public decimal UnitPrice { get; set; }
            public int TotalStock { get; set; }
            public List<BatchInfoResponse> ActiveBatches { get; set; } = new();
            public bool HasLowStockWarning { get; set; }
            public bool HasNearExpiryWarning { get; set; }
        }

    public class UpdateBatchRequest
        {
            public int MedId { get; set; }
            public string BatchNo { get; set; } = null!;
            public int Quantity { get; set; }
            public DateOnly ExpiryDate { get; set; }
            public DateOnly ManufactureDate { get; set; }
            public DateOnly? ReceivedDate { get; set; }
            public string? SupplierName { get; set; }
            public string Manufacturer { get; set; } = null!;
            public string Status { get; set; } = "active";
        }

    public class UpdateMedicineRequest
        {
            [Required(ErrorMessage = "Name is required.")]
            [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
            public string Name { get; set; } = null!;

            public string? Description { get; set; }

            public int? CategoryId { get; set; }

            [Range(0.0, double.MaxValue, ErrorMessage = "Unit price cannot be negative.")]
            public decimal UnitPrice { get; set; }

            public bool RemoveImage { get; set; }
        }
}
