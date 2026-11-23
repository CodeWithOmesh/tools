import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  UserRound,
  Wifi,
} from "lucide-react";
import {
  buildQrPayload,
  CONTENT_TYPES,
  initialFields,
  type ErrorCorrection,
  type QrContentType,
  type QrFields,
} from "./types";
import {
  contrastWarning as getContrastWarning,
  renderQrPng,
  renderQrSvg,
  type RenderOptions,
} from "./qr";

const TYPE_ICONS: Record<QrContentType, ReactNode> = {
  url: <Link2 size={16} />,
  text: <Type size={16} />,
  wifi: <Wifi size={16} />,
  vcard: <UserRound size={16} />,
  email: <Mail size={16} />,
  phone: <Phone size={16} />,
  whatsapp: <MessageCircle size={16} />,
  location: <MapPin size={16} />,
  event: <CalendarDays size={16} />,
};

const DRAFT_KEY = "cwo-qr-generator-draft-v1";
const DEFAULT_OPTIONS: RenderOptions = {
  size: 640,
  errorCorrection: "M",
  dark: "#111827",
  light: "#ffffff",
  margin: 2,
};
const inputClass = "control";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={inputClass}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className={inputClass}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Field label={label}>
      <select
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </Field>
  );
}
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sanitizeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-|-$/g, "") || "qr-code"
  );
}

