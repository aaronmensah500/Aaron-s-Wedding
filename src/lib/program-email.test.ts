import { describe, expect, it } from "vitest";
import { programHtml, programText, type ProgramContent } from "./program-email";

const program: ProgramContent = {
  heading: "The Celebration of Holy Matrimony",
  betweenLabel: "Between",
  coupleNames: "Aaron Kwame Mensah & Princess Tari M. Lamptey-Puddicombe",
  dateLabel: "Date",
  dateValue: "Saturday 29th August, 2026",
  timeLabel: "Time",
  timeValue: "11:30am – 1:30pm",
  venueLabel: "Venue",
  venueValue: "Agape House New Testament Church",
  leads: [{ role: "Officiating Minister", name: "Reverend Prince Mensah" }],
  serviceTitle: "Order of Service",
  service: [
    { item: "Arrival of Guests", by: "" },
    { item: "Opening Prayer", by: "Ps. Prince Henry" },
  ],
  ministersTitle: "Officiating Ministers",
  ministers: ["Rev. Prince Mensah"],
  supportTitle: "Supported by",
  support: ["Rev. Adelaide Mensah"],
  photoTitle: "Order of Photography",
  photography: ["Officiating Ministers", "Pastors & Wives"],
  closingNote: "After the photography, please grab your little bites.",
};

const SITE = "https://www.aprincess4aaron.com";

describe("program-email", () => {
  it("renders the order of service in sequence", () => {
    const html = programHtml(program, SITE);
    expect(html).toContain("Order of Service");
    expect(html).toContain("Arrival of Guests");
    expect(html).toContain("Opening Prayer");
    expect(html).toContain("Ps. Prince Henry");
    // numbered 01, 02…
    expect(html).toContain("01");
    expect(html).toContain("02");
  });

  it("includes ministers, photography and the closing note", () => {
    const html = programHtml(program, SITE);
    expect(html).toContain("Rev. Prince Mensah");
    expect(html).toContain("Rev. Adelaide Mensah");
    expect(html).toContain("Officiating Ministers");
    expect(html).toContain("grab your little bites");
  });

  it("links to the live programme page", () => {
    expect(programHtml(program, SITE)).toContain(`${SITE}/program`);
    expect(programText(program, SITE)).toContain(`${SITE}/program`);
  });

  it("escapes HTML in guest-authored content", () => {
    const nasty: ProgramContent = {
      ...program,
      coupleNames: '<script>alert("x")</script>',
    };
    const html = programHtml(nasty, SITE);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("plain text mirrors the html content and numbers items", () => {
    const text = programText(program, SITE);
    expect(text).toContain("01. Arrival of Guests");
    expect(text).toContain("02. Opening Prayer — Ps. Prince Henry");
    expect(text).toContain("1. Officiating Ministers");
    expect(text).toContain("grab your little bites");
    expect(text).not.toContain("<");
  });

  it("omits empty sections rather than printing blank headings", () => {
    const sparse: ProgramContent = { heading: "Just a heading" };
    const html = programHtml(sparse, "");
    expect(html).toContain("Just a heading");
    expect(html).not.toContain("Order of Photography");
    const text = programText(sparse, "");
    expect(text).not.toContain("ORDER OF PHOTOGRAPHY");
  });
});
