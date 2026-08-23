import {
  MagicWandIcon,
  PaperPlaneIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircledIcon,
  PlayIcon,
  CodeIcon,
  ReloadIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { mcpApi } from "../services/scmsApi";
import { useLanguage } from "../context/LanguageContext";
import SegmentedControl from "../components/SegmentedControl";
import ArrayObjectField from "../components/mcp/ArrayObjectField";
import ToolResultView from "../components/mcp/ToolResultView";
import {
  CATEGORY_ORDER,
  getCategoryLabel,
  getToolLabel,
  getToolMeta,
  humanizeKey,
  isTimeField,
  STATUS_PILL_STYLES,
  TIME_QUICK_PICKS,
} from "../utils/mcpToolCatalog";

const renderMessageContent = (content) => {
  if (!content) return null;

  const lines = content.split("\n");

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    let lineContent = line;
    if (isBullet) {
      const bulletIndex = line.indexOf(trimmed.startsWith("* ") ? "* " : "- ");
      lineContent = line.substring(bulletIndex + 2);
    }

    const parts = [];
    const regex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(lineContent)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(lineContent.substring(lastIndex, matchIndex));
      }
      parts.push(
        <strong key={matchIndex} className="font-extrabold text-slate-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < lineContent.length) {
      parts.push(lineContent.substring(lastIndex));
    }

    const contentNode = parts.length > 0 ? parts : lineContent;

    if (isBullet) {
      return (
        <ul key={lineIdx} className="list-disc pl-5 my-0.5">
          <li className="font-medium text-slate-700 dark:text-slate-200">{contentNode}</li>
        </ul>
      );
    }

    return (
      <p key={lineIdx} className="min-h-[1.25rem] font-medium text-slate-700 dark:text-slate-200">
        {contentNode}
      </p>
    );
  });
};

