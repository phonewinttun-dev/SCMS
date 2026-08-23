using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SCMS.Domain.Features.Mcp
{
    public interface IGeminiApiKeyProvider
    {
        /// <summary>True when at least one key is configured.</summary>
        bool HasKeys { get; }

        /// <summary>Number of keys in the pool.</summary>
        int KeyCount { get; }

        /// <summary>Take the next usable key, skipping any currently cooling down after a rate limit.</summary>
        GeminiApiKey? Acquire();

        /// <summary>Park a key for a cooldown after the provider rate-limited or exhausted it.</summary>
        void ReportRateLimited(GeminiApiKey key);

        /// <summary>Mark a key permanently unusable for this process (e.g. it was rejected as invalid).</summary>
        void ReportInvalid(GeminiApiKey key);
    }

    /// <summary>A key plus its slot, so callers can report failures back without leaking the secret.</summary>
    public sealed class GeminiApiKey
    {
        public GeminiApiKey(int index, string value)
        {
            Index = index;
            Value = value;
        }

        public int Index { get; }

        public string Value { get; }

        /// <summary>Safe-to-log identifier. Never log <see cref="Value"/>.</summary>
        public string Label => $"key#{Index + 1}";
    }

    /// <summary>
    /// Round-robins across the configured Gemini API keys so a demo does not stall on a
    /// single key's per-minute quota. A key that reports 429/RESOURCE_EXHAUSTED is parked
    /// for a short cooldown and the next key is used instead.
    ///
    /// Keys are read from (in order):
    ///   Gemini:ApiKeys:0, Gemini:ApiKeys:1, ...   (user-secrets / appsettings array)
    ///   Gemini:ApiKey                             (legacy single-key setting)
    ///   GEMINI_API_KEY, GEMINI_API_KEY_2          (environment variables)
    /// </summary>
    public sealed class GeminiApiKeyProvider : IGeminiApiKeyProvider
    {
        private static readonly TimeSpan RateLimitCooldown = TimeSpan.FromSeconds(60);

        private static readonly string[] PlaceholderValues =
        {
            "YOUR_GEMINI_API_KEY_HERE",
            "YOUR_API_KEY",
            "CHANGE_ME"
        };

        private readonly GeminiApiKey[] _keys;
        private readonly DateTime[] _cooldownUntil;
        private readonly bool[] _invalid;
        private readonly ILogger<GeminiApiKeyProvider>? _logger;
        private int _cursor = -1;

        public GeminiApiKeyProvider(IConfiguration configuration, ILogger<GeminiApiKeyProvider>? logger = null)
        {
            _logger = logger;
            _keys = LoadKeys(configuration);
            _cooldownUntil = new DateTime[_keys.Length];
            _invalid = new bool[_keys.Length];

            _logger?.LogInformation("Gemini API key pool initialised with {KeyCount} key(s).", _keys.Length);
        }

        public bool HasKeys => _keys.Length > 0;

        public int KeyCount => _keys.Length;

        public GeminiApiKey? Acquire()
        {
            if (_keys.Length == 0) return null;

            var now = DateTime.UtcNow;

            // One full pass round-robin: take the first key that is neither invalid nor cooling down.
            for (var attempt = 0; attempt < _keys.Length; attempt++)
            {
                var index = (int)((uint)Interlocked.Increment(ref _cursor) % (uint)_keys.Length);

                if (_invalid[index]) continue;
                if (_cooldownUntil[index] > now) continue;

                return _keys[index];
            }

            // Every key is cooling down or invalid. Prefer the one that frees up soonest so the
            // caller still gets a real attempt rather than a hard failure.
            var soonest = -1;
            for (var index = 0; index < _keys.Length; index++)
            {
                if (_invalid[index]) continue;
                if (soonest < 0 || _cooldownUntil[index] < _cooldownUntil[soonest])
                {
                    soonest = index;
                }
            }

            return soonest >= 0 ? _keys[soonest] : null;
        }

        public void ReportRateLimited(GeminiApiKey key)
        {
            if (key == null || key.Index < 0 || key.Index >= _keys.Length) return;

            _cooldownUntil[key.Index] = DateTime.UtcNow.Add(RateLimitCooldown);
            _logger?.LogWarning(
                "Gemini {KeyLabel} rate-limited; cooling down for {Seconds}s. {Remaining} other key(s) available.",
                key.Label,
                RateLimitCooldown.TotalSeconds,
                _keys.Length - 1);
        }

        public void ReportInvalid(GeminiApiKey key)
        {
            if (key == null || key.Index < 0 || key.Index >= _keys.Length) return;

            _invalid[key.Index] = true;
            _logger?.LogError("Gemini {KeyLabel} was rejected as invalid and will not be retried.", key.Label);
        }

        private static GeminiApiKey[] LoadKeys(IConfiguration configuration)
        {
            var candidates = new List<string>();

            // Array form: "Gemini": { "ApiKeys": [ "...", "..." ] }
            var section = configuration.GetSection("Gemini:ApiKeys");
            if (section.Exists())
            {
                candidates.AddRange(section.GetChildren().Select(c => c.Value ?? string.Empty));
            }

            // Legacy single-key form, still honoured so existing setups keep working.
            candidates.Add(configuration["Gemini:ApiKey"] ?? string.Empty);

            candidates.Add(Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty);
            candidates.Add(Environment.GetEnvironmentVariable("GEMINI_API_KEY_2") ?? string.Empty);

            return candidates
                .Select(v => v.Trim())
                .Where(IsUsable)
                .Distinct(StringComparer.Ordinal)
                .Select((value, index) => new GeminiApiKey(index, value))
                .ToArray();
        }

        private static bool IsUsable(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            return !PlaceholderValues.Contains(value, StringComparer.OrdinalIgnoreCase);
        }
    }
}
