import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
      <SignUp />
    </div>
  );
}
