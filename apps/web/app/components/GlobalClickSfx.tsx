"use client";

import { useEffect } from "react";
import { AudioManager } from "../../lib/Audio/AudioManager";

export default function GlobalClickSfx() {
  useEffect(() => {
    const audio = AudioManager.getInstance();

    const onClickCapture = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest(
        'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]'
      ) as HTMLButtonElement | HTMLInputElement | null;

      if (!clickable) return;
      if ((clickable as HTMLButtonElement).disabled) return;
      if (clickable.hasAttribute("data-no-click-sfx")) return; // optional opt-out

      await audio.initAfterUserGesture();
      audio.play("/audio/sfx/click.mp3");
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}