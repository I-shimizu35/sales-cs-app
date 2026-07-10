/**
 * Excel/Googleスプレッドシートの数式インジェクション対策(CWE-1236)。
 * =, +, -, @, タブ, 改行始まりのセルは先頭にシングルクォートを付与し、
 * 開いた際に数式として実行されないようにする。
 */
export function sanitizeForSpreadsheet(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function csvEscape(rawValue: string): string {
  const value = sanitizeForSpreadsheet(rawValue);
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  // ExcelでUTF-8を文字化けさせずに開けるようBOMを付与
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
