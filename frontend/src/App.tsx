import { useChat } from "./hooks/useChat";
import { useBackend } from "./hooks/useBackend";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";

export default function App() {
	const chat = useChat();
	const backend = useBackend();
	return (
		<div className="flex h-screen w-full overflow-hidden text-slate-100 font-sans selection:bg-purple-500/30">
			<Sidebar agents={chat.agents} health={backend.health} />
			<ChatWindow
				messages={chat.messages}
				isTyping={chat.isTyping}
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
		</div>
	);
}
