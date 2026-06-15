import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-sidebar";
import { askOracle } from "@/lib/oracle.functions";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Sparkles, Loader2, User, Plus, MessageSquare, Trash2, History } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { LearnMessage } from "@/components/learn-message";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Msg[]; updated_at: string };

const SUGGESTIONS = [
  "Explique-moi la photosynthèse simplement",
  "Crée un plan de révision pour mon bac de maths",
  "Donne-moi une question piège sur la Révolution française",
  "Résume la dérivation en 5 points",
];

export const Route = createFileRoute("/_authenticated/oracle")({
  head: () => ({ meta: [{ title: "Oracle — SnapLern" }] }),
  component: OraclePage,
});

function OraclePage() {
  const ask = useServerFn(askOracle);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadChats = async () => {
    const { data } = await supabase
      .from("oracle_chats")
      .select("id,title,messages,updated_at")
      .order("updated_at", { ascending: false });
    setChats((data ?? []) as Chat[]);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const newChat = () => {
    setChatId(null);
    setMessages([]);
    setInput("");
    setShowHistory(false);
  };

  const openChat = (c: Chat) => {
    setChatId(c.id);
    setMessages(c.messages || []);
    setShowHistory(false);
  };

  const deleteChat = async (id: string) => {
    await supabase.from("oracle_chats").delete().eq("id", id);
    if (chatId === id) newChat();
    setChats((cs) => cs.filter((c) => c.id !== id));
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await ask({ data: { messages: next } });
      const finalMsgs: Msg[] = [...next, { role: "assistant", content: reply }];
      setMessages(finalMsgs);

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      if (chatId) {
        await supabase
          .from("oracle_chats")
          .update({ messages: finalMsgs })
          .eq("id", chatId);
      } else {
        const title = content.slice(0, 60);
        const { data: created } = await supabase
          .from("oracle_chats")
          .insert({ user_id: u.user.id, title, messages: finalMsgs })
          .select("id,title,messages,updated_at")
          .single();
        if (created) {
          setChatId(created.id);
        }
      }
      loadChats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Oracle silencieux");
      setMessages(next.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100vh-6rem)]">
        {/* Gallery sidebar */}
        <aside
          className={`${showHistory ? "fixed inset-0 z-40 bg-black/40 md:bg-transparent md:static md:inset-auto" : "hidden"} md:flex md:relative w-full md:w-72 shrink-0`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistory(false);
          }}
        >
          <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col w-72 max-w-[80vw] ml-auto md:ml-0 h-full">
            <button
              onClick={newChat}
              className="w-full flex items-center justify-center gap-2 bg-[#ff7a6c] hover:bg-[#ff6b5a] text-white rounded-xl px-3 py-2.5 font-bold text-sm transition"
            >
              <Plus className="h-4 w-4" /> Nouvelle discussion
            </button>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-4 mb-2 px-1">
              Historique
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {chats.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-8">
                  Aucune discussion pour l'instant.
                </div>
              ) : (
                chats.map((c) => {
                  const active = c.id === chatId;
                  return (
                    <div
                      key={c.id}
                      className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition ${
                        active ? "bg-[#fff5f3] border border-[#ffd5cc]" : "hover:bg-slate-50 border border-transparent"
                      }`}
                      onClick={() => openChat(c)}
                    >
                      <MessageSquare className={`h-4 w-4 shrink-0 ${active ? "text-[#ff7a6c]" : "text-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{c.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setShowHistory(true)}
            className="md:hidden h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center"
            title="Historique"
          >
            <History className="h-5 w-5 text-slate-700" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-[#ff6b5a] flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff7a6c]">/ oracle</div>
            <h1 className="text-2xl font-black truncate">Ton tuteur IA personnel</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-slate-100 p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] flex items-center justify-center mb-4"
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              <div className="font-black text-xl">Parle à l'Oracle</div>
              <div className="text-sm text-slate-500 max-w-md mt-2">Pose n'importe quelle question sur tes cours, demande un exercice, un résumé ou une explication.</div>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm bg-[#fff5f3] hover:bg-[#ffe7e2] border border-[#ffd5cc] rounded-xl px-4 py-3 font-medium text-slate-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-slate-900 text-white" : "bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] text-white"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed bg-slate-900 text-white">
                  {m.content}
                </div>
              ) : (
                <LearnMessage content={m.content} />
              )}
            </motion.div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] text-white flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-[#fff5f3] rounded-2xl px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Oracle réfléchit…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-4 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 focus-within:border-[#ff7a6c]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demande à Oracle…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#ff7a6c] hover:bg-[#ff6b5a] disabled:opacity-40 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm"
          >
            <Send className="h-4 w-4" /> Envoyer
          </button>
        </form>
        </div>
      </div>
    </AppShell>
  );
}