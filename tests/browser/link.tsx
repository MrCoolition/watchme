import type { ComponentProps } from "react";

// Next's router runtime is not present in Vite. Preserve ordinary anchor semantics in the UI fixture.
export default function FixtureLink(props: ComponentProps<"a">) { return <a {...props}/>; }
