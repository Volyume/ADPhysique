'use client';

import { useState, useTransition } from 'react';
import { Button } from '@volyume/ui';
import { approveContent, rejectContent } from './actions';

// Small interactive island for a single actionable content row: an Approve
// button plus a Reject button that opens a free-text reason prompt before
// calling rejectContent. Kept as a leaf client component so the pipeline
// page itself stays a server component.
export function PipelineRowActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (rejecting) {
    return (
      <div className="flex flex-col gap-sm">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection"
          rows={2}
          className="rounded-md border border-borderSubtle bg-inputBg px-sm py-xs type-caption text-textPrimary"
        />
        <div className="flex gap-sm">
          <Button
            variant="destructive"
            disabled={isPending || reason.trim().length === 0}
            onClick={() => {
              startTransition(async () => {
                await rejectContent(id, reason.trim());
                setRejecting(false);
                setReason('');
              });
            }}
          >
            Confirm reject
          </Button>
          <Button variant="ghost" disabled={isPending} onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-sm">
      <Button
        variant="primary"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await approveContent(id);
          });
        }}
      >
        Approve
      </Button>
      <Button variant="destructive" disabled={isPending} onClick={() => setRejecting(true)}>
        Reject
      </Button>
    </div>
  );
}
