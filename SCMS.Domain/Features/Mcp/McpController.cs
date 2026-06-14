using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SCMS.Shared;
using SCMS.Domain.DTOs.Mcp;

namespace SCMS.Domain.Features.Mcp
{
    [ApiController]
    [Route("api/mcp")]
    [Authorize(Roles = "owner,admin,doctor")]
    public class McpController : ControllerBase
    {
        private readonly IMcpService _mcpService;
        private readonly IConfiguration _configuration;
        private static readonly HttpClient HttpClient = new();

        public McpController(IMcpService mcpService, IConfiguration configuration)
        {
            _mcpService = mcpService;
            _configuration = configuration;
        }

        [HttpGet("tools")]
        public IActionResult GetAvailableTools()
        {
            var tools = _mcpService.GetAvailableTools();
            return Ok(Result<List<McpToolDefinition>>.Success(tools));
        }

        [HttpPost("tools/call")]
        public async Task<IActionResult> CallToolAsync([FromBody] McpToolCallRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(Result<McpToolCallResponse>.Failure("Invalid tool call request. Tool name is required."));
            }

            var result = await _mcpService.CallToolAsync(request);

            if (result.IsFailure)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("chat")]
        public async Task<IActionResult> ChatAsync([FromBody] AiChatRequest request)
        {
            if (request == null || request.Messages == null || request.Messages.Count == 0)
            {
                return BadRequest(Result<AiChatResponse>.Failure("Chat messages are required."));
            }

            // 1. Resolve Gemini API Key (support appsettings or env variable for robustness)
            var apiKey = _configuration["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
            {
                apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            }

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(Result<AiChatResponse>.Failure("Gemini API key is not configured. Please add Gemini:ApiKey to appsettings.json or set GEMINI_API_KEY environment variable."));
            }

            try
            {
                // 2. Prepare MCP tools in Gemini function calling format
                var rawTools = _mcpService.GetAvailableTools();
                var geminiTools = new List<GeminiTool>
                {
                    new()
                    {
                        FunctionDeclarations = rawTools.Select(t => new GeminiFunctionDeclaration
                        {
                            Name = t.Name,
                            Description = t.Description,
                            Parameters = ConvertSchema(t.InputSchema)
                        }).ToList()
                    }
                };

                // 3. Prepare System Prompt (low token usage & Myanmar language directive)
                var systemInstruction = new GeminiInstruction
                {
                    Parts = new List<GeminiPart>
                    {
                        new()
                        {
                            Text = "You are a helpful, secure clinic assistant for the Smart Clinic Management System (SCMS).\n" +
                                   "You have access to real-time clinic operations, EMR, and stock details through MCP tools.\n" +
                                   "Rules:\n" +
                                   "- Support commands and queries in both English and Myanmar language. Always reply in the user's preferred language.\n" +
                                   "- Keep answers concise, clear, and direct (low token usage focus).\n" +
                                   "- Always retrieve data using the provided MCP tools before answering. NEVER fabricate patient details, stock levels, or EMR data.\n" +
                                   "- Never diagnose patients or recommend prescription changes independently. Remind the user that clinical judgment belongs to the doctor.\n" +
                                   "- Always output all dates in 'dd-MM-yyyy' format in all your natural language replies (e.g., 24-06-2026 instead of 2026-06-24). Never output dates in 'yyyy-MM-dd' or other formats. This is extremely important.\n" +
                                   "- For simple bulk rescheduling of today's active appointments (e.g., 'reschedule all appointments to start from 8:30 AM', or 'arrive clinic at 9 AM, reschedule today's appointments to start from 9:30 AM'), use the simple `reschedule_today_appointments` tool with the target start time. It will automatically shift all today's active slots relatively.\n" +
                                   "- For fine-grained range-based rescheduling of specific time slots, use `reschedule_appointments_in_range`.\n" +
                                   "- For status updates (confirm, cancel, complete) by Patient Name, use `update_appointment_status_by_patient_name` directly to search and apply changes.\n" +
                                   "- For bulk status updates of all today's appointments at once (e.g. 'confirm all today's appointments', 'cancel all today's appointments', 'complete all visits today'), use the `bulk_update_today_appointments_status` tool directly with the desired status ('confirmed', 'completed', 'cancelled', 'pending').\n" +
                                   "- For managing, showing, or recommending medication templates for specific diseases (e.g., 'what are the standard templates/pills for Asthma?', or 'save a template for Hypertension'), use `get_prescription_templates` and `create_prescription_template` tools.\n" +
                                   "- For comprehensive Know Your Patient (KYP) clinical and behavioral intelligence summaries, patient briefs, profiles, or 360-degree patient reviews (e.g. 'brief me on today's next patient', 'give me a KYP brief on Aung Min', or 'what's Ko Aung Min's clinical and behavioral intelligence brief?'), use the `get_patient_kyp_brief` tool directly using the patient's ID or Name to analyze their adherence profiling, EMR Sentinel warnings, and financial or budget sensitivity context."
                        }
                    }
                };

                // 4. Map chat history to Gemini structure
                var contents = new List<GeminiContent>();
                foreach (var msg in request.Messages)
                {
                    contents.Add(new GeminiContent
                    {
                        Role = string.Equals(msg.Role, "user", StringComparison.OrdinalIgnoreCase) ? "user" : "model",
                        Parts = new List<GeminiPart> { new() { Text = msg.Content } }
                    });
                }

                // 5. Run the Agentic Tool-Calling Loop (max 5 iterations to prevent infinite loops)
                string finalReply = "Sorry, I was unable to complete your request. Please try again.";
                int maxIterations = 5;

                for (int iter = 0; iter < maxIterations; iter++)
                {
                    var geminiReq = new GeminiGenerateRequest
                    {
                        Contents = contents,
                        SystemInstruction = systemInstruction,
                        Tools = geminiTools
                    };

                    var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";
                    HttpResponseMessage httpResponse = null!;
                    string errContent = string.Empty;
                    bool callSuccessful = false;

                    for (int retry = 0; retry < 3; retry++)
                    {
                        try
                        {
                            httpResponse = await HttpClient.PostAsJsonAsync(url, geminiReq);
                            if (httpResponse.IsSuccessStatusCode)
                            {
                                callSuccessful = true;
                                break;
                            }

                            errContent = await httpResponse.Content.ReadAsStringAsync();

                            // Determine if error is transient (e.g. 503 or 429)
                            bool isRetryable = false;
                            try
                            {
                                var errObj = JsonSerializer.Deserialize<GeminiErrorResponse>(errContent);
                                if (errObj?.Error != null)
                                {
                                    var code = errObj.Error.Code;
                                    var status = errObj.Error.Status;
                                    if (code == 503 || status == "UNAVAILABLE" || code == 429 || status == "RESOURCE_EXHAUSTED")
                                    {
                                        isRetryable = true;
                                    }
                                }
                            }
                            catch
                            {
                                if (httpResponse.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                                    (int)httpResponse.StatusCode == 429)
                                {
                                    isRetryable = true;
                                }
                            }

                            if (!isRetryable)
                            {
                                break; // Do not retry auth or client errors
                            }

                            // Wait before retrying (exponential delay: 1s, 2s)
                            await Task.Delay(TimeSpan.FromSeconds(retry + 1));
                        }
                        catch (Exception ex)
                        {
                            errContent = $"Network/connection error: {ex.Message}";
                            // Retry network/connection errors too
                            await Task.Delay(TimeSpan.FromSeconds(retry + 1));
                        }
                    }

                    if (!callSuccessful)
                    {
                        string userFriendlyMessage = "The AI service is temporarily unavailable. Please try again in a moment.";

                        if (httpResponse != null)
                        {
                            try
                            {
                                var errObj = JsonSerializer.Deserialize<GeminiErrorResponse>(errContent);
                                if (errObj?.Error != null)
                                {
                                    var code = errObj.Error.Code;
                                    var status = errObj.Error.Status;
                                    var msg = errObj.Error.Message;

                                    if (code == 503 || status == "UNAVAILABLE")
                                    {
                                        userFriendlyMessage = "The AI service is currently experiencing high demand and is temporarily unavailable. Please try again in a moment.";
                                    }
                                    else if (code == 429 || status == "RESOURCE_EXHAUSTED")
                                    {
                                        userFriendlyMessage = "The AI service has reached its rate limit. Please wait a moment before trying again.";
                                    }
                                    else if (code == 400 && msg.Contains("API key", StringComparison.OrdinalIgnoreCase))
                                    {
                                        userFriendlyMessage = "The configured Gemini API key is invalid. Please check your system configuration.";
                                    }
                                    else if (!string.IsNullOrWhiteSpace(msg))
                                    {
                                        userFriendlyMessage = $"AI service error: {msg}";
                                    }
                                }
                            }
                            catch
                            {
                                userFriendlyMessage = $"The AI service returned an unexpected response (HTTP {(int)httpResponse.StatusCode}). Please try again later.";
                            }
                        }
                        else
                        {
                            userFriendlyMessage = $"Unable to communicate with the AI service. {errContent}";
                        }

                        return BadRequest(Result<AiChatResponse>.Failure(userFriendlyMessage));
                    }

                    var geminiRes = await httpResponse.Content.ReadFromJsonAsync<GeminiGenerateResponse>();
                    var candidate = geminiRes?.Candidates?.FirstOrDefault();
                    var modelContent = candidate?.Content;

                    if (modelContent == null || modelContent.Parts == null || modelContent.Parts.Count == 0)
                    {
                        break;
                    }

                    // Add the model's turn to our conversation history
                    contents.Add(modelContent);

                    // Check if the model wants to call functions
                    var functionCalls = modelContent.Parts.Where(p => p.FunctionCall != null).Select(p => p.FunctionCall!).ToList();

                    if (functionCalls.Count == 0)
                    {
                        // No function calls, this is the final natural language answer
                        finalReply = modelContent.Parts.FirstOrDefault(p => !string.IsNullOrEmpty(p.Text))?.Text ?? finalReply;
                        break;
                    }

                    // Execute tool calls and collect responses in a single turn
                    var toolResponseParts = new List<GeminiPart>();

                    foreach (var call in functionCalls)
                    {
                        var toolArgs = call.Args ?? new Dictionary<string, object>();
                        var localCallResult = await _mcpService.CallToolAsync(new McpToolCallRequest
                        {
                            Name = call.Name,
                            Arguments = toolArgs
                        });

                        object responseData;
                        if (localCallResult.IsSuccess && localCallResult.Data != null && localCallResult.Data.Content.Count > 0)
                        {
                            responseData = new { result = localCallResult.Data.Content[0].Text };
                        }
                        else
                        {
                            responseData = new { error = localCallResult.Message ?? "Execution failed." };
                        }

                        toolResponseParts.Add(new GeminiPart
                        {
                            FunctionResponse = new GeminiFunctionResponse
                            {
                                Name = call.Name,
                                Response = responseData
                            }
                        });
                    }

                    // Add the function responses back into the history under the 'user' role
                    contents.Add(new GeminiContent
                    {
                        Role = "user",
                        Parts = toolResponseParts
                    });
                }

                // Auto-convert any remaining yyyy-MM-dd date formats to dd-MM-yyyy in the final reply for absolute format consistency
                if (!string.IsNullOrEmpty(finalReply))
                {
                    finalReply = System.Text.RegularExpressions.Regex.Replace(
                        finalReply,
                        @"\b(\d{4})-(\d{2})-(\d{2})\b",
                        "$3-$2-$1"
                    );
                }

                return Ok(Result<AiChatResponse>.Success(new AiChatResponse { Reply = finalReply }));
            }
            catch (Exception ex)
            {
                return BadRequest(Result<AiChatResponse>.Failure($"Internal error running AI assistant: {ex.Message}"));
            }
        }

