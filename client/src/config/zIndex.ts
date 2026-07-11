// src/shared/config/zIndex.ts
//
// 🎯 SINGLE SOURCE OF TRUTH สำหรับ z-index ทั้งแอป
// ห้าม hardcode z-10/z-20/z-30/z-50 ในไฟล์ component อื่นอีก — ให้ import จากที่นี่เสมอ
// ช่องว่างระหว่างแต่ละระดับเว้นห่างมากพอ (ขั้นละ 10-100+) เผื่ออนาคตต้องแทรกชั้นใหม่
// โดยไม่ต้องไปไล่แก้เลขทุกไฟล์ที่เคยตั้งไว้
//
// ลำดับต้องอ่านจากบนลงล่าง: ยิ่งอยู่ล่าง (เลขเยอะ) ยิ่งอยู่ "หน้า" กว่าเสมอ
export const Z = {
    // พื้นหลัง/ลวดลายตกแต่ง (scanlines, wallpaper, ambient glow) — ไม่ควรมี interactive element ใดๆ
    background: 0,

    // เนื้อหาหลักของหน้า (main content)
    content: 10,

    // แถบนำทาง / ปุ่มลอย (GlobalGameNav ฯลฯ) ต้องอยู่เหนือเนื้อหา แต่ไม่ต้องเหนือ overlay ชั่วคราว
    nav: 20,

    // Footer — เป็นส่วนหนึ่งของ static layout เหมือน nav ไม่ใช่ overlay จึงอยู่ระดับใกล้กัน
    footer: 20,

    // คัสเตอร์เอฟเฟกต์ตามเมาส์ (BleachReiatsuCursor) ต้องเหนือทุกอย่างที่เป็น static layout
    cursor: 40,

    // Dropdown / combobox / popover ที่ลอยชั่วคราวเหนือเนื้อหา (search bar suggestions ฯลฯ)
    // ตั้งไว้สูงมากตั้งแต่แรกเพราะ "ต้องชนะทุกอย่างที่เป็น static layout" เสมอ ไม่ว่าจะมี
    // layer ใหม่มาแทรกตรงกลางสเกลอีกกี่ตัวก็ตาม
    dropdown: 1000,

    // Modal / dialog (ต้องอยู่เหนือ dropdown เสมอ เผื่อ dropdown เปิดค้างอยู่ตอนเปิด modal)
    modal: 2000,

    // Page transition overlay (SenkaimonTransition) — ระหว่างเปลี่ยนหน้าต้องบังทุกอย่างจริงๆ
    transition: 3000,

    // Toast / snackbar แจ้งเตือน — สูงสุดในระบบ ต้องเห็นเสมอไม่ว่าอะไรจะเปิดอยู่
    toast: 9999,
} as const;