// DropdownMenu: the React renderer of ds-components/specs/dropdown-menu.spec.json, wrapping
// @radix-ui/react-dropdown-menu. Hand-written. The look comes from the generated dropdown-menu.css (it styles the
// data attributes set here) and dropdown-menu.extensions.css, both loaded by ds-components/src/styles.css; this
// file sets no style and no class. Names, defaults, slots and reflected attributes come from the generated
// dropdown-menu.contract.ts.
//
//   <DropdownMenu>
//     <DropdownMenuTrigger asChild>
//       <Button iconEnd={<Icon name="chevron-down" />}>Options</Button>
//     </DropdownMenuTrigger>
//     <DropdownMenuPortal>
//       <DropdownMenuContent>
//         <DropdownMenuItem iconStart={<Icon name="pencil" />} onSelect={rename}>Rename chat</DropdownMenuItem>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem variant="danger" onSelect={remove}>Delete chat</DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenuPortal>
//   </DropdownMenu>
import type * as React from "react";
import { Children, createContext, isValidElement, useContext, useId, useLayoutEffect, useState } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import {
  DROPDOWN_MENU_DEFAULTS,
  DROPDOWN_MENU_REFLECTS,
  DROPDOWN_MENU_SLOTS,
  type DropdownMenuProps as DropdownMenuContractProps,
  type DropdownMenuTriggerProps as DropdownMenuTriggerContractProps,
  type DropdownMenuContentProps as DropdownMenuContentContractProps,
  type DropdownMenuLabelProps as DropdownMenuLabelContractProps,
  type DropdownMenuItemProps as DropdownMenuItemContractProps,
  type DropdownMenuCheckboxItemProps as DropdownMenuCheckboxItemContractProps,
  type DropdownMenuRadioGroupProps as DropdownMenuRadioGroupContractProps,
  type DropdownMenuRadioItemProps as DropdownMenuRadioItemContractProps,
} from "./dropdown-menu.contract";

type Radix<T extends React.ElementType> = React.ComponentPropsWithoutRef<T>;

// ------------------------------------------------------------------ root, trigger, portal

/** Props of DropdownMenu, the root. It renders no element. */
export type DropdownMenuProps = Omit<DropdownMenuContractProps, "onOpenChange"> & {
  /** Called with true or false when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** The trigger and the portalled content. */
  children?: React.ReactNode;
};

export function DropdownMenu({
  open,
  defaultOpen = DROPDOWN_MENU_DEFAULTS.defaultOpen,
  onOpenChange,
  modal = DROPDOWN_MENU_DEFAULTS.modal,
  dir,
  children,
}: DropdownMenuProps) {
  // open and dir default to null (unset): they reach Radix only when the caller gave them, so an explicit
  // undefined never makes the menu controlled or overrides a direction provider.
  const given = { ...(open !== undefined ? { open } : {}), ...(dir !== undefined ? { dir } : {}) };
  return (
    <RadixMenu.Root {...given} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      {children}
    </RadixMenu.Root>
  );
}

/** Props of DropdownMenuTrigger. With asChild the child, normally a Souvenir Button, becomes the trigger. */
export type DropdownMenuTriggerProps = Omit<Radix<typeof RadixMenu.Trigger>, keyof DropdownMenuTriggerContractProps> &
  DropdownMenuTriggerContractProps & { ref?: React.Ref<HTMLButtonElement> };

export function DropdownMenuTrigger({
  asChild = DROPDOWN_MENU_DEFAULTS["trigger.asChild"],
  disabled = DROPDOWN_MENU_DEFAULTS["trigger.disabled"],
  children,
  ref,
  ...radix
}: DropdownMenuTriggerProps) {
  // data-slot is a list of slot names. With asChild, Radix's Slot hands data-slot="dropdown-menu-trigger" to the
  // child; a Souvenir Button merges it after its own name, so the element carries
  // data-slot="button dropdown-menu-trigger" and keeps the Button's look. Without asChild the Radix button carries
  // data-slot="dropdown-menu-trigger" alone.
  const reflected = { [DROPDOWN_MENU_REFLECTS["trigger.disabled"]]: disabled ? "" : undefined };
  return (
    <RadixMenu.Trigger {...radix} {...reflected} ref={ref} asChild={asChild} disabled={disabled} data-slot={DROPDOWN_MENU_SLOTS.trigger}>
      {children}
    </RadixMenu.Trigger>
  );
}

