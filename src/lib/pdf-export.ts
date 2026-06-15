import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

type Analysis = {
  title: string;
  subject: string;
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  lesson: { heading: string; content: string }[];
  quiz: { question: string; choices: string[]; answerIndex: number; explanation: string }[];
  flashcards: { question: string; answer: string }[];
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildHtml = (analysis: Analysis, opts?: { title?: string; subject?: string }) => {
  const title = opts?.title || analysis.title || "Parcours";
  const subject = opts?.subject || analysis.subject || "";
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const concepts = (analysis.keyConcepts || [])
    .map(
      (kc) => `
      <div style="display:flex;gap:12px;margin-bottom:14px;break-inside:avoid;">
        <div style="width:8px;height:8px;border-radius:50%;background:#ff7a6c;margin-top:8px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:2px;">${esc(kc.term)}</div>
          <div style="color:#475569;font-size:13px;line-height:1.55;">${esc(kc.definition)}</div>
        </div>
      </div>`,
    )
    .join("");

  const lesson = (analysis.lesson || [])
    .map(
      (l) => `
      <div style="margin-bottom:18px;break-inside:avoid;">
        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 6px 0;">${esc(l.heading)}</h3>
        <p style="color:#334155;font-size:13px;line-height:1.65;margin:0;white-space:pre-wrap;">${esc(l.content)}</p>
      </div>`,
    )
    .join("");

  const flashcards = (analysis.flashcards || [])
    .map(
      (fc) => `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#fff;break-inside:avoid;">
        <div style="display:flex;gap:10px;margin-bottom:8px;">
          <span style="font-weight:800;color:#ff7a6c;font-size:12px;">Q</span>
          <span style="color:#0f172a;font-size:13px;font-weight:600;line-height:1.5;">${esc(fc.question)}</span>
        </div>
        <div style="display:flex;gap:10px;">
          <span style="font-weight:800;color:#475569;font-size:12px;">R</span>
          <span style="color:#334155;font-size:13px;line-height:1.55;">${esc(fc.answer)}</span>
        </div>
      </div>`,
    )
    .join("");

  const quiz = (analysis.quiz || [])
    .map(
      (q, i) => `
      <div style="margin-bottom:18px;break-inside:avoid;">
        <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:6px;">${i + 1}. ${esc(q.question)}</div>
        <div style="margin-left:8px;">
          ${q.choices
            .map((c, ci) => {
              const isAns = ci === q.answerIndex;
              const mark = isAns
                ? `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#ff7a6c;color:#fff;font-size:9px;font-weight:800;text-align:center;line-height:14px;margin-right:8px;">${String.fromCharCode(65 + ci)}</span>`
                : `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid #cbd5e1;font-size:9px;font-weight:600;text-align:center;line-height:12px;margin-right:8px;color:#64748b;">${String.fromCharCode(65 + ci)}</span>`;
              return `<div style="font-size:13px;color:${isAns ? "#0f172a" : "#475569"};font-weight:${isAns ? 600 : 400};line-height:1.55;margin-bottom:3px;">${mark}${esc(c)}</div>`;
            })
            .join("")}
        </div>
        ${
          q.explanation
            ? `<div style="margin-top:8px;padding:8px 12px;background:#fef3f0;border-left:3px solid #ff7a6c;border-radius:4px;font-size:12px;color:#475569;line-height:1.5;font-style:italic;">${esc(q.explanation)}</div>`
            : ""
        }
      </div>`,
    )
    .join("");

  return `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:#fdfbf3;padding:48px 56px;width:794px;box-sizing:border-box;">
    <div style="border-bottom:2px solid #ff7a6c;padding-bottom:18px;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:2px;color:#ff7a6c;margin-bottom:8px;">SNAPLERN · PARCOURS</div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 6px 0;color:#0f172a;line-height:1.15;">${esc(title)}</h1>
      ${subject ? `<div style="font-size:13px;color:#475569;">${esc(subject)}</div>` : ""}
      <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Généré le ${date}</div>
    </div>

    ${
      analysis.summary
        ? `<section style="margin-bottom:24px;">
            <h2 style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#ff7a6c;margin:0 0 10px 0;">RÉSUMÉ</h2>
            <p style="font-size:13px;line-height:1.65;color:#334155;margin:0;">${esc(analysis.summary)}</p>
          </section>`
        : ""
    }

    ${
      concepts
        ? `<section style="margin-bottom:24px;">
            <h2 style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#ff7a6c;margin:0 0 12px 0;">CONCEPTS CLÉS</h2>
            ${concepts}
          </section>`
        : ""
    }

    ${
      lesson
        ? `<section style="margin-bottom:24px;">
            <h2 style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#ff7a6c;margin:0 0 12px 0;">COURS DÉTAILLÉ</h2>
            ${lesson}
          </section>`
        : ""
    }

    ${
      flashcards
        ? `<section style="margin-bottom:24px;">
            <h2 style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#ff7a6c;margin:0 0 12px 0;">FLASHCARDS</h2>
            ${flashcards}
          </section>`
        : ""
    }

    ${
      quiz
        ? `<section style="margin-bottom:24px;">
            <h2 style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#ff7a6c;margin:0 0 12px 0;">QUIZ</h2>
            ${quiz}
          </section>`
        : ""
    }
  </div>`;
};

export async function exportSessionPdf(
  analysis: Analysis,
  opts?: { title?: string; subject?: string },
) {
  // Off-screen container at A4 width (~794px at 96dpi)
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fdfbf3;z-index:-1;";
  wrap.innerHTML = buildHtml(analysis, opts);
  document.body.appendChild(wrap);

  try {
    const target = wrap.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#fdfbf3",
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Slice canvas into A4-sized pages to avoid cutting elements awkwardly
    const pxPerPage = (canvas.width * pageH) / pageW;
    let renderedHeight = 0;
    let pageIdx = 0;

    while (renderedHeight < canvas.height) {
      const sliceH = Math.min(pxPerPage, canvas.height - renderedHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#fdfbf3";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceH,
        0,
        0,
        canvas.width,
        sliceH,
      );
      const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
      if (pageIdx > 0) pdf.addPage();
      const sliceHeightPts = (sliceH * imgW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, sliceHeightPts);
      renderedHeight += sliceH;
      pageIdx += 1;
    }

    // Footer with page numbers
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("SnapLern.app", 40, pageH - 18);
      pdf.text(`${i} / ${total}`, pageW - 40, pageH - 18, { align: "right" });
    }

    const safeTitle = (opts?.title || analysis.title || "parcours")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
    pdf.save(`snaplern-${safeTitle || "parcours"}.pdf`);
    // imgH kept for legacy references; not directly used after slicing
    void imgH;
  } finally {
    wrap.remove();
  }
}