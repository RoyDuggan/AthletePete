import React from "react";

type ZonePromptEditorProps = {
  template: string;
  defaultTemplate: string;
  onChange: (template: string) => void;
  /** Summary label; " (customised)" is appended automatically when modified. */
  title?: string;
  /** Explanatory hint shown under the summary. */
  hint?: React.ReactNode;
  /** Status line shown in the toolbar (e.g. "Saved" / "Saving…"). */
  status?: React.ReactNode;
};

const DEFAULT_HINT = (
  <>
    This prompt frames every per-zone AI summary. Edit it to change the context;{" "}
    <code>{"{{placeholders}}"}</code> are filled automatically from each zone's
    metrics. Your changes are saved to your account.
  </>
);

/**
 * Collapsible editor for a customisable AI prompt context. Used for both the
 * per-zone summaries and the overall lap interpretation — pass `title`/`hint`
 * to label each. Edits are lifted to the owner, which persists them to the
 * user's account. `{{placeholder}}` tokens (zone prompt) are filled per zone
 * before the request is sent.
 */
const ZonePromptEditor: React.FC<ZonePromptEditorProps> = ({
  template,
  defaultTemplate,
  onChange,
  title = "AI zone prompt context",
  hint = DEFAULT_HINT,
  status,
}) => {
  const isModified = template.trim() !== defaultTemplate.trim();

  return (
    <details className="zone-prompt-editor">
      <summary>
        {title}
        {isModified ? " (customised)" : ""}
      </summary>

      <p className="zone-prompt-editor-hint">{hint}</p>

      <textarea
        className="zone-prompt-editor-textarea"
        value={template}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        spellCheck={false}
      />

      <div className="zone-prompt-editor-toolbar">
        <button
          type="button"
          className="zone-map-button"
          onClick={() => onChange(defaultTemplate)}
          disabled={!isModified}
        >
          Reset to default
        </button>
        {status != null && (
          <span className="zone-prompt-editor-status">{status}</span>
        )}
      </div>
    </details>
  );
};

export default ZonePromptEditor;
