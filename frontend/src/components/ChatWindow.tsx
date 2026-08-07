import { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Sparkles } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import type { ChatMessage } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
	messages,
	isTyping,
	onSend,
}: {
	messages: ChatMessage[];
	isTyping: boolean;
	onSend: (message: string) => Promise<void>;
}) {
	const [prompt, setPrompt] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (scrollRef.current)
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [messages, isTyping]);

	const send = async () => {
		if (!prompt.trim() || isTyping) return;
		const value = prompt;
		setPrompt("");
		try {
			await onSend(value);
		} catch {
			/* hook renders the error message */
		}
	};
	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void send();
		}
	};

	return (
		<main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#0B0E14] to-[#13161c]">
			<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
			<div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
			<header className="h-16 border-b border-white/5 flex items-center px-8 backdrop-blur-md z-10 sticky top-0 bg-slate-900/30">
				<h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
					Session Secure
				</h2>
			</header>
			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto p-8 space-y-8 pb-40 scroll-smooth relative z-10"
			>
				<AnimatePresence initial={false}>
					{messages.map((message, index) => (
						<motion.div
							key={message.id}
							initial={{ opacity: 0, y: 20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ type: "spring", stiffness: 260, damping: 20 }}
						>
							<MessageBubble message={message} index={index} isLatest={index === messages.length - 1} isTyping={isTyping} />
						</motion.div>
					))}
				</AnimatePresence>
				{isTyping && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="flex gap-4 max-w-4xl mx-auto"
					>
						<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0 opacity-80 shadow-[0_0_15px_rgba(139,92,246,0.5)] mt-1">
							<Loader2 className="w-4 h-4 text-white animate-spin" />
						</div>
						<div className="glass-panel px-5 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
							<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
							<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
							<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
						</div>
					</motion.div>
				)}
			</div>
			<div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-transparent z-20">
				<div className="max-w-4xl mx-auto relative">
					<div className="relative glass-panel rounded-3xl p-2 flex items-end gap-2 shadow-2xl border border-white/10 ring-1 ring-white/5 bg-slate-900/60">
						<TextareaAutosize
							minRows={1}
							maxRows={6}
							value={prompt}
							disabled={isTyping}
							onChange={(event) => setPrompt(event.target.value)}
							onKeyDown={onKeyDown}
							placeholder={
								isTyping ? "AgentX is responding..." : "Message AgentX..."
							}
							className="flex-1 bg-transparent border-none text-slate-200 px-4 py-3 focus:outline-none text-sm placeholder:text-slate-500 resize-none leading-relaxed disabled:cursor-not-allowed disabled:opacity-60"
						/>
						<button
							onClick={() => void send()}
							disabled={!prompt.trim() || isTyping}
							className="bg-white disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 p-3 rounded-2xl hover:bg-slate-200 transition-all shadow-sm mb-0.5 mr-0.5"
						>
							<Send className="w-4 h-4" />
						</button>
					</div>
					<div className="text-center mt-3 flex items-center justify-center gap-4">
						<p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
							<Sparkles className="w-3 h-3 text-purple-400/70" />
							Powered by Hermes Framework
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
