# LexiLoops

LexiLoops คือเกมฝึกคำศัพท์รายวันสำหรับองค์กร ช่วยพนักงานทำความเข้าใจคำศัพท์เฉพาะทางและคำศัพท์ผลิตภัณฑ์ผ่านปริศนาคำสามรูปแบบ พร้อมระบบความยาก ใบ้คำ การนับ streak และความคืบหน้าแบบทีม

เว็บไซต์เผยแพร่ที่ [lexi-loop-vibecode.vercel.app](https://lexi-loop-vibecode.vercel.app)

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| ปริศนาคำรายวัน 3 รูปแบบ | เรียงคำ (Anagram), จับคู่นิยาม (Definition Match), เติมคำในช่องว่าง (Fill-in-the-Blank) — ปริศนาคือ snapshot ต่อ (วัน, รูปแบบ, ความยาก) ผูกกับวันท้องถิ่นของผู้ใช้ |
| ระดับความยาก 3 ระดับ | เริ่มต้น/กลาง/สูง — ปรับความยาวคำ (3–6 / 6–10 / 10–16 ตัว), เวลา (90 / 60 / 40 วินาที) และจำนวนตัวเลือก (3 / 4 / 5) อัตโนมัติ |
| ระบบใบ้และเผยคำตอบ | ใบ้แบบเปิดทีละขั้น ครั้งละ 15 คะแนน (สูงสุด 45) · เผยคำตอบ หักคะแนนคงเหลือครึ่งหนึ่ง |
| ระบบคะแนน | คะแนนพื้นฐาน 100 × ตัวคูณความยาก (1.0 / 1.5 / 2.0) − หักใบ้ − เวลาเหลือที่ใช้ ≤ 50% ได้โบนัส +20 |
| Streak | นับวันต่อเนื่องที่ทำกิจกรรม พร้อมปฏิทินไฟในหน้าความคืบหน้า |
| กระดานคะแนนทีม | อันดับรายสัปดาห์และรายเดือน สรุปคะแนนสะสมของทุกคนในองค์กร |
| คลังคำภายใน | คำศัพท์ของบริษัทเองเท่านั้น — ไม่มีแหล่งภายนอก — พร้อม seed ต้นแบบ ~39 คำ |
| การเข้าสู่ระบบ | Manus OAuth เป็นการเดียว — ไม่มีรูปแบบสมัครสมาชิกอื่น — แยก role `admin`/`user` |
| การจัดการคลังคำ (Admin เท่านั้น) | CRUD คำศัพท์, ค้นหา, เปิด/ปิดใช้งาน, นำเข้าหลายคำพร้อมกัน (ฟอร์แมต `คำ|นิยาม|ความยาก|หมวดหมู่`) |

## โครงสร้างโปรเจกต์

```
lexiloops/
├── client/                    # React 19 + Vite + Tailwind 4 (frontend)
│   ├── index.html
│   ├── public/                # ใช้เฉพาะไฟล์ config เล็ก ๆ (favicon, robots.txt)
│   └── src/
│       ├── components/
│       │   ├── games/         # AnagramGame, DefinitionGame, FillBlankGame
│       │   ├── ui/            # shadcn/ui components
│       │   └── AppShell.tsx   # layout + top nav + auth state
│       ├── hooks/useGame.ts   # game engine: timer, hints, submit
│       ├── pages/             # Home, PlayGame, Progress, Leaderboard,
│       │                      # Vocabulary, AdminWords
│       └── index.css          # design tokens (ขาวหม่น / ดำหมึก / เขียว-ส้มพาสเทล)
├── server/
│   ├── routers.ts             # tRPC: auth, vocabulary, puzzles, attempts,
│   │                          # progress, streaks, leaderboard
│   ├── db.ts                  # query helpers (drizzle + mysql2)
│   ├── gameLogic.ts           # puzzle generation + leaderboard aggregation
│   └── gameLogic.test.ts      # vitest: scoring, streak, admin gating, generation
├── shared/game.ts             # constants + pure puzzle builders (anagram /
│                              # fillblank payloads, seeded shuffle, scoring)
├── drizzle/
│   ├── schema.ts              # users, vocabulary, dailyPuzzles, attempts, streaks
│   └── migrations/
└── scripts/seed-words.ts      # seed คลังคำต้นแบบขององค์กร
```

## Stack

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, wouter, shadcn/ui, Radix, Sonner, Framer Motion |
| Backend | Express 4, tRPC 11 (ข้อความใต้ `/api/trpc`), zod, superjson |
| Database | MySQL/TiDB ผ่าน drizzle-orm (schema-first + migration) |
| Auth | Manus OAuth (session cookie, `protectedProcedure` / `adminProcedure`) |
| Testing | Vitest 2 |

## การติดตั้งและรันในเครื่อง

ต้องการ Node.js 22+ (PNPM แนะนำ, หรือ npm ก็ได้)

```bash
# 1. ติดตั้ง dependencies
pnpm install

# 2. ตั้งค่า environment (คล้าย .env)
export DATABASE_URL="mysql://user:pass@host:3306/dbname"
export JWT_SECRET="<secret-sam-khrueang-yang-jwt-session>"
# OAuth และ analytics ใช้ตัวแปร system ของ Manus หากไม่ได้โฮสต์บน Manus
# ต้องสลับ OAuth portal เป็นของตัวเอง (ดูหมายเหตุด้านล่าง)

# 3. รัน migration สร้างตาราง
pnpm db:push
# หรือ generate migration แล้ว apply เอง: npx drizzle-kit generate

# 4. (เลือกได้) Seed คลังคำต้นแบบ ~39 คำ
npx tsx scripts/seed-words.ts

# 5. รัน dev server (backend + Vite HMR)
pnpm dev

# หรือ build + รัน production
pnpm build && pnpm start
```

หมายเหตุด้าน OAuth: โค้ดที่ให้มาผูกกับ Manus OAuth (`VITE_APP_ID`, `VITE_APP_TITLE` ฯลฯ) หากจะโฮสต์เองนอก Manus คุณต้องปรับ `server/_core/oauth.ts` ให้ใช้ identity provider ของตัวเอง หรือติดตั้งระบบ auth อื่นแทน

## โครงสร้างฐานข้อมูล

| ตาราง | จุดประสงค์ |
|---|---|
| `users` | บัญชีผู้ใช้จาก OAuth พร้อม `role` (`user` / `admin`) |
| `vocabulary` | คลังคำศัพท์ภายใน (unique บน `word`, มี `blanks` สำหรับประโยคช่องว่าง) |
| `dailyPuzzles` | snapshot ปิซเซิลต่อวัน สร้างด้วย seeded random ทำให้ deterministic — ผู้ใช้ทุกคนที่เล่นวัน/รูปแบบ/ความยากเดียวกันได้ปิซเซิลชุดเดียวกัน (คำที่เลือกผูกกับ pool ของวันนั้น) |
| `attempts` | บันทึกผลเล่นแต่ละครั้ง พร้อมคะแนน ใช้เวลา ใบ้ที่ใช้ (unique ต่อ user+puzzle) |
| `streaks` | จำนวนปิซเซิลที่เล่นวันละ 1 แถวต่อผู้ใช้ สำหรับคำนวณ streak |

## ระบบเกม

- **Anagram**: จัดเรียงกระเบื้องตัวอักษรที่สลับ — ระดับความยากเปิดตัวอักษรล่วงหน้า 1 / 2 / 0 ตัว
- **Definition Match**: เลือกนิยามที่ถูกต้องจากตัวเลือก 3 / 4 / 5 ข้อ (คำหลอกมาจาก pool วันเดียวกัน สลับตำแหน่งด้วย random เดียวกับวัน)
- **Fill-in-the-Blank**: เสริมตัวอักษรที่หายไป โดยระดับความยากเผย 50% / 33% / 15% ของคำ
- ปิซเซิลแต่ละชุดเล่นได้ไม่จำกัดครั้ง แต่บันทึกคะแนนจาก attempt แรกต่อปิซเซิล (unique constraint)
- คะแนนสูงสุด: easy 100 · medium 150 · hard 200

## การจัดการสิทธิ์

| Procedure | สิทธิ์ |
|---|---|
| `auth.me`, `auth.logout` | public |
| `vocabulary.list`, ปิซเซิล/ผลลัพธ์/กระดานคะแนน/ความคืบหน้า | protected (login แล้ว) |
| `vocabulary.create/update/delete/importBulk`, `leaderboard.adminOnly` | **adminProcedure** — FORBIDDEN หาก role ไม่ใช่ `admin` |

การตั้งผู้ใช้เป็น Admin ทำผ่านฐานข้อมูลโดยตรง (หรือผ่านหน้าจัดการ) โดยอัปเดต `role = 'admin'` ในตาราง `users`

## การทดสอบ

```bash
pnpm test          # vitest — scoring, streak, admin gating, puzzle generation
pnpm check         # tsc --noEmit
```

## License

MIT
