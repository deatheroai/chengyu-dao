import { describe, it, expect } from "vitest";
import {
  isValidCloudSaveCode,
  generateCloudSaveCode,
  isValidCloudSavePayload,
  CLOUD_SAVE_CODE_ALPHABET,
  CLOUD_SAVE_CODE_LENGTH,
  MAX_CLOUD_SAVE_PAYLOAD_BYTES,
} from "./cloudSaveValidation";

describe("generateCloudSaveCode", () => {
  it("produces a code of the expected length, entirely from the allowed alphabet", () => {
    const code = generateCloudSaveCode(() => 0.5);
    expect(code).toHaveLength(CLOUD_SAVE_CODE_LENGTH);
    for (const char of code) expect(CLOUD_SAVE_CODE_ALPHABET).toContain(char);
  });

  it("is deterministic for a fixed rng (0 and just-under-1 both land in range)", () => {
    expect(generateCloudSaveCode(() => 0)).toBe(CLOUD_SAVE_CODE_ALPHABET[0].repeat(CLOUD_SAVE_CODE_LENGTH));
    const lastChar = CLOUD_SAVE_CODE_ALPHABET[CLOUD_SAVE_CODE_ALPHABET.length - 1];
    expect(generateCloudSaveCode(() => 0.999999)).toBe(lastChar.repeat(CLOUD_SAVE_CODE_LENGTH));
  });

  it("excludes visually-ambiguous characters (0/O, 1/I/L)", () => {
    for (const char of "01IOL") {
      expect(CLOUD_SAVE_CODE_ALPHABET).not.toContain(char);
    }
  });

  it("a freshly generated code always validates", () => {
    for (let i = 0; i < 20; i++) {
      expect(isValidCloudSaveCode(generateCloudSaveCode())).toBe(true);
    }
  });
});

describe("isValidCloudSaveCode", () => {
  it("accepts a well-formed code", () => {
    expect(isValidCloudSaveCode("23456789")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidCloudSaveCode("2345678")).toBe(false);
    expect(isValidCloudSaveCode("234567890")).toBe(false);
  });

  it("rejects lowercase and excluded characters", () => {
    expect(isValidCloudSaveCode("2345678A".toLowerCase())).toBe(false);
    expect(isValidCloudSaveCode("0123456O")).toBe(false);
  });

  it("rejects non-string input without throwing", () => {
    expect(isValidCloudSaveCode(undefined)).toBe(false);
    expect(isValidCloudSaveCode(null)).toBe(false);
    expect(isValidCloudSaveCode(42)).toBe(false);
    expect(isValidCloudSaveCode({ code: "23456789" })).toBe(false);
  });
});

describe("isValidCloudSavePayload", () => {
  it("accepts a plain object well under the size cap", () => {
    expect(isValidCloudSavePayload({ completedSessions: [{ idiomIds: ["a"], completedAt: 1 }] })).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidCloudSavePayload("a string")).toBe(false);
    expect(isValidCloudSavePayload(42)).toBe(false);
    expect(isValidCloudSavePayload(null)).toBe(false);
    expect(isValidCloudSavePayload(undefined)).toBe(false);
  });

  it("rejects a payload over the size cap", () => {
    const huge = { blob: "x".repeat(MAX_CLOUD_SAVE_PAYLOAD_BYTES) };
    expect(isValidCloudSavePayload(huge)).toBe(false);
  });

  it("accepts a payload right at the size cap boundary", () => {
    // Account for the two-character JSON wrapper `{}` plus the key/quote
    // overhead so the *serialized* length lands exactly at the cap.
    const overhead = JSON.stringify({ blob: "" }).length;
    const blob = "x".repeat(MAX_CLOUD_SAVE_PAYLOAD_BYTES - overhead);
    expect(JSON.stringify({ blob }).length).toBe(MAX_CLOUD_SAVE_PAYLOAD_BYTES);
    expect(isValidCloudSavePayload({ blob })).toBe(true);
  });
});
