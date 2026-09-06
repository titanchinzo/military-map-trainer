import type { LineTypeDef } from "@/types/line";

/**
 * §2.8–§2.9 catalog. Boundary lines (§2.8 Хүснэгт 11) are visually identical
 * across all 10 echelons — only the repeating echelon letter differs — so
 * they're modeled as one drawable type with an echelon picked at draw time,
 * rather than 10 near-duplicate entries.
 */
export const LINE_TYPES: LineTypeDef[] = [
  {
    id: "boundary",
    kind: "boundary",
    mn: "Хязгаарлах шугам",
    desc: "Хөрш анги, нэгжийн хариуцах бүсийг ялган зааглах шугам. Шатлалыг сонгоно.",
    ref: "Т4-2022 §2.8 Хүснэгт 11",
  },
  {
    id: "mainStrike",
    kind: "strikeDirection",
    mn: "Гол цохилтын чиглэл",
    desc: "Гол хүчний довтолгооны үндсэн чиглэл.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "supportStrike",
    kind: "strikeDirection",
    mn: "Туслах цохилтын чиглэл",
    desc: "Туслах хүчний довтолгооны чиглэл.",
    ref: "Т4-2022 §2.9",
    dashed: true,
  },
  {
    id: "furtherAdvance",
    kind: "strikeDirection",
    mn: "Цаашид давших чиглэл",
    desc: "Объект эзэлсний дараа цаашид үргэлжлүүлэн давших чиглэл (ЦДЧ).",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "immediateMission",
    kind: "missionLine",
    mn: "Ойрын үүрэг",
    desc: "Анги, нэгжийн ойрын үүргийг заасан шугам.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "subsequentMission",
    kind: "missionLine",
    mn: "Дараагийн үүрэг",
    desc: "Анги, нэгжийн дараагийн үүргийг заасан шугам.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "directFireZone",
    kind: "plainLine",
    mn: "Шууд хөнөөлийн бүс",
    desc: "Шууд харах, шууд буудлагын зэвсгийн хөнөөх зайн хил (ШХБ).",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "restrictedArea",
    kind: "plainLine",
    mn: "Хориглолтын район",
    desc: "Батальон/ротын хориглолтын районы хариуцлагын бүсийн төгсгөлийг заасан шугам.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "restrictedInnerLine",
    kind: "plainLine",
    mn: "Хориглолтын өвөр эгнээ",
    desc: "Хориглолтын районы дотоод эгнээг заасан шугам, газар орны шинж чанараас хамааран хаяалбарын дагуу зурна.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "strongpointSubunit",
    kind: "plainLine",
    mn: "Тулгуурт байр эзэлсэн салбар",
    desc: "Тулгуурт байр эзэлсэн салбарыг өвөр эгнээг хаяалбарын дагуу заасан шугам.",
    ref: "Т4-2022 §2.9",
  },
  {
    id: "combatArea",
    kind: "area",
    mn: "Анги, салбарын байрлалын район",
    desc: "Анги, салбарын байрлалын район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "assemblyArea",
    kind: "area",
    mn: "Цугларах район",
    desc: "Анги, нэгж цугларах район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "mobilizationArea",
    kind: "area",
    mn: "Дайчилгааны район",
    desc: "Дайчилгаа хийх район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "startArea",
    kind: "area",
    mn: "Эхлэх район",
    desc: "Ажиллагаа эхлэх район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "overnightArea",
    kind: "area",
    mn: "Хоноглолт хийх район (марш)",
    desc: "Марш хийх үед хоноглолт хийх район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "restArea",
    kind: "area",
    mn: "Өнжилт хийх район (марш)",
    desc: "Марш хийх үед өнжилт хийх район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "reserveArea",
    kind: "area",
    mn: "Нөөц хүч байрлуулах район",
    desc: "Нөөц хүч байрлуулах район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "fireArea",
    kind: "area",
    mn: "Галын уут байгуулах район",
    desc: "Дайсныг татан оруулж бөглөх галын уут байгуулах район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "combingArea",
    kind: "area",
    mn: "Самнах ажиллагааны район",
    desc: "Мотобуудлагын рот самнах ажиллагаа явуулж байгаа район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "airDropArea",
    kind: "area",
    mn: "Шүхэр десантаар буух район",
    desc: "Шүхэр ашиглан десантаар буух район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "specialAttentionArea",
    kind: "area",
    mn: "Онцгой анхаарах район",
    desc: "Онцгой анхаарал шаардсан район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
    dashed: true,
  },
  {
    id: "artilleryFiringArea",
    kind: "area",
    mn: "Артиллери, зенитийн галт байрны район",
    desc: "Артиллери, зенитийн пуужингийн нэгтгэл, ангийн галт байрны район.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
  },
  {
    id: "floodedArea",
    kind: "area",
    mn: "Усанд автсан бүс",
    desc: "Усанд автсан бүс нутаг.",
    ref: "Т4-2022 §2.9 Хүснэгт 12",
    dashed: true,
  },
];

export function getLineType(id: string): LineTypeDef | undefined {
  return LINE_TYPES.find((t) => t.id === id);
}
