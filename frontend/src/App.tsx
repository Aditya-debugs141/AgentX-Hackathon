import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "./hooks/useChat";
import { useBackend } from "./hooks/useBackend";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";

export default function App() {
	const [isChatStarted, setIsChatStarted] = useState(false);
	const chat = useChat();
	const backend = useBackend();

	return (
		<div className="flex h-screen w-full overflow-hidden text-slate-100 font-sans selection:bg-purple-500/30 bg-[#0B0E14] relative">
			<AnimatePresence mode="wait">
				{!isChatStarted ? (
					<LandingPage key="landing" onStart={() => setIsChatStarted(true)} />
				) : (
					<motion.div
						key="chat"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="flex h-screen w-full"
					>
						<Sidebar agents={chat.agents} health={backend.health} onBack={() => setIsChatStarted(false)} />
						<ChatWindow
							messages={chat.messages}
							isTyping={chat.isResponding}
							onSend={chat.sendMessage}
						/>
						<button
							onClick={() => void backend.refresh()}
							title={`Backend: ${backend.health}`}
							className="fixed bottom-6 left-[19.5rem] z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-lg hover:bg-slate-800/80 transition-all cursor-pointer"
						>
							<span
								className={`relative inline-flex rounded-full h-3 w-3 ${backend.health === "online" ? "bg-emerald-500" : backend.health === "offline" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`}
							/>
							<span
								className={`text-[10px] font-mono uppercase tracking-wider font-bold ${backend.health === "online" ? "text-emerald-400" : backend.health === "offline" ? "text-red-400" : "text-yellow-400"}`}
							>
								{backend.health === "online"
									? "API Online"
									: backend.health === "offline"
										? "API Offline"
										: "Checking..."}
							</span>
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
