import { expect, test } from "@playwright/test";
import { PRESETS } from "../../src/lib/presets";
import { DEFAULT_PREFERENCES, type WatchDesign } from "../../src/lib/types";

test("new case architectures render distinct catalog parts in normal and luminous views", async ({ page }, info) => {
  const configurations: Partial<WatchDesign>[] = [
    { caseShape: "square", metal: "bronze", texture: "malachite", hands: "cathedral", markers: "california", strap: "nato", bezel: "coined", caseFinish: "hammered" },
    { caseShape: "rectangle", metal: "platinum", texture: "motherofpearl", hands: "leaf", markers: "breguet", strap: "alligator", bezel: "scalloped", crystalStyle: "domed" },
    { caseShape: "hexagonal", metal: "carbon", texture: "honeycomb", hands: "snowflake", markers: "triangles", strap: "sailcloth", bezel: "screws", chapterRing: "railroad" },
    { caseShape: "oval", metal: "whitegold", texture: "lapis", hands: "breguet", markers: "diamonds", strap: "mesh", crystalStyle: "faceted" },
    { caseShape: "shield", metal: "sapphire", texture: "marble", hands: "syringe", markers: "dots", strap: "rally", caseFinish: "blasted" },
    { caseShape: "round", metal: "silver", texture: "linen", hands: "mercedes", markers: "explorer", strap: "braided", strapColor: "#7b243b", lumeStyle: "full-dial" },
    { caseShape: "octagonal", texture: "wave", hands: "arrow", strap: "bracelet", braceletStyle: "engineer", caseFinish: "damascus", chapterRing: "tachymeter" },
    { caseShape: "cushion", texture: "fume", hands: "lollipop", strap: "bracelet", braceletStyle: "beads-of-rice", crystalStyle: "smoked", lumeStyle: "hands-only" },
    { caseShape: "tonneau", texture: "enamel", strap: "bracelet", braceletStyle: "five-link", caseFinish: "polished", complication: "daydate", additionalComplications: ["calendar", "gmt"] },
  ];
  const watches = configurations.map((patch, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, name: `Catalog design ${index + 1}`, design: { ...PRESETS[0].design, ...patch }, favorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  await page.addInitScript(data => localStorage.setItem("watchme.fixture.studio.v1", JSON.stringify(data)), { watches, preferences: { ...DEFAULT_PREFERENCES, activeWatchId: watches[0].id } });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  for (let index = 0; index < watches.length; index++) {
    const watch = watches[index];
    await page.getByRole("button", { name: `Select ${watch.name}`, exact: true }).click();
    await expect(page.locator(".watch-stage svg")).toHaveAttribute("data-case-shape", watch.design.caseShape);
    await expect(page.locator(`.watch-stage [data-part-texture="${watch.design.texture}"]`)).toBeVisible();
    await page.locator(".watch-stage").screenshot({ path: info.outputPath(`catalog-${index + 1}-${watch.design.caseShape}.png`) });
    if (index === 5) {
      await page.getByRole("button", { name: "Enable lume", exact: true }).click();
      await page.locator(".watch-stage").screenshot({ path: info.outputPath("catalog-full-dial-lume.png") });
      await page.getByRole("button", { name: "Disable lume", exact: true }).click();
    }
  }
  expect(errors).toEqual([]);
});
