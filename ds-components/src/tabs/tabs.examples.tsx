// Tabs examples: one entry per example id in ds-components/specs/tabs.spec.json, with exactly the props and content
// the spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
//
// How tests see a selection: every example passes onValueChange={record("<example id>")}, which appends the new
// value to window.__tabsEvents["<example id>"].valueChange. The controlled example holds its value in useState and
// records every change too. tabs.tests.mjs reads that log.
//
// Test hook (not an example): window.__tabsFixtures.refCleanup() mounts a Tabs with a ref on every part, in its own
// React root without StrictMode (so each ref attaches once), unmounts it, and returns what the refs saw: the React 19
// callback refs (which return a cleanup) as a log, and an object ref on the list before and after unmount. A spec
// example cannot show a ref; requirement tabs-ref-cleanup needs one.
import { useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps } from "./tabs";
import { Icon, type IconName } from "../../gallery/icons";

type RefReport = { log: string[]; objectAttached: string | null; objectAfter: string | null };
type FixtureWindow = { __tabsFixtures?: { refCleanup: () => RefReport } };

function refCleanup(): RefReport {
  const log: string[] = [];
  const callback = (name: string) => (node: HTMLElement | null) => {
    if (node === null) {
      log.push(`${name}:null`);
      return;
    }
    log.push(`${name}:attach:${node.getAttribute("data-slot")}`);
    return () => {
      log.push(`${name}:cleanup`);
    };
  };
  const host = document.createElement("div");
  (document.querySelector("section[data-example]") ?? document.body).appendChild(host);
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <Tabs ref={callback("root")} defaultValue="a">
        <TabsList ref={callback("list")} ariaLabel="Ref fixture">
          <TabsTrigger ref={callback("trigger")} value="a">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent ref={callback("content")} value="a">
          Panel A
        </TabsContent>
      </Tabs>,
    ),
  );
  log.push("unmount");
  root.unmount();
  // An object ref on the list: set to the element on mount, back to null on unmount.
  const object: { current: HTMLDivElement | null } = { current: null };
  const second = createRoot(host);
  flushSync(() =>
    second.render(
      <Tabs defaultValue="a">
        <TabsList ref={object} ariaLabel="Ref fixture">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
      </Tabs>,
    ),
  );
  const objectAttached = object.current ? object.current.getAttribute("data-slot") : null;
  second.unmount();
  host.remove();
  return { log, objectAttached, objectAfter: object.current ? object.current.getAttribute("data-slot") : null };
}

if (typeof window !== "undefined") (window as unknown as FixtureWindow).__tabsFixtures = { refCleanup };

type EventLog = { __tabsEvents?: Record<string, { valueChange: string[] }> };

const record = (id: string) => (value: string) => {
  const log = ((window as unknown as EventLog).__tabsEvents ??= {});
  (log[id] ??= { valueChange: [] }).valueChange.push(value);
};

// One tab of a spec example's content: its value, label, panel and the optional icon and disabled flag.
type Item = { value: string; label: string; panel: ReactNode; iconStart?: IconName; disabled?: boolean };

// The list and panels for a spec example's content, in the order the spec gives them.
function Parts({ items, list }: { items: Item[]; list: { ariaLabel: string; behavior?: "hug" | "fill"; loop?: boolean } }) {
  return (
    <>
      <TabsList ariaLabel={list.ariaLabel} behavior={list.behavior} loop={list.loop}>
        {items.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            disabled={t.disabled}
            iconStart={t.iconStart ? <Icon name={t.iconStart} /> : undefined}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.panel}
        </TabsContent>
      ))}
    </>
  );
}

const product: Item[] = [
  { value: "details", label: "Details", panel: "Organic cotton, relaxed fit." },
  { value: "reviews", label: "Reviews (124)", panel: "Average rating 4.6 out of 5." },
  { value: "delivery", label: "Delivery", panel: "Free delivery over £50." },
];
const receive: Item[] = [
  { value: "delivery", label: "Delivery", panel: "Delivered in 2 to 3 working days." },
  { value: "collection", label: "Collection", panel: "Collect from a store near you." },
];
const orders: Item[] = [
  { value: "all", label: "All", panel: "All orders." },
  { value: "open", label: "Open", panel: "Orders on their way." },
  { value: "returned", label: "Returned", panel: "Returned orders." },
];
const account: Item[] = [
  { value: "profile", label: "Profile", panel: "Name and email." },
  { value: "addresses", label: "Addresses", panel: "Saved addresses." },
  { value: "payments", label: "Payments", panel: "Saved payment methods." },
];

function Controlled() {
  const [tab, setTab] = useState("reviews");
  const change: TabsProps["onValueChange"] = (value) => {
    record("controlled")(value);
    setTab(value);
  };
  return (
    <Tabs value={tab} onValueChange={change}>
      <Parts
        list={{ ariaLabel: "Product information" }}
        items={[
          { value: "details", label: "Details", panel: "Organic cotton, relaxed fit." },
          { value: "reviews", label: "Reviews (124)", panel: "Average rating 4.6 out of 5." },
        ]}
      />
    </Tabs>
  );
}

