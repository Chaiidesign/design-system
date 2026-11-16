// Dialog: the React renderer of ds-components/specs/dialog.spec.json, on @radix-ui/react-dialog.
// Hand-written. The look comes from the generated dialog.css (it styles the data attributes set here) and
// dialog.extensions.css, both loaded by ds-components/src/styles.css; this file sets no style and no class.
// Names, defaults, slots and reflected attributes all come from the generated dialog.contract.ts.
//
//   import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogTitle,
//     DialogDescription, DialogBody, DialogFooter, DialogClose, Button } from "@souvenir/ds-components";
//   <Dialog>
//     <DialogTrigger asChild><Button>Change address</Button></DialogTrigger>
//     <DialogPortal>
//       <DialogOverlay>
//         <DialogContent>
//           <DialogHeader><DialogTitle>Change delivery address</DialogTitle></DialogHeader>
//           <DialogBody>12 Harbour Street</DialogBody>
//           <DialogFooter>
//             <DialogClose asChild><Button>Cancel</Button></DialogClose>
//             <Button variant="primary" onClick={save}>Use this address</Button>
//           </DialogFooter>
//         </DialogContent>
//       </DialogOverlay>
//     </DialogPortal>
//   </Dialog>
//
// What this adapter adds to Radix 1.3.1, each named by the spec:
//   - aria-modal="true" on the content (dialog-aria-modal).
//   - A development warning when a DialogContent mounts without a DialogTitle or with an empty one
//     (dialog-title-dev-warning); Radix 1.3.1 does not warn.
//   - content.dismissible: false blocks Escape and the outside press (dialog-not-dismissible).
//   - content.initialFocus: the first control that is not a link, or the title (dialog-focus-on-open,
//     dialog-initial-focus-title).
//   - Focus return for a dialog without a trigger to the element that had focus when it opened
//     (dialog-focus-returns-without-trigger); Radix alone leaves it on the body.
//   - A body that scrolls joins the Tab order, so it can be scrolled with the keyboard (dialog-body-scroll-keyboard).
// The dialog is always modal: Radix's modal prop is not exposed (see the spec's notCarried).
import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  DIALOG_DEFAULTS,
  DIALOG_REFLECTS,
  DIALOG_SLOTS,
  type DialogProps as DialogContractProps,
  type DialogTriggerProps as DialogTriggerContractProps,
  type DialogContentProps as DialogContentContractProps,
  type DialogHeaderProps as DialogHeaderContractProps,
  type DialogTitleProps as DialogTitleContractProps,
  type DialogDescriptionProps as DialogDescriptionContractProps,
  type DialogBodyProps as DialogBodyContractProps,
  type DialogFooterProps as DialogFooterContractProps,
  type DialogCloseProps as DialogCloseContractProps,
} from "./dialog.contract";

// esbuild replaces process.env.NODE_ENV at build time; this declaration only tells TypeScript it exists.
declare const process: { env: { NODE_ENV?: string } };

// ---------------------------------------------------------------- shared state

// Souvenir's own context beside Radix's: how many triggers are mounted (so a dialog without one can return focus
// itself), and whether the title takes focus on open.
type DialogShared = { triggers: React.RefObject<number> };
const DialogSharedContext = React.createContext<DialogShared | null>(null);
const TitleFocusContext = React.createContext(false);

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

// The first control inside the content that takes focus on open: tabbable, visible, not a link, and not the body
// (which is tabbable only so that it can be scrolled, and is not a control).
const TABBABLE = 'button, [href], input, select, textarea, summary, [tabindex], [contenteditable="true"], [contenteditable=""]';
function firstControl(container: HTMLElement): HTMLElement | null {
  for (const el of container.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (el.tabIndex < 0 || el.matches(":disabled, a[href]")) continue;
    if (el.getAttribute("data-slot") === DIALOG_SLOTS.body) continue;
    if (!el.checkVisibility({ visibilityProperty: true })) continue;
    return el;
  }
  return null;
}

// Warn once per kind of fault, in development only.
const warned = { missing: false, empty: false };

// ---------------------------------------------------------------- Dialog (root: renders nothing)

/** Every prop Dialog takes. modal is not exposed: the dialog is always modal. */
export type DialogProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Root>, keyof DialogContractProps | "modal"> &
  Omit<DialogContractProps, "onOpenChange"> & {
    /** Called with true or false when the trigger, a close part, Escape or an outside press asks to open or close. */
    onOpenChange?: (open: boolean) => void;
  };

