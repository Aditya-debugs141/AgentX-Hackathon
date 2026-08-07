import { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Sparkles, ShieldCheck } from "lucide-react";
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
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
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
		<main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#0B0E14] via-[#0f1219] to-[#13161c]">
			{/* Dramatic Ambient Lighting */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[140px] rounded-full pointer-events-none" />
			<div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />
			
			<header className="h-16 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl z-10 sticky top-0 bg-slate-900/40 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
						<span className="text-xs font-bold tracking-wide text-emerald-400">SESSION SECURE</span>
					</div>
				</div>
				<div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
					<ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
					End-to-End Encrypted Context
				</div>
			</header>

			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-40 scroll-smooth relative z-10 custom-scrollbar"
			>
				<AnimatePresence initial={false}>
					{messages.length === 0 && !isTyping && (
						<motion.div 
							initial={{ opacity: 0 }} 
							animate={{ opacity: 1 }} 
							className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto"
						>
							<div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-500/20 flex items-center justify-center mb-6 shadow-inner border border-white/5 ring-1 ring-white/10">
								<Sparkles className="w-8 h-8 text-blue-400" />
							</div>
							<h2 className="text-2xl font-bold text-slate-200 mb-2">How can I help you today?</h2>
							<p className="text-slate-400 text-sm leading-relaxed">
								Ask me to check your placement eligibility, find upcoming workshops, or explain campus examination policies.
							</p>
						</motion.div>
					)}

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
						<div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.3)] mt-1">
							<Loader2 className="w-5 h-5 text-white animate-spin" />
						</div>
						<div className="glass-panel px-6 py-4 rounded-3xl rounded-tl-sm flex items-center gap-2 bg-slate-800/50 border border-white/5 shadow-md">
							<span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
							<span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
							<span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
						</div>
					</motion.div>
				)}
			</div>
			
			<div className="absolute bottom-0 left-0 w-full p-6 md:p-8 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-transparent z-20 pointer-events-none">
				<div className="max-w-4xl mx-auto relative pointer-events-auto">
					<div className="relative glass-panel rounded-3xl p-2 flex items-end gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 bg-slate-900/80 backdrop-blur-2xl transition-all focus-within:ring-purple-500/50 focus-within:border-purple-500/50">
						<TextareaAutosize
							minRows={1}
							maxRows={6}
							value={prompt}
							disabled={isTyping}
							onChange={(event) => setPrompt(event.target.value)}
							onKeyDown={onKeyDown}
							placeholder={
								isTyping ? "Dosth is reasoning..." : "Ask Dosth anything about campus..."
							}
							className="flex-1 bg-transparent border-none text-slate-100 px-4 py-3.5 focus:outline-none text-[15px] placeholder:text-slate-500 resize-none leading-relaxed disabled:cursor-not-allowed disabled:opacity-60 font-medium [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
						/>
						<button
							onClick={() => void send()}
							disabled={!prompt.trim() || isTyping}
							className="bg-white disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 p-3.5 rounded-2xl hover:bg-slate-200 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 mb-0.5 mr-0.5"
						>
							<Send className="w-5 h-5" />
						</button>
					</div>
					<div className="text-center mt-4 flex items-center justify-center gap-4">
						<p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
							<Sparkles className="w-3 h-3 text-purple-400" />
							Powered by Hermes Orchestrator Engine
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
