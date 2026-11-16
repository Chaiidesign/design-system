// Dialog examples: one entry per example id in ds-components/specs/dialog.spec.json, with the props and content
// the spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
//
// Where the spec's body content describes the text rather than giving it ("Five paragraphs of policy text, taller
// than the viewport"), the example renders that text, so the body really is taller than the viewport.
//
// How tests see what happened, all on window:
//   __dialogEvents[<example id>].openChange   every value onOpenChange was called with, in order
//   __dialogEvents[<example id>].action       one entry per press on a footer action that is not a close part
//   __dialogControl["controlled-without-trigger"].setOpen(open)   opens or closes that example from a test, as a
//                                             product would, so focus return can be proved without a trigger
//   __dialogFixtures.mountUntitled("missing" | "empty")   mounts an open dialog whose content has no title, or an
//                                             empty one, for the development-warning test; no spec example may
//                                             lack a title, so this is a test hook, not an example
//   __dialogFixtures.mountNoControl()         mounts an open dialog with no control inside, for the focus-on-open
//                                             branch "to the content when there is none". A spec example cannot have
//                                             it: a dismissible dialog must show a close part (dialog-visible-close)
//                                             and a non-dismissible one must offer a footer action
//                                             (dialog-not-dismissible-has-way-out), and both are controls
//
// On a page that shows several examples (the component page, the index) every open dialog would cover the page at
// once, so each example there starts hidden behind an "Open" button that mounts it (OnDemand). The page for one
// example (?example=<id>), which the test runner loads, renders the example exactly as the spec gives it.
import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu";
import { Icon } from "../../gallery/icons";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

type Log = Record<string, { openChange?: boolean[]; action?: string[]; menuOpenChange?: boolean[] }>;
type DialogWindow = {
  __dialogEvents?: Log;
  __dialogControl?: Record<string, { setOpen: (open: boolean) => void }>;
  __dialogFixtures?: { mountUntitled: (kind: "missing" | "empty") => void; mountNoControl: () => void };
};
const win = () => window as unknown as DialogWindow;

const entry = (id: string) => ((win().__dialogEvents ??= {})[id] ??= {});
const recordOpen = (id: string) => (open: boolean) => {
  (entry(id).openChange ??= []).push(open);
};
const recordAction = (id: string, label: string) => () => {
  (entry(id).action ??= []).push(label);
};

const POLICY = [
  "You can return most items within 30 days of delivery for a full refund. The item must be unused and in its original packaging, with every tag still attached.",
  "Start a return from your orders page. Choose the items, tell us why, and pick a drop-off point or a collection slot. We email a label that you print or show on your phone.",
  "Refunds go back to the card or account you paid with, within 5 working days of the item reaching our warehouse. Delivery charges are refunded when the whole order comes back.",
  "Some items cannot be returned once opened, for hygiene reasons: earrings, swimwear without its liner and opened cosmetics. Their product pages say so before you buy.",
  "If an item arrives damaged or is not what you ordered, tell us within 14 days and we collect it free of charge, whatever the reason for the return.",
];

const TERMS = Array.from({ length: 12 }, (_, i) =>
  [
    `${i + 1}. Items from our partner warehouse travel with a separate carrier and are tracked on their own.`,
    "The carrier gives a one-hour window on the morning of delivery and asks for a signature when the parcel is worth more than £250.",
    "If nobody is in, the parcel goes to the nearest pick-up point and waits there for seven days before it comes back to us.",
  ].join(" "),
);

const TERMS_DE = Array.from({ length: 12 }, (_, i) =>
  [
    `§ ${i + 1}. Lieferbedingungen: Artikel aus unserem Partnerlager werden getrennt versandt.`,
    "Die Versandkostenübernahme gilt nur für Bestellungen innerhalb Deutschlands; die Lieferadressänderungsbenachrichtigung erhalten Sie per E-Mail.",
    "Bei Nichtzustellbarkeit wird das Paket an die nächstgelegene Paketabholstation weitergeleitet.",
  ].join(" "),
);

function ControlledWithoutTrigger() {
  const id = "controlled-without-trigger";
  const [open, setOpen] = useState(true);
  (win().__dialogControl ??= {})[id] = { setOpen };
  const change = (next: boolean) => {
    recordOpen(id)(next);
    setOpen(next);
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your session is about to end</DialogTitle>
              <DialogDescription>Stay signed in to keep your basket.</DialogDescription>
            </DialogHeader>
            <DialogBody>You will be signed out in 2 minutes.</DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Sign out</Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={() => {
                  recordAction(id, "Stay signed in")();
                  change(false);
                }}
              >
                Stay signed in
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  );
}

// Test hook for dialog-title-dev-warning: an open dialog with no title, or an empty one, mounted on its own root.
function mountUntitled(kind: "missing" | "empty") {
  const host = document.createElement("div");
  host.setAttribute("data-dialog-fixture", kind);
  document.body.appendChild(host);
  createRoot(host).render(
    <Dialog defaultOpen>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            {kind === "empty" ? (
              <DialogHeader>
                <DialogTitle>{""}</DialogTitle>
              </DialogHeader>
            ) : null}
            <DialogBody>A dialog without a name.</DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>,
  );
}
// Test hook for dialog-focus-on-open, the branch with no control: header and body text only, nothing tabbable.
function mountNoControl() {
  const host = document.createElement("div");
  host.setAttribute("data-dialog-fixture", "no-control");
  document.body.appendChild(host);
  createRoot(host).render(
    <Dialog defaultOpen>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Saving your address</DialogTitle>
            </DialogHeader>
            <DialogBody>This takes a moment.</DialogBody>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>,
  );
}
if (typeof window !== "undefined") win().__dialogFixtures = { mountUntitled, mountNoControl };