export const examples = {
  line: () => (
    <Tabs defaultValue="details" onValueChange={record("line")}>
      <Parts list={{ ariaLabel: "Product information" }} items={product} />
    </Tabs>
  ),
  pill: () => (
    <Tabs variant="pill" defaultValue="delivery" onValueChange={record("pill")}>
      <Parts list={{ ariaLabel: "How to receive your order" }} items={receive} />
    </Tabs>
  ),
  fill: () => (
    <Tabs variant="pill" defaultValue="delivery" onValueChange={record("fill")}>
      <Parts list={{ ariaLabel: "How to receive your order", behavior: "fill" }} items={receive} />
    </Tabs>
  ),
  "with-icons": () => (
    <Tabs defaultValue="delivery" onValueChange={record("with-icons")}>
      <Parts
        list={{ ariaLabel: "How to receive your order" }}
        items={[
          { ...receive[0], iconStart: "truck" },
          { ...receive[1], iconStart: "store" },
        ]}
      />
    </Tabs>
  ),
  small: () => (
    <Tabs size="sm" defaultValue="all" onValueChange={record("small")}>
      <Parts list={{ ariaLabel: "Order filter" }} items={orders} />
    </Tabs>
  ),
  "small-pill": () => (
    <Tabs variant="pill" size="sm" defaultValue="open" onValueChange={record("small-pill")}>
      <Parts list={{ ariaLabel: "Order filter" }} items={orders} />
    </Tabs>
  ),
  vertical: () => (
    <Tabs orientation="vertical" defaultValue="profile" onValueChange={record("vertical")}>
      <Parts list={{ ariaLabel: "Account settings" }} items={account} />
    </Tabs>
  ),
  "vertical-pill": () => (
    <Tabs orientation="vertical" variant="pill" defaultValue="addresses" onValueChange={record("vertical-pill")}>
      <Parts list={{ ariaLabel: "Account settings" }} items={account} />
    </Tabs>
  ),
  "disabled-tab": () => (
    <Tabs defaultValue="details" onValueChange={record("disabled-tab")}>
      <Parts
        list={{ ariaLabel: "Product information" }}
        items={[
          { value: "details", label: "Details", panel: "Organic cotton, relaxed fit." },
          { value: "sizes", label: "Size guide", disabled: true, panel: "Not available for this product." },
          { value: "delivery", label: "Delivery", panel: "Free delivery over £50." },
        ]}
      />
    </Tabs>
  ),
  manual: () => (
    <Tabs activationMode="manual" defaultValue="recent" onValueChange={record("manual")}>
      <Parts
        list={{ ariaLabel: "Order history" }}
        items={[
          { value: "recent", label: "Recent", panel: "Orders from the last 30 days." },
          { value: "older", label: "Older", panel: "Loaded when selected." },
        ]}
      />
    </Tabs>
  ),
  rtl: () => (
    <Tabs dir="rtl" defaultValue="details" onValueChange={record("rtl")}>
      <Parts
        list={{ ariaLabel: "معلومات المنتج" }}
        items={[
          { value: "details", label: "التفاصيل", panel: "قطن عضوي." },
          { value: "reviews", label: "المراجعات", panel: "التقييم 4.6 من 5." },
        ]}
      />
    </Tabs>
  ),
  controlled: () => <Controlled />,
  "long-labels": () => (
    <Tabs defaultValue="care" onValueChange={record("long-labels")}>
      <Parts
        list={{ ariaLabel: "Product information" }}
        items={[
          { value: "details", label: "Details and materials", panel: "Organic cotton, relaxed fit." },
          { value: "care", label: "Washing and care instructions", panel: "Wash at 30 degrees." },
          { value: "returns", label: "Delivery and free returns", panel: "Free returns within 30 days." },
        ]}
      />
    </Tabs>
  ),
  "no-loop": () => (
    <Tabs orientation="vertical" defaultValue="payments" onValueChange={record("no-loop")}>
      <Parts list={{ ariaLabel: "Account settings", loop: false }} items={account} />
    </Tabs>
  ),
  "disabled-ends": () => (
    <Tabs defaultValue="delivery" onValueChange={record("disabled-ends")}>
      <Parts
        list={{ ariaLabel: "Product information" }}
        items={[
          { value: "sizes", label: "Size guide", disabled: true, panel: "Not available for this product." },
          { value: "details", label: "Details", panel: "Organic cotton, relaxed fit." },
          { value: "delivery", label: "Delivery", panel: "Free delivery over £50." },
          { value: "care", label: "Care", disabled: true, panel: "Not available for this product." },
        ]}
      />
    </Tabs>
  ),
  "worst-case-320": () => (
    <Tabs variant="line" size="md" defaultValue="questions" onValueChange={record("worst-case-320")}>
      <Parts
        list={{ ariaLabel: "Product information" }}
        items={[
          { value: "details", label: "Details", panel: "Organic cotton, relaxed fit." },
          { value: "reviews", label: "Reviews (1,284)", panel: "Average rating 4.6 out of 5." },
          { value: "sizes", label: "Size guide", disabled: true, panel: "Not available." },
          { value: "delivery", label: "Delivery", panel: "Free delivery over £50." },
          { value: "returns", label: "Returns", panel: "Free returns within 30 days." },
          { value: "questions", label: "Questions and answers", panel: "12 questions." },
        ]}
      />
    </Tabs>
  ),
};
