import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-16 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-50">
          Цэргийн тактикийн таних тэмдгийн сургалт
        </h1>
        <p className="text-lg leading-relaxed text-zinc-400">
          Байлдааны газрын зураг (topo) дээр Т4-2022 зааврын дагуух тактикийн
          таних тэмдгүүдийг чирж байрлуулан сурах интерактив хэрэгсэл. Тэмдэг
          дээр 2–3 секунд хулгана байрлуулбал түүний тодорхойлолт гарч ирнэ.
        </p>
      </div>
      <Show when="signed-in">
        <Link
          href="/map"
          className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
        >
          Газрын зураг руу орох
        </Link>
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-500">
            Нэвтрэж эхлэх
          </button>
        </SignInButton>
      </Show>
      <dl className="grid max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <dt className="text-sm font-semibold text-zinc-200">
            160+ таних тэмдэг
          </dt>
          <dd className="mt-1 text-sm text-zinc-500">
            Удирдлага, анги/салбар, зэвсэглэл, техник, ажиллагааны тэмдгүүд
            ангилалаар эрэмбэлэгдсэн.
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <dt className="text-sm font-semibold text-zinc-200">
            Topo газрын зураг
          </dt>
          <dd className="mt-1 text-sm text-zinc-500">
            Өндрийн шугам, релефтэй байлдааны газрын зураг дээр ажиллана.
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <dt className="text-sm font-semibold text-zinc-200">
            Өндрийн мэдээлэл
          </dt>
          <dd className="mt-1 text-sm text-zinc-500">
            Тэмдэг байрлуулах үед TessaDEM-ээс тухайн цэгийн далайн түвшнээс
            дээших өндрийг татаж үзүүлнэ.
          </dd>
        </div>
      </dl>
    </div>
  );
}
