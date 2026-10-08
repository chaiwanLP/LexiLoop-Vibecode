import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppShell from "@/components/AppShell";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (e) => setError(e.message),
  });

  return (
    <AppShell>
      <section className="container max-w-md py-14">
        <Card>
          <CardHeader>
            <CardTitle>สมัครสมาชิก</CardTitle>
            <CardDescription>สร้างบัญชีภายในองค์กร (รหัสผ่าน ≥ 8 ตัว)</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                register.mutate({ email, password, name: name || undefined });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อที่แสดง</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อทีม / ชื่อเล่น" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัว" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={register.isPending}>
                {register.isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              มีบัญชีแล้ว? <Link href="/login" className="underline">เข้าสู่ระบบ</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
