// The component gallery. Bundled by v2/tools/build-gallery.mjs into ds-components/gallery/dist/.
//
// URL parameters:
//   component=<slug>&example=<id>  only that example, inside <main data-gallery><section data-example data-component>
//   component=<slug>               every example of the component, each with a visible title
//   (neither)                      an index of every component and every example, grouped under headings
//   page=tokens                    the token page, read from ds-tokens/dist/tokens.json
//   theme=light|dark  density=standard|compact  dir=ltr|rtl
//
// The page sets data-gallery-ready="true" on <html> once it has rendered, so a test can wait for it,
// and exposes window.__souvenirGallery with the example ids of every component (spec and file).
import { Component, StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { registry, type RegistryEntry } from "@gallery/registry";
import tokens from "../../../ds-tokens/dist/tokens.json";

type Token = { name: string; collection: string; type: string; cssVar: string; values: Record<string, string | number> };
const TOKENS = tokens as unknown as Token[];

const THEMES = ["light", "dark"] as const;
const DENSITIES = ["standard", "compact"] as const;
const params = new URLSearchParams(location.search);
const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;

const initial = {
  component: params.get("component"),
  example: params.get("example"),
  page: params.get("page"),
  theme: pick(params.get("theme"), THEMES, "light"),
  density: pick(params.get("density"), DENSITIES, "standard"),
  dir: pick(params.get("dir"), ["ltr", "rtl"] as const, "ltr"),
};

function applyRootAttributes(theme: string, density: string, dir: string) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  html.setAttribute("data-density", density);
  html.setAttribute("dir", dir);
}
applyRootAttributes(initial.theme, initial.density, initial.dir);

(window as unknown as { __souvenirGallery: unknown }).__souvenirGallery = {
  components: registry.map((r) => ({
    slug: r.meta.slug,
    name: r.meta.name,
    fixture: r.meta.fixture,
    specProblem: r.meta.specProblem,
    specExamples: r.meta.examples.map((e) => e.id),
    fileExamples: r.module.examples && typeof r.module.examples === "object" ? Object.keys(r.module.examples) : null,
  })),
};

const findComponent = (slug: string | null) => registry.find((r) => r.meta.slug === slug) ?? null;

// The ids to show for a component: spec order first, then any the examples file adds.
function exampleIds(entry: RegistryEntry): string[] {
  const ids = entry.meta.examples.map((e) => e.id);
  for (const id of Object.keys(entry.module.examples ?? {})) if (!ids.includes(id)) ids.push(id);
  return ids;
}
const titleOf = (entry: RegistryEntry, id: string) => entry.meta.examples.find((e) => e.id === id)?.title ?? id;

// ------------------------------------------------------------------ example rendering

class ExampleBoundary extends Component<{ label: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <p className="g-problem" role="alert">{this.props.label} could not render: {this.state.error.message}</p>;
    return this.props.children;
  }
}

function ExampleBody({ entry, id }: { entry: RegistryEntry; id: string }) {
  const fn = entry.module.examples?.[id];
  if (!entry.module.examples) return <p className="g-problem" role="alert">The examples file for {entry.meta.slug} has no "examples" export.</p>;
  if (typeof fn !== "function") return <p className="g-problem" role="alert" data-gallery-missing="">The examples file for {entry.meta.slug} has no example "{id}".</p>;
  return <ExampleBoundary label={`${entry.meta.slug}/${id}`}>{fn() as ReactNode}</ExampleBoundary>;
}

