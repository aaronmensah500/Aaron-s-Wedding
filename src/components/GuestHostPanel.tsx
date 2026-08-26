import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiErrorMessage } from "../i18n/en";
import { parseApiErrorCode } from "../lib/api/json";

type HostGuestRow = {
  id: string;
  email: string;
  full_name: string;
  attendance: string;
  guests: number;
  party_names?: string[];
  status: string;
  updated_at: string;
  program_sent_at?: string | null;
};

type GuestHostPanelProps = {
  session: Session;
};

export function GuestHostPanel({ session }: GuestHostPanelProps) {
  const [guests, setGuests] = useState([] as HostGuestRow[]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState("pending" as "pending" | "all");
  const [progBusy, setProgBusy] = useState(false);
  const [progMsg, setProgMsg] = useState("");
  const [progErr, setProgErr] = useState("");

  const authHeader = `Bearer ${session.access_token}`;

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/host/guests", {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });
      const j = (await res.json().catch(() => ({}))) as {
        guests?: HostGuestRow[];
        error?: { code?: string; message?: string };
      };
      if (!res.ok) {
        const code = parseApiErrorCode(j);
        setErr(code ? apiErrorMessage(code) : "Could not load guests.");
        setGuests([]);
        return;
      }
      setGuests(j.guests ?? []);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setMsg("");
    setErr("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/host/guests/${action}`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const code = parseApiErrorCode(j);
        setErr(code ? apiErrorMessage(code) : "Action failed.");
        return;
      }
      setMsg(action === "approve" ? apiErrorMessage("host_approve_ok") : apiErrorMessage("host_reject_ok"));
      await load();
    } finally {
      setBusyId("");
    }
  };

  const pending = guests.filter(g => g.status === "pending");
  const shown = filter === "pending" ? pending : guests;

  // ---- Programme broadcast ----
  const approved = guests.filter(g => g.status === "approved");
  const notSent = approved.filter(g => !g.program_sent_at);

  const sendProgram = async (opts: { test?: boolean } = {}) => {
    setProgErr("");
    setProgMsg("");
    setProgBusy(true);
    try {
      if (opts.test) {
        const to = (session.user.email || "").trim();
        const res = await fetch("/api/host/program/send", {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "test", testEmail: to }),
        });
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          setProgErr(String((j.error as { message?: string })?.message || "Test send failed."));
          return;
        }
        setProgMsg(`Test sent to ${to}. Check it looks right before sending to guests.`);
        return;
      }

      if (!notSent.length) {
        setProgMsg("Everyone approved has already received the programme.");
        return;
      }
      if (
        !window.confirm(
          `Send the programme to ${notSent.length} approved guest${notSent.length === 1 ? "" : "s"}?\n\nThis emails real guests and cannot be undone.`
        )
      ) {
        return;
      }

      // The endpoint handles one batch per call; loop until nothing remains.
      let sent = 0;
      for (let i = 0; i < 50; i += 1) {
        const res = await fetch("/api/host/program/send", {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "send" }),
        });
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          setProgErr(String((j.error as { message?: string })?.message || "Send failed."));
          break;
        }
        sent += Number(j.sent || 0);
        setProgMsg(`Sending… ${sent} sent, ${Number(j.remaining || 0)} to go.`);
        if (j.done || Number(j.remaining || 0) === 0) {
          setProgMsg(`Programme sent to ${sent} guest${sent === 1 ? "" : "s"}.`);
          break;
        }
      }
      await load();
    } finally {
      setProgBusy(false);
    }
  };

  return (
    <div className="guest-host">
      <div className="guest-portal__panel guest-host__intro">
        <div className="eyebrow">Host</div>
        <h3 className="guest-portal__panel-title">Guest approvals</h3>
        <p className="guest-portal__hint">
          Approve RSVPs so guests can sign in with their email and a 6-digit code from Supabase. You can edit the site
          from any page once signed in here.
        </p>
      </div>

      <div className="guest-portal__panel guest-host__program">
        <div className="eyebrow">Programme</div>
        <h3 className="guest-portal__panel-title">Send the order of service</h3>
        <p className="guest-portal__hint">
          Emails the <strong>published</strong> programme to approved guests — publish your latest
          edits first. Approved: {approved.length} · Not yet sent: {notSent.length}
        </p>
        <div className="guest-host__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={progBusy}
            onClick={() => void sendProgram({ test: true })}
          >
            {progBusy ? "Working…" : "Send test to myself"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={progBusy || notSent.length === 0}
            onClick={() => void sendProgram()}
          >
            {notSent.length ? `Send to ${notSent.length} guest${notSent.length === 1 ? "" : "s"}` : "All sent"}
          </button>
        </div>
        {progMsg ? (
          <p className="guest-portal__msg" role="status">
            {progMsg}
          </p>
        ) : null}
        {progErr ? (
          <p className="guest-portal__err" role="alert">
            {progErr}
          </p>
        ) : null}
      </div>

      <div className="guest-host__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "pending"}
          className={filter === "pending" ? "guest-host__tab guest-host__tab--on" : "guest-host__tab"}
          onClick={() => setFilter("pending")}
        >
          Pending {pending.length ? `(${pending.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={filter === "all" ? "guest-host__tab guest-host__tab--on" : "guest-host__tab"}
          onClick={() => setFilter("all")}
        >
          All guests
        </button>
      </div>

      {loading ? (
        <p className="guest-portal__hint" role="status">
          Loading…
        </p>
      ) : null}
      {err ? (
        <p className="guest-portal__err" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="guest-portal__msg" role="status">
          {msg}
        </p>
      ) : null}

      {!loading && shown.length === 0 ? (
        <p className="guest-portal__hint">
          {filter === "pending" ? "No RSVPs waiting for approval." : "No guests yet."}
        </p>
      ) : null}

      <ul className="guest-host__list">
        {shown.map(row => (
          <li key={row.id} className="guest-host__row">
            <div className="guest-host__row-main">
              <strong>{row.full_name}</strong>
              <span className="guest-host__email">{row.email}</span>
              <span className="guest-host__meta">
                {row.attendance === "yes" ? "Attending" : "Declined"} ·{" "}
                {row.attendance === "yes"
                  ? `Party of ${row.guests}`
                  : `${row.guests} ${row.guests === 1 ? "guest" : "guests"}`}{" "}
                ·{" "}
                <span className={`guest-host__status guest-host__status--${row.status}`}>
                  {row.status}
                </span>
                {row.program_sent_at ? (
                  <span className="guest-host__sent" title={`Programme sent ${row.program_sent_at}`}>
                    {" "}· programme sent
                  </span>
                ) : null}
              </span>
              {Array.isArray(row.party_names) && row.party_names.length > 0 ? (
                <span className="guest-host__party">
                  <span className="guest-host__party-label">Bringing</span>
                  {row.party_names.map((n, i) => (
                    <span key={i} className="guest-host__party-name">
                      {n}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
            {row.status === "pending" ? (
              <div className="guest-host__actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busyId === row.id}
                  onClick={() => void act(row.id, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busyId === row.id}
                  onClick={() => void act(row.id, "reject")}
                >
                  Decline
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
