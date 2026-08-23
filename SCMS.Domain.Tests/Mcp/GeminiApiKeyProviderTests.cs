using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Xunit;
using SCMS.Domain.Features.Mcp;

namespace SCMS.Domain.Tests.Mcp
{
    public class GeminiApiKeyProviderTests
    {
        private static GeminiApiKeyProvider Build(params (string Key, string Value)[] settings)
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(settings.ToDictionary(s => s.Key, s => (string?)s.Value))
                .Build();

            return new GeminiApiKeyProvider(config);
        }

        [Fact]
        public void WithNoKeysConfigured_ReportsNoKeys()
        {
            var provider = Build();

            Assert.False(provider.HasKeys);
            Assert.Null(provider.Acquire());
        }

        [Fact]
        public void PlaceholderKeys_AreIgnored()
        {
            var provider = Build(("Gemini:ApiKey", "YOUR_GEMINI_API_KEY_HERE"));

            Assert.False(provider.HasKeys);
        }

        [Fact]
        public void DuplicateKeys_AreCollapsed()
        {
            var provider = Build(
                ("Gemini:ApiKeys:0", "same-key"),
                ("Gemini:ApiKey", "same-key"));

            Assert.Equal(1, provider.KeyCount);
        }

        [Fact]
        public void TwoKeys_AreHandedOutInRotation()
        {
            var provider = Build(
                ("Gemini:ApiKeys:0", "key-a"),
                ("Gemini:ApiKeys:1", "key-b"));

            Assert.Equal(2, provider.KeyCount);

            var handedOut = new List<string>
            {
                provider.Acquire()!.Value,
                provider.Acquire()!.Value,
                provider.Acquire()!.Value,
                provider.Acquire()!.Value
            };

            // Round-robin: each key is used half the time, so one key's quota is not burned first.
            Assert.Equal(2, handedOut.Count(k => k == "key-a"));
            Assert.Equal(2, handedOut.Count(k => k == "key-b"));
        }

        [Fact]
        public void ARateLimitedKey_IsSkippedInFavourOfTheOther()
        {
            var provider = Build(
                ("Gemini:ApiKeys:0", "key-a"),
                ("Gemini:ApiKeys:1", "key-b"));

            var first = provider.Acquire()!;
            provider.ReportRateLimited(first);

            // This is the whole point of the pool: the exhausted key stops being handed out.
            for (var i = 0; i < 5; i++)
            {
                Assert.NotEqual(first.Value, provider.Acquire()!.Value);
            }
        }

        [Fact]
        public void WhenEveryKeyIsRateLimited_StillReturnsOneToTryRatherThanNothing()
        {
            var provider = Build(
                ("Gemini:ApiKeys:0", "key-a"),
                ("Gemini:ApiKeys:1", "key-b"));

            provider.ReportRateLimited(provider.Acquire()!);
            provider.ReportRateLimited(provider.Acquire()!);

            Assert.NotNull(provider.Acquire());
        }

        [Fact]
        public void AnInvalidKey_IsRetiredPermanently()
        {
            var provider = Build(
                ("Gemini:ApiKeys:0", "key-a"),
                ("Gemini:ApiKeys:1", "key-b"));

            var bad = provider.Acquire()!;
            provider.ReportInvalid(bad);

            for (var i = 0; i < 5; i++)
            {
                Assert.NotEqual(bad.Value, provider.Acquire()!.Value);
            }
        }

        [Fact]
        public void WhenAllKeysAreInvalid_AcquireReturnsNull()
        {
            var provider = Build(("Gemini:ApiKeys:0", "key-a"));

            provider.ReportInvalid(provider.Acquire()!);

            Assert.Null(provider.Acquire());
        }
    }
}
