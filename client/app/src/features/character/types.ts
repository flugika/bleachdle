import { Character } from "@/src/entities/character/schema";

export type CharacterRace =
    | "Soul"
    | "Shinigami"
    | "Quincy"
    | "Arrancar"
    | "Hollow"
    | "Fullbringer"
    | "Human"
    | "Mod Soul"      // เพิ่มมาเพื่อรองรับตัวละครอย่าง คอน
    | "Unknown";      // สำหรับตัวที่นิยามไม่ได้จริงๆ หรือเป็นปริศนา

export type CharacterAffiliation =
    | "Gotei 13"
    | "Royal Guard"
    | "Arrancar Army"
    | "Espada"
    | "Sternritter"
    | "Wandenreich"
    | "Visored"
    | "Xcution"        // เพิ่มสำหรับกลุ่ม Chad/Ginjo
    | "Human"              // สำหรับพวกคนธรรมดาที่ไม่ได้เป็น Fullbringer (เช่น คุณครู เพื่อนร่วมห้อง)
    | "Independent";       // สำหรับพวกอิสระ (ไอเซ็น, อุราฮาร่า, โยรุอิจิ, กริมจอว์หลังจบศึก)

export type CharacterAppearance =
    | "Agent of the Shinigami"    // ภาคตัวแทนยมทูต (Ch. 1-70)
    | "Soul Society"              // ภาคโซลโซไซตี้ (Ch. 71-182)
    | "Arrancar"                  // ภาคอาร์รันคาร์ (Ch. 183-315)
    | "Turn Back The Pendulum"
    | "Hueco Mundo"               // ภาคฮูเอโกมุนโด้ (Ch. 316-423)
    | "Lost Substitute Shinigami"// ภาคฟูลบริงค์ (Ch. 424-479)
    | "Thousand-Year Blood War"   // ภาคสงครามเลือดพันปี (Ch. 480-686)
// | "Hell Arc"                  // ภาคเฮล (ตอนพิเศษหลัง TYBW)
// | "Others/Movie/Filler";      // สำหรับตัวละครพิเศษ

export type CharacterRelease =
    | "Shikai"
    | "Bankai"
    | "Resurreccion"
    | "Vollständig"
    | "Shunko"
    | "None";      // สำหรับตัวละครที่ไม่มีการปลดปล่อย

export type WeaponType =
    | "Weaponized"     // ใช้ "อะไรสักอย่าง" ในมือสู้ (จะเป็นดาบ, ธนู, กิ๊บ, จี้, หรือไม้เท้า ก็ช่างมัน ขอแค่มีของในมือสู้)
    | "Unarmed"        // ใช้ "ร่างกาย" สู้ (หมัด, เท้า, หรือพลังเปล่าๆ แบบไม่ต้องถือของ)
    | "Energy"  // ใช้ "พลังงาน" ยิงหรือปล่อย (วิถีมาร, พลังกดดันวิญญาณ, พลังทำลาย)
    | "None";

export type CombatUtility =
    | "Physical"   // สายพลังกายภาพ (Melee) - ดาบ, หมัด, เท้า
    | "Element"    // สายธาตุ (Fire, Ice, Lightning, Wind, Earth)
    | "Kido"       // สายวิถีมาร (ยิงไกล, คาถา)
    | "Scientific" // สายวิทยาศาสตร์/กลยุทธ์ (มายูริ, อุราฮาร่า)
    | "Special"    // สายโกงกฎ (Conceptual - ไอเซ็น, อาซคิน, สึคิชิมะ)
    | "Support"// สายซัพพอร์ต (โอริฮิเมะ, เร็ตสึ)
    | "None"

export type MatchResult = 'correct' | 'wrong' | 'higher' | 'lower' | 'partial';

export interface ComparisonOutcome {
    gender: MatchResult;
    race: MatchResult;
    affiliation: MatchResult;
    height: MatchResult;
    age: MatchResult;
    eyeColor: MatchResult;
    hairColor: MatchResult;
    firstAppearanceChapter: MatchResult;
    weapon: MatchResult;
    release: MatchResult;
    primaryAbility: MatchResult;
    image: string;
}

export interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
}