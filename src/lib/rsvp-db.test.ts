import { describe, expect, it } from "vitest";
import { fetchExistingRsvp, fetchExistingRsvpStatus, upsertRsvpRow } from "./rsvp-db";

function singleRowService(row: Record<string, unknown> | null, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error }),
          }),
        }),
      }),
    }),
  } as never;
}

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

  it("falls back when party_names column is missing (keeps status)", async () => {
    const calls: string[] = [];
    const service = {
      from: () => ({
        upsert: (row: Record<string, unknown>) => {
          calls.push("party_names" in row ? "with-party" : "without-party");
          if ("party_names" in row) {
            return Promise.resolve({
              error: { code: "PGRST204", message: "Could not find the 'party_names' column of 'rsvps' in the schema cache" },
            });
          }
          return Promise.resolve({ error: null });
        },
      }),
    } as never;

    const result = await upsertRsvpRow(service, {
      wedding_slug: "primary",
      email: "a@b.com",
      full_name: "Ada",
      attendance: "yes",
      events: [],
      guests: 3,
      party_names: ["Bee", "Cee"],
      diet: [],
      song: "",
      note: "",
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    // Drops only party_names and keeps the status column intact.
    expect(result).toEqual({ ok: true, hasStatusColumn: true });
    expect(calls).toEqual(["with-party", "without-party"]);
  });

  it("fetchExistingRsvp returns status and party size", async () => {
    const existing = await fetchExistingRsvp(
      singleRowService({ status: "approved", guests: 3 }),
      "primary",
      "a@b.com"
    );
    expect(existing).toEqual({ status: "approved", guests: 3 });
  });

  it("fetchExistingRsvp returns null when no prior RSVP", async () => {
    const existing = await fetchExistingRsvp(singleRowService(null), "primary", "new@b.com");
    expect(existing).toBe(null);
  });

  it("upserts in a single call when all columns exist", async () => {
    const calls: Record<string, unknown>[] = [];
    const service = {
      from: () => ({
        upsert: (row: Record<string, unknown>) => {
          calls.push(row);
          return Promise.resolve({ error: null });
        },
      }),
    } as never;

    const result = await upsertRsvpRow(service, {
      wedding_slug: "primary",
      email: "a@b.com",
      full_name: "Ada",
      attendance: "yes",
      events: [],
      guests: 2,
      party_names: ["Bee"],
      diet: [],
      song: "",
      note: "",
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    expect(result).toEqual({ ok: true, hasStatusColumn: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ guests: 2, party_names: ["Bee"], status: "pending" });
  });
});
