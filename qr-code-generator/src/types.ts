export type QrContentType =
  | "url"
  | "text"
  | "wifi"
  | "vcard"
  | "email"
  | "phone"
  | "whatsapp"
  | "location"
  | "event";
export type WifiSecurity = "WPA" | "WEP" | "nopass";
export type ErrorCorrection = "L" | "M" | "Q" | "H";

export type QrFields = Record<string, string>;

export const CONTENT_TYPES: Array<{ id: QrContentType; label: string; description: string }> = [
  { id: "url", label: "Website URL", description: "Open a website or landing page" },
  { id: "text", label: "Plain text", description: "Share a message or any text" },
  { id: "wifi", label: "Wi-Fi", description: "Let guests connect to a network" },
  { id: "vcard", label: "Contact", description: "Share a contact card" },
  { id: "email", label: "Email", description: "Prepare an email message" },
  { id: "phone", label: "Phone", description: "Start a phone call" },
  { id: "whatsapp", label: "WhatsApp", description: "Open a WhatsApp chat" },
  { id: "location", label: "Location", description: "Share a map coordinate" },
  { id: "event", label: "Event", description: "Share an event schedule" },
];

export function initialFields(type: QrContentType): QrFields {
  switch (type) {
    case "url":
      return { url: "https://example.com" };
    case "text":
      return { text: "Hello! Thanks for scanning this QR code." };
    case "wifi":
      return { ssid: "Guest Wi-Fi", password: "", security: "WPA", hidden: "false" };
    case "vcard":
      return {
        firstName: "Alex",
        lastName: "Morgan",
        organization: "",
        phone: "",
        email: "",
        website: "",
      };
    case "email":
      return { email: "hello@example.com", subject: "", message: "" };
    case "phone":
      return { phone: "" };
    case "whatsapp":
      return { phone: "", message: "" };
    case "location":
      return { latitude: "", longitude: "", label: "" };
    case "event":
      return { title: "", start: "", end: "", location: "", description: "" };
  }
}

function required(fields: QrFields, key: string, label: string): string {
  const value = (fields[key] ?? "").trim();
  if (!value) throw new Error(`Enter ${label.toLowerCase()} to create this QR code.`);
  return value;
}

function escapeWifi(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:");
}

function escapeVCard(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function eventDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid event date and time.");
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}${pad(parsed.getMonth() + 1)}${pad(parsed.getDate())}T${pad(parsed.getHours())}${pad(parsed.getMinutes())}00`;
}

export function buildQrPayload(type: QrContentType, fields: QrFields): string {
  switch (type) {
    case "url": {
      const raw = required(fields, "url", "a website address");
      const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
      let url: URL;
      try {
        url = new URL(candidate);
      } catch {
        throw new Error("Enter a valid website address.");
      }
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error("Use a website address starting with http:// or https://.");
      return url.toString();
    }
    case "text":
      return required(fields, "text", "some text");
    case "wifi": {
      const ssid = escapeWifi(required(fields, "ssid", "a Wi-Fi network name"));
      const security = (fields.security || "WPA") as WifiSecurity;
      if (!["WPA", "WEP", "nopass"].includes(security))
        throw new Error("Choose a valid Wi-Fi security type.");
      const password =
        security === "nopass" ? "" : escapeWifi(required(fields, "password", "the Wi-Fi password"));
      return `WIFI:T:${security};S:${ssid};${security === "nopass" ? "" : `P:${password};`}H:${fields.hidden === "true" ? "true" : "false"};;`;
    }
    case "vcard": {
      const first = escapeVCard(required(fields, "firstName", "a first name"));
      const last = escapeVCard(fields.lastName ?? "");
      const fullName = [first, last].filter(Boolean).join(" ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
        `FN:${fullName}`,
      ];
      if (fields.organization?.trim()) lines.push(`ORG:${escapeVCard(fields.organization)}`);
      if (fields.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCard(fields.phone)}`);
      if (fields.email?.trim()) lines.push(`EMAIL:${escapeVCard(fields.email)}`);
      if (fields.website?.trim()) lines.push(`URL:${escapeVCard(fields.website)}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    }
    case "email": {
      const email = required(fields, "email", "an email address");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid email address.");
      const params = new URLSearchParams();
      if (fields.subject?.trim()) params.set("subject", fields.subject.trim());
      if (fields.message?.trim()) params.set("body", fields.message.trim());
      const query = params.toString();
      return `mailto:${email}${query ? `?${query}` : ""}`;
    }
    case "phone": {
      const phone = required(fields, "phone", "a phone number").replace(/[\s().-]/g, "");
      if (!/^\+?[\d*#]{3,20}$/.test(phone)) throw new Error("Enter a valid phone number.");
      return `tel:${phone}`;
    }
    case "whatsapp": {
      const phone = required(fields, "phone", "a WhatsApp number").replace(/\D/g, "");
      if (phone.length < 7 || phone.length > 15)
        throw new Error("Enter a WhatsApp number with its country code.");
      const message = fields.message?.trim();
      return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    }
    case "location": {
      const latitude = Number(required(fields, "latitude", "a latitude"));
      const longitude = Number(required(fields, "longitude", "a longitude"));
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
        throw new Error("Latitude must be between -90 and 90.");
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
        throw new Error("Longitude must be between -180 and 180.");
      return `geo:${latitude},${longitude}${fields.label?.trim() ? `?q=${encodeURIComponent(fields.label.trim())}` : ""}`;
    }
    case "event": {
      const title = escapeVCard(required(fields, "title", "an event title"));
      const start = eventDate(required(fields, "start", "a start date and time"));
      const end = eventDate(required(fields, "end", "an end date and time"));
      if (end <= start) throw new Error("The event end must be after its start.");
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Code with Omesh//QR Event//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `SUMMARY:${title}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
      ];
      if (fields.location?.trim()) lines.push(`LOCATION:${escapeVCard(fields.location)}`);
      if (fields.description?.trim()) lines.push(`DESCRIPTION:${escapeVCard(fields.description)}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      return lines.join("\r\n");
    }
  }
}
