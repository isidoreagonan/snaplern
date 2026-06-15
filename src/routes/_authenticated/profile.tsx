import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { toast } from "sonner";
import { SignedImage } from "@/components/signed-image";
import { Camera, Loader2, Save, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Mon profil — SnapLern" }] }),
  component: ProfilePage,
});

const STUDY_LEVELS = [
  "Collège", "Lycée — Seconde", "Lycée — Première", "Lycée — Terminale",
  "Bac+1 / L1", "Bac+2 / L2", "Bac+3 / L3", "Bac+4 / M1", "Bac+5 / M2",
  "Doctorat", "Formation pro", "Autodidacte", "Autre",
];

function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [studyLevel, setStudyLevel] = useState("");
  const [school, setSchool] = useState("");
  const [bio, setBio] = useState("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,study_level,school,bio")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setStudyLevel(data.study_level ?? "");
        setSchool(data.school ?? "");
        setBio(data.bio ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const handleAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (5 Mo max)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatars/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("learning-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("learning-images").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      toast.success("Photo mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          study_level: studyLevel || null,
          school: school || null,
          bio: bio || null,
        })
        .eq("user_id", userId);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: displayName, avatar_url: avatarUrl } });
      toast.success("Profil enregistré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const initial = (displayName || email || "?")[0]?.toUpperCase();

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/app" })}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black font-display">Mon profil</h1>
        <p className="text-slate-500 mt-1">Personnalise ton espace SnapLern.</p>
      </header>

      <div className="bg-white rounded-[24px] p-6 md:p-8 border border-slate-100 max-w-2xl">
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] text-white flex items-center justify-center text-3xl font-black overflow-hidden">
              {avatarUrl ? (
                <SignedImage src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 bg-slate-900 text-white rounded-full p-2 shadow-lg hover:scale-105 transition"
              aria-label="Changer la photo"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
            />
          </div>
          <div>
            <div className="font-black text-lg">{displayName || "Sans nom"}</div>
            <div className="text-sm text-slate-500">{email}</div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <Field label="Nom affiché">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7a6c] outline-none"
            />
          </Field>

          <Field label="Niveau d'études">
            <select
              value={studyLevel}
              onChange={(e) => setStudyLevel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7a6c] outline-none bg-white"
            >
              <option value="">— Choisir —</option>
              {STUDY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>

          <Field label="École / Université">
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Ex : Sorbonne, ENS Lyon…"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7a6c] outline-none"
            />
          </Field>

          <Field label="Bio (objectifs, matières favorites…)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#ff7a6c] outline-none resize-none"
            />
          </Field>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#ff7a6c] transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}