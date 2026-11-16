// Tabs: the React renderer of ds-components/specs/tabs.spec.json, wrapping @radix-ui/react-tabs.
// Hand-written. The look comes from the generated tabs.css (it styles the data attributes set here) and
// tabs.extensions.css, both loaded by ds-components/src/styles.css; this file sets no style and no class.
// Names, defaults, slots and reflected attributes all come from the generated tabs.contract.ts.
//
//   import { Tabs, TabsList, TabsTrigger, TabsContent } from "@souvenir/ds-components";
//   <Tabs defaultValue="details">
//     <TabsList ariaLabel="Product information">
//       <TabsTrigger value="details">Details</TabsTrigger>
//       <TabsTrigger value="reviews">Reviews (124)</TabsTrigger>
//     </TabsList>
//     <TabsContent value="details">Organic cotton, relaxed fit.</TabsContent>
//     <TabsContent value="reviews">Average rating 4.6 out of 5.</TabsContent>
//   </Tabs>
import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import {
  TABS_DEFAULTS,
  TABS_REFLECTS,
  TABS_SLOTS,
  type TabsProps as TabsContractProps,
  type TabsListProps as TabsListContractProps,
  type TabsTriggerProps as TabsTriggerContractProps,
  type TabsContentProps as TabsContentContractProps,
} from "./tabs.contract";

// ---------------------------------------------------------------- Tabs (root)

// Radix's own root props pass through, minus the names the contract owns, so each has one way to be set.
type RadixRootProps = Omit<React.ComponentPropsWithoutRef<typeof RadixTabs.Root>, keyof TabsContractProps>;

type TabsBaseProps = RadixRootProps &
  Omit<TabsContractProps, "value" | "defaultValue" | "onValueChange"> & {
    /** Called with the new value when a different tab is selected. */
    onValueChange?: (value: string) => void;
    ref?: React.Ref<HTMLDivElement>;
  };

/** The parent holds the selected value. */
export type TabsControlledProps = TabsBaseProps & { value: string; defaultValue?: never };
/** Tabs holds its own state, starting from defaultValue. */
export type TabsUncontrolledProps = TabsBaseProps & { defaultValue: string; value?: never };
/** Every prop Tabs takes. One of value or defaultValue is required (requirement tabs-one-selected): without one,
 * Radix starts with no tab selected. */
export type TabsProps = TabsControlledProps | TabsUncontrolledProps;

// Proof, checked by tsc, that Tabs needs value or defaultValue. Not a requirement id: tabs-one-selected is a test.
// @ts-expect-error Tabs without value or defaultValue must not type-check
const _tabsNeedsValue: TabsProps = { variant: "line" };
void _tabsNeedsValue;

export function Tabs(props: TabsProps) {
  const {
    variant = TABS_DEFAULTS.variant,
    size = TABS_DEFAULTS.size,
    orientation = TABS_DEFAULTS.orientation,
    activationMode = TABS_DEFAULTS.activationMode,
    dir,
    value,
    defaultValue,
    onValueChange,
    ...radix
  } = props;
  // Unset unless given: dir, value and defaultValue are spread only when the caller gave them, so Radix never
  // sees an explicit undefined and never treats an uncontrolled Tabs as controlled.
  const given: { dir?: "ltr" | "rtl"; value?: string; defaultValue?: string } = {};
  if (dir !== undefined) given.dir = dir;
  if (value !== undefined) given.value = value;
  if (defaultValue !== undefined) given.defaultValue = defaultValue;
  const reflected = {
    [TABS_REFLECTS.variant]: variant,
    [TABS_REFLECTS.size]: size,
  };
  // One press, one call. When the parent holds the value, Radix reports a press on a tab twice: once from the
  // focus the press gives the tab (automatic activation) and once from the press itself, both before the parent
  // re-renders. A repeat of the same value within the same task is dropped.
  const lastCall = React.useRef<string | null>(null);
  const handleValueChange = (next: string) => {
    if (lastCall.current === next) return;
    lastCall.current = next;
    queueMicrotask(() => {
      lastCall.current = null;
    });
    onValueChange?.(next);
  };
  return (
    <RadixTabs.Root
      {...radix}
      {...given}
      {...reflected}
      orientation={orientation}
      activationMode={activationMode}
      onValueChange={handleValueChange}
      data-slot={TABS_SLOTS.root}
    />
  );
}

// ---------------------------------------------------------------- TabsList

type RadixListProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>,
  keyof TabsListContractProps | "aria-label" | "aria-labelledby"
>;

type TabsListBaseProps = RadixListProps &
  Omit<TabsListContractProps, "ariaLabel" | "ariaLabelledby"> & { ref?: React.Ref<HTMLDivElement> };

/** Named by a visible heading: the id of that heading. Preferred when such a heading exists. */
export type TabsListLabelledbyProps = TabsListBaseProps & { ariaLabelledby: string; ariaLabel?: string };
/** Named by a string, when no visible heading names the list. */
export type TabsListLabelProps = TabsListBaseProps & { ariaLabel: string; ariaLabelledby?: string };
/** Every prop TabsList takes. One of ariaLabel or ariaLabelledby is required (requirement tabs-list-needs-name). */
export type TabsListProps = TabsListLabelledbyProps | TabsListLabelProps;

