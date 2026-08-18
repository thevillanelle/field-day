"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/app/actions/onboarding";

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await saveProfile(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push("/onboarding/vertical");
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md rounded-2xl border border-[#e0d8ce] p-8 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44] mb-2">
            Step 1 of 3
          </p>
          <h1 className="text-2xl font-bold text-[#2d1a0e]">Tell us a little about you</h1>
          <p className="text-sm text-[#7a6e65] mt-1">
            This shapes who you get matched with — keep it real.
          </p>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="age" className="text-[#2d1a0e]">Age</Label>
            <Input id="age" name="age" type="number" min={13} max={120} required className="border-[#e0d8ce]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender" className="text-[#2d1a0e]">Gender</Label>
            <Input
              id="gender"
              name="gender"
              type="text"
              placeholder="How would you describe your gender?"
              className="border-[#e0d8ce]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location" className="text-[#2d1a0e]">Location</Label>
            <Input id="location" name="location" type="text" placeholder="City" className="border-[#e0d8ce]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio" className="text-[#2d1a0e]">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="A couple sentences about you — save the rest for the games."
              className="border-[#e0d8ce] min-h-24"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white h-10 mt-2"
          >
            {pending ? "Saving…" : "Continue →"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
