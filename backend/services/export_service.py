from __future__ import annotations

import csv
import io
import textwrap
from typing import Any

import structlog

from services.session_store import get_session_store
from utils.time_utils import utc_now_iso

logger = structlog.get_logger()


# ── Markdown helpers ─────────────────────────────────────────────────────────-

def export_chat_markdown(session_id: str) -> str:
    store = get_session_store()
    info = store.get_session_info(session_id)
    history = info["history"] if info else []

    lines: list[str] = [
        f"# Chat Export — Session `{session_id[:8]}…`",
        f"_Exported: {utc_now_iso()}_",
        "",
        "---",
        "",
    ]
    if not history:
        lines.append("_No messages in this session yet._")
    for msg in history:
        label = "**You**" if msg["role"] == "user" else "**Axion**"
        lines.append(f"### {label}")
        lines.append("")
        lines.append(msg["content"])
        lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def _is_correct_option(option_text: str, correct_letter: str) -> bool:
    """Return True if the option begins with the correct label.

    Handles patterns like 'A.', 'A)'', 'A -' , 'A:' (case-insensitive).
    """
    opt = (option_text or "").lstrip()
    c = (correct_letter or "").strip().upper()
    if not c:
        return False
    return opt.upper().startswith((f"{c}.", f"{c})", f"{c} -", f"{c}:", f"{c} "))


def export_quiz_markdown(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "quiz")
    questions: list[dict] = (result or {}).get("questions", [])

    lines: list[str] = [
        f"# Quiz Export — Session `{session_id[:8]}…`",
        f"_Exported: {utc_now_iso()}_",
        "",
        "---",
        "",
    ]
    if not questions:
        lines.append("_No quiz generated in this session._")
    for i, q in enumerate(questions, 1):
        lines.append(f"### Q{i}. {q.get('question', '')}")
        lines.append("")
        correct = str(q.get("correct", "")).strip().upper()
        for opt in q.get("options", []):
            marker = "✓" if _is_correct_option(str(opt), correct) else "○"
            lines.append(f"- {marker} {opt}")
        if q.get("explanation"):
            lines.append(f"\n> 💡 {q['explanation']}")
        lines.append("")
    return "\n".join(lines)


def export_flashcards_markdown(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "flashcards")
    cards: list[dict] = (result or {}).get("cards", [])

    lines: list[str] = [
        f"# Flashcards Export — Session `{session_id[:8]}…`",
        f"_Exported: {utc_now_iso()}_",
        "",
        "---",
        "",
    ]
    if not cards:
        lines.append("_No flashcards generated in this session._")
    for c in cards:
        lines.append(f"**Q:** {c.get('front', '')}")
        lines.append(f"**A:** {c.get('back', '')}")
        lines.append("")
    return "\n".join(lines)


def export_plan_markdown(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "plan")
    title = (result or {}).get("title", "Study Plan")
    schedule: list[dict] = (result or {}).get("schedule", [])

    lines: list[str] = [
        f"# {title}",
        f"_Session `{session_id[:8]}…` · Exported: {utc_now_iso()}_",
        "",
        "---",
        "",
    ]
    if not schedule:
        lines.append("_No plan generated in this session._")
    for day in schedule:
        lines.append(f"## Day {day.get('day', '?')} — {day.get('topic', '')}")
        lines.append(f"**Duration:** {day.get('duration', 'N/A')}")
        lines.append("")
        for task in day.get("tasks", []):
            lines.append(f"- {task}")
        lines.append("")
    return "\n".join(lines)


# ── CSV helpers ─────────────────────────────────────────────────────────────--

def export_flashcards_csv(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "flashcards")
    cards: list[dict] = (result or {}).get("cards", [])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#", "Front", "Back"])
    for i, card in enumerate(cards, 1):
        writer.writerow([i, card.get("front", ""), card.get("back", "")])
    return output.getvalue()


def export_plan_csv(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "plan")
    schedule: list[dict] = (result or {}).get("schedule", [])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Day", "Topic", "Tasks", "Duration"])
    for day in schedule:
        tasks_str = " | ".join(day.get("tasks", []))
        writer.writerow([day.get("day", ""), day.get("topic", ""), tasks_str, day.get("duration", "")])
    return output.getvalue()


def export_quiz_csv(session_id: str) -> str:
    store = get_session_store()
    result = store.get_agent_result(session_id, "quiz")
    questions: list[dict] = (result or {}).get("questions", [])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#", "Question", "A", "B", "C", "D", "Correct", "Explanation"])

    for i, q in enumerate(questions, 1):
        opts = [str(o) for o in (q.get("options") or [])]

        def _strip_prefix(s: str) -> str:
            s = s.strip()
            # remove leading 'A.' / 'A)' / 'A -' if present
            if len(s) >= 2 and s[0].upper() in "ABCD":
                if s[1] in ".)":
                    return s[2:].strip()
                if s[1].isspace():
                    return s[2:].strip()
            if len(s) >= 3 and s[0].upper() in "ABCD" and s[1:3] == " -":
                return s[3:].strip()
            return s

        columns = {"A": "", "B": "", "C": "", "D": ""}
        for opt in opts:
            o = opt.lstrip()
            if o and o[0].upper() in columns:
                columns[o[0].upper()] = _strip_prefix(o)

        writer.writerow(
            [
                i,
                q.get("question", ""),
                columns["A"],
                columns["B"],
                columns["C"],
                columns["D"],
                str(q.get("correct", "")),
                q.get("explanation", ""),
            ]
        )

    return output.getvalue()


