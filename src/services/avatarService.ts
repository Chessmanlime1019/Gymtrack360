import { supabase } from "@/lib/supabaseClient";

export async function subirAvatar(userId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/profile.${extension}`;

  const { error: errorUpload } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (errorUpload) throw errorUpload;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // cache-bust: sin esto, el navegador puede seguir mostrando la foto vieja
  // cacheada aunque el archivo en Storage ya cambió.
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: errorUpdate } = await (supabase.from("profiles") as any)
    .update({ avatar_url: url })
    .eq("id", userId);
  if (errorUpdate) throw errorUpdate;

  return url;
}