export default function App() {
  const [type, setType] = useState<QrContentType>("url");
  const [fields, setFields] = useState<QrFields>(() => initialFields("url"));
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_OPTIONS);
  const [logo, setLogo] = useState("");
  const [logoName, setLogoName] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [expanded, setExpanded] = useState<"design" | "logo" | "advanced">("design");

  const payload = useMemo(() => {
    try {
      return { value: buildQrPayload(type, fields), error: "" };
    } catch (reason) {
      return {
        value: "",
        error: reason instanceof Error ? reason.message : "Unable to create this QR code.",
      };
    }
  }, [type, fields]);

  const patchField = (key: string, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  const patchOption = <K extends keyof RenderOptions>(key: K, value: RenderOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));
  const selectType = (next: QrContentType) => {
    setType(next);
    setFields(initialFields(next));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          type?: QrContentType;
          fields?: QrFields;
          options?: Partial<RenderOptions>;
          logo?: string;
          logoName?: string;
        };
        if (saved.type && CONTENT_TYPES.some((item) => item.id === saved.type)) setType(saved.type);
        if (saved.fields) setFields(saved.fields);
        if (saved.options) setOptions((current) => ({ ...current, ...saved.options }));
        if (saved.logo) setLogo(saved.logo);
        if (saved.logoName) setLogoName(saved.logoName);
      }
    } catch {
      /* Local storage is optional. */
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    setSaving(true);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ type, fields, options, logo, logoName }));
        setSaving(false);
      } catch {
        setSaving(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [type, fields, options, logo, logoName, draftReady]);

  useEffect(() => {
    let current = true;
    if (!payload.value) {
      setPreview("");
      setError(payload.error);
      return () => {
        current = false;
      };
    }
    setError("");
    const timer = window.setTimeout(() => {
      void renderQrPng(payload.value, options, logo)
        .then((dataUrl) => {
          if (current) setPreview(dataUrl);
        })
        .catch((reason) => {
          if (current) {
            setPreview("");
            setError(reason instanceof Error ? reason.message : "Could not render the QR code.");
          }
        });
    }, 100);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [payload, options, logo]);

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setDownloadError("Choose an image file for the logo.");
      event.target.value = "";
      return;
    }
    if (file.size > 350_000) {
      setDownloadError("Choose a logo image smaller than 350 KB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result || ""));
      setLogoName(file.name);
      patchOption("errorCorrection", "H");
      setDownloadError("");
    };
    reader.onerror = () => setDownloadError("Unable to read this logo file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const downloadName = sanitizeFilename(
    type === "url" ? `${(fields.url ?? "").replace(/^https?:\/\//i, "")}-qr` : `${type}-qr-code`,
  );
  const contrastWarning = getContrastWarning(options.dark, options.light);

  const handlePng = async () => {
    try {
      setDownloadError("");
      const png = await renderQrPng(payload.value, options, logo);
      downloadBlob(dataUrlToBlob(png), `${downloadName}.png`);
    } catch (reason) {
      setDownloadError(
        reason instanceof Error ? reason.message : "Could not create the PNG image.",
      );
    }
  };
  const handleSvg = async () => {
    try {
      setDownloadError("");
      const svg = await renderQrSvg(payload.value, options, logo);
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${downloadName}.svg`);
    } catch (reason) {
      setDownloadError(
        reason instanceof Error ? reason.message : "Could not create the SVG image.",
      );
    }
  };
  const reset = () => {
    if (!window.confirm("Reset this QR code and its design settings?")) return;
    setType("url");
    setFields(initialFields("url"));
    setOptions(DEFAULT_OPTIONS);
    setLogo("");
    setLogoName("");
    setDownloadError("");
    localStorage.removeItem(DRAFT_KEY);
  };

  const fieldForm = () => {
    switch (type) {
      case "url":
        return (
          <TextInput
            label="Website address"
            value={fields.url || ""}
            onChange={(v) => patchField("url", v)}
            placeholder="https://example.com"
            hint="A website address without https:// is accepted too."
          />
        );
      case "text":
        return (
          <TextArea
            label="Your text"
            value={fields.text || ""}
            onChange={(v) => patchField("text", v)}
            placeholder="Type the message you want to share…"
          />
        );
      case "wifi":
        return (
          <>
            <TextInput
              label="Network name (SSID)"
              value={fields.ssid || ""}
              onChange={(v) => patchField("ssid", v)}
              placeholder="Your Wi-Fi name"
            />
            <TextInput
              label="Password"
              value={fields.password || ""}
              onChange={(v) => patchField("password", v)}
              placeholder={fields.security === "nopass" ? "No password needed" : "Wi-Fi password"}
            />
            <div className="form-grid">
              <SelectField
                label="Security type"
                value={fields.security || "WPA"}
                onChange={(v) => patchField("security", v)}
              >
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No password</option>
              </SelectField>
              <SelectField
                label="Hidden network"
                value={fields.hidden || "false"}
                onChange={(v) => patchField("hidden", v)}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </SelectField>
            </div>
          </>
        );
      case "vcard":
        return (
          <>
            <div className="form-grid">
              <TextInput
                label="First name"
                value={fields.firstName || ""}
                onChange={(v) => patchField("firstName", v)}
                placeholder="First name"
              />
              <TextInput
                label="Last name"
                value={fields.lastName || ""}
                onChange={(v) => patchField("lastName", v)}
                placeholder="Last name"
              />
            </div>
            <TextInput
              label="Organization"
              value={fields.organization || ""}
              onChange={(v) => patchField("organization", v)}
              placeholder="Company (optional)"
            />
            <TextInput
              label="Phone"
              value={fields.phone || ""}
              onChange={(v) => patchField("phone", v)}
              placeholder="+1 555 0100"
            />
            <TextInput
              label="Email"
              type="email"
              value={fields.email || ""}
              onChange={(v) => patchField("email", v)}
              placeholder="alex@example.com"
            />
            <TextInput
              label="Website"
              value={fields.website || ""}
              onChange={(v) => patchField("website", v)}
              placeholder="https://example.com"
            />
          </>
        );
      case "email":
        return (
          <>
            <TextInput
              label="Email address"
              type="email"
              value={fields.email || ""}
              onChange={(v) => patchField("email", v)}
              placeholder="hello@example.com"
            />
            <TextInput
              label="Subject"
              value={fields.subject || ""}
              onChange={(v) => patchField("subject", v)}
              placeholder="Email subject"
            />
            <TextArea
              label="Message"
              value={fields.message || ""}
              onChange={(v) => patchField("message", v)}
              placeholder="Write a message…"
            />
          </>
        );
      case "phone":
        return (
          <TextInput
            label="Phone number"
            value={fields.phone || ""}
            onChange={(v) => patchField("phone", v)}
            placeholder="+1 555 0100"
            hint="Include your country code for international use."
          />
        );
      case "whatsapp":
        return (
          <>
            <TextInput
              label="WhatsApp number"
              value={fields.phone || ""}
              onChange={(v) => patchField("phone", v)}
              placeholder="94771234567"
              hint="Include the country code, without the leading + sign."
            />
            <TextArea
              label="Pre-filled message (optional)"
              value={fields.message || ""}
              onChange={(v) => patchField("message", v)}
              placeholder="Hello! I found your contact…"
            />
          </>
        );
      case "location":
        return (
          <>
            <TextInput
              label="Location name (optional)"
              value={fields.label || ""}
              onChange={(v) => patchField("label", v)}
              placeholder="Office / Meeting point"
            />
            <div className="form-grid">
              <TextInput
                label="Latitude"
                value={fields.latitude || ""}
                onChange={(v) => patchField("latitude", v)}
                placeholder="6.9271"
              />
              <TextInput
                label="Longitude"
                value={fields.longitude || ""}
                onChange={(v) => patchField("longitude", v)}
                placeholder="79.8612"
              />
            </div>
          </>
        );
      case "event":
        return (
          <>
            <TextInput
              label="Event title"
              value={fields.title || ""}
              onChange={(v) => patchField("title", v)}
              placeholder="Community meetup"
            />
            <div className="form-grid">
              <TextInput
                label="Start date and time"
                type="datetime-local"
                value={fields.start || ""}
                onChange={(v) => patchField("start", v)}
              />
              <TextInput
                label="End date and time"
                type="datetime-local"
                value={fields.end || ""}
                onChange={(v) => patchField("end", v)}
              />
            </div>
            <TextInput
              label="Location (optional)"
              value={fields.location || ""}
              onChange={(v) => patchField("location", v)}
              placeholder="Venue name or address"
            />
            <TextArea
              label="Description (optional)"
              value={fields.description || ""}
              onChange={(v) => patchField("description", v)}
              placeholder="Event details…"
            />
          </>
        );
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="https://codewithomesh.com">
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo-icon.svg`} alt="" width={40} height={40} />
          <span className="brand-name">
            Code with <b>Omesh</b>
            <small>FREE ONLINE TOOLS</small>
          </span>
        </a>
        <div className="header-right">
          <span className="free-pill">
            <i />
            Free tool
          </span>
          <a href="https://codewithomesh.com/tools/" className="header-link">
            More tools <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <Sparkles size={14} /> CREATE · CUSTOMIZE · DOWNLOAD
          </div>
          <h1>
            Free online <span>QR code generator</span>
          </h1>
          <p>
            Create QR codes for websites, Wi-Fi, contacts and more. Customize the design, add your
            logo, then download a high-quality PNG or scalable SVG.
          </p>
          <div className="trust-row">
            <span>
              <Check size={14} /> No sign-up
            </span>
            <span>
              <Check size={14} /> PNG & SVG downloads
            </span>
            <span>
              <Check size={14} /> Generated in your browser
            </span>
          </div>
        </section>

        <div className="mobile-switch" role="tablist" aria-label="QR editor view">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "edit"}
            className={mobileTab === "edit" ? "selected" : ""}
            onClick={() => setMobileTab("edit")}
          >
            Customize
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            className={mobileTab === "preview" ? "selected" : ""}
            onClick={() => setMobileTab("preview")}
          >
            QR preview
          </button>
        </div>
        <div className="workspace">
          <section className={`editor-column ${mobileTab === "edit" ? "mobile-active" : ""}`}>
            <div className="column-heading">
              <div>
                <i>01</i>
                <h2>QR content</h2>
              </div>
              <span className="saved-indicator">
                {draftReady ? (
                  saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <b /> Saved locally
                    </>
                  )
                ) : (
                  "Loading…"
                )}
              </span>
            </div>
            <div className="editor-card">
              <section className="form-section">
                <div className="section-title">
                  <span>01</span>
                  <div>
                    <h3>Choose content type</h3>
                    <p>What should happen when someone scans?</p>
                  </div>
                </div>
                <div className="type-grid">
                  {CONTENT_TYPES.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={type === item.id ? "type-option active" : "type-option"}
                      onClick={() => selectType(item.id)}
                    >
                      <span className="type-icon">{TYPE_ICONS[item.id]}</span>
                      <span>
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </span>
                      {type === item.id ? <Check size={15} className="type-check" /> : null}
                    </button>
                  ))}
                </div>
                <div className="form-subsection">
                  <div className="subsection-heading">
                    <h3>{CONTENT_TYPES.find((item) => item.id === type)?.label} details</h3>
                    <span>The preview updates as you type</span>
                  </div>
                  {fieldForm()}
                </div>
              </section>
              <section className="form-section">
                <div className="section-title">
                  <span>02</span>
                  <div>
                    <h3>Customize design</h3>
                    <p>Make your QR code match your brand.</p>
                  </div>
                </div>
                <div className="color-grid">
                  <Field label="QR colour">
                    <div className="color-control">
                      <input
                        type="color"
                        value={options.dark}
                        onChange={(e) => patchOption("dark", e.target.value)}
                      />
                      <input
                        className="color-hex"
                        value={options.dark}
                        onChange={(e) => patchOption("dark", e.target.value)}
                        aria-label="QR colour hex value"
                      />
                    </div>
                  </Field>
                  <Field label="Background colour">
                    <div className="color-control">
                      <input
                        type="color"
                        value={options.light}
                        onChange={(e) => patchOption("light", e.target.value)}
                      />
                      <input
                        className="color-hex"
                        value={options.light}
                        onChange={(e) => patchOption("light", e.target.value)}
                        aria-label="Background colour hex value"
                      />
                    </div>
                  </Field>
                </div>
                <div className="preset-row">
                  <span>Quick palettes</span>
                  <div className="palette-list">
                    {[
                      ["#111827", "#ffffff"],
                      ["#174c3c", "#ffffff"],
                      ["#123b72", "#ffffff"],
                      ["#5b2c83", "#ffffff"],
                      ["#7c2d12", "#fff7ed"],
                    ].map(([dark, light]) => (
                      <button
                        type="button"
                        key={dark}
                        aria-label={`Use ${dark} QR colour`}
                        title={`QR ${dark}, background ${light}`}
                        className="palette-swatch"
                        style={{ background: light, borderColor: dark }}
                        onClick={() => setOptions((current) => ({ ...current, dark, light }))}
                      >
                        <span style={{ background: dark }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-grid">
                  <SelectField
                    label="Image size"
                    value={String(options.size)}
                    onChange={(v) => patchOption("size", Number(v))}
                  >
                    <option value="256">256 × 256 px</option>
                    <option value="512">512 × 512 px</option>
                    <option value="640">640 × 640 px</option>
                    <option value="1024">1024 × 1024 px</option>
                    <option value="1600">1600 × 1600 px</option>
                  </SelectField>
                  <SelectField
                    label="Quiet-zone margin"
                    value={String(options.margin)}
                    onChange={(v) => patchOption("margin", Number(v))}
                  >
                    <option value="0">None</option>
                    <option value="1">Small</option>
                    <option value="2">Standard</option>
                    <option value="4">Large</option>
                    <option value="6">Extra large</option>
                  </SelectField>
                </div>
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => setExpanded(expanded === "advanced" ? "design" : "advanced")}
                  aria-expanded={expanded === "advanced"}
                >
                  <span>Advanced settings</span>
                  <ChevronRight size={15} />
                </button>
                {expanded === "advanced" ? (
                  <div className="form-grid advanced-grid">
                    <SelectField
                      label="Error correction"
                      value={options.errorCorrection}
                      onChange={(v) => patchOption("errorCorrection", v as ErrorCorrection)}
                    >
                      <option value="L">Low (7%)</option>
                      <option value="M">Medium (15%)</option>
                      <option value="Q">Quartile (25%)</option>
                      <option value="H">High (30%)</option>
                    </SelectField>
                    <p className="field-note">
                      Higher correction can help a code remain readable if it is partially covered
                      or damaged. Use High when adding a logo.
                    </p>
                  </div>
                ) : null}
              </section>
              <section className="form-section">
                <div className="section-title">
                  <span>03</span>
                  <div>
                    <h3>Add a logo</h3>
                    <p>Place a small image at the centre of your QR code.</p>
                  </div>
                </div>
                {logo ? (
                  <div className="logo-preview">
                    <img src={logo} alt="Selected logo" />
                    <div>
                      <b>{logoName || "Custom logo"}</b>
                      <small>Logo is embedded into the downloaded image.</small>
                    </div>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => {
                        setLogo("");
                        setLogoName("");
                      }}
                      aria-label="Remove logo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="logo-drop">
                    <ImagePlus size={20} />
                    <b>Choose a logo image</b>
                    <span>PNG, JPG, WebP or other browser-supported image · up to 350 KB</span>
                    <input type="file" accept="image/*" onChange={uploadLogo} hidden />
                  </label>
                )}
                <p className="hint-line">
                  Adding a logo automatically selects High error correction. Use a simple logo, keep
                  it small, and test the downloaded code before printing.
                </p>
              </section>
              <div className="editor-footer">
                <span>
                  <ShieldCheck size={15} /> QR content is generated locally in your browser.
                </span>
                <button type="button" className="text-button" onClick={reset}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
          </section>
          <aside className={`preview-column ${mobileTab === "preview" ? "mobile-active" : ""}`}>
            <div className="column-heading">
              <div>
                <i>02</i>
                <h2>Live QR preview</h2>
              </div>
              <span className="live-pill">
                <b /> LIVE
              </span>
            </div>
            <div className="preview-stage">
              <div className="qr-card">
                <div className="qr-artboard">
                  {preview ? (
                    <img src={preview} alt="Generated QR code preview" />
                  ) : (
                    <div className="qr-empty">
                      <QrCode size={54} />
                      <span>Complete the content fields to create your QR code.</span>
                    </div>
                  )}
                </div>
                <div className="qr-card-caption">
                  <strong>{CONTENT_TYPES.find((item) => item.id === type)?.label} QR code</strong>
                  <span>Scan with your phone camera</span>
                </div>
              </div>
            </div>
            {error ? <div className="error-message">{error}</div> : null}
            {!error && contrastWarning ? (
              <div className="error-message warning-message">{contrastWarning}</div>
            ) : null}
            {downloadError ? <div className="error-message">{downloadError}</div> : null}
            <div className="download-actions">
              <button
                type="button"
                className="download-button"
                onClick={() => void handlePng()}
                disabled={!payload.value || !preview}
              >
                <ArrowDownToLine size={16} /> Download PNG
              </button>
              <button
                type="button"
                className="print-button"
                onClick={() => void handleSvg()}
                disabled={!payload.value || !preview}
              >
                <ArrowDownToLine size={16} /> Download SVG
              </button>
            </div>
            <div className="qr-info">
              <div>
                <span>Output size</span>
                <b>
                  {options.size} × {options.size} px
                </b>
              </div>
              <div>
                <span>Correction</span>
                <b>{options.errorCorrection}</b>
              </div>
              <div>
                <span>Format</span>
                <b>PNG / SVG</b>
              </div>
            </div>
            <div className="preview-security">
              <ShieldCheck size={15} /> Private by design. Your QR content is not uploaded.
            </div>
            <div className="scan-tip">
              <Sparkles size={16} />
              <span>
                <b>Before you print</b> Test the QR code with a phone camera and check that it scans
                at the final printed size.
              </span>
            </div>
          </aside>
        </div>
        <section className="below-content">
          <div className="below-intro">
            <span className="eyebrow">QR CODES FOR EVERYDAY USE</span>
            <h2>One QR code generator. Many possibilities.</h2>
            <p>
              Create scannable codes for your business, home, events and everyday sharing — without
              installing an app.
            </p>
          </div>
          <div className="benefits">
            <article>
              <i>
                <Link2 size={19} />
              </i>
              <h3>Share a website</h3>
              <p>
                Turn a website or landing page into a QR code for menus, posters and business cards.
              </p>
            </article>
            <article>
              <i>
                <ShieldCheck size={19} />
              </i>
              <h3>Connect to Wi-Fi</h3>
              <p>
                Let guests join your wireless network by scanning a code instead of typing a
                password.
              </p>
            </article>
            <article>
              <i>
                <ImagePlus size={19} />
              </i>
              <h3>Make it yours</h3>
              <p>Customize colours, add a small logo, and export a PNG or scalable SVG image.</p>
            </article>
          </div>
          <div className="faq">
            <h2>Frequently asked questions</h2>
            <details>
              <summary>Is this QR code generator free?</summary>
              <p>Yes. Create and download QR codes without creating an account or paying.</p>
            </details>
            <details>
              <summary>Do these QR codes expire?</summary>
              <p>
                No. These are static QR codes. Their content is encoded directly in the QR image and
                does not depend on a subscription or redirect service.
              </p>
            </details>
            <details>
              <summary>Can I add my logo and change the colours?</summary>
              <p>
                Yes. You can choose QR and background colours and optionally overlay a small logo in
                the centre. Always test a logo QR code before printing.
              </p>
            </details>
            <details>
              <summary>Are my details uploaded?</summary>
              <p>
                No. QR payloads and images are generated in your browser. Your current settings are
                saved locally in this browser.
              </p>
            </details>
            <details>
              <summary>What is the difference between PNG and SVG?</summary>
              <p>
                PNG is a raster image that works well for everyday use. SVG is a vector format that
                can be resized for print without becoming pixelated.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Code with Omesh</span>
        <span>Useful tools. Simple solutions.</span>
        <a href="https://codewithomesh.com">
          codewithomesh.com <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
