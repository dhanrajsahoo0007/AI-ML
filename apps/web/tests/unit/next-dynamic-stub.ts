import { lazy, type ComponentType } from "react";

// `next/dynamic` outside a Next.js build renders nothing on the server, so components behind it (the diagram
// renderers, Tabs, the teaching widgets) would vanish from unit-test HTML. In tests it is React.lazy instead;
// render with tests/unit/render-html.ts, which waits for lazy components the way Next's server render does.
// Like next/dynamic, the loader may resolve to the component or to a module whose default export is one.
type Loaded<P> = ComponentType<P> | { default: ComponentType<P> };

export default function dynamic<P extends object>(loader: () => Promise<Loaded<P>>): ComponentType<P> {
  return lazy(async () => {
    const mod = await loader();
    return { default: "default" in mod ? mod.default : mod };
  });
}
