import { Alert, Avatar, Button, EmptyState, Select, Spinner, TextArea } from "@fynxt/ui";
import { useEffect, useId, useMemo, useState } from "react";
import type { ActivityWorkspaceConfig, Comment } from "./types";

export interface CommentsPanelProps {
  recordId: string;
  canComment: boolean;
  config: ActivityWorkspaceConfig;
  /** Called after a comment is added so the card's count badge updates (I1 AC16). */
  onAdded: () => void;
}

/** Comments for one activity (I1 AC16): add box, "No comments yet" empty state, sortable list. */
export function CommentsPanel({ recordId, canComment, config, onAdded }: CommentsPanelProps) {
  const { labels, dataAdapter, formatDateTime, states } = config;
  const headingId = useId();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<"recent" | "oldest">("recent");

  useEffect(() => {
    let live = true;
    dataAdapter.comments(recordId).then(
      (c) => live && setComments(c),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e))
    );
    return () => {
      live = false;
    };
  }, [dataAdapter, recordId]);

  const sorted = useMemo(() => {
    const list = [...(comments ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return order === "recent" ? list.reverse() : list;
  }, [comments, order]);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await dataAdapter.addComment(recordId, text.trim());
      setComments((prev) => [...(prev ?? []), c]);
      setText("");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fx-aw-comments" aria-labelledby={headingId}>
      <div className="fx-aw-comments__header">
        <h4 id={headingId} className="fx-aw-comments__title">{labels.comments}</h4>
        <Select
          label="Sort comments"
          hideLabel
          value={order}
          options={[
            { value: "recent", label: labels.sortRecent },
            { value: "oldest", label: labels.sortOldest },
          ]}
          onChange={(e) => setOrder(e.target.value === "oldest" ? "oldest" : "recent")}
        />
      </div>
      {canComment && (
        <div className="fx-aw-comments__add">
          <TextArea label={labels.addComment} hideLabel placeholder={labels.addComment} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="fx-aw-comments__add-actions">
            <Button size="s" onClick={add} loading={busy} disabled={!text.trim()}>
              {labels.commentAction}
            </Button>
          </div>
        </div>
      )}
      {error && <Alert status="error" title={states.errorTitle}>{error}</Alert>}
      {comments === null && !error ? (
        <Spinner label={states.loading} />
      ) : sorted.length === 0 ? (
        <EmptyState compact title={labels.noComments} headingLevel={4} />
      ) : (
        <ul className="fx-aw-comments__list">
          {sorted.map((c) => (
            <li key={c.id} className="fx-aw-comments__item">
              <Avatar name={c.author} decorative />
              <div className="fx-aw-comments__body">
                <p className="fx-aw-comments__meta">
                  <span className="fx-aw-comments__author">{c.author}</span>{" "}
                  <time dateTime={c.createdAt}>{formatDateTime(c.createdAt)}</time>
                </p>
                <p className="fx-aw-comments__text">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