/** Props of DropdownMenuPortal. It renders no element of its own: it moves the content to the end of the body. */
export type DropdownMenuPortalProps = Radix<typeof RadixMenu.Portal>;

export function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  return <RadixMenu.Portal {...props} />;
}

// ------------------------------------------------------------------ content

/** Props of DropdownMenuContent. Radix Content props the spec does not list pass through at Radix's defaults. */
export type DropdownMenuContentProps = Omit<Radix<typeof RadixMenu.Content>, keyof DropdownMenuContentContractProps> &
  DropdownMenuContentContractProps & { ref?: React.Ref<HTMLDivElement> };

export function DropdownMenuContent({
  side = DROPDOWN_MENU_DEFAULTS["content.side"],
  align = DROPDOWN_MENU_DEFAULTS["content.align"],
  sideOffset = DROPDOWN_MENU_DEFAULTS["content.sideOffset"],
  collisionPadding = DROPDOWN_MENU_DEFAULTS["content.collisionPadding"],
  loop = DROPDOWN_MENU_DEFAULTS["content.loop"],
  children,
  ref,
  ...radix
}: DropdownMenuContentProps) {
  // data-side and data-align (DROPDOWN_MENU_REFLECTS["content.side"], DROPDOWN_MENU_REFLECTS["content.align"]) are written by Radix with the
  // side and alignment actually used after collisions, so they are not set here: setting them would report the
  // requested side even when Radix flipped it.
  return (
    <RadixMenu.Content
      {...radix}
      ref={ref}
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      loop={loop}
      data-slot={DROPDOWN_MENU_SLOTS.content}
    >
      {children}
    </RadixMenu.Content>
  );
}

// ------------------------------------------------------------------ groups and labels

// A group learns its label's id from the label inside it, because Radix's Label is a plain div with no link to
// its group. aria-labelledby is set only once a label has registered, so an unlabelled group has no dangling id.
const GroupLabelContext = createContext<((id: string | undefined) => void) | null>(null);

function useGroupLabel() {
  const [labelId, setLabelId] = useState<string | undefined>(undefined);
  return { labelId, setLabelId };
}

/** Props of DropdownMenuGroup: a set of related items under one label. */
export type DropdownMenuGroupProps = Radix<typeof RadixMenu.Group> & { ref?: React.Ref<HTMLDivElement> };

export function DropdownMenuGroup({ ref, children, ...radix }: DropdownMenuGroupProps) {
  const { labelId, setLabelId } = useGroupLabel();
  return (
    <RadixMenu.Group aria-labelledby={labelId} {...radix} ref={ref} data-slot={DROPDOWN_MENU_SLOTS.group}>
      <GroupLabelContext.Provider value={setLabelId}>{children}</GroupLabelContext.Provider>
    </RadixMenu.Group>
  );
}

/** Props of DropdownMenuLabel: the heading of a group. Not focusable and cannot be chosen. */
export type DropdownMenuLabelProps = Omit<Radix<typeof RadixMenu.Label>, keyof DropdownMenuLabelContractProps> &
  DropdownMenuLabelContractProps & { ref?: React.Ref<HTMLDivElement> };

export function DropdownMenuLabel({ id, children, ref, ...radix }: DropdownMenuLabelProps) {
  const own = useId();
  const labelId = id ?? own;
  const register = useContext(GroupLabelContext);
  useLayoutEffect(() => {
    if (!register) return;
    register(labelId);
    return () => register(undefined);
  }, [register, labelId]);
  return (
    <RadixMenu.Label {...radix} ref={ref} id={labelId} data-slot={DROPDOWN_MENU_SLOTS.label}>
      {children}
    </RadixMenu.Label>
  );
}

