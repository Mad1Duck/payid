import * as React from 'react';
import { GripVerticalIcon } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '@site/src/lib/utils';

// PanelGroup
export function ResizablePanelGroup(props: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      {...props}
      className={cn('flex h-full w-full', props.className)}
    />
  );
}

// Panel
export function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

// Handle
export function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  return (
    <Separator
      data-slot="resizable-handle"
      {...props}
      className={cn('bg-border relative flex w-px items-center justify-center', className)}>
      {withHandle && (
        <div className="flex h-4 w-4 items-center justify-center rounded border bg-border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}
