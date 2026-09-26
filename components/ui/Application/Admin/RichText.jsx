"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

const TOOLS = [
  [Undo2, "undo", "Undo (Ctrl+Z)"],
  [Redo2, "redo", "Redo (Ctrl+Y)"],
  "|",
  [Bold, "bold", "Bold (Ctrl+B)"],
  [Italic, "italic", "Italic (Ctrl+I)"],
  [Underline, "underline", "Underline (Ctrl+U)"],
  [Strikethrough, "strikeThrough", "Strikethrough"],
  "|",
  [AlignLeft, "justifyLeft", "Align left"],
  [AlignCenter, "justifyCenter", "Align center"],
  [AlignRight, "justifyRight", "Align right"],
  [AlignJustify, "justifyFull", "Justify"],
  "|",
  [List, "insertUnorderedList", "Bullet list"],
  [ListOrdered, "insertOrderedList", "Numbered list"],
  [Link2, "link", "Insert link"],
  "|",
  [Eraser, "removeFormat", "Clear formatting"],
];

const STATES = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "insertUnorderedList",
  "insertOrderedList",
  "justifyCenter",
  "justifyRight",
  "justifyFull",
];

const words = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

/**
 * Small rich-text box with a toolbar and a word count, the one the 360 app
 * uses. Plain contentEditable, so it weighs nothing next to CKEditor.
 */
export default function RichText({ id, value, onChange, placeholder = "", minHeight = 180 }) {
  const box = useRef(null);
  const [active, setActive] = useState({});

  // only push outside changes into the box, so typing never jumps the caret
  useEffect(() => {
    if (box.current && box.current.innerHTML !== (value || "")) {
      box.current.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => onChange(box.current.innerHTML === "<br>" ? "" : box.current.innerHTML);

  const refresh = () =>
    setActive(
      Object.fromEntries(
        STATES.map((cmd) => {
          try {
            return [cmd, document.queryCommandState(cmd)];
          } catch {
            return [cmd, false];
          }
        }),
      ),
    );

  const run = (cmd) => {
    box.current.focus();

    if (cmd === "link") {
      const url = window.prompt("Link address (https://…)");
      if (!url) return;
      if (!/^(https?:|mailto:|tel:)/i.test(url.trim())) {
        window.alert("Use a link that starts with https://, mailto: or tel:");
        return;
      }
      document.execCommand("createLink", false, url.trim());
    } else {
      document.execCommand(cmd, false, null);
    }

    emit();
    refresh();
  };

  return (
    <div className="border border-[#dfe3e8] bg-white text-[#1f2933] focus-within:border-[#188ae2] focus-within:shadow-[0_0_0_3px_rgba(24,138,226,0.15)] dark:border-border dark:bg-card dark:text-foreground">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-[2px] border-b border-[#eef1f4] bg-[#f7f8fa] px-[6px] py-[5px] dark:border-border dark:bg-white/5"
      >
        {TOOLS.map((tool, i) => {
          if (tool === "|") {
            return <span key={`s${i}`} className="mx-[4px] h-[20px] w-px bg-[#dfe3e8]" aria-hidden="true" />;
          }
          const [Icon, cmd, title] = tool;
          return (
            <button
              key={cmd}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={Boolean(active[cmd])}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(cmd)}
              className={`flex size-[30px] items-center justify-center text-[#3b4652] transition hover:bg-[#e6ebf0] dark:text-gray-300 dark:hover:bg-white/10 ${active[cmd] ? "bg-[#dbeafe] text-[#1672c2]" : ""}`}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      <div
        id={id}
        ref={box}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="max-h-[420px] overflow-y-auto px-[14px] py-[10px] text-[14px] leading-[1.6] outline-none empty:before:text-[#9aa3ad] empty:before:content-[attr(data-placeholder)] [&_a]:text-[#188ae2] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-[22px] [&_ul]:list-disc [&_ul]:pl-[22px]"
        style={{ minHeight }}
      />

      <div className="flex justify-end border-t border-[#eef1f4] bg-[#f7f8fa] px-[10px] py-[3px] text-[12px] text-[#8a939c] dark:border-border dark:bg-white/5">
        Words: {words(value)}
      </div>
    </div>
  );
}
