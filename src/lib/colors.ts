import type { AffiliationColor } from "@/types/symbol";

/**
 * Exact affiliation colors from Т4-2022 §1.7, Хүснэгт 2 (RGB columns).
 * "orange" (онцгой байдал) and "tan" (бор — зам/цагдаа) aren't in that RGB
 * table but are named explicitly in §1.7.8–§1.7.9; standard tints are used.
 */
export const AFFILIATION_HEX: Record<AffiliationColor, string> = {
  friendly: "rgb(0,39,255)", // Хөх — өөрийн цэрэг
  hostile: "rgb(255,0,10)", // Улаан — эсрэг тал
  black: "rgb(0,0,0)", // Хар
  green: "rgb(31,165,73)", // Ногоон — хилийн цэрэг
  brown: "rgb(79,44,18)", // Хүрэн — орон нутгийн цэрэг
  tan: "rgb(207,72,39)", // Бор — зам/маршрут, цагдаа, дотоодын цэрэг
  yellow: "rgb(255,239,0)", // Шар — ЦХБ хордолт
  orange: "rgb(255,140,0)", // Улбар шар — онцгой байдал
};

export const AFFILIATION_LABEL: Record<AffiliationColor, string> = {
  friendly: "Өөрийн цэрэг (хөх)",
  hostile: "Эсрэг тал (улаан)",
  black: "Ерөнхий/төрөл мэргэжлийн цэрэг (хар)",
  green: "Хилийн цэрэг (ногоон)",
  brown: "Орон нутгийн цэрэг (хүрэн)",
  tan: "Дотоодын цэрэг / цагдаа / зам (бор)",
  yellow: "ЦХБ (шар)",
  orange: "Онцгой байдал (улбар шар)",
};
