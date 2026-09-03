import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/"], // ไม่ต้องให้ Google ค้นหาใน API endpoints
        },
        sitemap: "https://play-bleachdle.vercel.app/sitemap.xml",
    };
}