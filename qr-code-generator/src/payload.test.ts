import { describe, expect, it } from "vitest";
import { buildQrPayload, initialFields } from "./types";

describe("QR payload builder", () => {
  it("normalizes a website URL", () => {
    expect(buildQrPayload("url", { url: "example.com/path" })).toBe("https://example.com/path");
  });

  it("keeps plain text unchanged", () => {
    expect(buildQrPayload("text", { text: "Hello QR" })).toBe("Hello QR");
  });

  it("escapes special characters in Wi-Fi credentials", () => {
    expect(
      buildQrPayload("wifi", {
        ssid: "Cafe;Guest",
        password: "a:b,c",
        security: "WPA",
        hidden: "false",
      }),
    ).toBe("WIFI:T:WPA;S:Cafe\\;Guest;P:a\\:b\\,c;H:false;;");
  });

  it("builds an open Wi-Fi network payload without a password", () => {
    expect(buildQrPayload("wifi", { ssid: "Free WiFi", security: "nopass", hidden: "false" })).toBe(
      "WIFI:T:nopass;S:Free WiFi;H:false;;",
    );
  });

  it("builds a vCard contact", () => {
    const payload = buildQrPayload("vcard", {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });
    expect(payload).toContain("BEGIN:VCARD");
    expect(payload).toContain("FN:Ada Lovelace");
    expect(payload).toContain("EMAIL:ada@example.com");
    expect(payload).toContain("END:VCARD");
  });

  it("encodes email subject and message", () => {
    const payload = buildQrPayload("email", {
      email: "hello@example.com",
      subject: "Quick question",
      message: "Hello there",
    });
    expect(payload).toBe("mailto:hello@example.com?subject=Quick+question&body=Hello+there");
  });

  it("requires a country-code style WhatsApp number", () => {
    expect(() => buildQrPayload("whatsapp", { phone: "123" })).toThrow("country code");
  });

  it("validates geographic coordinate ranges", () => {
    expect(() => buildQrPayload("location", { latitude: "91", longitude: "0" })).toThrow(
      "Latitude",
    );
    expect(buildQrPayload("location", { latitude: "6.9271", longitude: "79.8612" })).toBe(
      "geo:6.9271,79.8612",
    );
  });

  it("requires an event to end after it starts", () => {
    expect(() =>
      buildQrPayload("event", {
        title: "Meetup",
        start: "2026-10-10T10:00",
        end: "2026-10-10T09:00",
      }),
    ).toThrow("end must be after");
    const payload = buildQrPayload("event", {
      title: "Meetup",
      start: "2026-10-10T10:00",
      end: "2026-10-10T11:00",
    });
    expect(payload).toContain("BEGIN:VCALENDAR");
    expect(payload).toContain("BEGIN:VEVENT");
    expect(payload).toContain("END:VCALENDAR");
  });

  it("provides default values for each QR type", () => {
    expect(initialFields("url").url).toBe("https://example.com");
    expect(initialFields("wifi").security).toBe("WPA");
  });
});
