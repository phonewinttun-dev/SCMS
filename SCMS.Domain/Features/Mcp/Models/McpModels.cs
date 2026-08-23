using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SCMS.Domain.Features.Mcp.Models
{
    public class McpToolDefinition
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("inputSchema")]
        public JsonSchemaInput InputSchema { get; set; } = new();

        /// <summary>
        /// True for any tool that creates, updates, cancels, reschedules, or deletes clinic data.
        /// The AI chat agent is read-only by design and must never be handed these tools - only the
        /// human-driven Quick Actions UI (which requires an explicit confirm click) may invoke them.
        /// </summary>
        [JsonPropertyName("isMutating")]
        public bool IsMutating { get; set; } = false;
    }

    public class JsonSchemaInput
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "object";

        [JsonPropertyName("properties")]
        public Dictionary<string, PropertyDefinition> Properties { get; set; } = new();

        [JsonPropertyName("required")]
        public List<string> Required { get; set; } = new();
    }

    public class PropertyDefinition
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        /// <summary>Closed set of accepted values. Lets the model pick a valid value instead of guessing from prose.</summary>
        [JsonPropertyName("enum")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Enum { get; set; }

        [JsonPropertyName("items")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public JsonSchemaInput? Items { get; set; }
    }

    // Strongly-typed input classes for MCP tools

    public class EmptyInput
    {
    }

    public class PeriodInput
    {
        [AllowedValues("daily", "weekly", "monthly", "all")]
        [Description("Aggregation period. Defaults to 'daily'.")]
        public string? Period { get; set; }
    }

    public class PatientIdInput
    {
        [Required]
        [Description("The unique identifier of the patient.")]
        public int PatientId { get; set; }
    }

    public class MedicineNameInput
    {
        [Required]
        [Description("Name or fragment of the medicine.")]
        public string Name { get; set; } = string.Empty;
    }

    public class ExpiringBatchesInput
    {
        [Description("The number of days to look ahead for expiring batches (default is 30).")]
        public int? Days { get; set; }
    }

    public class CreateFollowUpReminderInput
    {
        [Required]
        [Description("The unique identifier of the patient.")]
        public int PatientId { get; set; }

        [Required]
        [Description("Number of days from today when the follow-up is due.")]
        public int DueInDays { get; set; }

        [Required]
        [Description("Clinical recommendation or notes for the follow-up.")]
        public string Recommendation { get; set; } = string.Empty;
    }

    public class UpdateAppointmentStatusInput
    {
        [Required]
        [Description("The unique ID of the appointment.")]
        public int AppointmentId { get; set; }

        [Required]
        [AllowedValues("pending", "confirmed", "cancelled", "completed")]
        [Description("The new status.")]
        public string Status { get; set; } = string.Empty;

        [Description("Optional update notes explaining the status change.")]
        public string? Notes { get; set; }
    }

    public class CancelAppointmentsInRangeInput
    {
        [Required]
        [Description("Start of the time range. Supports simple times (e.g. '10:00'), relative dates ('today at 10:00', 'tomorrow at 12:00'), or full ISO dates.")]
        public string StartTime { get; set; } = string.Empty;

        [Required]
        [Description("End of the time range. Supports simple times (e.g. '12:00'), relative dates ('today at 12:00', 'tomorrow at 14:00'), or full ISO dates.")]
        public string EndTime { get; set; } = string.Empty;

        [Description("Optional reason for cancelling these appointments.")]
        public string? Reason { get; set; }
    }

    public class RescheduleAppointmentsInRangeInput
    {
        [Required]
        [Description("Start of source range. Supports simple times (e.g. '10:00'), relative dates ('today at 10:00', 'tomorrow at 10:00'), or full ISO dates.")]
        public string SourceStartTime { get; set; } = string.Empty;

        [Required]
        [Description("End of source range. Supports simple times (e.g. '11:00'), relative dates ('today at 11:00', 'tomorrow at 11:00'), or full ISO dates.")]
        public string SourceEndTime { get; set; } = string.Empty;

        [Required]
        [Description("New start time to begin shifting appointments to. Supports simple times (e.g. '14:00'), relative dates ('today at 14:00', 'tomorrow at 08:30'), or full ISO dates.")]
        public string TargetStartTime { get; set; } = string.Empty;
    }

    public class UpdateAppointmentStatusByPatientNameInput
    {
        [Required]
        [Description("The full or partial name of the patient.")]
        public string PatientName { get; set; } = string.Empty;

        [Required]
        [AllowedValues("pending", "confirmed", "cancelled", "completed")]
        [Description("The new status.")]
        public string Status { get; set; } = string.Empty;

        [Description("Optional physician or administrative notes.")]
        public string? Notes { get; set; }
    }

    public class RescheduleTodayAppointmentsInput
    {
        [Required]
        [Description("The new start time for the first appointment. Supports simple times (e.g. '08:30'), relative ('today at 08:30'), or full ISO dates.")]
        public string TargetStartTime { get; set; } = string.Empty;
    }

    public class GetPrescriptionTemplatesInput
    {
        [Description("Optional disease ID filter.")]
        public int? DiseaseId { get; set; }

        [Description("Optional disease name filter (partial match).")]
        public string? DiseaseName { get; set; }
    }

    public class CreatePrescriptionTemplateInput
    {
        [Required]
        [Description("The name of the template.")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Description("The unique ID of the disease.")]
        public int DiseaseId { get; set; }

        [Required]
        [Description("List of template items (medicines).")]
        public List<PrescriptionTemplateItemInput> Items { get; set; } = new();
    }

    public class PrescriptionTemplateItemInput
    {
        [Required]
        [Description("The unique ID of the medicine.")]
        public int MedicineId { get; set; }

        [Description("Dosage details (e.g. '500 mg').")]
        public string? Dosage { get; set; }

        [Required]
        [Description("Duration in days.")]
        public int Days { get; set; }

        [Required]
        [Description("Total quantity.")]
        public int Quantity { get; set; }

        [Description("Usage instruction.")]
        public string? Instruction { get; set; }
    }

    public class DeletePrescriptionTemplateInput
    {
        [Required]
        [Description("The unique ID of the prescription template to delete.")]
        public int TemplateId { get; set; }
    }

    public class BulkUpdateTodayAppointmentsStatusInput
    {
        [Required]
        [AllowedValues("pending", "confirmed", "cancelled", "completed")]
        [Description("The new status.")]
        public string Status { get; set; } = string.Empty;
    }

    public class PatientKypBriefInput
    {
        [Description("The unique identifier of the patient (optional if patientName is provided).")]
        public int? PatientId { get; set; }

        [Description("The name of the patient (optional if patientId is provided).")]
        public string? PatientName { get; set; }
    }

    public class McpToolCallRequest
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("arguments")]
        public Dictionary<string, object>? Arguments { get; set; }
    }

    public class McpContentItem
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "text";

        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    public class McpToolCallResponse
    {
        [JsonPropertyName("content")]
        public List<McpContentItem> Content { get; set; } = new();

        [JsonPropertyName("isError")]
        public bool IsError { get; set; } = false;
    }

    public class AiChatMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "user"; // user or model

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class AiChatRequest
    {
        [JsonPropertyName("messages")]
        public List<AiChatMessage> Messages { get; set; } = new();
    }

    public class AiChatResponse
    {
        [JsonPropertyName("reply")]
        public string Reply { get; set; } = string.Empty;
    }
}
