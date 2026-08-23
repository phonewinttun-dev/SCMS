using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SCMS.Domain.Features.Mcp;
using SCMS.Domain.Features.Mcp.Models;
using SCMS.Domain.Security;
using SCMS.Shared;

namespace SCMS.Api.Controllers
{
    [ApiController]
    [Route("api/mcp")]
    [Authorize]
    [HasPermission("Mcp.Access")]
    [Produces("application/json")]
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

        /// <summary>Retrieve list of all available MCP tools and JSON schemas.</summary>
        [HttpGet("tools")]
        [ProducesResponseType(typeof(Result<List<McpToolDefinition>>), StatusCodes.Status200OK)]
        public IActionResult GetAvailableTools()
        {
            var tools = _mcpService.GetAvailableTools();
            return Ok(Result<List<McpToolDefinition>>.Success(tools));
        }

        /// <summary>Execute an MCP tool call by name with arguments.</summary>
        [HttpPost("tools/call")]
        [ProducesResponseType(typeof(Result<McpToolCallResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CallToolAsync([FromBody] McpToolCallRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(Result<McpToolCallResponse>.Failure("Invalid tool call request. Tool name is required."));
            }

            var result = await _mcpService.CallToolAsync(request);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Agentic AI assistant conversation endpoint with automatic tool-calling loop.</summary>
        [HttpPost("chat")]
        [ProducesResponseType(typeof(Result<AiChatResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChatAsync([FromBody] AiChatRequest request)
        {
            if (request == null || request.Messages == null || request.Messages.Count == 0)
            {
                return BadRequest(Result<AiChatResponse>.Failure("Chat messages are required."));
            }

            // 1. Resolve Gemini API Key(s) (supports single ApiKey and rotating ApiKeys array)
            var availableKeys = new List<string>();
            var singleKey = _configuration["Gemini:ApiKey"];
            if (!string.IsNullOrWhiteSpace(singleKey) && singleKey != "YOUR_GEMINI_API_KEY_HERE")
            {
                availableKeys.Add(singleKey.Trim());
            }

            var keySection = _configuration.GetSection("Gemini:ApiKeys");
            foreach (var child in keySection.GetChildren())
            {
                if (!string.IsNullOrWhiteSpace(child.Value) && !availableKeys.Contains(child.Value.Trim()))
                {
                    availableKeys.Add(child.Value.Trim());
                }
            }

            var envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            if (!string.IsNullOrWhiteSpace(envKey) && !availableKeys.Contains(envKey.Trim()))
            {
                availableKeys.Add(envKey.Trim());
            }

            if (availableKeys.Count == 0)
            {
                return BadRequest(Result<AiChatResponse>.Failure("Gemini API key is not configured. Please add Gemini:ApiKey or Gemini:ApiKeys to user-secrets/appsettings.json."));
            }

            var modelName = _configuration["Gemini:Model"];
            if (string.IsNullOrWhiteSpace(modelName))
            {
                modelName = "gemini-3.6-flash";
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

                // 3. Prepare System Prompt
                var systemInstruction = new GeminiInstruction
                {
                    Parts = new List<GeminiPart>
                    {
                        new()
                        {
                            Text = "You are a helpful, secure clinic assistant for the Smart Clinic Management System (SCMS).\n" +
                                   "You have access to real-time clinic operations, EMR, financial summaries, and stock details through MCP tools.\n" +
                                   "Rules:\n" +
                                   "- Support commands and queries in both English and Myanmar language. Always reply in the user's preferred language.\n" +
                                   "- Keep answers concise, clear, and direct (low token usage focus).\n" +
                                   "- Always retrieve data using the provided MCP tools before answering. NEVER fabricate patient details, stock levels, or EMR data.\n" +
                                   "- Never diagnose patients or recommend prescription changes independently. Remind the user that clinical judgment belongs to the doctor.\n" +
                                   "- Always output all dates in 'dd-mm-yyyy' format in all your natural language replies (e.g., 24-06-2026 instead of 2026-06-24). Never output dates in 'yyyy-mm-dd' or other formats. This is extremely important.\n" +
                                   "- For general clinic briefings, daily/weekly/monthly operations, revenue/income, walk-in vs booking counts, or doctor consultation fees, use the `get_dashboard_summary` tool with the requested period ('daily', 'weekly', 'monthly').\n" +
                                   "- For simple bulk rescheduling of today's active appointments, use the simple `reschedule_today_appointments` tool with the target start time.\n" +
                                   "- For fine-grained range-based rescheduling of specific time slots, use `reschedule_appointments_in_range`.\n" +
                                   "- For status updates by Patient Name, use `update_appointment_status_by_patient_name` directly.\n" +
                                   "- For bulk status updates of all today's appointments at once, use the `bulk_update_today_appointments_status` tool directly.\n" +
                                   "- For managing medication templates, use `get_prescription_templates` and `create_prescription_template` tools.\n" +
                                   "- For comprehensive Know Your Patient (KYP) clinical summaries, use `get_patient_kyp_brief` tool."
                        }
                    }
                };

                // 4. Map chat history to Gemini structure using JsonArray to ensure lossless multi-turn state preservation
                var contents = new JsonArray();
                foreach (var msg in request.Messages)
                {
                    contents.Add(new JsonObject
                    {
                        ["role"] = string.Equals(msg.Role, "user", StringComparison.OrdinalIgnoreCase) ? "user" : "model",
                        ["parts"] = new JsonArray
                        {
                            new JsonObject { ["text"] = msg.Content }
                        }
                    });
                }

                // 5. Run the Agentic Tool-Calling Loop (max 5 iterations)
                string finalReply = "Sorry, I was unable to complete your request. Please try again.";
                int maxIterations = 5;

                for (int iter = 0; iter < maxIterations; iter++)
                {
                    var geminiReq = new JsonObject
                    {
                        ["contents"] = contents.DeepClone(),
                        ["systemInstruction"] = JsonNode.Parse(JsonSerializer.Serialize(systemInstruction)),
                        ["tools"] = JsonNode.Parse(JsonSerializer.Serialize(geminiTools))
                    };

                    HttpResponseMessage httpResponse = null!;
                    string errContent = string.Empty;
                    bool callSuccessful = false;

                    foreach (var apiKey in availableKeys)
                    {
                        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}";

                        for (int retry = 0; retry < 2; retry++)
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
                                    break;
                                }

                                await Task.Delay(TimeSpan.FromSeconds(retry + 1));
                            }
                            catch (Exception ex)
                            {
                                errContent = $"Network/connection error: {ex.Message}";
                                await Task.Delay(TimeSpan.FromSeconds(retry + 1));
                            }
                        }

                        if (callSuccessful)
                        {
                            break;
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
                                    else if ((code == 400 || code == 401 || string.Equals(status, "UNAUTHENTICATED", StringComparison.OrdinalIgnoreCase)) &&
                                             (msg.Contains("API key", StringComparison.OrdinalIgnoreCase) ||
                                              msg.Contains("authentication", StringComparison.OrdinalIgnoreCase) ||
                                              msg.Contains("credential", StringComparison.OrdinalIgnoreCase)))
                                    {
                                        userFriendlyMessage = "The Gemini API key is missing or invalid. Please add a valid API key to 'Gemini:ApiKey' in appsettings.json or set the GEMINI_API_KEY environment variable (obtain a free key from https://aistudio.google.com/).";
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

                    var rawResponseJson = await httpResponse.Content.ReadAsStringAsync();
                    var resNode = JsonNode.Parse(rawResponseJson);
                    var candidateNode = resNode?["candidates"]?[0];
                    var modelContentNode = candidateNode?["content"]?.DeepClone();

                    if (modelContentNode == null || modelContentNode["parts"] is not JsonArray partsArray || partsArray.Count == 0)
                    {
                        break;
                    }

                    // Preserve 100% of the raw model response content (including thought_signature and thought blocks)
                    contents.Add(modelContentNode);

                    var functionCalls = new List<(string Name, Dictionary<string, object> Args, string? Id, string? ThoughtSignature)>();

                    foreach (var partNode in partsArray)
                    {
                        if (partNode?["functionCall"] is JsonObject fnCallObj)
                        {
                            var fnName = fnCallObj["name"]?.GetValue<string>() ?? string.Empty;
                            var argsDict = new Dictionary<string, object>();
                            if (fnCallObj["args"] is JsonObject argsObj)
                            {
                                foreach (var kvp in argsObj)
                                {
                                    if (kvp.Value != null)
                                    {
                                        argsDict[kvp.Key] = kvp.Value.Deserialize<object>() ?? kvp.Value.ToString();
                                    }
                                }
                            }
                            var id = fnCallObj["id"]?.GetValue<string>();
                            var sig = partNode["thought_signature"]?.GetValue<string>()
                                   ?? partNode["thoughtSignature"]?.GetValue<string>()
                                   ?? fnCallObj["thought_signature"]?.GetValue<string>()
                                   ?? fnCallObj["thoughtSignature"]?.GetValue<string>();

                            functionCalls.Add((fnName, argsDict, id, sig));
                        }
                    }

                    if (functionCalls.Count == 0)
                    {
                        foreach (var partNode in partsArray)
                        {
                            if (partNode?["thought"]?.GetValue<bool>() == true) continue;

                            var text = partNode?["text"]?.GetValue<string>();
                            if (!string.IsNullOrEmpty(text))
                            {
                                finalReply = text;
                                break;
                            }
                        }
                        break;
                    }

                    var toolResponseParts = new JsonArray();

                    foreach (var (name, args, id, thoughtSig) in functionCalls)
                    {
                        var localCallResult = await _mcpService.CallToolAsync(new McpToolCallRequest
                        {
                            Name = name,
                            Arguments = args
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

                        var fnResponseObj = new JsonObject
                        {
                            ["name"] = name,
                            ["response"] = JsonNode.Parse(JsonSerializer.Serialize(responseData))
                        };
                        if (!string.IsNullOrEmpty(id))
                        {
                            fnResponseObj["id"] = id;
                        }

                        var partObj = new JsonObject
                        {
                            ["functionResponse"] = fnResponseObj
                        };

                        if (!string.IsNullOrEmpty(thoughtSig))
                        {
                            partObj["thought_signature"] = thoughtSig;
                        }

                        toolResponseParts.Add(partObj);
                    }

                    contents.Add(new JsonObject
                    {
                        ["role"] = "user",
                        ["parts"] = toolResponseParts
                    });
                }

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

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
    }

    public class GeminiPart
    {
        [JsonPropertyName("text")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Text { get; set; }

        [JsonPropertyName("thought")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? Thought { get; set; }

        [JsonPropertyName("thought_signature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ThoughtSignature { get; set; }

        [JsonPropertyName("functionCall")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public GeminiFunctionCall? FunctionCall { get; set; }

        [JsonPropertyName("functionResponse")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public GeminiFunctionResponse? FunctionResponse { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
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
        [JsonPropertyName("id")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("args")]
        public Dictionary<string, object>? Args { get; set; }

        [JsonPropertyName("thought_signature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ThoughtSignature { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
    }

    public class GeminiFunctionResponse
    {
        [JsonPropertyName("id")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("response")]
        public object Response { get; set; } = new { };

        [JsonPropertyName("thought_signature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ThoughtSignature { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
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