export function Dialog({ open, defaultOpen = DIALOG_DEFAULTS.defaultOpen, onOpenChange, ...radix }: DialogProps) {
  const triggers = React.useRef(0);
  const shared = React.useMemo(() => ({ triggers }), []);
  // A default of null means unset: open is passed only when the caller gave it, so Radix holds the state otherwise.
  const controlled = open === undefined || open === null ? {} : { open };
  return (
    <DialogSharedContext.Provider value={shared}>
      <RadixDialog.Root {...radix} {...controlled} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal />
    </DialogSharedContext.Provider>
  );
}

// ---------------------------------------------------------------- DialogTrigger

export type DialogTriggerProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Trigger>, keyof DialogTriggerContractProps> &
  DialogTriggerContractProps & { ref?: React.Ref<HTMLButtonElement> };

/** The control that opens the dialog. With asChild, a Souvenir Button keeps its look and gains the trigger's attributes. */
export function DialogTrigger({ asChild = DIALOG_DEFAULTS["trigger.asChild"], ref, ...radix }: DialogTriggerProps) {
  const shared = React.useContext(DialogSharedContext);
  React.useEffect(() => {
    if (!shared) return;
    shared.triggers.current += 1;
    return () => {
      shared.triggers.current -= 1;
    };
  }, [shared]);
  return <RadixDialog.Trigger {...radix} ref={ref} asChild={asChild} data-slot={DIALOG_SLOTS.trigger} />;
}

// ---------------------------------------------------------------- DialogPortal (renders nothing)

/** Moves the overlay and the content to the end of the body. forceMount and container are not part of the surface. */
export type DialogPortalProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Portal>, "forceMount" | "container">;

export function DialogPortal(props: DialogPortalProps) {
  return <RadixDialog.Portal {...props} />;
}

// ---------------------------------------------------------------- DialogOverlay

/** Covers the viewport and dims the page. Its child is the DialogContent; its padding is the margin to the screen edge. */
export type DialogOverlayProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>, "forceMount" | "asChild"> & {
  ref?: React.Ref<HTMLDivElement>;
};

export function DialogOverlay({ ref, ...radix }: DialogOverlayProps) {
  return <RadixDialog.Overlay {...radix} ref={ref} data-slot={DIALOG_SLOTS.overlay} />;
}

// ---------------------------------------------------------------- DialogContent

type RadixContentProps = React.ComponentPropsWithoutRef<typeof RadixDialog.Content>;

/** Every prop DialogContent takes. Radix's escape and outside-press hooks are replaced by dismissible. */
export type DialogContentProps = Omit<
  RadixContentProps,
  | keyof DialogContentContractProps
  | "forceMount"
  | "asChild"
  | "onEscapeKeyDown"
  | "onPointerDownOutside"
  | "onInteractOutside"
  | "onFocusOutside"
  | "role"
  | "aria-modal"
> &
  Omit<DialogContentContractProps, "onOpenAutoFocus" | "onCloseAutoFocus"> & {
    /** Called before focus moves inside on open. preventDefault stops the move so the product can place focus itself. */
    onOpenAutoFocus?: (event: Event) => void;
    /** Called before focus returns on close. preventDefault lets the product place focus on the next step instead. */
    onCloseAutoFocus?: (event: Event) => void;
    ref?: React.Ref<HTMLDivElement>;
  };

const preventDismiss = (event: { preventDefault(): void }) => event.preventDefault();

export function DialogContent({
  size = DIALOG_DEFAULTS["content.size"],
  dismissible = DIALOG_DEFAULTS["content.dismissible"],
  initialFocus = DIALOG_DEFAULTS["content.initialFocus"],
  onOpenAutoFocus,
  onCloseAutoFocus,
  children,
  ref,
  ...radix
}: DialogContentProps) {
  const shared = React.useContext(DialogSharedContext);
  const node = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState<HTMLDivElement | null>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const setNode = React.useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      setMounted(el);
      setRef(ref, el);
    },
    [ref],
  );

  // dialog-title-dev-warning: Radix 1.3.1 renders no warning for a missing title, so the adapter checks each time
  // the content element mounts (it mounts on open; this component itself stays mounted while closed).
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const el = mounted;
    if (!el) return;
    const title = el.querySelector(`[data-slot="${DIALOG_SLOTS.title}"]`);
    if (!title && !warned.missing) {
      warned.missing = true;
      console.warn("DialogContent: no DialogTitle inside. The dialog has no accessible name; add a DialogTitle with text.");
    } else if (title && !(title.textContent ?? "").trim() && !warned.empty) {
      warned.empty = true;
      console.warn("DialogContent: the DialogTitle is empty. The dialog has no accessible name; give the title text.");
    }
  }, [mounted]);

  const handleOpenAutoFocus = (event: Event) => {
    // Remember where focus was, for a dialog without a trigger. Never an element inside the dialog itself (a
    // development remount opens it again from inside).
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !node.current?.contains(active)) returnTo.current = active;
    onOpenAutoFocus?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    const el = node.current;
    if (!el) return;
    const target =
      initialFocus === "title" ? el.querySelector<HTMLElement>(`[data-slot="${DIALOG_SLOTS.title}"]`) : firstControl(el);
    (target ?? el).focus({ preventScroll: true });
  };

  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event);
    if (event.defaultPrevented) return;
    // With a trigger, Radix returns focus to it. Without one, Radix would leave focus on the body.
    if (shared && shared.triggers.current > 0) return;
    event.preventDefault();
    const back = returnTo.current;
    if (back && back.isConnected) back.focus();
  };

  const reflected = { [DIALOG_REFLECTS["content.size"]]: size };
  const blocked = dismissible ? {} : { onEscapeKeyDown: preventDismiss, onPointerDownOutside: preventDismiss, onInteractOutside: preventDismiss };

  return (
    <TitleFocusContext.Provider value={initialFocus === "title"}>
      <RadixDialog.Content
        {...radix}
        {...reflected}
        {...blocked}
        ref={setNode}
        aria-modal="true"
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        data-slot={DIALOG_SLOTS.content}
      >
        {children}
      </RadixDialog.Content>
    </TitleFocusContext.Provider>
  );
}