// Proof for requirement tabs-list-needs-name, checked by tsc: if the union ever accepted a list with neither
// name, this directive would be unused and the type check would fail.
// @ts-expect-error tabs-list-needs-name: a TabsList without ariaLabel or ariaLabelledby must not type-check
const _listNeedsName: TabsListProps = { behavior: "hug", children: null };
void _listNeedsName;

// Scrolls the list (never the page) so that a tab is fully in view, keeping the list's inline padding around it
// so its focus ring shows. scrollBy on the list alone works in both reading directions.
function revealInList(list: HTMLElement, tab: HTMLElement) {
  if (list.scrollWidth <= list.clientWidth) return;
  const l = list.getBoundingClientRect();
  const t = tab.getBoundingClientRect();
  const cs = getComputedStyle(list);
  const startPad = parseFloat(cs.paddingLeft) || 0;
  const endPad = parseFloat(cs.paddingRight) || 0;
  const left = l.left + list.clientLeft + startPad;
  const right = l.left + list.clientLeft + list.clientWidth - endPad;
  let delta = 0;
  if (t.left < left) delta = t.left - left;
  else if (t.right > right) delta = Math.min(t.right - right, t.left - left);
  if (delta !== 0) list.scrollBy({ left: delta, behavior: "instant" });
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

export function TabsList(props: TabsListProps) {
  const {
    behavior = TABS_DEFAULTS["list.behavior"],
    loop = TABS_DEFAULTS["list.loop"],
    ariaLabel,
    ariaLabelledby,
    ref,
    ...radix
  } = props;
  const own = React.useRef<HTMLDivElement | null>(null);
  const merged = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node;
      setRef(ref, node);
    },
    [ref],
  );
  // When the list scrolls, the selected tab is scrolled into view on first render (tabs-selected-in-view-on-mount).
  React.useLayoutEffect(() => {
    const list = own.current;
    if (!list) return;
    const reveal = () => {
      // Once a tab has focus, the person is moving through the list; leave its scroll alone.
      if (list.contains(document.activeElement)) return;
      const selected = list.querySelector<HTMLElement>(`[data-slot~="${TABS_SLOTS.trigger}"][data-state="active"]`);
      if (selected) revealInList(list, selected);
    };
    reveal();
    // A web font that loads after the first render widens the labels; reveal again once fonts are in.
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) reveal();
    });
    return () => {
      live = false;
    };
  }, []);
  const reflected = { [TABS_REFLECTS["list.behavior"]]: behavior };
  return (
    <RadixTabs.List
      {...radix}
      {...reflected}
      ref={merged}
      loop={loop}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      data-slot={TABS_SLOTS.list}
    />
  );
}

// ---------------------------------------------------------------- TabsTrigger

type RadixTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>,
  keyof TabsTriggerContractProps | "asChild"
>;

export type TabsTriggerProps = RadixTriggerProps & TabsTriggerContractProps & { ref?: React.Ref<HTMLButtonElement> };

// The label's words as text, when they are plain text, so the extensions stylesheet can reserve the width of the
// heavier selected weight (tabs-no-width-shift). Other content is shown as given and reserves nothing.
function textOf(node: React.ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node) && node.every((n) => typeof n === "string" || typeof n === "number")) return node.join("");
  return undefined;
}

export function TabsTrigger(props: TabsTriggerProps) {
  const { value, disabled = TABS_DEFAULTS["trigger.disabled"], children, iconStart, iconEnd, ref, onFocus, ...radix } = props;
  const reflected = { [TABS_REFLECTS["trigger.disabled"]]: disabled ? "" : undefined };
  // A tab that gets focus, from an arrow key or otherwise, is scrolled fully into view inside the list, with the
  // list's padding around it so its focus ring is not cut off (tabs-focused-tab-in-view, tabs-focus-visible).
  const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    const list = event.currentTarget.closest<HTMLElement>(`[data-slot~="${TABS_SLOTS.list}"]`);
    if (list) revealInList(list, event.currentTarget);
  };
  return (
    <RadixTabs.Trigger
      {...radix}
      {...reflected}
      ref={ref}
      value={value}
      disabled={disabled}
      onFocus={handleFocus}
      data-slot={TABS_SLOTS.trigger}
    >
      {iconStart != null && iconStart !== false ? (
        <span data-slot={TABS_SLOTS.iconStart} aria-hidden="true">
          {iconStart}
        </span>
      ) : null}
      <span data-slot={TABS_SLOTS.label} data-label={textOf(children)}>
        {children}
      </span>
      {iconEnd != null && iconEnd !== false ? (
        <span data-slot={TABS_SLOTS.iconEnd} aria-hidden="true">
          {iconEnd}
        </span>
      ) : null}
      <span data-slot={TABS_SLOTS.indicator} aria-hidden="true" />
    </RadixTabs.Trigger>
  );
}

// ---------------------------------------------------------------- TabsContent

type RadixContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>,
  keyof TabsContentContractProps | "forceMount" | "asChild"
>;

export type TabsContentProps = RadixContentProps & TabsContentContractProps & { ref?: React.Ref<HTMLDivElement> };

export function TabsContent(props: TabsContentProps) {
  const { value, children, ref, ...radix } = props;
  return (
    <RadixTabs.Content {...radix} ref={ref} value={value} data-slot={TABS_SLOTS.content}>
      {children}
    </RadixTabs.Content>
  );
}
