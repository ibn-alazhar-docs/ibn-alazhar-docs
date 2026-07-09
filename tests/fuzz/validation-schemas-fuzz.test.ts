import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
} from "@/shared/validators/auth";
import {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
} from "@/shared/validators/folder";
import { createTagSchema, updateTagSchema, mergeTagsSchema } from "@/shared/validators/tag";
import { documentUpdateSchema } from "@/shared/validators/document";
import {
  singleExportSchema,
  batchExportSchema,
  folderExportSchema,
  tagExportSchema,
} from "@/core/services/export/validators";

const EMPTY = undefined;
const NULL_BODY = null;
const EMPTY_OBJ = {} as Record<string, unknown>;
const ARRAY_BODY: unknown[] = ["a", "b", "c"];
const STRING_BODY = "just a string";
const NUMBER_BODY = 42;
const BOOL_BODY = true;

const SQL_INJECTIONS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "' UNION SELECT * FROM users--",
  "1; SELECT * FROM admins",
  "' OR 1=1--",
];

const XSS_PAYLOADS = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "javascript:alert(1)",
  '"onmouseover="alert(1)',
  "{{constructor.constructor('alert(1)')()}}",
];

const SPECIAL_STRINGS = [
  "\x00nullbyte",
  "test\nnewline",
  "test\rcarriage",
  "test\ttab",
  "\u200Bzero-width-space",
  "\u200Czero-width-non-joiner",
  "\u200Dzero-width-joiner",
  "\u202ERTL-override",
  "\uFEFFBOM",
  "👨‍👩‍👧‍👦emoji-family",
  "🏴󐁧󐁢󐁳󐁣󐁴󐁿emoji-flag",
  "../../etc/passwd",
  "..\\..\\Windows\\System32",
  "__proto__",
  "constructor",
  "prototype",
];

const VERY_LONG_STRINGS = ["A".repeat(10_001), "A".repeat(100_000), "ABC123!@#".repeat(2_000)];

const INVALID_EMAILS = [
  "",
  "not-an-email",
  "@no-local",
  "no-domain@",
  "spaces in@email.com",
  "test\x00@test.com",
  "test\n@test.com",
  "<script>@test.com",
  ...SQL_INJECTIONS,
  ...XSS_PAYLOADS,
];

const INVALID_PASSWORDS = [
  "",
  "short",
  "nocaps123",
  "NOLOWER123",
  "NoNumber",
  "\x00null-byte",
  ...SPECIAL_STRINGS.map((s) => `Ab1${s}`),
  ...VERY_LONG_STRINGS.map((s) => `Ab1${s}`.slice(0, 129)),
];

const INVALID_HEX_COLORS = [
  "",
  "not-hex",
  "#FFF",
  "#GGGGGG",
  "#12345",
  "#1234567",
  "123456",
  "#fffffz",
  ...SQL_INJECTIONS,
  ...XSS_PAYLOADS,
];

type SchemaTest = {
  schema: z.ZodTypeAny;
  name: string;
  inputs: unknown[];
};