// ---------------------------------------------------------------- layout parts

export type DialogHeaderProps = Omit<React.ComponentPropsWithoutRef<"div">, keyof DialogHeaderContractProps> &
  DialogHeaderContractProps & { ref?: React.Ref<HTMLDivElement> };

/** Holds the title and the description. Never scrolls away. */
export function DialogHeader({ ref, ...native }: DialogHeaderProps) {
  return <div {...native} ref={ref} data-slot={DIALOG_SLOTS.header} />;
}

export type DialogTitleProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Title>, keyof DialogTitleContractProps | "asChild"> &
  DialogTitleContractProps & { ref?: React.Ref<HTMLHeadingElement> };

/** The dialog's name. Required in every DialogContent: the content's aria-labelledby points at it. */
export function DialogTitle({ ref, ...radix }: DialogTitleProps) {
  const takesFocus = React.useContext(TitleFocusContext);
  return <RadixDialog.Title tabIndex={takesFocus ? -1 : undefined} {...radix} ref={ref} data-slot={DIALOG_SLOTS.title} />;
}

export type DialogDescriptionProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>,
  keyof DialogDescriptionContractProps | "asChild"
> &
  DialogDescriptionContractProps & { ref?: React.Ref<HTMLParagraphElement> };

/** One short sentence under the title. Its id joins the content's aria-describedby. */
export function DialogDescription({ ref, ...radix }: DialogDescriptionProps) {
  return <RadixDialog.Description {...radix} ref={ref} data-slot={DIALOG_SLOTS.description} />;
}

export type DialogBodyProps = Omit<React.ComponentPropsWithoutRef<"div">, keyof DialogBodyContractProps> &
  DialogBodyContractProps & { ref?: React.Ref<HTMLDivElement> };

/** The task. The only part that scrolls; while it scrolls it is in the Tab order, so the keyboard can scroll it. */
export function DialogBody({ ref, tabIndex, ...native }: DialogBodyProps) {
  const node = React.useRef<HTMLDivElement | null>(null);
  const [scrolls, setScrolls] = React.useState(false);
  const setNode = React.useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      setRef(ref, el);
    },
    [ref],
  );
  React.useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  return <div {...native} ref={setNode} tabIndex={tabIndex ?? (scrolls ? 0 : undefined)} data-slot={DIALOG_SLOTS.body} />;
}

export type DialogFooterProps = Omit<React.ComponentPropsWithoutRef<"div">, keyof DialogFooterContractProps> &
  DialogFooterContractProps & { ref?: React.Ref<HTMLDivElement> };

/** The actions, least weighty first and the primary action last. Never scrolls away. */
export function DialogFooter({ ref, ...native }: DialogFooterProps) {
  return <div {...native} ref={ref} data-slot={DIALOG_SLOTS.footer} />;
}

// ---------------------------------------------------------------- DialogClose

export type DialogCloseProps = Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Close>, keyof DialogCloseContractProps> &
  DialogCloseContractProps & { ref?: React.Ref<HTMLButtonElement> };

/** Closes the dialog when pressed. With asChild, a Souvenir Button keeps its look. */
export function DialogClose({ asChild = DIALOG_DEFAULTS["close.asChild"], ref, ...radix }: DialogCloseProps) {
  return <RadixDialog.Close {...radix} ref={ref} asChild={asChild} data-slot={DIALOG_SLOTS.close} />;
}
