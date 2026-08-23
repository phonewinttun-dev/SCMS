using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Xunit;
using SCMS.Api.Controllers;

namespace SCMS.Domain.Tests.Mcp
{
    /// <summary>
    /// Gemini 3.x thinking models attach an encrypted "thoughtSignature" to the first functionCall
    /// part. It must survive the deserialise/re-serialise round trip when the turn is replayed as
    /// history, or the next request fails with:
    ///
    ///   "Function call is missing a thought_signature in functionCall parts."
    ///
    /// Dropping the property from GeminiPart is silent at compile time and breaks every
    /// multi-step tool call at runtime, so it is pinned here.
    /// </summary>
    public class GeminiPartSerializationTests
    {
        // Shape captured from a real gemini-3.5-flash-lite response to a two-tool prompt.
        private const string ModelTurnJson = """
        {
          "role": "model",
          "parts": [
            {
              "functionCall": { "name": "get_low_stock_medicines" },
              "thoughtSignature": "EucECuQEARFNMg-opaque-signature-payload"
            },
            {
              "functionCall": { "name": "get_today_appointments" }
            }
          ]
        }
        """;

        private static GeminiContent Parse() =>
            JsonSerializer.Deserialize<GeminiContent>(ModelTurnJson)!;

        [Fact]
        public void ThoughtSignature_SurvivesDeserialisation()
        {
            var content = Parse();

            Assert.Equal("EucECuQEARFNMg-opaque-signature-payload", content.Parts[0].ThoughtSignature);
        }

        [Fact]
        public void ThoughtSignature_IsEchoedBackOnReserialisation()
        {
            var json = JsonSerializer.Serialize(Parse());

            Assert.Contains("thoughtSignature", json);
            Assert.Contains("EucECuQEARFNMg-opaque-signature-payload", json);
        }

        [Fact]
        public void OnParallelCalls_OnlyTheSignedPartCarriesASignature()
        {
            var content = Parse();

            // Gemini signs only the first call of a parallel batch. Never synthesise one for the rest.
            Assert.Equal(2, content.Parts.Count(p => p.FunctionCall != null));
            Assert.NotNull(content.Parts[0].ThoughtSignature);
            Assert.Null(content.Parts[1].ThoughtSignature);

            var json = JsonSerializer.Serialize(content);
            Assert.Single(System.Text.RegularExpressions.Regex.Matches(json, "thoughtSignature"));
        }

        [Fact]
        public void PartsWithoutASignature_DoNotEmitANullField()
        {
            var json = JsonSerializer.Serialize(new GeminiPart { Text = "hello" });

            Assert.DoesNotContain("thoughtSignature", json);
            Assert.DoesNotContain("thought", json);
        }

        [Fact]
        public void ThinkingSummaryParts_AreDistinguishableFromTheReply()
        {
            var content = JsonSerializer.Deserialize<GeminiContent>("""
            {
              "role": "model",
              "parts": [
                { "text": "Let me check the stock levels...", "thought": true },
                { "text": "Three medicines are below threshold." }
              ]
            }
            """)!;

            // The reply is the non-thought part; picking the first text part would surface reasoning.
            var reply = content.Parts.First(p => p.Thought != true && !string.IsNullOrEmpty(p.Text));

            Assert.Equal("Three medicines are below threshold.", reply.Text);
        }
    }
}
