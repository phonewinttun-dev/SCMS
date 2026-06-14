using SCMS.Shared;
using System.Collections.Generic;
using System.Threading.Tasks;
using SCMS.Domain.DTOs.Mcp;

namespace SCMS.Domain.Features.Mcp
{
    public interface IMcpService
    {
        List<McpToolDefinition> GetAvailableTools();
        Task<Result<McpToolCallResponse>> CallToolAsync(McpToolCallRequest request);
    }
}
