import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/auth/safe-next";
import { passwordSchema, profileSchema, signUpSchema } from "@/lib/validation/auth";

describe("safeNext (open-redirect protection)", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/me/settings")).toBe("/me/settings");
    expect(safeNext("/admin?x=1")).toBe("/admin?x=1");
  });
  it("rejects external, protocol-relative and scheme targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/javascript:x", ""]) {
      expect(safeNext(bad), bad).toBe("/me");
    }
    expect(safeNext(null, "/")).toBe("/");
  });
});

describe("auth validation", () => {
  it("enforces the password policy", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHere").success).toBe(false);
    expect(passwordSchema.safeParse("Good-Passw0rd").success).toBe(true);
  });

  it("requires accepting the terms and normalises email", () => {
    const ok = signUpSchema.safeParse({ email: " Ada@Example.COM ", password: "Good-Passw0rd", terms: "on" });
    expect(ok.success && ok.data.email).toBe("ada@example.com");
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "Good-Passw0rd" }).success).toBe(false);
  });

  it("validates profile settings", () => {
    const ok = profileSchema.safeParse({
      username: "ada_lagos",
      display_name: "",
      bio: "",
      home_city_id: "",
      is_diaspora: "yes",
      location_consent: "on",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.display_name).toBeNull();
      expect(ok.data.is_diaspora).toBe(true);
      expect(ok.data.location_consent).toBe(true);
    }
    expect(profileSchema.safeParse({ username: "a b", display_name: "", bio: "", home_city_id: "", is_diaspora: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ username: "deleted_abc", display_name: "", bio: "", home_city_id: "", is_diaspora: "" }).success).toBe(false);
  });
});
