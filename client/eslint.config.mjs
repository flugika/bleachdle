// npx eslint . --fix

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 🎯 Custom rule overrides — กรอง noise ออก เหลือแต่ error ที่กระทบจริง
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // ═══════════════════════════════════════════════
      // ปิด — ไม่กระทบ runtime, เป็นแค่ style/pattern preference
      // ═══════════════════════════════════════════════

      // rule ใหม่จาก React 19 เข้มงวดเกินไปกับ pattern มาตรฐาน (sync mount, derived-state reset)
      "react-hooks/set-state-in-effect": "off",

      // React Compiler เตือนว่า "memoization ที่มีอยู่รักษาไว้ไม่ได้" — ไม่ใช่บั๊ก
      // แค่ compiler ปฏิเสธ optimize ให้ ผลลัพธ์ยังถูกต้อง แค่ไม่ได้ memo เพิ่ม
      "react-hooks/preserve-manual-memoization": "off",

      // คอมเมนต์ไทยในวงเล็บ JSX ผิดที่ — เป็นแค่ syntax cosmetic ไม่กระทบ output
      "react/jsx-no-comment-textnodes": "off",

      // เครื่องหมาย ' " ที่ไม่ escape ใน JSX text — browser render ถูกต้องอยู่แล้ว
      "react/no-unescaped-entities": "off",

      // ═══════════════════════════════════════════════
      // ลดเป็น warning — ควรแก้ทีหลัง แต่ไม่บล็อก build
      // ═══════════════════════════════════════════════

      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",

      // ═══════════════════════════════════════════════
      // คงเป็น error — เป็นบั๊กจริงที่กระทบ runtime ห้ามปิด/ลด
      // ═══════════════════════════════════════════════

      "react-hooks/rules-of-hooks": "error",   // hook order พัง = state เพี้ยน/crash
      "react-hooks/purity": "error",           // Date.now()/Math.random() ตอน render = ผลไม่ deterministic, hydration mismatch
    },
  },
]);

export default eslintConfig;