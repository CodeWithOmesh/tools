import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { TOOLS } from "../tools";
import { ToolIcon } from "../ToolIcon";

const FAQ: [string, string][] = [
  [
    "Are my PDF files uploaded to a server?",
    "No. Every tool runs inside your browser, so your files stay on your device. Nothing is sent to us or anyone else.",
  ],
  [
    "Are these PDF tools really free?",
    "Yes. There is no sign-up, no watermark and no limit on how many files you process.",
  ],
  [
    "Can I use password-protected PDFs?",
    "Not yet. Remove the password first (for example by printing to PDF from your PDF viewer), then add the file again.",
  ],
  [
    "Is there a file size limit?",
    "Each PDF can be up to 100 MB and each image up to 25 MB. Very large files depend on your device's memory.",
  ],
  [
    "Is signing a PDF here legally binding?",
    "The Sign PDF tool adds an image of your signature, like signing a printed page. That is accepted for many everyday documents, but it is not a certificate-based digital signature. Check what your recipient requires for contracts and official forms.",
  ],
  [
    "Do the tools work on my phone?",
    "Yes. They work in modern mobile browsers. On phones you can use the arrow buttons instead of dragging to reorder.",
  ],
];

export default function Home() {
  return (
    <>
      <section className="intro">
        <div className="intro-kicker">
          <Sparkles size={14} /> FREE · PRIVATE · NO SIGN-UP
        </div>
        <h1>
          Free online <span>PDF tools</span>
        </h1>
        <p>
          Merge, split, convert, number, watermark and sign PDF files right in your browser. Your
          documents never leave your device.
        </p>
        <div className="trust-row">
          <span>
            <Check size={14} /> No uploads
          </span>
          <span>
            <Check size={14} /> No watermarks
          </span>
          <span>
            <Check size={14} /> No account needed
          </span>
        </div>
      </section>

      <section className="tool-cards" aria-label="PDF tools">
        {TOOLS.map((tool) => (
          <Link key={tool.id} to={`/${tool.path}`} className="tool-link-card">
            <span className="tool-link-icon">
              <ToolIcon id={tool.id} size={22} />
            </span>
            <b>{tool.name}</b>
            <p>{tool.summary}</p>
            <span className="tool-link-go">
              Open tool <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </section>

      <section className="faq">
        <h2>Frequently asked questions</h2>
        {FAQ.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </>
  );
}