/** Props of DropdownMenuRadioGroup: radio items of which exactly one is chosen. */
export type DropdownMenuRadioGroupProps = Omit<Radix<typeof RadixMenu.RadioGroup>, keyof DropdownMenuRadioGroupContractProps> &
  Omit<DropdownMenuRadioGroupContractProps, "onValueChange"> & {
    /** Called with the value of the radio item just chosen. */
    onValueChange?: (value: string) => void;
    ref?: React.Ref<HTMLDivElement>;
  };

export function DropdownMenuRadioGroup({ value, onValueChange, children, ref, ...radix }: DropdownMenuRadioGroupProps) {
  const { labelId, setLabelId } = useGroupLabel();
  // value defaults to null (unset): passed only when given.
  const given = value !== undefined ? { value } : {};
  return (
    <RadixMenu.RadioGroup aria-labelledby={labelId} {...radix} {...given} onValueChange={onValueChange} ref={ref} data-slot={DROPDOWN_MENU_SLOTS.radioGroup}>
      <GroupLabelContext.Provider value={setLabelId}>{children}</GroupLabelContext.Provider>
    </RadixMenu.RadioGroup>
  );
}

// ------------------------------------------------------------------ items

// The plain text of a label, for type-ahead. undefined when the label holds something other than text.
function textOf(node: React.ReactNode): string | undefined {
  let out = "";
  let plain = true;
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") out += String(child);
    else if (isValidElement<{ children?: React.ReactNode }>(child)) {
      const inner = textOf(child.props.children);
      if (inner === undefined) plain = false;
      else out += inner;
    } else if (child != null && typeof child !== "boolean") plain = false;
  });
  return plain ? out.trim() : undefined;
}

// The label column of every item kind: the label, then the optional description under it. With a description the
// item is labelled by its label and described by its description, so the description is never part of its name.
function useItemText(children: React.ReactNode, description: React.ReactNode, textValue: string | undefined) {
  const base = useId();
  const hasDescription = description != null && description !== false && description !== "";
  const labelId = `${base}-label`;
  const descriptionId = `${base}-description`;
  const aria = hasDescription ? { "aria-labelledby": labelId, "aria-describedby": descriptionId } : {};
  // Type-ahead matches the label only: never the description, and never the shortcut hint.
  const typeAhead = textValue ?? textOf(children);
  const text = (
    <>
      <span data-slot={DROPDOWN_MENU_SLOTS.itemLabel} id={hasDescription ? labelId : undefined}>
        {children}
      </span>
      {hasDescription ? (
        <span data-slot={DROPDOWN_MENU_SLOTS.itemDescription} id={descriptionId}>
          {description}
        </span>
      ) : null}
    </>
  );
  return { aria, typeAhead, text };
}

const present = (node: React.ReactNode) => node != null && node !== false;

// aria-keyshortcuts takes key names joined by "+" (KeyboardEvent.key values, such as Meta+C), never the glyphs a
// hint shows to the eye. A hint written with "+" (Ctrl+C) is split on it; a hint of glyphs (⌘⇧M) is read glyph by
// glyph, and the characters after the glyphs are the key. Letters are upper case, as ARIA's examples write them.
const KEY_GLYPHS: Record<string, string> = {
  "⌘": "Meta", "⇧": "Shift", "⌥": "Alt", "⌃": "Control", "⌫": "Backspace", "⌦": "Delete", "⏎": "Enter", "↩": "Enter",
  "⎋": "Escape", "⇥": "Tab", "←": "ArrowLeft", "→": "ArrowRight", "↑": "ArrowUp", "↓": "ArrowDown",
};
const KEY_WORDS: Record<string, string> = { ctrl: "Control", control: "Control", cmd: "Meta", command: "Meta", meta: "Meta", alt: "Alt", option: "Alt", opt: "Alt", shift: "Shift", esc: "Escape", del: "Delete" };
const keyName = (k: string) => KEY_WORDS[k.toLowerCase()] ?? KEY_GLYPHS[k] ?? (k.length === 1 ? k.toUpperCase() : k);
function keyShortcutsOf(hint: string): string {
  const text = hint.trim();
  if (text.includes("+") && text.length > 1) return text.split("+").map((k) => keyName(k.trim())).join("+");
  const keys: string[] = [];
  let rest = "";
  for (const ch of text) {
    if (KEY_GLYPHS[ch]) {
      if (rest) { keys.push(keyName(rest)); rest = ""; }
      keys.push(KEY_GLYPHS[ch]);
    } else if (ch.trim()) rest += ch;
  }
  if (rest) keys.push(keyName(rest));
  return keys.join("+");
}

