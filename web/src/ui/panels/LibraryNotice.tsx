import { useEffect } from "react";
import { useLibrary } from "../libraryStore";

const VISIBLE_MS = 6000;

/** After deleting a saved gate: a few seconds to bring it back. */
export function LibraryNotice() {
  const deleted = useLibrary((s) => s.deleted);
  const { restore, dismissDeleted } = useLibrary.getState();

  useEffect(() => {
    if (!deleted) {
      return;
    }
    const timer = setTimeout(dismissDeleted, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [deleted, dismissDeleted]);

  if (!deleted) {
    return null;
  }
  return (
    <div className="notice" role="status">
      Deleted {deleted.gate.name}.
      <button type="button" className="button-small button-accent" onClick={restore}>
        Restore
      </button>
    </div>
  );
}