// Several examples on one page: each waits behind an "Open" button, and mounts afresh on every press so it opens
// again after it closes. The single-example page renders the example as it is.
const singleExample = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("example");
function OnDemand({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(0);
  if (singleExample()) return <>{children}</>;
  return (
    <>
      <Button onClick={() => setShown((n) => n + 1)}>Open</Button>
      {shown > 0 ? <div key={shown}>{children}</div> : null}
    </>
  );
}

function WithMenu() {
  const id = "with-menu";
  return (
    <Dialog defaultOpen onOpenChange={recordOpen(id)}>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delivery day</DialogTitle>
              <DialogDescription>Choose when the courier comes.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <DropdownMenu onOpenChange={(open: boolean) => (entry(id).menuOpenChange ??= []).push(open)}>
                <DropdownMenuTrigger asChild>
                  <Button iconEnd={<Icon name="chevron-down" />}>Tuesday 18 November</Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Tuesday 18 November</DropdownMenuItem>
                    <DropdownMenuItem>Wednesday 19 November</DropdownMenuItem>
                    <DropdownMenuItem>Thursday 20 November</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button variant="primary" onClick={recordAction(id, "Save day")}>
                Save day
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  );
}

export const examples = {
  default: () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("default")}>
        <DialogTrigger asChild>
          <Button>Change address</Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change delivery address</DialogTitle>
                <DialogDescription>Your order will go to the new address.</DialogDescription>
              </DialogHeader>
              <DialogBody>12 Harbour Street, Leith, Edinburgh EH6 6QW</DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Cancel</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("default", "Use this address")}>
                  Use this address
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "confirm-step": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("confirm-step")}>
        <DialogTrigger asChild>
          <Button>Continue to payment</Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>Use express delivery?</DialogTitle>
                <DialogDescription>It arrives tomorrow and adds £4.99 to your order.</DialogDescription>
              </DialogHeader>
              <DialogBody>You can change this until the order ships.</DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Keep standard</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("confirm-step", "Add express delivery")}>
                  Add express delivery
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  small: () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("small")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>Rename list</DialogTitle>
              </DialogHeader>
              <DialogBody>Weekend shopping</DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Cancel</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("small", "Save name")}>
                  Save name
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  medium: () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("medium")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent size="md">
              <DialogHeader>
                <DialogTitle>Delivery options</DialogTitle>
              </DialogHeader>
              <DialogBody>Standard: 3 to 5 working days, free. Express: next working day, £4.99.</DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "no-description": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("no-description")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Order summary</DialogTitle>
              </DialogHeader>
              <DialogBody>
                2 items: £38.00
                <br />
                Delivery: £4.99
                <br />
                Total: £42.99
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "not-dismissible": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("not-dismissible")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent dismissible={false}>
              <DialogHeader>
                <DialogTitle>Confirm your card</DialogTitle>
                <DialogDescription>Your bank needs you to confirm this payment in its app.</DialogDescription>
              </DialogHeader>
              <DialogBody>Keep this window open until the app says the payment is confirmed.</DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Use a different card</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("not-dismissible", "I have confirmed it")}>
                  I have confirmed it
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "title-focus": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("title-focus")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent initialFocus="title">
              <DialogHeader>
                <DialogTitle>Returns policy</DialogTitle>
              </DialogHeader>
              <DialogBody>
                {POLICY.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  closed: () => (
    <Dialog defaultOpen={false} onOpenChange={recordOpen("closed")}>
      <DialogTrigger asChild>
        <Button>Change address</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change delivery address</DialogTitle>
            </DialogHeader>
            <DialogBody>12 Harbour Street, Leith, Edinburgh EH6 6QW</DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  ),
  "controlled-without-trigger": () => (
    <OnDemand>
      <ControlledWithoutTrigger />
    </OnDemand>
  ),
  "long-text": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("long-text")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose how you would like us to deliver the items that are coming from our partner warehouse</DialogTitle>
                <DialogDescription>
                  These items ship separately from the rest of your order, so they can arrive on a different day and may need a signature.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {TERMS.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Back</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("long-text", "Deliver everything together")}>
                  Deliver everything together
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "worst-case-320": () => (
    <OnDemand>
      <Dialog defaultOpen onOpenChange={recordOpen("worst-case-320")}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent dismissible={false}>
              <DialogHeader>
                <DialogTitle>Choose how you would like us to deliver the items that are coming from our partner warehouse in Rotterdam</DialogTitle>
                <DialogDescription>
                  These items ship separately from the rest of your order, so they can arrive on a different day and may need a signature from someone at the address.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {TERMS_DE.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Go back to my basket</Button>
                </DialogClose>
                <Button variant="primary" onClick={recordAction("worst-case-320", "Deliver everything together on the later date")}>
                  Deliver everything together on the later date
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </OnDemand>
  ),
  "with-menu": () => (
    <OnDemand>
      <WithMenu />
    </OnDemand>
  ),
};
