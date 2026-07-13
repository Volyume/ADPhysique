'use client';

import { useState } from 'react';
import { Button } from '@volyume/ui';

// Copies a block of text (a caption or hashtag line) to the clipboard so the
// founder can paste it straight into a channel. Shows a brief "Copied"
// confirmation, then reverts. Leaf client island so the pipeline page stays a
// server component. Falls back silently if the Clipboard API is unavailable
// (older webview): the text is still selectable in the panel above.
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (insecure context / permissions): the text
          // stays selectable above, so this is a best-effort convenience.
        }
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