function ExampleSection({ entry, id, titled, level = 2 }: { entry: RegistryEntry; id: string; titled: boolean; level?: 2 | 3 }) {
  const known = entry.meta.examples.some((e) => e.id === id);
  const fileHas = typeof entry.module.examples?.[id] === "function";
  const Heading = level === 2 ? "h2" : "h3";
  const headingId = `ex-${entry.meta.slug}-${id}`;
  if (!titled) {
    // The single-example page: <main data-gallery><section data-example data-component>, nothing else.
    if (!fileHas) return <ExampleBody entry={entry} id={id} />;
    return (
      <section data-example={id} data-component={entry.meta.slug} aria-label={`${entry.meta.name}: ${titleOf(entry, id)}`}>
        <ExampleBody entry={entry} id={id} />
      </section>
    );
  }
  if (!fileHas) {
    return (
      <div className="g-cell">
        <Heading className="g-cell-title">{titleOf(entry, id)}</Heading>
        <ExampleBody entry={entry} id={id} />
      </div>
    );
  }
  return (
    <div className="g-cell">
      <Heading className="g-cell-title" id={headingId}>
        {titleOf(entry, id)} <code className="g-code">{id}</code>
        {!known && <span className="g-flag"> not in the spec</span>}
      </Heading>
      <section data-example={id} data-component={entry.meta.slug} aria-labelledby={headingId}>
        <ExampleBody entry={entry} id={id} />
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ chrome

function Controls({ theme, density, setTheme, setDensity }: { theme: string; density: string; setTheme: (t: string) => void; setDensity: (d: string) => void }) {
  const current = new URLSearchParams(location.search);
  const link = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    p.set("theme", theme);
    p.set("density", density);
    if (current.get("dir")) p.set("dir", current.get("dir")!);
    return `?${p.toString()}`;
  };
  return (
    <header className="g-header">
      <p className="g-brand"><a href={link({})}>Souvenir gallery</a></p>
      <nav aria-label="Gallery" className="g-nav">
        <a href={link({})}>All components</a>
        <a href={link({ page: "tokens" })}>Tokens</a>
        {registry.map((r) => <a key={r.meta.slug} href={link({ component: r.meta.slug })}>{r.meta.name}{r.meta.fixture ? " (fixture)" : ""}</a>)}
      </nav>
      <div className="g-controls">
        <label className="g-control">
          <span>Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="g-control">
          <span>Density</span>
          <select value={density} onChange={(e) => setDensity(e.target.value)}>
            <option value="standard">Standard</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </header>
  );
}

function ComponentHeader({ entry, level }: { entry: RegistryEntry; level: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <>
      <H className={level === 1 ? "g-title" : "g-group-title"}>
        {entry.meta.name}
        {entry.meta.fixture && <span className="g-flag"> test fixture, not shipped</span>}
      </H>
      {entry.meta.specProblem && <p className="g-problem">Spec problem: {entry.meta.specProblem}</p>}
    </>
  );
}

function ComponentPage({ entry }: { entry: RegistryEntry }) {
  return (
    <>
      <ComponentHeader entry={entry} level={1} />
      <div className="g-grid">{exampleIds(entry).map((id) => <ExampleSection key={id} entry={entry} id={id} titled level={2} />)}</div>
    </>
  );
}

function IndexPage() {
  return (
    <>
      <h1 className="g-title">Components</h1>
      {registry.length === 0 && <p>No component has an examples file yet.</p>}
      {registry.map((entry) => (
        <div key={entry.meta.slug} className="g-group">
          <ComponentHeader entry={entry} level={2} />
          <div className="g-grid">{exampleIds(entry).map((id) => <ExampleSection key={id} entry={entry} id={id} titled level={3} />)}</div>
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ token page

const groupBy = <T,>(items: T[], key: (t: T) => string) => {
  const out = new Map<string, T[]>();
  for (const it of items) { const k = key(it); if (!out.has(k)) out.set(k, []); out.get(k)!.push(it); }
  return out;
};

function Swatch({ token, mode }: { token: Token; mode: string }) {
  const value = String(token.values[mode] ?? "");
  const themed = mode === "light" || mode === "dark";
  return (
    <div className="g-swatch-cell" data-theme={themed ? mode : undefined}>
      <span className="g-swatch" style={{ background: `var(${token.cssVar})` }} aria-hidden="true" />
      <span className="g-swatch-value"><span className="g-mode">{mode}</span> <code className="g-code">{value}</code></span>
    </div>
  );
}

function TokenPage() {
  const colours = TOKENS.filter((t) => t.type === "color");
  const groups = groupBy(colours, (t) => `${t.collection === "Themes" ? "" : `${t.collection}: `}${t.name.split("/")[0]}`);
  const sizes = TOKENS.filter((t) => t.collection === "Typography" && t.name.startsWith("font-size/"));
  const radius = TOKENS.filter((t) => t.collection === "Radius");
  const spacing = TOKENS.filter((t) => t.collection === "Density");
  const weightOf = (role: string) => (role.startsWith("heading-") ? "heading" : role.startsWith("label-") ? "label" : role.startsWith("body-") ? "body" : role);
  return (
    <>
      <h1 className="g-title">Tokens</h1>
      <p className="g-lede">Every colour token in light and dark, then the type, radius and spacing scales. Read from ds-tokens/dist/tokens.json; each swatch is painted by its CSS variable.</p>
      <h2 className="g-group-title">Colour</h2>
      {[...groups.entries()].map(([group, list]) => (
        <section key={group} className="g-group" aria-labelledby={`tok-${group}`}>
          <h3 className="g-cell-title" id={`tok-${group}`}>{group}</h3>
          <ul className="g-token-list">
            {list.map((t) => (
              <li key={t.name} className="g-token">
                <div className="g-token-names">
                  <span className="g-token-name">{t.name}</span>
                  <code className="g-code">{t.cssVar}</code>
                </div>
                <div className="g-swatches">{Object.keys(t.values).map((mode) => <Swatch key={mode} token={t} mode={mode} />)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <h2 className="g-group-title">Type</h2>
      <ul className="g-token-list">
        {sizes.map((t) => {
          const role = t.name.slice("font-size/".length);
          return (
            <li key={t.name} className="g-token">
              <div className="g-token-names">
                <span className="g-token-name">{role}</span>
                <code className="g-code">{t.cssVar} {String(t.values.default ?? "")}</code>
              </div>
              <p className="g-type-sample" style={{ fontSize: `var(--font-size-${role})`, lineHeight: `var(--line-height-${role})`, fontWeight: `var(--font-weight-${weightOf(role)})` }}>Save changes to the order</p>
            </li>
          );
        })}
      </ul>
      <h2 className="g-group-title">Radius</h2>
      <ul className="g-token-list g-token-list-wrap">
        {radius.map((t) => (
          <li key={t.name} className="g-token g-token-small">
            <span className="g-radius-box" style={{ borderRadius: `var(${t.cssVar})` }} aria-hidden="true" />
            <span className="g-token-name">{t.name}</span>
            <code className="g-code">{t.cssVar} {String(t.values.default ?? "")}</code>
          </li>
        ))}
      </ul>
      <h2 className="g-group-title">Spacing</h2>
      <ul className="g-token-list">
        {spacing.map((t) => (
          <li key={t.name} className="g-token">
            <div className="g-token-names">
              <span className="g-token-name">{t.name}</span>
              <code className="g-code">{t.cssVar}</code>
              <span className="g-mode">{Object.entries(t.values).map(([m, v]) => `${m} ${v}`).join(", ")}</span>
            </div>
            <span className="g-space-track" aria-hidden="true"><span className="g-space-bar" style={{ inlineSize: `var(${t.cssVar})` }} /></span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ app

function Ready() {
  useEffect(() => {
    document.documentElement.setAttribute("data-gallery-ready", "true");
  }, []);
  return null;
}

function App() {
  const [theme, setThemeState] = useState<string>(initial.theme);
  const [density, setDensityState] = useState<string>(initial.density);
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(location.search);
    p.set(key, value);
    history.replaceState(null, "", `?${p.toString()}`);
  };
  const setTheme = (t: string) => { setThemeState(t); update("theme", t); applyRootAttributes(t, density, initial.dir); };
  const setDensity = (d: string) => { setDensityState(d); update("density", d); applyRootAttributes(theme, d, initial.dir); };

  const entry = findComponent(initial.component);

  // One example, nothing else on the page: what the test runner loads.
  if (initial.component && initial.example) {
    document.title = `${initial.component} / ${initial.example} - Souvenir gallery`;
    return (
      <main data-gallery="">
        {entry
          ? <ExampleSection entry={entry} id={initial.example} titled={false} />
          : <p className="g-problem" role="alert" data-gallery-missing="">No component "{initial.component}" in the gallery.</p>}
        <Ready />
      </main>
    );
  }

  let body: ReactNode;
  if (initial.page === "tokens") { document.title = "Tokens - Souvenir gallery"; body = <TokenPage />; }
  else if (initial.component) {
    document.title = `${entry?.meta.name ?? initial.component} - Souvenir gallery`;
    body = entry ? <ComponentPage entry={entry} /> : <p className="g-problem" role="alert" data-gallery-missing="">No component "{initial.component}" in the gallery.</p>;
  } else { document.title = "Souvenir gallery"; body = <IndexPage />; }

  return (
    <>
      <Controls theme={theme} density={density} setTheme={setTheme} setDensity={setDensity} />
      <main data-gallery="" className="g-main">{body}<Ready /></main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
