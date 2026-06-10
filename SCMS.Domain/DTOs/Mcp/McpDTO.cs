using System.Text.Json.Serialization;

namespace SCMS.Domain.DTOs.Mcp
{
    public class McpToolDefinition
        {
            [JsonPropertyName("name")]
            public string Name { get; set; } = string.Empty;

            [JsonPropertyName("description")]
            public string Description { get; set; } = string.Empty;

            [JsonPropertyName("inputSchema")]
            public object InputSchema { get; set; } = new { type = "object", properties = new { } };
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