/** Props of DropdownMenuItem: one action. Choosing it runs onSelect and closes the menu. */
export type DropdownMenuItemProps = Omit<Radix<typeof RadixMenu.Item>, keyof DropdownMenuItemContractProps | "aria-keyshortcuts"> &
  Omit<DropdownMenuItemContractProps, "onSelect"> & {
    /** Called when the item is chosen by pointer, Enter or Space. Call event.preventDefault() to keep the menu open. */
    onSelect?: (event: Event) => void;
    ref?: React.Ref<HTMLDivElement>;
  };

export function DropdownMenuItem({
  variant = DROPDOWN_MENU_DEFAULTS["item.variant"],
  disabled = DROPDOWN_MENU_DEFAULTS["item.disabled"],
  children,
  description,
  iconStart,
  iconEnd,
  shortcut,
  textValue,
  onSelect,
  ref,
  ...radix
}: DropdownMenuItemProps) {
  const { aria, typeAhead, text } = useItemText(children, description, textValue);
  const reflected = {
    [DROPDOWN_MENU_REFLECTS["item.variant"]]: variant,
    [DROPDOWN_MENU_REFLECTS["item.disabled"]]: disabled ? "" : undefined,
  };
  return (
    <RadixMenu.Item
      {...radix}
      {...aria}
      {...reflected}
      ref={ref}
      disabled={disabled}
      textValue={typeAhead}
      onSelect={onSelect}
      aria-keyshortcuts={shortcut ? keyShortcutsOf(shortcut) || undefined : undefined}
      data-slot={DROPDOWN_MENU_SLOTS.item}
    >
      {present(iconStart) ? (
        <span data-slot={DROPDOWN_MENU_SLOTS.iconStart} aria-hidden="true">
          {iconStart}
        </span>
      ) : null}
      {text}
      {present(iconEnd) ? (
        <span data-slot={DROPDOWN_MENU_SLOTS.iconEnd} aria-hidden="true">
          {iconEnd}
        </span>
      ) : null}
      {shortcut ? (
        <span data-slot={DROPDOWN_MENU_SLOTS.itemShortcut} aria-hidden="true">
          {shortcut}
        </span>
      ) : null}
    </RadixMenu.Item>
  );
}

/** Props of DropdownMenuItemIndicator: the check mark or dot, mounted by Radix only while its item is checked. */
export type DropdownMenuItemIndicatorProps = Radix<typeof RadixMenu.ItemIndicator> & { ref?: React.Ref<HTMLSpanElement> };

export function DropdownMenuItemIndicator({ ref, ...radix }: DropdownMenuItemIndicatorProps) {
  return <RadixMenu.ItemIndicator {...radix} ref={ref} aria-hidden="true" data-slot={DROPDOWN_MENU_SLOTS.itemIndicator} />;
}

// The indicator box is always present, so the label does not move when the item is checked or unchecked.
function IndicatorBox({ glyph }: { glyph: React.ReactNode }) {
  return (
    <span data-slot={DROPDOWN_MENU_SLOTS.indicatorBox} aria-hidden="true">
      <DropdownMenuItemIndicator>{glyph}</DropdownMenuItemIndicator>
    </span>
  );
}

