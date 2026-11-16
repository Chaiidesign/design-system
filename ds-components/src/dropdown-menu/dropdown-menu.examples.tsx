// DropdownMenu examples: one entry per example id in ds-components/specs/dropdown-menu.spec.json, with exactly the
// props and content the spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
//
// How tests see what happened: every example records into window.__dropdownMenuEvents["<example id>"], keyed by
// event: select (the label of each action item chosen), openChange (true or false), checkedChange (the label and
// the new value) and valueChange (the radio value chosen). Radio groups and checkbox items start from the values the
// spec gives and hold them in useState, so a test reads both what the person did and what the menu shows.
//
// Test hook, not an example: window.__dropdownMenuFixtures.mountShortcuts(hints) mounts an open menu with one item
// per hint, for the edge cases of dropdown-menu-shortcut-exposed (a plus key, a two-step sequence) that no spec
// example should carry.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "../button/button";
import { Icon } from "../../gallery/icons";

type EventLog = Record<string, unknown[]>;
type Log = { __dropdownMenuEvents?: Record<string, EventLog> };

function record(id: string, event: string, value: unknown) {
  const all = ((window as unknown as Log).__dropdownMenuEvents ??= {});
  const log = (all[id] ??= {});
  (log[event] ??= []).push(value);
}
const onOpen = (id: string) => (open: boolean) => record(id, "openChange", open);
const onSelect = (id: string, label: string) => () => record(id, "select", label);

// Checkbox items and radio groups start from the values the spec gives. Their state lives in the example
// component, above the portal, because the content unmounts when the menu closes and would forget it.
function useChecks(id: string, initial: Record<string, boolean | undefined>) {
  const [checked, setChecked] = useState(initial);
  return (label: string) => ({
    ...(checked[label] !== undefined ? { checked: checked[label] } : {}),
    onCheckedChange: (next: boolean) => {
      record(id, "checkedChange", [label, next]);
      setChecked((all) => ({ ...all, [label]: next }));
    },
  });
}

function useRadio(id: string, initial: string) {
  const [value, setValue] = useState(initial);
  return {
    value,
    onValueChange: (next: string) => {
      record(id, "valueChange", next);
      setValue(next);
    },
  };
}

