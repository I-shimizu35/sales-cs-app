import Anthropic from "@anthropic-ai/sdk";
import { ReportType } from "./types";
import { MOCK_RESPONSES } from "./mock-responses";

const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

/**
 * true のとき、実際のClaude API呼び出しを一切行わず lib/mock-responses.ts の
 * 固定レスポンスを返す。Anthropicの課金設定が済んでいない開発初期段階でも、
 * 画面遷移・DB保存・生成結果の表示崩れがないかを確認できるようにするための
 * スイッチ。.env.local に CLAUDE_MOCK=true を設定すると有効になる。
 */
const isMockMode = process.env.CLAUDE_MOCK === "true";

// 本番呼び出し時のみ、必要になった時点でクライアントを生成する(モックモードでは
// APIキー未設定でも起動できるようにするため、モジュール読み込み時には作らない)
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEYが設定されていません。.env.localを確認してください。");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const SYSTEM_INSTRUCTION = `あなたは営業/CS支援の専門家です。
事実として確認できない情報を断定しないでください。
出力は指定のJSON形式のみを返し、それ以外の説明文やMarkdown装飾(コードブロック記号含む)は一切含めないでください。`;

export class ClaudeJsonParseError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.raw = raw;
  }
}

/**
 * プロンプトテンプレート文字列中の {{variable}} を実値に置換する。
 */
export function fillTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

/**
 * Claude APIを呼び出し、JSONとしてパースした結果を返す共通関数。
 * 全ての生成機能(企業分析、議事録、BANT判定 等)はこの関数を経由する。
 *
 * CLAUDE_MOCK=true の場合、実際のAPI呼び出しは行わず reportType に対応する
 * モック応答を即座に返す(reportType未指定、または該当モックがない場合はエラー)。
 *
 * JSON以外の応答が返ってきた場合、コードブロック記号(```json等)の除去を
 * 試みてから再パースし、それでも失敗する場合は1回だけ「JSON形式で返して
 * ください」という念押し付きで再送信する。
 */
export async function callClaudeJson<T = Record<string, unknown>>(
  promptTemplate: string,
  variables: Record<string, unknown>,
  options?: { maxRetries?: number; reportType?: ReportType }
): Promise<T> {
  if (isMockMode) {
    if (!options?.reportType || !MOCK_RESPONSES[options.reportType]) {
      throw new Error(
        `モックモードですが reportType="${options?.reportType}" のモック応答が未定義です(lib/mock-responses.tsに追加してください)。`
      );
    }
    // 実際のAPIのようにわずかに待たせて、UIのローディング状態も確認できるようにする
    await new Promise((resolve) => setTimeout(resolve, 500));
    return JSON.parse(JSON.stringify(MOCK_RESPONSES[options.reportType])) as T;
  }

  const maxRetries = options?.maxRetries ?? 1;
  const userPrompt = fillTemplate(promptTemplate, variables);
  const anthropicClient = getClient();

  let lastRaw = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const userContent =
      attempt > 0
        ? `${userPrompt}\n\n直前の応答はJSONとして解析できませんでした。説明文やコードブロック記号を含めず、有効なJSONオブジェクトのみを返してください。`
        : userPrompt;

    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM_INSTRUCTION,
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("Claudeがこのリクエストの生成を拒否しました(安全性ポリシーによる)。");
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const raw = textBlock?.text ?? "";
    lastRaw = raw;

    try {
      return JSON.parse(stripCodeFence(raw)) as T;
    } catch {
      // 次のattemptへ
    }
  }

  throw new ClaudeJsonParseError(
    `Claudeの応答をJSONとして解析できませんでした(${maxRetries + 1}回試行)`,
    lastRaw
  );
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
