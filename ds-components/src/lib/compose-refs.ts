// Shared by the components that hold their own ref to an element and also forward the caller's ref (DialogContent,
// DialogBody; TabsList may adopt it). Hand-written, not a component: it has no spec and sets no data-slot.
//
// React 19 lets a callback ref return a cleanup function. React then calls that cleanup on detach instead of calling
// the ref with null. A component that calls the caller's ref by hand must keep that contract, or the caller's cleanup
// never runs (an observer leaks) and the caller's ref is called with null it was told it would not get.
//
// attachRefs(node, ...refs) sets every ref to node and returns one cleanup for the caller to return from its own
// callback ref. On detach the cleanup runs each ref's own cleanup when that ref returned one, and otherwise calls the
// callback ref with null or sets the object ref's current to null, as React would. Always returning a cleanup means
// React never calls the composing callback with null, so the component resets its own state inside the cleanup.
import type * as React from "react";

type AnyRef<T> = React.Ref<T> | undefined;

function assign<T>(ref: AnyRef<T>, value: T | null): (() => void) | void {
  if (typeof ref === "function") return ref(value) as (() => void) | void;
  if (ref) (ref as React.RefObject<T | null>).current = value;
}

export function attachRefs<T>(node: T, ...refs: AnyRef<T>[]): () => void {
  const cleanups = refs.map((ref) => assign(ref, node));
  return () => {
    refs.forEach((ref, i) => {
      const cleanup = cleanups[i];
      if (typeof cleanup === "function") cleanup();
      else assign(ref, null);
    });
  };
}
