import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  canRequestMagicLink,
  isHostEmail,
  normalizeEmail,
  resolveSessionRole,
} from "./guest-access";

vi.mock("./adminAuthServer", () => ({
  isAllowlistedAdminEmail: (email: string) => email === "host@example.com",
}));

function mockService(opts: {
  rsvp?: { status: string } | null;
  gift?: boolean;
}) {
  return {
    from: (table: string) => {
      if (table === "rsvps") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.rsvp
                    ? {
                        id: "1",
                        email: "guest@example.com",
                        full_name: "Guest",
                        attendance: "yes",
                        events: [],
                        guests: 1,
                        diet: [],
                        song: "",
                        note: "",
                        status: opts.rsvp.status,
                        created_at: "",
                        updated_at: "",
                      }
                    : null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "gifts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: opts.gift ? { id: "g1" } : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  } as never;
}

describe("guest-access", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("allows host email", async () => {
    const result = await canRequestMagicLink(mockService({}), "host@example.com");
    expect(result).toEqual({ ok: true, reason: "host" });
    expect(isHostEmail("host@example.com")).toBe(true);
  });

  it("blocks pending rsvp", async () => {
    const result = await canRequestMagicLink(
      mockService({ rsvp: { status: "pending" } }),
      "guest@example.com"
    );
    expect(result).toEqual({ ok: false, reason: "rsvp_pending" });
  });

  it("allows approved rsvp", async () => {
    const result = await canRequestMagicLink(
      mockService({ rsvp: { status: "approved" } }),
      "guest@example.com"
    );
    expect(result).toEqual({ ok: true, reason: "approved_rsvp" });
  });

  it("allows gift without approved rsvp", async () => {
    const result = await canRequestMagicLink(
      mockService({ rsvp: null, gift: true }),
      "gifter@example.com"
    );
    expect(result).toEqual({ ok: true, reason: "gift" });
  });

  it("resolveSessionRole returns host", async () => {
    expect(await resolveSessionRole(mockService({}), "host@example.com")).toBe("host");
  });
});
