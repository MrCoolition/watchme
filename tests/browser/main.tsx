// This entry is served only by vite.browser.config.ts. Next.js never routes to it.
import { createRoot } from "react-dom/client";
import { WatchStudio } from "../../src/components/watch-studio";
import "../../src/app/globals.css";
import { readFixture } from "./actions";

const data = readFixture();
createRoot(document.getElementById("root")!).render(<WatchStudio key={data.account.id} initialData={data}/>);
