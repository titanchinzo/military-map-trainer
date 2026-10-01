// Вэб хуудсанд desktop апп дотор нээгдсэнээ мэдэх боломж олгоно — жишээ нь
// нүүр хуудасны "Windows програм татах" товчийг нуухад. Зөвхөн апп-ын өөрийн
// домэйнд тавина; нэвтрэлтийн (Clerk, Google) хуудсуудад юу ч нэмэхгүй.
// Sandbox-тэй preload нь ESM дэмждэггүй — зөвхөн CommonJS require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge } = require("electron");

const PREFIX = "--mmt-app-origin=";
const appOrigin = process.argv.find((a) => a.startsWith(PREFIX))?.slice(PREFIX.length);

if (location.origin === appOrigin) contextBridge.exposeInMainWorld("mmtDesktop", true);
