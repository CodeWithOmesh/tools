import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { TOOLS } from "../tools";
import { ToolIcon } from "../ToolIcon";

const FAQ: [string, string][] = [
  [
    "Are my images uploaded to a server?",
    "No. Every tool runs inside your browser, so your photos stay on your device. Nothing is sent to us or anyone else.",
  ],
  [
    "Are these image tools really free?",
    "Yes. There is no sign-up, no watermark and no limit on how many images you process.",
  ],
  [
    "Which image formats are supported?",
    "You can add JPG, PNG, WebP, GIF, BMP, AVIF and SVG images, and save them as JPG, PNG or WebP. Animated GIFs are saved as a still image of the first frame.",
  ],
  [
    "Why can't I open my iPhone photos?",
    'iPhones often save photos as HEIC, which most browsers cannot open. Choose "Most Compatible" under Settings › Camera › Formats, or share the photo as a JPG first.',
  ],
  [
    "Will resizing or converting lower the quality?",
    "PNG keeps every pixel exactly. JPG and WebP use a quality setting: around 85–90% looks the same to most people while making files much smaller.",
  ],
  [
    "Is there a size limit?",
    "Each image can be up to 50 MB, and the result can be up to about 16 megapixels, which is the largest size every browser can create.",
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
          Free online <span>image tools</span>
        </h1>
        <p>
          Resize, convert and crop images right in your browser. Your photos never leave your
          device.
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

      <section className="tool-cards" aria-label="Image tools">
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
