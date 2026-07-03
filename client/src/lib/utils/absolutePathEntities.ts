import { z } from 'zod';

export const localOrRemoteUrlSchema = z.string().refine(
    (val) => val.startsWith('/') || z.string().url().safeParse(val).success,
    { message: 'ต้องเป็น absolute path ที่ขึ้นต้นด้วย "/" หรือ URL เต็มที่ถูกต้อง' }
);