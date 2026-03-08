"use client";

import { useEffect, useId } from "react";
import { type AudioSettings } from "../../lib/settings";

interface SettingsProps {
	isOpen: boolean;
	onClose: () => void;
	audio: AudioSettings;
	onAudioChange: (nextAudio: AudioSettings) => void;
}

interface SliderRowProps {
	label: string;
	value: number;
	onChange: (nextValue: number) => void;
}

function SliderRow({ label, value, onChange }: SliderRowProps) {
	const inputId = useId();
	const displayValue = Math.round(value * 100);

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-3">
				<label
					htmlFor={inputId}
					className="text-sm md:text-base font-semibold text-white tracking-wide"
				>
					{label}
				</label>
				<span className="text-xs md:text-sm text-neutral-400 tabular-nums min-w-10 text-right">
					{displayValue}%
				</span>
			</div>

			<input
				id={inputId}
				type="range"
				min={0}
				max={100}
				step={1}
				value={displayValue}
				onChange={(event) => onChange(Number(event.target.value) / 100)}
				className="w-full h-10 accent-white bg-transparent"
			/>
		</div>
	);
}

export default function Settings({ isOpen, onClose, audio, onAudioChange }: SettingsProps) {
	useEffect(() => {
		if (!isOpen) return;

		const handleEsc = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		document.addEventListener("keydown", handleEsc);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[120]">
			<button
				type="button"
				aria-label="Close settings"
				onClick={onClose}
				className="absolute inset-0 bg-black/70"
			/>

			<aside
				role="dialog"
				aria-modal="true"
				aria-label="Settings"
				className="absolute right-0 top-0 h-full w-[min(92vw,30rem)] bg-neutral-950 border-l border-neutral-800 shadow-2xl p-4 md:p-6 flex flex-col"
			>
				<header className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-4">
					<div>
						<h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">Settings</h2>
						<p className="text-xs md:text-sm text-neutral-500 mt-1">Device preferences</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white text-xs md:text-sm font-bold uppercase tracking-wider"
					>
						Close
					</button>
				</header>

				<div className="mt-6 space-y-6 overflow-y-auto pr-1">
					<section className="rounded-xl border border-neutral-800 bg-black/60 p-4 md:p-5 space-y-4">
						<h3 className="text-xs md:text-sm font-bold text-neutral-400 uppercase tracking-widest">Audio</h3>

						<SliderRow
							label="Master Volume"
							value={audio.master}
							onChange={(master) => onAudioChange({ ...audio, master })}
						/>

						<SliderRow
							label="SFX Volume"
							value={audio.sfx}
							onChange={(sfx) => onAudioChange({ ...audio, sfx })}
						/>

						<SliderRow
							label="Music Volume"
							value={audio.music}
							onChange={(music) => onAudioChange({ ...audio, music })}
						/>
					</section>
				</div>
			</aside>
		</div>
	);
}
