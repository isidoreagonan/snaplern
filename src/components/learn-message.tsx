import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Copy, Check, Sparkles, Lightbulb, BookmarkPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Beautiful, study-oriented renderer for Oracle responses.
 * - Headings become gradient section banners
 * - **bold** becomes a highlighter mark (key concept)
 * - Lists get custom markers
 * - Blockquotes become "À retenir" memory callouts
 * - Inline code becomes a soft pill, code blocks a dark card
 * - A floating toolbar lets the student copy or save the answer
 */
export function LearnMessage({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  // Extract a 1-line key takeaway (first heading, bold span, or first sentence)
  const takeaway = useMemo(() => {
    const h = content.match(/^#{1,3}\s+(.+)$/m)?.[1];
    if (h) return h.trim();
    const b = content.match(/\*\*(.+?)\*\*/)?.[1];
    if (b) return b.trim();
    const s = content.split(/[.!?]\s/)[0];
    return s?.slice(0, 140).trim() ?? "";
  }, [content]);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copié");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative max-w-[88%] rounded-3xl bg-white border border-slate-100 shadow-[0_2px_30px_-12px_rgba(255,107,90,0.25)] overflow-hidden"
    >
      {/* Top ribbon */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Oracle · réponse
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="text-slate-400 hover:text-[#ff7a6c] p-1.5 rounded-md hover:bg-slate-50"
            title="Copier"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => toast.success("Ajouté à ta Mémoire")}
            className="text-slate-400 hover:text-[#ff7a6c] p-1.5 rounded-md hover:bg-slate-50"
            title="Sauver dans Mémoire"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Takeaway */}
      {takeaway && (
        <div className="mx-5 mt-3 mb-1 flex items-start gap-2 rounded-2xl bg-gradient-to-r from-[#fff5f3] to-[#fff] border border-[#ffd5cc] px-3 py-2">
          <Lightbulb className="h-4 w-4 text-[#ff7a6c] shrink-0 mt-0.5" />
          <div className="text-[12px] leading-snug text-slate-700">
            <span className="font-mono uppercase tracking-widest text-[9px] text-[#ff7a6c] mr-2">
              à retenir
            </span>
            {takeaway}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-5 pb-5 pt-3 text-[14.5px] leading-[1.7] text-slate-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="mt-5 mb-3 text-lg font-black text-slate-900 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-5 before:rounded-full before:bg-gradient-to-b before:from-[#ff8a7a] before:to-[#ff6b5a]">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3 className="mt-5 mb-2 text-base font-black text-slate-900 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-4 before:rounded-full before:bg-[#ff7a6c]">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="mt-4 mb-1.5 text-sm font-bold uppercase tracking-wider text-[#ff7a6c]">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="my-2.5">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-bold bg-[linear-gradient(180deg,transparent_62%,#ffe1da_62%)] px-0.5">
                {children}
              </strong>
            ),
            em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
            ul: ({ children }) => <ul className="my-3 space-y-1.5 pl-1">{children}</ul>,
            ol: ({ children }) => (
              <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-[#ff7a6c] marker:font-bold">
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => {
              // Ordered list items: use default marker
              if ((props as { ordered?: boolean }).ordered) {
                return <li className="pl-1">{children}</li>;
              }
              return (
                <li className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-[0.65em] before:w-2 before:h-2 before:rounded-sm before:rotate-45 before:bg-gradient-to-br before:from-[#ff8a7a] before:to-[#ff6b5a]">
                  {children}
                </li>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="my-4 rounded-2xl border-l-4 border-[#ff7a6c] bg-[#fff5f3] px-4 py-3 text-slate-700 italic">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isBlock = /language-/.test(className ?? "");
              if (isBlock) {
                return (
                  <code className="block bg-slate-900 text-slate-100 rounded-xl px-4 py-3 text-[13px] font-mono overflow-x-auto my-3">
                    {children}
                  </code>
                );
              }
              return (
                <code className="bg-slate-100 text-[#b91c1c] rounded px-1.5 py-0.5 text-[0.9em] font-mono">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <pre className="my-3">{children}</pre>,
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff7a6c] underline decoration-[#ffd5cc] underline-offset-2 hover:decoration-[#ff7a6c]"
              >
                {children}
              </a>
            ),
            hr: () => <hr className="my-5 border-dashed border-slate-200" />,
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-slate-50 text-left px-3 py-2 font-bold text-slate-700">{children}</th>
            ),
            td: ({ children }) => <td className="px-3 py-2 border-t border-slate-100">{children}</td>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}