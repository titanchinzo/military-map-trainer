// Windows exe-үүдийг GitHub release-д байршуулна (нүүр хуудасны "Татах" товч
// эндээс татдаг):
//
//   cd desktop && npm run dist && npm run release
//
// Tag нь `desktop-v<package.json version>`. Release байхгүй бол үүсгээд
// нийтэлнэ; байгаа бол ижил нэртэй файлуудыг шинээр солино. GitHub токеныг
// Git Credential Manager-аас (git push хийдэг нэвтрэлт) авна — хэвлэхгүй.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DESKTOP = path.resolve(import.meta.dirname, "..");
const ASSETS = ["MilitaryMapTrainer-Setup.exe", "MilitaryMapTrainer-Portable.exe"];

const git = (args, input) =>
  execFileSync("git", args, {
    cwd: DESKTOP,
    input,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });

const repo = /github\.com[/:](.+?)(?:\.git)?\s*$/.exec(git(["remote", "get-url", "origin"]))?.[1];
if (!repo) throw new Error("origin is not a GitHub remote");
const token = /^password=(.*)$/m.exec(git(["credential", "fill"], "protocol=https\nhost=github.com\n\n"))?.[1];
if (!token) throw new Error("no GitHub credential stored — run `git push` once to sign in");

const { version } = JSON.parse(fs.readFileSync(path.join(DESKTOP, "package.json"), "utf8"));
const tag = `desktop-v${version}`;

async function api(method, url, body, headers = {}) {
  const res = await fetch(url.startsWith("https://") ? url : `https://api.github.com${url}`, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
  });
  if (method === "GET" && res.status === 404) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

for (const name of ASSETS)
  if (!fs.existsSync(path.join(DESKTOP, "dist", name))) throw new Error(`dist/${name} missing — run npm run dist`);

let release = await api("GET", `/repos/${repo}/releases/tags/${tag}`);
const created = !release;
if (created) {
  release = await api(
    "POST",
    `/repos/${repo}/releases`,
    JSON.stringify({
      tag_name: tag,
      target_commitish: "main",
      name: `Windows програм v${version}`,
      draft: true,
      body: [
        "- **MilitaryMapTrainer-Setup.exe** — суулгадаг хувилбар (зөвлөмж). Start цэсэнд «Тактикийн тэмдгийн сургалт» нэрээр гарна.",
        "- **MilitaryMapTrainer-Portable.exe** — суулгахгүйгээр шууд ажиллана.",
        "",
        "Интернэт шаардлагатай: програм нь military-map-trainer.vercel.app-ийг өөрийн цонхонд нээдэг.",
        "Анх ажиллуулахад Windows SmartScreen анхааруулбал **More info → Run anyway** дарна.",
      ].join("\n"),
    }),
  );
}
console.log(`${created ? "created draft" : "updating"} release ${tag} (id ${release.id})`);

for (const name of ASSETS) {
  const old = release.assets.find((a) => a.name === name);
  if (old) await api("DELETE", `/repos/${repo}/releases/assets/${old.id}`);
  const started = Date.now();
  const asset = await api(
    "POST",
    `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
    fs.readFileSync(path.join(DESKTOP, "dist", name)),
    { "Content-Type": "application/octet-stream" },
  );
  console.log(`${old ? "replaced" : "uploaded"} ${asset.name} (${asset.size} bytes) in ${Math.round((Date.now() - started) / 1000)}s`);
}

if (release.draft) {
  release = await api("PATCH", `/repos/${repo}/releases/${release.id}`, JSON.stringify({ draft: false, make_latest: "true" }));
  console.log("published");
}
console.log(release.html_url);
