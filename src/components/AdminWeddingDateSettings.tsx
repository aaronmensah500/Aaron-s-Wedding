import { useWeddingContent } from "../lib/weddingContent";
import {
  combineLocalDateAndTime,
  contentPatchesFromWeddingDate,
  deriveWeddingDateFormats,
  toDateInputValue,
  toTimeInputValue,
} from "../lib/weddingDateFormats";

export function AdminWeddingDateSettings() {
  const { content, patchContent } = useWeddingContent();
  const iso = content.site?.weddingDateIso ?? "";
  const formats = deriveWeddingDateFormats(iso);
  const dateValue = toDateInputValue(iso);
  const timeValue = toTimeInputValue(iso);

  function apply(dateYmd: string, timeHm: string) {
    const nextIso = combineLocalDateAndTime(dateYmd, timeHm, iso);
    if (!nextIso) return;
    const patches = contentPatchesFromWeddingDate(nextIso);
    if (!patches) return;
    patchContent(patches);
  }

  return (
    <fieldset className="adm-fieldset">
      <legend>Wedding date</legend>
      <p className="adm-hint" style={{ margin: 0 }}>
        Pick the day and ceremony time — Roman hero line, nav stamp, and countdown update automatically.
      </p>
      <label className="adm-field">
        <span className="adm-field__lbl">Date</span>
        <input
          className="adm-field__input"
          type="date"
          value={dateValue}
          onChange={e => apply(e.target.value, timeValue)}
        />
      </label>
      <label className="adm-field">
        <span className="adm-field__lbl">Ceremony time (your local time)</span>
        <input
          className="adm-field__input"
          type="time"
          value={timeValue}
          onChange={e => apply(dateValue, e.target.value)}
        />
      </label>
      {formats ? (
        <dl className="adm-date-preview">
          <div>
            <dt>Hero (Roman)</dt>
            <dd>{formats.dateDisplayRoman}</dd>
          </div>
          <div>
            <dt>Navigation</dt>
            <dd>{formats.navMonoId}</dd>
          </div>
          <div>
            <dt>Short date</dt>
            <dd>{formats.dotDateShort}</dd>
          </div>
        </dl>
      ) : null}
    </fieldset>
  );
}
