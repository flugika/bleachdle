import { z } from 'zod';

// 🖤 1 แถว = 1 ตัวละคร (character_id เป็น PK ตรงๆ เหมือน SQL table ที่คุยกันไว้)
// focus_x/focus_y เป็น % (0-100) ไม่ใช่ pixel เพื่อให้ independent จากขนาดไฟล์จริง
export const SilhouetteSchema = z.object({
    id: z.string().uuid(),
    character_id: z.string().uuid(),
    image: z.string(),
});

export type BleachSilhouette = z.infer<typeof SilhouetteSchema>;