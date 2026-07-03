import fs from "fs";
import path from "path";

const envPath = path.resolve(__dirname, "../../../.env.local");
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

function envVal(name: string): string {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const match = envText.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) {
    throw new Error(`環境変数 ${name} が見つかりません(process.envにも.env.localにも存在しません)`);
  }
  return match[1].trim();
}

export const SUPABASE_URL = envVal("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = envVal("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = envVal("SUPABASE_SERVICE_ROLE_KEY");