        private static object ConvertSchema(object originalSchema)
        {
            try
            {
                // Adjust parameter schema naming to suit Gemini API if needed.
                // Gemini expects the type parameter in uppercase (e.g. "OBJECT", "STRING"),
                // so we do a quick replace in the serialized JSON to keep it fully compliant.
                var rawJson = JsonSerializer.Serialize(originalSchema);
                rawJson = rawJson
                    .Replace("\"type\":\"object\"", "\"type\":\"OBJECT\"")
                    .Replace("\"type\":\"string\"", "\"type\":\"STRING\"")
                    .Replace("\"type\":\"integer\"", "\"type\":\"INTEGER\"")
                    .Replace("\"type\":\"number\"", "\"type\":\"NUMBER\"")
                    .Replace("\"type\":\"boolean\"", "\"type\":\"BOOLEAN\"")
                    .Replace("\"type\":\"array\"", "\"type\":\"ARRAY\"");

                return JsonSerializer.Deserialize<object>(rawJson) ?? originalSchema;
            }
            catch
            {
                return originalSchema;
            }
        }
    }

    #region Gemini API Mapping Classes
    public class GeminiGenerateRequest
    {
        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; } = new();

        [JsonPropertyName("systemInstruction")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public GeminiInstruction? SystemInstruction { get; set; }

        [JsonPropertyName("tools")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GeminiTool>? Tools { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = new();
    }

    public class GeminiPart
    {
        [JsonPropertyName("text")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Text { get; set; }

        [JsonPropertyName("functionCall")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public GeminiFunctionCall? FunctionCall { get; set; }

        [JsonPropertyName("functionResponse")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public GeminiFunctionResponse? FunctionResponse { get; set; }
    }

    public class GeminiInstruction
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = new();
    }

    public class GeminiTool
    {
        [JsonPropertyName("functionDeclarations")]
        public List<GeminiFunctionDeclaration> FunctionDeclarations { get; set; } = new();
    }

    public class GeminiFunctionDeclaration
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("parameters")]
        public object Parameters { get; set; } = new { type = "OBJECT", properties = new { } };
    }

    public class GeminiFunctionCall
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("args")]
        public Dictionary<string, object>? Args { get; set; }
    }

    public class GeminiFunctionResponse
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("response")]
        public object Response { get; set; } = new { };
    }

    public class GeminiGenerateResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }
    }

    public class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }
    }

    public class GeminiErrorResponse
    {
        [JsonPropertyName("error")]
        public GeminiErrorDetails? Error { get; set; }
    }

    public class GeminiErrorDetails
    {
        [JsonPropertyName("code")]
        public int Code { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    }
    #endregion
}
