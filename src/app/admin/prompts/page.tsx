import { createServerClient } from "@/lib/supabase";
import { ReportType } from "@/lib/types";
import { REPORT_TYPE_LABEL } from "@/lib/status";
import { PROMPT_TEMPLATES } from "@/lib/prompts";
import { upsertPromptTemplate } from "./actions";

export const dynamic = "force-dynamic";

interface PromptRow {
  name: string;
  template_text: string;
  version: number;
}

async function getPrompts(): Promise<Record<string, PromptRow>> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("prompts").select("name, template_text, version");
  if (error) throw new Error(`プロンプト一覧の取得に失敗しました: ${error.message}`);
  const map: Record<string, PromptRow> = {};
  for (const row of data ?? []) {
    map[row.name] = row as PromptRow;
  }
  return map;
}

export default async function AdminPromptsPage() {
  const prompts = await getPrompts();
  const reportTypes = Object.keys(REPORT_TYPE_LABEL) as ReportType[];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        AI生成(商談準備・商談FB等)で使われるプロンプトのテンプレートです。ここで編集すると、次回生成時から反映されます。
        「未登録」のものはコード内の初期値(あれば)がそのまま使われています。
      </p>

      {reportTypes.map((reportType) => {
        const dbRow = prompts[reportType];
        const fallback = PROMPT_TEMPLATES[reportType];
        const upsertWithType = upsertPromptTemplate.bind(null, reportType);

        return (
          <section key={reportType} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {REPORT_TYPE_LABEL[reportType]}
                <span className="ml-2 text-xs font-normal text-slate-400">({reportType})</span>
              </h3>
              {dbRow ? (
                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                  登録済み(v{dbRow.version})
                </span>
              ) : (
                <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                  未登録{fallback ? "(コード初期値を使用中)" : "(未定義・生成不可)"}
                </span>
              )}
            </div>
            <form action={upsertWithType} className="space-y-2">
              <textarea
                name="template_text"
                defaultValue={dbRow?.template_text ?? fallback ?? ""}
                rows={8}
                required
                className="field font-mono text-xs"
              />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary btn-sm">
                  保存する
                </button>
              </div>
            </form>
          </section>
        );
      })}
    </div>
  );
}
