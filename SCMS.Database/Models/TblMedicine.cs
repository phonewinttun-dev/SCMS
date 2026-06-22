using System;
using System.Collections.Generic;

namespace SCMS.Database.Models;

public partial class TblMedicine
{
    public int MedicineId { get; set; }

    public int? CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public string? ImageId { get; set; }

    public decimal UnitPrice { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public bool? DeleteFlag { get; set; }

    public virtual TblMedicineCategory? Category { get; set; }

    public virtual ICollection<TblMedicineBatch> TblMedicineBatches { get; set; } = new List<TblMedicineBatch>();

    public virtual ICollection<TblPrescriptionItem> TblPrescriptionItems { get; set; } = new List<TblPrescriptionItem>();

    public virtual ICollection<TblPrescriptionTemplateItem> TblPrescriptionTemplateItems { get; set; } = new List<TblPrescriptionTemplateItem>();
}
