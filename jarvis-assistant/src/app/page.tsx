"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

type RecognitionWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
};

type JarvisResult = {
  ok: boolean;
  result?: {
    title: string;
    detail: string;
    spoken?: string;
  };
  error?: string;
};

const SUGGESTIONS = [
  "Open the website YouTube",
  "Launch VS Code",
  "What is our system status?",
  "List the files in downloads",
  "Take note that I scheduled a meeting at 4 PM",
  "Read my notes",
  "Run the command status",
];

const createId = () => crypto.randomUUID();

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Hello, I am Jarvis. Ask me to open apps, check system health, or keep quick notes.",
    },
  ]);
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const canUseSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window;
  }, []);

  const speak = useCallback((text: string | undefined) => {
    if (!text || typeof window === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("speech synthesis failed", error);
    }
  }, []);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const scrollToBottom = useCallback(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const processInput = useCallback(
    async (command: string) => {
      if (!command.trim()) return;
      appendMessage({ id: createId(), role: "user", content: command });
      setPending(true);
      try {
        const response = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });
        const data = (await response.json()) as JarvisResult;
        if (!data.ok || !data.result) {
          throw new Error(data.error ?? "Unknown error");
        }
        const { title, detail, spoken } = data.result;
        appendMessage({
          id: createId(),
          role: "assistant",
          content: `${title}\n${detail}`,
        });
        speak(spoken ?? detail);
      } catch (error: unknown) {
        const description =
          error instanceof Error ? error.message : "Failed to contact Jarvis.";
        appendMessage({
          id: createId(),
          role: "assistant",
          content: `Something went wrong: ${description}`,
        });
      } finally {
        setPending(false);
      }
    },
    [appendMessage, speak]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const current = input.trim();
      setInput("");
      await processInput(current);
    },
    [input, processInput]
  );

  const handleSuggestion = useCallback(
    async (value: string) => {
      setInput("");
      await processInput(value);
    },
    [processInput]
  );

  const toggleListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const recognitionCtor =
      (window as RecognitionWindow).SpeechRecognition ??
      (window as RecognitionWindow).webkitSpeechRecognition;
    if (!recognitionCtor) {
      appendMessage({
        id: createId(),
        role: "assistant",
        content: "Your browser does not support speech recognition.",
      });
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new recognitionCtor();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: RecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput("");
          processInput(transcript);
        }
      };

      recognition.onerror = () => {
        setListening(false);
        appendMessage({
          id: createId(),
          role: "assistant",
          content: "I could not understand the audio input.",
        });
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      try {
        recognition.start();
        setListening(true);
      } catch (error) {
        console.error("speech recognition error", error);
      }
    }
  }, [appendMessage, listening, processInput]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-slate-400">Jarvis Control Deck</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Command your workstation hands-free.
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            Speak or type what you need. Jarvis can launch apps, open websites, audit system
            health, run whitelisted commands, and keep quick notes that persist through sessions.
          </p>
        </header>
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="flex h-[32rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-xl shadow-slate-950/30 backdrop-blur">
            <div
              ref={listRef}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
            >
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {message.role === "assistant" ? "Jarvis" : "You"}
                  </p>
                  <div className="whitespace-pre-wrap rounded-xl bg-slate-900/80 px-4 py-3 text-sm leading-relaxed text-slate-200 ring-1 ring-white/5">
                    {message.content}
                  </div>
                </div>
              ))}
              {pending ? (
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Working...
                </div>
              ) : null}
            </div>
            <form
              onSubmit={handleSubmit}
              className="border-t border-white/10 bg-slate-950/30 p-4"
            >
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Tell Jarvis what to do..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  disabled={pending}
                  aria-label="Command input"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  disabled={pending || input.trim().length === 0}
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    listening
                      ? "bg-emerald-500 text-white hover:bg-emerald-400"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {listening ? "Listening…" : "Speak"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {pending
                  ? "Executing command..."
                  : listening
                  ? "Jarvis is listening."
                  : canUseSpeech
                  ? "Press Speak to issue a voice command."
                  : "Speech synthesis only is available in this browser."}
              </p>
            </form>
          </div>
          <aside className="flex h-[32rem] flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-6 shadow-lg shadow-slate-950/20 backdrop-blur">
            <div>
              <h2 className="text-sm font-semibold uppercase text-slate-400">
                Quick commands
              </h2>
              <div className="mt-3 grid gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestion(suggestion)}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-sky-500 hover:bg-slate-900"
                    disabled={pending}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-auto space-y-3">
              <h2 className="text-sm font-semibold uppercase text-slate-400">
                Capabilities
              </h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Launches curated desktop apps or favorite websites</li>
                <li>• Audits system uptime, memory, and load</li>
                <li>• Runs safe shell commands (uptime, whoami, ip)</li>
                <li>• Keeps quick notes stored securely on-device</li>
                <li>• Voice input with speech response when supported</li>
              </ul>
              <p className="text-xs text-slate-500">
                Extend Jarvis by editing <code>src/lib/command-registry.ts</code> to add more actions
                or connect custom tooling.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
