-- ============================================================
-- 支援フェーズ管理(SU2.0支援フローの進捗) + ロープレ実施記録
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

alter table companies
  add column if not exists support_phase text not null default 'initial_design'
    check (support_phase in (
      'initial_design',
      'material_collection',
      'deal_sheet_setup',
      'sales_materials',
      'gpt_setup',
      'operation_prep',
      'operating'
    ));

alter table deals
  add column if not exists roleplay_conducted_at date;
