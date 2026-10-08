import { expect, test } from "@playwright/test";

test("assistant: a road-safety question is refused with a link to the city's safety page and 112", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Ask" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
  await page.getByLabel("Your question").fill("Is the Lekki-Epe expressway safe to drive at night?");
  await page.getByRole("button", { name: "Ask" }).click();
  const answer = page.getByTestId("assistant-a").last();
  await expect(answer.getByTestId("assistant-safety-link")).toHaveAttribute("href", "/safety/lagos");
  await expect(answer).toContainText("112");
});