/** Props of DropdownMenuCheckboxItem: a setting that is on or off. */
export type DropdownMenuCheckboxItemProps = Omit<Radix<typeof RadixMenu.CheckboxItem>, keyof DropdownMenuCheckboxItemContractProps | "onSelect"> &
  Omit<DropdownMenuCheckboxItemContractProps, "onCheckedChange"> & {
    /** Called with the new value when the item is chosen. */
    onCheckedChange?: (checked: boolean) => void;
    /** Called when the item is chosen. Call event.preventDefault() to keep the menu open. */
    onSelect?: (event: Event) => void;
    /** The text type-ahead matches; set from the label when the label is plain text. */
    textValue?: string;
    ref?: React.Ref<HTMLDivElement>;
  };

export function DropdownMenuCheckboxItem({
  checked,
  onCheckedChange,
  disabled = DROPDOWN_MENU_DEFAULTS["checkboxItem.disabled"],
  children,
  description,
  textValue,
  ref,
  ...radix
}: DropdownMenuCheckboxItemProps) {
  const { aria, typeAhead, text } = useItemText(children, description, textValue);
  // checked defaults to null (unset), which Radix renders as off: passed only when given.
  const given = checked !== undefined ? { checked } : {};
  const reflected = { [DROPDOWN_MENU_REFLECTS["checkboxItem.disabled"]]: disabled ? "" : undefined };
  return (
    <RadixMenu.CheckboxItem
      {...radix}
      {...aria}
      {...reflected}
      {...given}
      ref={ref}
      disabled={disabled}
      textValue={typeAhead}
      onCheckedChange={onCheckedChange ? (next) => onCheckedChange(next === true) : undefined}
      data-slot={DROPDOWN_MENU_SLOTS.checkboxItem}
    >
      <IndicatorBox glyph={<CheckGlyph />} />
      {text}
    </RadixMenu.CheckboxItem>
  );
}

/** Props of DropdownMenuRadioItem: one of several exclusive choices inside a radio group. */
export type DropdownMenuRadioItemProps = Omit<Radix<typeof RadixMenu.RadioItem>, keyof DropdownMenuRadioItemContractProps | "onSelect"> &
  DropdownMenuRadioItemContractProps & {
    /** Called when the item is chosen. Call event.preventDefault() to keep the menu open. */
    onSelect?: (event: Event) => void;
    /** The text type-ahead matches; set from the label when the label is plain text. */
    textValue?: string;
    ref?: React.Ref<HTMLDivElement>;
  };

export function DropdownMenuRadioItem({
  value,
  disabled = DROPDOWN_MENU_DEFAULTS["radioItem.disabled"],
  children,
  description,
  textValue,
  ref,
  ...radix
}: DropdownMenuRadioItemProps) {
  const { aria, typeAhead, text } = useItemText(children, description, textValue);
  const reflected = { [DROPDOWN_MENU_REFLECTS["radioItem.disabled"]]: disabled ? "" : undefined };
  return (
    <RadixMenu.RadioItem
      {...radix}
      {...aria}
      {...reflected}
      ref={ref}
      value={value}
      disabled={disabled}
      textValue={typeAhead}
      data-slot={DROPDOWN_MENU_SLOTS.radioItem}
    >
      <IndicatorBox glyph={<DotGlyph />} />
      {text}
    </RadixMenu.RadioItem>
  );
}

/** Props of DropdownMenuSeparator: a line between groups. Not focusable. */
export type DropdownMenuSeparatorProps = Radix<typeof RadixMenu.Separator> & { ref?: React.Ref<HTMLDivElement> };

export function DropdownMenuSeparator({ ref, ...radix }: DropdownMenuSeparatorProps) {
  return <RadixMenu.Separator {...radix} ref={ref} data-slot={DROPDOWN_MENU_SLOTS.separator} />;
}

// ------------------------------------------------------------------ glyphs

// The check mark of a checked checkbox item and the dot of a chosen radio item, drawn in the current text colour.
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function DotGlyph() {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}