function mountShortcuts(hints: string[]) {
  const host = document.createElement("div");
  host.setAttribute("data-dropdown-menu-fixture", "shortcuts");
  document.body.appendChild(host);
  createRoot(host).render(
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button>Shortcuts</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          {hints.map((hint, i) => (
            <DropdownMenuItem key={hint} shortcut={hint}>{`Item ${i + 1}`}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>,
  );
}
if (typeof window !== "undefined") (window as unknown as { __dropdownMenuFixtures?: object }).__dropdownMenuFixtures = { mountShortcuts };

function Closed() {
  const id = "closed";
  return (
    <DropdownMenu onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
          <DropdownMenuItem onSelect={onSelect(id, "Share")}>Share</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function Actions() {
  const id = "actions";
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" iconOnly ariaLabel="Chat options" iconStart={<Icon name="more-horizontal" />} />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem iconStart={<Icon name="pencil" />} onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
          <DropdownMenuItem iconStart={<Icon name="share" />} onSelect={onSelect(id, "Share")}>Share</DropdownMenuItem>
          <DropdownMenuItem iconStart={<Icon name="archive" />} onSelect={onSelect(id, "Archive")}>Archive</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem iconStart={<Icon name="trash" />} variant="danger" onSelect={onSelect(id, "Delete chat")}>Delete chat</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function ModelSelector() {
  const id = "model-selector";
  const radio = useRadio(id, "standard");
  const check = useChecks(id, { "Extended thinking": true });
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" iconEnd={<Icon name="chevron-up" />}>Standard</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup {...radio}>
            <DropdownMenuLabel>Models</DropdownMenuLabel>
            <DropdownMenuRadioItem value="pro">Pro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="standard">Standard</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="fast">Fast</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem {...check("Extended thinking")}>Extended thinking</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function WithDescriptions() {
  const id = "with-descriptions";
  const radio = useRadio(id, "standard");
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" iconEnd={<Icon name="chevron-down" />}>Standard</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup {...radio}>
            <DropdownMenuLabel>Models</DropdownMenuLabel>
            <DropdownMenuRadioItem value="pro" description="Best for long documents and hard problems">Pro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="standard" description="Fast and capable for most work">Standard</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            iconStart={<Icon name="settings" />}
            iconEnd={<Icon name="external-link" />}
            description="Opens in a new tab"
            onSelect={onSelect(id, "Model settings")}
          >
            Model settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function WithShortcuts() {
  const id = "with-shortcuts";
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Edit</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem iconStart={<Icon name="copy" />} shortcut="⌘C" onSelect={onSelect(id, "Copy")}>Copy</DropdownMenuItem>
          <DropdownMenuItem iconStart={<Icon name="clipboard" />} shortcut="⌘V" onSelect={onSelect(id, "Paste")}>Paste</DropdownMenuItem>
          <DropdownMenuItem shortcut="⌘A" onSelect={onSelect(id, "Select all")}>Select all</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function Grouped() {
  const id = "grouped";
  const check = useChecks(id, { "Archived chats": true, "Shared chats": undefined });
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Sort</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onSelect(id, "Newest first")}>Newest first</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSelect(id, "Oldest first")}>Oldest first</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Show</DropdownMenuLabel>
            <DropdownMenuCheckboxItem {...check("Archived chats")}>Archived chats</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem {...check("Shared chats")}>Shared chats</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function HighlightedKeyboard() {
  const id = "highlighted-keyboard";
  const radio = useRadio(id, "standard");
  const check = useChecks(id, { "Extended thinking": true });
  return (
    <DropdownMenu onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={onSelect(id, "Delete chat")}>Delete chat</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem {...check("Extended thinking")}>Extended thinking</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup {...radio}>
            <DropdownMenuRadioItem value="standard">Standard</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function DisabledItems() {
  const id = "disabled-items";
  const radio = useRadio(id, "standard");
  const check = useChecks(id, { Pinned: true });
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
          <DropdownMenuItem disabled shortcut="⌘S" onSelect={onSelect(id, "Share")}>Share</DropdownMenuItem>
          <DropdownMenuCheckboxItem disabled {...check("Pinned")}>Pinned</DropdownMenuCheckboxItem>
          <DropdownMenuItem disabled variant="danger" onSelect={onSelect(id, "Delete chat")}>Delete chat</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup {...radio}>
            <DropdownMenuRadioItem value="pro" disabled description="Not included in your plan">Pro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="standard">Standard</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function TriggerDisabled() {
  const id = "trigger-disabled";
  return (
    <DropdownMenu onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild disabled>
        <Button disabled iconEnd={<Icon name="chevron-down" />}>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

// The two lines above the trigger stand for the chat thread above a composer: they give the menu room to open
// above its trigger, which it could not do at the very top of the page.
function SideTop() {
  const id = "side-top";
  return (
    <>
      <p>Earlier messages sit above the composer.</p>
      <p>The model menu opens toward them.</p>
      <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
        <DropdownMenuTrigger asChild>
          <Button iconEnd={<Icon name="chevron-up" />}>Model</Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent side="top">
            <DropdownMenuItem onSelect={onSelect(id, "Pro")}>Pro</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSelect(id, "Standard")}>Standard</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </>
  );
}

// dir="rtl" on the wrapper only places the icon-only trigger at the inline end of the page, as at the right edge of
// a header. The menu itself keeps the page's left-to-right direction: Radix reads direction from its own prop or
// provider, not from the DOM.
function AlignEnd() {
  const id = "align-end";
  return (
    <div dir="rtl">
      <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" iconOnly ariaLabel="More" iconStart={<Icon name="more-horizontal" />} />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onSelect(id, "Settings")}>Settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSelect(id, "Help")}>Help</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

function NonModal() {
  const id = "non-modal";
  return (
    <DropdownMenu defaultOpen modal={false} onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Insert</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Image")}>Image</DropdownMenuItem>
          <DropdownMenuItem onSelect={onSelect(id, "File")}>File</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function RightToLeft() {
  const id = "right-to-left";
  return (
    <DropdownMenu defaultOpen dir="rtl" onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>خيارات</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem iconStart={<Icon name="pencil" />} shortcut="⌘R" onSelect={onSelect(id, "إعادة تسمية")}>إعادة تسمية</DropdownMenuItem>
          <DropdownMenuItem onSelect={onSelect(id, "مشاركة")}>مشاركة</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function LongLabel() {
  const id = "long-label";
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Move</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem iconStart={<Icon name="folder" />} shortcut="⌘M" onSelect={onSelect(id, "Move this chat")}>
            Move this chat to the project called Quarterly planning and supplier reviews
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSelect(id, "Move to a new project")}>Move to a new project</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

function Touch() {
  const id = "touch";
  return (
    <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
      <DropdownMenuTrigger asChild>
        <Button iconEnd={<Icon name="chevron-down" />}>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect(id, "Rename chat")}>Rename chat</DropdownMenuItem>
          <DropdownMenuItem onSelect={onSelect(id, "Share")}>Share</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

// As in align-end, dir="rtl" on the wrapper only puts the icon-only trigger at the right edge of the screen.
function WorstCase320() {
  const id = "worst-case-320";
  const label = "Keep a copy of every shared link working after the chat is moved";
  const check = useChecks(id, { [label]: true });
  return (
    <div dir="rtl">
      <DropdownMenu defaultOpen onOpenChange={onOpen(id)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" iconOnly ariaLabel="Chat options" iconStart={<Icon name="more-horizontal" />} />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>This chat and everything shared from it</DropdownMenuLabel>
              <DropdownMenuItem
                iconStart={<Icon name="folder" />}
                shortcut="⌘⇧M"
                description="Links shared from this chat keep working after the move"
                onSelect={onSelect(id, "Move this conversation")}
              >
                Move this conversation and all of its attached files to another project
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem {...check(label)}>{label}</DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem iconStart={<Icon name="trash" />} variant="danger" shortcut="⌘⌫" onSelect={onSelect(id, "Delete this chat")}>
              Delete this chat, its files and every link shared from it
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

export const examples = {
  closed: () => <Closed />,
  actions: () => <Actions />,
  "model-selector": () => <ModelSelector />,
  "with-descriptions": () => <WithDescriptions />,
  "with-shortcuts": () => <WithShortcuts />,
  grouped: () => <Grouped />,
  "highlighted-keyboard": () => <HighlightedKeyboard />,
  "disabled-items": () => <DisabledItems />,
  "trigger-disabled": () => <TriggerDisabled />,
  "side-top": () => <SideTop />,
  "align-end": () => <AlignEnd />,
  "non-modal": () => <NonModal />,
  "right-to-left": () => <RightToLeft />,
  "long-label": () => <LongLabel />,
  touch: () => <Touch />,
  "worst-case-320": () => <WorstCase320 />,
};
