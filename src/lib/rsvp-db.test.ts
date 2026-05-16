import { describe, expect, it } from "vitest";
import { fetchExistingRsvpStatus, upsertRsvpRow } from "./rsvp-db";

describe("rsvp-db", () => {
  it("falls back when status column is missing", async () => {
    const calls: string[] = [];
    const service = {
      from: (table: string) => {
        if (table !== "rsvps") return {};
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { code: "42703", message: "column rsvps.status does not exist" },
                }),
              }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => {
            calls.push("status" in row ? "with-status" : "without-status");
            if ("status" in row) {
              return Promise.resolve({
                error: { code: "PGRST204", message: "Could not find the 'status' column" },
              });
            }
            return Promise.resolve({ error: null });
          },
        };
      },
    } as never;

    const existing = await fetchExistingRsvpStatus(service, "primary", "a@b.com");
    expect(existing).toBe(null);

    const result = await upsertRsvpRow(service, {
      wedding_slug: "primary",
      email: "a@b.com",
      full_name: "Ada",
      attendance: "yes",
      events: [],
      guests: 1,
      diet: [],
      song: "",
      note: "",
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    expect(result).toEqual({ ok: true, hasStatusColumn: false });
    expect(calls).toEqual(["with-status", "without-status"]);
  });
});
