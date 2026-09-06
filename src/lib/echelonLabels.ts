import type { Echelon } from "@/types/symbol";

/** Mongolian names for each echelon, per Т4-2022 §1.4 Хүснэгт 1 — used to
 * label the 10 boundary-line variants in §2.8 Хүснэгт 11. */
export const ECHELON_LABEL: Record<Echelon, string> = {
  XXXX: "Армийн",
  XXX: "Корпусын",
  XX: "Дивизийн",
  X: "Бригадын",
  III: "Хорооны",
  II: "Батальоны",
  I: "Ротын",
  c: "Салааны",
  т: "Тасгийн",
  бү: "Бүлгийн",
};

export const ECHELON_ORDER: Echelon[] = [
  "XXXX",
  "XXX",
  "XX",
  "X",
  "III",
  "II",
  "I",
  "c",
  "т",
  "бү",
];