# ── PDF helper ─────────────────────────────────────────────────────────────---

def _safe(text: str) -> str:
    """Strip non-latin1 characters for fpdf basic font compatibility."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def export_to_pdf(title: str, sections: list[dict[str, Any]]) -> bytes:
    """
    sections: list of {"heading": str, "lines": [str]}
    Returns PDF bytes.
    """
    try:
        from fpdf import FPDF  # type: ignore

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # Title
        pdf.set_font("Helvetica", "B", 16)
        pdf.multi_cell(0, 10, _safe(title))
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 6, _safe(f"Exported: {utc_now_iso()}"), ln=True)
        pdf.ln(4)

        for section in sections:
            heading = section.get("heading", "")
            body_lines = section.get("lines", [])

            if heading:
                pdf.set_font("Helvetica", "B", 12)
                pdf.multi_cell(0, 8, _safe(heading))

            pdf.set_font("Helvetica", size=10)
            for line in body_lines:
                clean = _safe(line)
                if not clean.strip():
                    pdf.ln(3)
                else:
                    pdf.multi_cell(0, 6, clean)
            pdf.ln(2)

        # fpdf2 returns a bytearray when dest="S"; older fpdf returns str.
        out = pdf.output(dest="S")
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return out.encode("latin-1", errors="replace")

    except ImportError:
        logger.warning("fpdf2_not_installed")
        raise RuntimeError("PDF export requires fpdf2. Run: pip install fpdf2")


# ── Dispatch ─────────────────────────────────────────────────────────────────-

def build_export(session_id: str, fmt: str, content_type: str) -> tuple[bytes, str, str]:
    """
    Returns (content_bytes, media_type, filename).
    """
    ct = content_type.lower()
    fmt = fmt.lower()

    # ── Markdown
    if fmt == "markdown":
        if ct == "chat":
            text = export_chat_markdown(session_id)
        elif ct == "quiz":
            text = export_quiz_markdown(session_id)
        elif ct == "flashcards":
            text = export_flashcards_markdown(session_id)
        elif ct == "plan":
            text = export_plan_markdown(session_id)
        else:
            text = export_chat_markdown(session_id)
        filename = f"axion_{ct}_{session_id[:8]}.md"
        return text.encode("utf-8"), "text/markdown; charset=utf-8", filename

    # ── CSV
    if fmt == "csv":
        if ct == "flashcards":
            text = export_flashcards_csv(session_id)
        elif ct == "plan":
            text = export_plan_csv(session_id)
        elif ct == "quiz":
            text = export_quiz_csv(session_id)
        else:
            raise ValueError(f"CSV export not supported for content type: {ct}")
        filename = f"axion_{ct}_{session_id[:8]}.csv"
        return text.encode("utf-8"), "text/csv; charset=utf-8", filename

    # ── PDF
    if fmt == "pdf":
        if ct == "chat":
            md = export_chat_markdown(session_id)
            sections = [{"heading": "", "lines": md.splitlines()}]
            title = f"Chat Export — {session_id[:8]}"
        elif ct == "quiz":
            store = get_session_store()
            result = store.get_agent_result(session_id, "quiz")
            questions = (result or {}).get("questions", [])
            title = f"Quiz Export — {session_id[:8]}"
            sections = []
            for i, q in enumerate(questions, 1):
                correct = str(q.get("correct", "")).strip().upper()
                lines = [q.get("question", ""), ""]
                for opt in q.get("options", []):
                    marker = "[✓]" if _is_correct_option(str(opt), correct) else "[ ]"
                    lines.append(f"  {marker} {opt}")
                if q.get("explanation"):
                    lines += ["", f"Explanation: {q['explanation']}"]
                sections.append({"heading": f"Q{i}", "lines": lines})
        elif ct == "flashcards":
            md = export_flashcards_markdown(session_id)
            sections = [{"heading": "", "lines": md.splitlines()}]
            title = f"Flashcards — {session_id[:8]}"
        elif ct == "plan":
            md = export_plan_markdown(session_id)
            sections = [{"heading": "", "lines": md.splitlines()}]
            title = f"Study Plan — {session_id[:8]}"
        else:
            raise ValueError(f"Unknown content type: {ct}")

        pdf_bytes = export_to_pdf(title, sections)
        filename = f"axion_{ct}_{session_id[:8]}.pdf"
        return pdf_bytes, "application/pdf", filename

    raise ValueError(f"Unknown format: {fmt}")