export default function AiAssistant() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: "model",
      content:
        language === "mm"
          ? "မင်္ဂလာပါ! ကျွန်တော်ကတော့ ကုမယ် AI အကူအညီပေးသူ ဖြစ်ပါတယ်။ ဆေးခန်းလည်ပတ်မှုတွေ၊ ချိန်းဆိုမှုတွေနဲ့ ဆေးဝါးလက်ကျန်တွေကို ရှာဖွေစုံစမ်းဖို့ ဘယ်လိုကူညီပေးရမလဲခင်ဗျာ။"
          : "Hello! I am your intelligent assistant. How can I help you manage clinic operations, reschedule appointments, or check inventory levels today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolInputs, setToolInputs] = useState({});
  const [toolResponse, setToolResponse] = useState(null);
  const [toolError, setToolError] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [loadingToolCall, setLoadingToolCall] = useState(false);
  const [error, setError] = useState("");
  const [toolMode, setToolMode] = useState("guided"); // "guided" | "advanced"
  const [toolSearch, setToolSearch] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(null); // parsed args awaiting confirmation

  const chatEndRef = useRef(null);

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  const loadTools = async () => {
    try {
      setLoadingTools(true);
      setError("");
      const res = await mcpApi.tools();
      if (res?.isSuccess) {
        setTools(res.data || []);
      } else {
        setError(res?.message || "Failed to load MCP tools.");
      }
    } catch (err) {
      setError(err?.message || "Error connecting to AI backend.");
    } finally {
      setLoadingTools(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loadingChat) return;

    const nextMessages = [...messages, { role: "user", content: query }];
    setMessages(nextMessages);
    setInput("");
    setLoadingChat(true);

    try {
      const res = await mcpApi.chat({
        messages: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (res?.isSuccess && res.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: res.data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: "Sorry, I encountered an issue processing that request. Please try again.",
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `Error: ${err?.response?.data?.message || err?.message || "Could not connect to Gemini AI."}`,
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    setToolResponse(null);
    setPendingConfirm(null);
    const initialInputs = {};
    if (tool?.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([k, prop]) => {
        initialInputs[k] = prop.type === "array" && prop.items?.properties ? [] : "";
      });
    }
    setToolInputs(initialInputs);
    setToolError("");
  };

  const handleToolInput = (key, val) => {
    setToolInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleToolModeChange = (mode) => {
    setToolMode(mode);
    setSelectedTool(null);
    setToolResponse(null);
    setPendingConfirm(null);
    setToolError("");
  };

  /** Builds the final call arguments from toolInputs, coercing each value to the type the schema declares. */
  const buildParsedArgs = () => {
    const props = selectedTool.inputSchema?.properties || {};
    const required = selectedTool.inputSchema?.required || [];

    const missing = required.filter((k) => {
      const v = toolInputs[k];
      if (Array.isArray(v)) return v.length === 0;
      return String(v ?? "").trim() === "";
    });
    if (missing.length > 0) {
      const names = missing.map((k) => humanizeKey(k, language)).join(", ");
      setToolError(
        language === "mm" ? `လိုအပ်သည်: ${names}` : `Required: ${names}`
      );
      return null;
    }

    const parsedArgs = {};

    for (const [k, v] of Object.entries(toolInputs)) {
      const type = props[k]?.type;

      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        const itemProps = props[k]?.items?.properties || {};
        parsedArgs[k] = v.map((row) => {
          const out = {};
          Object.entries(row).forEach(([rk, rv]) => {
            const rType = itemProps[rk]?.type;
            out[rk] = rType === "number" || rType === "integer" ? Number(rv) : rv;
          });
          return out;
        });
        continue;
      }

      const raw = typeof v === "string" ? v.trim() : v;
      if (raw === "" || raw === undefined || raw === null) continue;

      if (type === "number" || type === "integer") {
        const num = Number(raw);
        if (Number.isNaN(num)) {
          setToolError(
            language === "mm"
              ? `"${humanizeKey(k, language)}" သည် ဂဏန်းဖြစ်ရမည်။`
              : `"${humanizeKey(k, language)}" must be a number.`
          );
          return null;
        }
        parsedArgs[k] = num;
      } else if (type === "boolean") {
        parsedArgs[k] = raw === "true" || raw === true;
      } else if (type === "array" || type === "object") {
        try {
          parsedArgs[k] = JSON.parse(raw);
        } catch {
          setToolError(`"${humanizeKey(k, language)}" must be valid JSON.`);
          return null;
        }
      } else {
        parsedArgs[k] = raw;
      }
    }

    return parsedArgs;
  };

  const executeToolCall = async (parsedArgs) => {
    setLoadingToolCall(true);
    setToolResponse(null);
    try {
      const res = await mcpApi.callTool({
        name: selectedTool.name,
        arguments: parsedArgs,
      });

      if (res?.isSuccess) {
        setToolResponse(res.data);
      } else {
        setToolResponse({ isError: true, error: res?.message || "Execution failed" });
      }
    } catch (err) {
      setToolResponse({ isError: true, error: err?.message || "Error calling tool" });
    } finally {
      setLoadingToolCall(false);
    }
  };

  const handleCallTool = async () => {
    if (!selectedTool || loadingToolCall) return;

    setToolError("");
    const parsedArgs = buildParsedArgs();
    if (!parsedArgs) return;

    const meta = getToolMeta(selectedTool.name);
    if (toolMode === "guided" && meta?.confirm) {
      setPendingConfirm(parsedArgs);
      return;
    }

    await executeToolCall(parsedArgs);
  };

  const handleConfirmToolCall = async () => {
    if (!pendingConfirm) return;
    const args = pendingConfirm;
    setPendingConfirm(null);
    await executeToolCall(args);
  };

  const quickPrompts = [
    {
      label: language === "mm" ? "ဆေးလက်ကျန်သတိပေးချက်များ" : "Stock alerts",
      prompt: "Show me all critical medicine stock alerts.",
    },
    {
      label: language === "mm" ? "ယနေ့လူနာအချိန်းအဆိုများ" : "Today appointments",
      prompt: "What appointments are scheduled for today?",
    },
    {
      label: language === "mm" ? "အဆုတ်ပန်းနာအတွက် ဆေးညွှန်းပုံစံ" : "Asthma prescription template",
      prompt: "What standard prescription templates do we have for Asthma?",
    },
  ];

  const filteredTools = useMemo(() => {
    const q = toolSearch.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((tool) => {
      const label = getToolLabel(tool, language).toLowerCase();
      return label.includes(q) || tool.name.toLowerCase().includes(q) || tool.description?.toLowerCase().includes(q);
    });
  }, [tools, toolSearch, language]);

  const groupedTools = useMemo(() => {
    const groups = {};
    filteredTools.forEach((tool) => {
      const category = getToolMeta(tool.name)?.category || "other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(tool);
    });
    const orderedKeys = [...CATEGORY_ORDER.filter((c) => groups[c]), ...Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c))];
    return orderedKeys.map((key) => ({ key, tools: groups[key] }));
  }, [filteredTools]);

  const selectedToolMeta = selectedTool ? getToolMeta(selectedTool.name) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] animate-fadeIn">
      {/* Chat Window */}
      <section className="flex h-[calc(100vh-140px)] flex-col rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms">
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/40 shrink-0">
            <MagicWandIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">
              {language === "mm" ? "AI ဆေးခန်းအကူ" : "AI Operations Assistant"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by Gemini & Model Context Protocol (MCP)
            </p>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="ml-auto scms-btn-outline p-1.5 h-8 min-h-8 w-8 btn-target"
            title="Reset Chat"
          >
            <ReloadIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white shrink-0 shadow-2xs ${
                  msg.role === "user" ? "bg-orange-500" : "bg-zinc-800 dark:bg-zinc-700"
                }`}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>
              <div
                className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-orange-500 text-white rounded-tr-sm shadow-xs font-medium"
                    : "bg-secondary/70 border border-border/70 text-foreground rounded-tl-sm shadow-2xs"
                }`}
              >
                <div className="space-y-1">{renderMessageContent(msg.content)}</div>
              </div>
            </div>
          ))}
          {loadingChat && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white bg-zinc-800 dark:bg-zinc-700 shrink-0 animate-pulse">
                AI
              </div>
              <div className="rounded-3xl rounded-tl-sm bg-secondary/70 border border-border/70 px-4 py-3 text-sm">
                <span className="loading loading-dots loading-xs text-orange-500" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => setInput(qp.prompt)}
                className="rounded-full border border-orange-200 dark:border-orange-900 bg-orange-50/60 dark:bg-orange-950/40 px-3 py-1.5 text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition btn-target"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="relative mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "mm" ? "မေးမြန်းလိုသောအချက် ရေးပါ..." : "Ask AI to check stock, query diagnoses..."
            }
            className="scms-input w-full pr-12 rounded-2xl h-11 text-xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || loadingChat}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-xl bg-orange-500 text-white disabled:opacity-40 hover:bg-orange-600 transition btn-target shadow-2xs"
            aria-label="Send Message"
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* MCP Tools Sidebar */}
      <section className="flex h-[calc(100vh-140px)] flex-col rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms">
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/40 shrink-0">
            <MagicWandIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {language === "mm" ? "အမြန်လုပ်ဆောင်ချက်များ" : "Quick Actions"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "mm" ? "ဆေးခန်းစီမံခန့်ခွဲမှု လုပ်ငန်းများ" : "One-tap clinic operations"}
            </p>
          </div>
          <button
            onClick={loadTools}
            className="ml-auto scms-btn-outline p-1.5 h-8 min-h-8 w-8 btn-target"
            title="Reload Tools"
          >
            <ReloadIcon className={`w-3.5 h-3.5 ${loadingTools ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <SegmentedControl
            ariaLabel="Tool mode"
            size="sm"
            value={toolMode}
            onChange={handleToolModeChange}
            options={[
              { value: "guided", label: language === "mm" ? "ရိုးရှင်း" : "Guided" },
              { value: "advanced", label: language === "mm" ? "အဆင့်မြင့်" : "Advanced", icon: CodeIcon },
            ]}
          />
          {toolMode === "guided" && (
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder={language === "mm" ? "လုပ်ဆောင်ချက်ရှာရန်..." : "Search actions..."}
                className="scms-input w-full h-8 text-xs !pl-8"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <ExclamationTriangleIcon className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Tools Selector */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loadingTools ? (
            <div className="grid place-items-center h-40">
              <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
            </div>
          ) : tools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs font-semibold">
              <QuestionMarkCircledIcon className="w-8 h-8 mb-2 opacity-40" />
              No backend tools found. Please check API status.
            </div>
          ) : toolMode === "advanced" ? (
            tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => handleToolSelect(tool)}
                className={`w-full text-left rounded-2xl border p-3.5 transition btn-target ${
                  selectedTool?.name === tool.name
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                    TOOL
                  </div>
                  <strong className="text-xs font-bold text-slate-900 dark:text-white">
                    {tool.name}
                  </strong>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </button>
            ))
          ) : groupedTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs font-semibold">
              <MagnifyingGlassIcon className="w-8 h-8 mb-2 opacity-40" />
              {language === "mm" ? "ရလဒ်မတွေ့ရှိပါ" : "No matching actions found."}
            </div>
          ) : (
            groupedTools.map(({ key, tools: groupTools }) => (
              <div key={key}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
                  {getCategoryLabel(key, language)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {groupTools.map((tool) => {
                    const meta = getToolMeta(tool.name);
                    const Icon = meta?.icon || CodeIcon;
                    const isSelected = selectedTool?.name === tool.name;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => handleToolSelect(tool)}
                        title={tool.description}
                        className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition btn-target ${
                          isSelected
                            ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/40"
                            : "border-border/70 hover:bg-secondary/60"
                        }`}
                      >
                        <div
                          className={`grid h-7 w-7 place-items-center rounded-xl ${
                            meta?.danger
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                              : "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground leading-tight">
                          {getToolLabel(tool, language)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tool Playground / Guided Form */}
        {selectedTool && toolMode === "advanced" && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Playground: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{selectedTool.name}</span>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 btn-target"
              >
                Clear
              </button>
            </div>

            {/* Dynamic Inputs */}
            {selectedTool.inputSchema?.properties &&
              Object.keys(selectedTool.inputSchema.properties).length > 0 && (
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto mb-3 pr-1">
                  {Object.entries(selectedTool.inputSchema.properties).map(([k, prop]) => {
                    const isRequired = (selectedTool.inputSchema.required || []).includes(k);
                    const isStructured = prop.type === "array" || prop.type === "object";

                    return (
                      <label key={k} className="block text-xs">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {k}{" "}
                          {prop.type ? (
                            <span className="font-mono normal-case text-slate-400">({prop.type})</span>
                          ) : null}
                          {isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                        </span>

                        {prop.description && (
                          <span className="block text-[10px] font-medium normal-case text-slate-400 mb-1 leading-snug">
                            {prop.description}
                          </span>
                        )}

                        {prop.enum ? (
                          <select
                            className="scms-input w-full text-xs h-8"
                            value={toolInputs[k] || ""}
                            onChange={(e) => handleToolInput(k, e.target.value)}
                          >
                            <option value="">
                              {isRequired ? "Select a value..." : "(leave blank)"}
                            </option>
                            {prop.enum.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : isStructured ? (
                          <textarea
                            rows={3}
                            spellCheck={false}
                            placeholder={prop.type === "array" ? "[ { ... } ]" : "{ ... }"}
                            className="scms-input w-full text-[11px] font-mono py-1.5 leading-snug"
                            value={toolInputs[k] || ""}
                            onChange={(e) => handleToolInput(k, e.target.value)}
                          />
                        ) : (
                          <input
                            type={prop.type === "integer" || prop.type === "number" ? "number" : "text"}
                            className="scms-input w-full text-xs h-8"
                            value={toolInputs[k] || ""}
                            onChange={(e) => handleToolInput(k, e.target.value)}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

            {toolError && (
              <div className="mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                {toolError}
              </div>
            )}

            <button
              onClick={handleCallTool}
              disabled={loadingToolCall}
              className="scms-btn-primary min-h-9 h-9 w-full flex items-center justify-center gap-2 text-xs font-bold btn-target"
            >
              {loadingToolCall ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <>
                  <PlayIcon className="w-3.5 h-3.5" />
                  <span>Execute Tool</span>
                </>
              )}
            </button>

            {toolResponse && (
              <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-mono max-h-[140px] overflow-auto">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1.5">
                  <CodeIcon className="w-3.5 h-3.5" />
                  <span>{toolResponse.isError ? "Error" : "Output"}</span>
                </div>
                {toolResponse.isError ? (
                  <div className="text-rose-600 dark:text-rose-400 font-semibold whitespace-pre-wrap">
                    {toolResponse.error ||
                      toolResponse.content?.[0]?.text ||
                      "The tool reported an error."}
                  </div>
                ) : (
                  <pre className="text-slate-800 dark:text-slate-200 text-[11px] whitespace-pre-wrap">
                    {toolResponse.content?.[0]?.text ?? JSON.stringify(toolResponse, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {selectedTool && toolMode === "guided" && (
          <div className="border-t border-border/70 pt-4 mt-3 max-h-[60%] overflow-y-auto pr-1 scrollbar-thin">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                {selectedToolMeta?.icon && <selectedToolMeta.icon className="w-4 h-4 text-orange-500" />}
                {getToolLabel(selectedTool, language)}
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition btn-target"
                title={language === "mm" ? "ပိတ်ရန်" : "Close"}
              >
                <Cross2Icon className="w-3.5 h-3.5" />
              </button>
            </div>
            {selectedTool.description && (
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{selectedTool.description}</p>
            )}

            {/* Guided Inputs */}
            {selectedTool.inputSchema?.properties &&
              Object.keys(selectedTool.inputSchema.properties).length > 0 && (
                <div className="space-y-3 mb-3">
                  {Object.entries(selectedTool.inputSchema.properties).map(([k, prop]) => {
                    const isRequired = (selectedTool.inputSchema.required || []).includes(k);
                    const isArrayOfObjects = prop.type === "array" && prop.items?.properties;
                    const isStructuredFallback = (prop.type === "array" || prop.type === "object") && !isArrayOfObjects;

                    return (
                      <div key={k}>
                        <span className="block text-xs font-bold text-foreground mb-1">
                          {humanizeKey(k, language)}
                          {isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                        </span>
                        {prop.description && (
                          <span className="block text-[11px] text-muted-foreground mb-1.5 leading-snug">
                            {prop.description}
                          </span>
                        )}

                        {prop.enum ? (
                          <div className="flex flex-wrap gap-1.5">
                            {prop.enum.map((opt) => {
                              const active = toolInputs[k] === opt;
                              const pillStyle = STATUS_PILL_STYLES[opt];
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleToolInput(k, active ? "" : opt)}
                                  className={`rounded-full border px-3 py-1 text-xs font-bold capitalize transition btn-target ${
                                    active
                                      ? pillStyle || "bg-orange-500 border-orange-500 text-white"
                                      : "border-border/70 text-muted-foreground hover:bg-secondary/60"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : isArrayOfObjects ? (
                          <ArrayObjectField
                            itemSchema={prop.items}
                            value={toolInputs[k]}
                            onChange={(rows) => handleToolInput(k, rows)}
                            language={language}
                          />
                        ) : isStructuredFallback ? (
                          <textarea
                            rows={3}
                            spellCheck={false}
                            placeholder={prop.type === "array" ? "[ { ... } ]" : "{ ... }"}
                            className="scms-input w-full text-[11px] font-mono py-1.5 leading-snug"
                            value={toolInputs[k] || ""}
                            onChange={(e) => handleToolInput(k, e.target.value)}
                          />
                        ) : (
                          <>
                            <input
                              type={prop.type === "integer" || prop.type === "number" ? "number" : "text"}
                              className="scms-input w-full text-xs h-9"
                              value={toolInputs[k] || ""}
                              onChange={(e) => handleToolInput(k, e.target.value)}
                              placeholder={
                                isTimeField(k)
                                  ? language === "mm"
                                    ? "ဥပမာ - ယနေ့ ၁၄:၀၀"
                                    : "e.g. today at 14:00"
                                  : undefined
                              }
                            />
                            {isTimeField(k) && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {TIME_QUICK_PICKS.map((qp) => (
                                  <button
                                    key={qp.value}
                                    type="button"
                                    onClick={() => handleToolInput(k, qp.value)}
                                    className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-secondary/60 transition btn-target"
                                  >
                                    {qp.label[language] || qp.label.en}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {toolError && (
              <div className="mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                {toolError}
              </div>
            )}

            {pendingConfirm ? (
              <div
                className={`rounded-xl border p-3 space-y-2 ${
                  selectedToolMeta?.danger
                    ? "border-rose-300 bg-rose-50/70 dark:bg-rose-950/40 dark:border-rose-900"
                    : "border-amber-300 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      selectedToolMeta?.danger ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-foreground leading-relaxed">
                    {language === "mm"
                      ? "ဤလုပ်ဆောင်ချက်သည် လူနာချိန်းဆိုမှုများစွာကို ပြောင်းလဲနိုင်သည်။ သေချာပါသလား?"
                      : "This will change multiple records and can't be undone automatically. Continue?"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingConfirm(null)}
                    className="flex-1 scms-btn-outline h-8 min-h-8 text-xs font-bold btn-target"
                  >
                    {language === "mm" ? "မလုပ်တော့ပါ" : "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirmToolCall}
                    disabled={loadingToolCall}
                    className={`flex-1 h-8 min-h-8 rounded-xl text-xs font-bold text-white transition btn-target flex items-center justify-center gap-1.5 ${
                      selectedToolMeta?.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-500 hover:bg-orange-600"
                    }`}
                  >
                    {loadingToolCall ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : language === "mm" ? (
                      "အတည်ပြုရန်"
                    ) : (
                      "Yes, Continue"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCallTool}
                disabled={loadingToolCall}
                className={`min-h-9 h-9 w-full flex items-center justify-center gap-2 text-xs font-bold btn-target rounded-2xl text-white transition ${
                  selectedToolMeta?.danger ? "bg-rose-600 hover:bg-rose-700" : "scms-btn-primary"
                }`}
              >
                {loadingToolCall ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <PlayIcon className="w-3.5 h-3.5" />
                    <span>{getToolLabel(selectedTool, language)}</span>
                  </>
                )}
              </button>
            )}

            {toolResponse && !pendingConfirm && (
              <div className="mt-3 rounded-2xl border border-border/70 bg-secondary/30 p-3">
                <ToolResultView
                  rawText={toolResponse.content?.[0]?.text ?? JSON.stringify(toolResponse, null, 2)}
                  isError={!!toolResponse.isError}
                  language={language}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
