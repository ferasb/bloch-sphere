import { useEffect } from "react";
import { useApp } from "../store";

const VISIBLE_MS = 6000;

/** After Reset or Set state: a few seconds to bring the cleared journey back, since Undo can't. */
export function RestoreNotice() {
  const restorable = useApp((s) => s.restorable);
  const note = useApp((s) => s.restoreNote);
  const { restore, dismissRestore } = useApp.getState();

  useEffect(() => {
    if (!restorable) {
      return;
    }
    const timer = setTimeout(dismissRestore, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [restorable, dismissRestore]);

  if (!restorable) {
    return null;
  }
  return (
    <div className="notice" role="status">
      {note}
      <button type="button" className="button-small button-accent" onClick={restore}>
        Restore
      </button>
    </div>
  );
}
