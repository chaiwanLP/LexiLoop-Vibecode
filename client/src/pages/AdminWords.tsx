import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DIFFICULTIES } from "../../../shared/game";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Search,
  BookOpen,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WordForm {
  word: string;
  definition: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  active: "yes" | "no";
}

const EMPTY_FORM: WordForm = {
  word: "",
  definition: "",
  difficulty: "easy",
  category: "",
  active: "yes",
};

export default function AdminWords() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { data: words, isLoading } = trpc.vocabulary.list.useQuery();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<WordForm>(EMPTY_FORM);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (words ?? []).filter((w) => !q || w.word.toUpperCase().includes(q) || w.definition.includes(query.trim()));
  }, [words, query]);

  const invalidate = () => {
    void utils.vocabulary.list.invalidate();
  };

  const createMut = trpc.vocabulary.create.useMutation({
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("เพิ่มคำศัพท์แล้ว");
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.message || "เพิ่มคำไม่ได้"),
  });

  const updateMut = trpc.vocabulary.update.useMutation({
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("แก้ไขคำศัพท์แล้ว");
      setForm(EMPTY_FORM);
      setEditId(null);
    },
    onError: (err) => toast.error(err.message || "แก้ไขไม่ได้"),
  });

  const deleteMut = trpc.vocabulary.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success("ลบคำศัพท์แล้ว");
    },
    onError: (err) => toast.error(err.message || "ลบไม่ได้"),
  });

  const importMut = trpc.vocabulary.importBulk.useMutation({
    onSuccess: (data) => {
      invalidate();
      setImportOpen(false);
      setImportText("");
      toast.success(`นำเข้าสําเร็จ: เพิ่ม ${data.added} คำ${data.skipped > 0 ? ` (ข้าม ${data.skipped} บรรทัดที่ไม่ถูกต้องหรือซ้ำ)` : ""}`);
    },
    onError: (err) => toast.error(err.message || "นำเข้าไม่ได้"),
  });

  const runImport = () => {
    const lines = importText.split("\n").filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error("วางข้อความต่างๆ อย่างน้อย 1 บรรทัด");
      return;
    }
    importMut.mutate({ lines });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (w: {
    id: number;
    word: string;
    definition: string;
    difficulty: string;
    category?: string | null;
    active: string;
  }) => {
    setForm({
      word: w.word,
      definition: w.definition,
      difficulty: w.difficulty as WordForm["difficulty"],
      category: w.category ?? "",
      active: w.active as "yes" | "no",
    });
    setEditId(w.id);
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.word.trim() || form.word.trim().length < 2) {
      toast.error("กรอกคำศัพท์อย่างน้อย 2 ตัวอักษร");
      return;
    }
    if (form.definition.trim().length < 5) {
      toast.error("กรอกคำนิยามให้ครบถ้วน (อย่างน้อย 5 ตัวอักษร)");
      return;
    }
    const payload = {
      word: form.word.trim().toUpperCase(),
      definition: form.definition.trim(),
      difficulty: form.difficulty,
      category: form.category.trim() || undefined,
      active: form.active,
    };
    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  if (loading) return <AppShell><Skeleton className="h-96 m-8" /></AppShell>;
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-3">เข้าสู่ระบบเพื่อดูหน้านี้</h1>
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="container py-24 text-center fade-up">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">สงวนสิทธิ์สำหรับผู้ดูแลระบบ</h1>
          <p className="text-muted-foreground mb-6">
            หน้านี้ใช้จัดการคลังคำศัพท์ของบริษัท เฉพาะ Admin เท่านั้นที่เข้าถึงได้
          </p>
          <Link href="/">
            <Button variant="outline" className="btn-press">กลับไปหน้าหลัก</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container py-10">
        <div className="fade-up flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-peach-dark" /> จัดการคลังคำศัพท์
            </h1>
            <p className="text-muted-foreground mt-1">
              เฉพาะ Admin · คลังคำของบริษัทเท่านั้น · มี {(words ?? []).length} คำ
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="btn-press bg-card"
              onClick={() => setImportOpen(true)}
            >
              <BookOpen className="w-4 h-4 mr-1" /> นำเข้าหลายคำ
            </Button>
            <Button onClick={openCreate} className="btn-press bg-mint-deep text-primary-foreground hover:bg-mint-deep/90">
              <Plus className="w-4 h-4 mr-1" /> เพิ่มคำศัพท์
            </Button>
          </div>
        </div>

        <div className="tile p-4 mt-6 flex items-center gap-3 fade-up" style={{ animationDelay: "60ms" }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาในคลังคำ..."
              className="pl-9 bg-card"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} คำ</span>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {filtered.map((w, i) => (
              <div
                key={w.id}
                className={cn("tile tile-hover p-5 fade-up", w.active === "no" && "opacity-60")}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-bold tracking-wide">{w.word}</h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {w.category && (
                      <span className="chip">
                        <Tag className="w-3 h-3" /> {w.category}
                      </span>
                    )}
                    <span
                      className={cn(
                        "chip",
                        w.difficulty === "easy" ? "chip-mint" : w.difficulty === "medium" ? "chip-peach" : "chip-ink"
                      )}
                    >
                      {DIFFICULTIES.find((d) => d.key === w.difficulty)?.label ?? w.difficulty}
                    </span>
                    {w.active === "no" && <span className="chip text-destructive">ปิดใช้งาน</span>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{w.definition}</p>
                <div className="flex gap-2 mt-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-press bg-card"
                    onClick={() => openEdit(w)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-press text-destructive border-destructive/30"
                    onClick={() => setDeleteId(w.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> ลบ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div className="tile p-10 text-center mt-6">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">ไม่พบคำศัพท์ที่ตรงกับคำค้นหา</p>
            <p className="text-sm text-muted-foreground">ลองคำค้นหาอื่น หรือเพิ่มคำใหม่</p>
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && (setEditId(null), setForm(EMPTY_FORM))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "แก้ไขคำศัพท์" : "เพิ่มคำศัพท์ใหม่"}</DialogTitle>
            <DialogDescription>
              คำศัพท์นี้จะถูกใช้ในเกมปริศนาคำรายวันขององค์กรเท่านั้น
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">คำศัพท์ (ภาษาอังกฤษพิมพ์ใหญ่)</label>
              <Input
                value={form.word}
                onChange={(e) => setForm((f) => ({ ...f, word: e.target.value.toUpperCase() }))}
                placeholder="เช่น RETENTION"
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">คำนิยาม (ภาษาไทย)</label>
              <Textarea
                value={form.definition}
                onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
                placeholder="อธิบายความหมายของคำให้พนักงานเข้าใจง่าย"
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">ระดับความยาก</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as WordForm["difficulty"] }))}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-full"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">หมวดหมู่</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="เช่น ธุรกิจ, ผลิตภัณฑ์"
                  maxLength={80}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="active-toggle"
                type="checkbox"
                checked={form.active === "yes"}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked ? "yes" : "no" }))}
                className="h-4 w-4 accent-[oklch(0.55_0.12_165)]"
              />
              <label htmlFor="active-toggle" className="text-sm">ใช้งานคำนี้ในเกม</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="btn-press" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={save} className="btn-press" disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => !open && (setImportOpen(false), setImportText(""))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>นำเข้าคำศัพท์หลายคำพร้อมกัน</DialogTitle>
            <DialogDescription>
              วางข้อความทีละบรรทัด รูปแบบ: คำศัพท์|คำนิยาม|ระดับความยาก|หมวดหมู่ (หมวดหมู่ไม่บังคับ) — เช่น RETENTION|อัตราการลูกค้าที่อยู่ต่อเนื่อง|hard|ธุรกิจ
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`CAMPAIGN|แผนการรณรงค์การตลาดที่มีเป้าหมายชัดเจน|medium|การตลาด\nLEAD|ผู้ที่มีแนวโน้มเป็นลูกค้า|easy|การตลาด`}
            rows={10}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" className="btn-press" onClick={() => setImportOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={runImport} className="btn-press" disabled={importMut.isPending}>
              {importMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              นำเข้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคำศัพท์</AlertDialogTitle>
            <AlertDialogDescription>
              การลบจะนำคำนี้ออกจากเกมปริศนาคำทั้งหมดในอนาคต และจะกู้คืนไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-press">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="btn-press bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
            >
              ลบคำศัพท์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
