# LexiLoops TODO

## Phase 1: Database & Game Design
- [x] ออกแบบสเกมาฐานข้อมูล (vocab, dailyPuzzles, attempts/scores, streaks, leaderboard) ใน drizzle/schema.ts
- [x] Generate และ apply migration SQL
- [x] สร้าง seed script คลังคำศัพท์องค์กร (~40 คำ) ความยาก 3 ระดับ
- [x] ออกแบบระบบสกอร์ (base score, difficulty multipliers, hint deductions, reveal deductions)

## Phase 2: Backend
- [x] Query helpers ใน server/db.ts (คำศัพท์, สถิติ, สกอร์, streak, กระดานคะแนน)
- [x] tRPC router: vocabulary CRUD (admin-only)
- [x] tRPC router: dailyPuzzles (generators สำหรับ anagram/definition/fill-blank)
- [x] tRPC router: scores/attempts (submit, streak tracking)
- [x] tRPC router: leaderboard (รายสัปดาห์ + รายเดือน)
- [x] auth + role (admin/user) ใช้ adminProcedure สำหรับจัดการคลังคำ

## Phase 3: Design & Home
- [x] ระบบสี/ฟอนต์ใน index.css (ขาวหม่น, ดำหมึก, เขียวพาสเทล, ส้มพาสเทล) + tile-based shadow ละเอียด
- [x] Home: หน้ารวมปริศนาคำศัพท์รายวัน เลือกเกม 3 แบบ
- [x] Navigation (top nav) + auth state

## Phase 4: Game Pages
- [x] เกม Anagram (เรียงคำ) — tile-based, timer, hints
- [x] เกม Definition Match (จับคู่นิยาม) — ตัวเลือกตามความยาก
- [x] เกม Fill-in-the-Blank (เติมคำในช่องว่าง)
- [x] ระบบระดับความยาก (easy/medium/hard): ความยาวคำ, เวลา, จำนวนตัวเลือก
- [x] ระบบใบ้แบบเปิดทีละขั้น (hint levels) หักคะแนนต่อขั้น
- [x] ปุ่มเผยคำตอบ (reveal) หักคะแนน
- [x] ผลลัพธ์เกม: แสดงคะแนนที่ได้, streak อัปเดต

## Phase 5: Progress, Leaderboard & Admin
- [x] หน้าความคืบหน้า: streak counter, คะแนนสะสม, สถิติรายสัปดาห์
- [x] กระดานคะแนนทีม: รายสัปดาห์ + รายเดือน
- [x] หน้าจัดการคลังคำ (admin-only): CRUD คำศัพท์, import, กำหนดความยาก
- [x] Seed คำศัพท์เริ่มต้นให้องค์กร

## Phase 6: Test & Verify
- [x] Vitest tests สำหรับ scoring, puzzle generation, admin gates
- [x] Screenshot ตรวจสอบ UI ทุกหน้า
- [x] บันทึก checkpoint

## Phase 7: Delivery
- [x] ส่งมอบเว็บไซต์
