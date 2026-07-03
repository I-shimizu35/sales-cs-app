"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";

export async function createCompanyNote(companyId: string, formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("ログインが必要です。");

  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) {
    throw new Error("メモの内容を入力してください。");
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("company_notes").insert({
    company_id: companyId,
    user_id: currentUser.id,
    body: body.trim(),
  });
  if (error) throw new Error(`メモの投稿に失敗しました: ${error.message}`);

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyNote(companyId: string, noteId: string): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("ログインが必要です。");

  const supabase = createServerClient();
  const { data: note, error: fetchError } = await supabase
    .from("company_notes")
    .select("user_id")
    .eq("id", noteId)
    .single();
  if (fetchError || !note) throw new Error(`メモの取得に失敗しました: ${fetchError?.message ?? ""}`);

  if (note.user_id !== currentUser.id && !isManagerOrAdmin(currentUser.role)) {
    throw new Error("自分が投稿したメモ以外は削除できません。");
  }

  const { error } = await supabase.from("company_notes").delete().eq("id", noteId);
  if (error) throw new Error(`メモの削除に失敗しました: ${error.message}`);

  revalidatePath(`/companies/${companyId}`);
}
