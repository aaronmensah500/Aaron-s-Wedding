import { EditableText } from "./EditableText";

/** Editable label inside a button or link (arrow/icon stay outside). */
export function EditableBtnLabel({
  value,
  onChange,
  trailing,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <EditableText value={value} onChange={onChange} />
      {trailing}
    </>
  );
}