const schemas: SchemaTest[] = [
  {
    schema: registerSchema,
    name: "registerSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { email: "", password: "", confirmPassword: "", name: "" },
      { email: "test@test.com", password: "Valid1", confirmPassword: "Valid1", name: "" },
      { email: "test@test.com", password: "weak", confirmPassword: "weak", name: "Test" },
      ...INVALID_EMAILS.map((e) => ({
        email: e,
        password: "TestPass123",
        confirmPassword: "TestPass123",
        name: "Test",
      })),
      ...INVALID_PASSWORDS.map((p) => ({
        email: "test@test.com",
        password: p,
        confirmPassword: p,
        name: "Test",
      })),
      {
        email: "test@test.com",
        password: "TestPass123",
        confirmPassword: "Mismatch1",
        name: "Test",
      },
      {
        email: "test@test.com",
        password: "TestPass123",
        confirmPassword: "TestPass123",
        name: VERY_LONG_STRINGS[0],
      },
      {
        email: "test@test.com",
        password: "TestPass123",
        confirmPassword: "TestPass123",
        name: "",
        __proto__: { admin: true },
      },
      {
        email: "test@test.com",
        password: "TestPass123",
        confirmPassword: "TestPass123",
        name: "Test",
        extra: "field",
      },
    ],
  },
  {
    schema: forgotPasswordSchema,
    name: "forgotPasswordSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { email: "" },
      { notEmail: "test@test.com" },
      ...INVALID_EMAILS.map((e) => ({ email: e })),
    ],
  },
  {
    schema: resetPasswordSchema,
    name: "resetPasswordSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      {
        email: "test@test.com",
        token: "",
        password: "TestPass123",
        confirmPassword: "TestPass123",
      },
      { email: "test@test.com", token: "tok", password: "weak", confirmPassword: "weak" },
      {
        email: "test@test.com",
        token: "tok",
        password: "TestPass123",
        confirmPassword: "Mismatch1",
      },
      ...INVALID_EMAILS.map((e) => ({
        email: e,
        token: "tok",
        password: "TestPass123",
        confirmPassword: "TestPass123",
      })),
      ...INVALID_PASSWORDS.slice(0, 15).map((p) => ({
        email: "test@test.com",
        token: "tok",
        password: p,
        confirmPassword: p,
      })),
    ],
  },
  {
    schema: profileUpdateSchema,
    name: "profileUpdateSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { name: "" },
      { name: null },
      { name: "A".repeat(101) },
      { notName: "Test" },
      ...SQL_INJECTIONS.map((s) => ({ name: s })),
      ...XSS_PAYLOADS.map((s) => ({ name: s })),
      ...SPECIAL_STRINGS.map((s) => ({ name: s })),
      { name: "Test", __proto__: { admin: true } },
    ],
  },
  {
    schema: createFolderSchema,
    name: "createFolderSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { name: "" },
      { name: null },
      { name: "A".repeat(101) },
      { name: "test", color: "bad-color" },
      { name: "test", color: "#FFF" },
      { name: "test", color: null },
      ...SQL_INJECTIONS.map((s) => ({ name: s })),
      ...XSS_PAYLOADS.map((s) => ({ name: s })),
      ...SPECIAL_STRINGS.map((s) => ({ name: s })),
      { name: "test", icon: "A".repeat(51) },
    ],
  },
  {
    schema: renameFolderSchema,
    name: "renameFolderSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { name: "" },
      { name: null },
      { name: "A".repeat(101) },
      ...SQL_INJECTIONS.map((s) => ({ name: s })),
      ...XSS_PAYLOADS.map((s) => ({ name: s })),
      ...SPECIAL_STRINGS.map((s) => ({ name: s })),
    ],
  },
  {
    schema: moveFolderSchema,
    name: "moveFolderSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { parentId: "valid" },
      { parentId: null },
      { parentId: "" },
    ],
  },
  {
    schema: createTagSchema,
    name: "createTagSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { name: "" },
      { name: null },
      { name: "A".repeat(51) },
      { name: "test", color: "bad" },
      { name: "test", color: "#FFF" },
      ...SQL_INJECTIONS.map((s) => ({ name: s })),
      ...XSS_PAYLOADS.map((s) => ({ name: s })),
      ...SPECIAL_STRINGS.map((s) => ({ name: s })),
    ],
  },
  {
    schema: updateTagSchema,
    name: "updateTagSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { name: "" },
      { name: null },
      { name: "A".repeat(51) },
      { color: "bad" },
      { color: "#FFF" },
      ...SQL_INJECTIONS.map((s) => ({ name: s })),
      ...XSS_PAYLOADS.map((s) => ({ name: s })),
      ...SPECIAL_STRINGS.map((s) => ({ name: s })),
      ...INVALID_HEX_COLORS.map((c) => ({ color: c })),
    ],
  },
  {
    schema: mergeTagsSchema,
    name: "mergeTagsSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { sourceTagId: "", targetTagId: "" },
      { sourceTagId: "a", targetTagId: "" },
      { sourceTagId: "", targetTagId: "b" },
      { sourceTagId: null, targetTagId: "b" },
      { sourceTagId: "a", targetTagId: null },
      ...SQL_INJECTIONS.map((s) => ({ sourceTagId: s, targetTagId: "b" })),
      ...XSS_PAYLOADS.map((s) => ({ sourceTagId: s, targetTagId: "b" })),
      ...SPECIAL_STRINGS.map((s) => ({ sourceTagId: s, targetTagId: "b" })),
    ],
  },
  {
    schema: documentUpdateSchema,
    name: "documentUpdateSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { title: "" },
      { title: "A".repeat(201) },
      { description: "A".repeat(501) },
      ...SQL_INJECTIONS.map((s) => ({ title: s })),
      ...XSS_PAYLOADS.map((s) => ({ title: s })),
      ...SPECIAL_STRINGS.map((s) => ({ title: s })),
      { title: "test", __proto__: { hacked: true } },
      { title: "test", extra: "field" },
    ],
  },
  {
    schema: batchExportSchema,
    name: "batchExportSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { documentIds: [], format: "md", profile: "plain" },
      { documentIds: [""], format: "md", profile: "plain" },
      {
        documentIds: Array.from({ length: 51 }, (_, i) => `doc-${i}`),
        format: "md",
        profile: "plain",
      },
      { documentIds: ["doc1"], format: "INVALID", profile: "plain" },
      { documentIds: ["doc1"], format: "md", profile: "INVALID" },
    ],
  },
  {
    schema: folderExportSchema,
    name: "folderExportSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { folderId: "", format: "md", profile: "plain" },
      { folderId: "folder1", format: "INVALID", profile: "plain" },
      { folderId: "folder1", format: "md", profile: "INVALID" },
      { folderId: "folder1", format: "md", profile: "plain", recursive: "not-boolean" },
    ],
  },
  {
    schema: tagExportSchema,
    name: "tagExportSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { tagId: "", format: "md", profile: "plain" },
      { tagId: "tag1", format: "INVALID", profile: "plain" },
      { tagId: "tag1", format: "md", profile: "INVALID" },
    ],
  },
  {
    schema: singleExportSchema,
    name: "singleExportSchema",
    inputs: [
      EMPTY,
      NULL_BODY,
      EMPTY_OBJ,
      ARRAY_BODY,
      STRING_BODY,
      NUMBER_BODY,
      BOOL_BODY,
      { documentId: "", format: "md", profile: "plain" },
      { documentId: "doc1", format: "INVALID", profile: "plain" },
      { documentId: "doc1", format: "md", profile: "INVALID" },
    ],
  },
];

describe("Fuzz: Validation Schemas (Zod safeParse)", () => {
  schemas.forEach(({ schema, name, inputs }) => {
    describe(name, () => {
      inputs.forEach((input, idx) => {
        const label =
          input === undefined
            ? "undefined"
            : input === null
              ? "null"
              : Array.isArray(input)
                ? `array[${input.length}]`
                : typeof input === "string"
                  ? `string: "${input.slice(0, 30)}"`
                  : typeof input === "number"
                    ? `number: ${input}`
                    : typeof input === "boolean"
                      ? `boolean: ${input}`
                      : `input #${idx}`;

        it(`rejects ${label} without throwing`, () => {
          const result = schema.safeParse(input);
          expect(result).toHaveProperty("success");
          if (result.success === false) {
            expect(result.error).toBeDefined();
          }
        });
      });
    });
  });
});
