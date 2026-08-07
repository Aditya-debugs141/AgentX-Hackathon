import { motion } from "framer-motion";
import { Sparkles, CalendarDays, Briefcase, Zap, ArrowRight, BrainCircuit, ShieldCheck, Clock } from "lucide-react";

export default function LandingPage({ onStart }: { onStart: () => void }) {
	// Smoother, highly polished stagger animations
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
				delayChildren: 0.1,
			},
		},
		exit: {
			opacity: 0,
			y: -40,
			transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
		},
	};

	const itemUpVariants = {
		hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
		visible: {
			opacity: 1,
			y: 0,
			filter: "blur(0px)",
			transition: { type: "spring", stiffness: 100, damping: 20 },
		},
	};

	const cards = [
		{
			title: "Instant Answers",
			description: "Stop hunting through disjointed campus portals. Just ask in natural language and get immediate, accurate answers.",
			icon: <Zap className="w-5 h-5 text-yellow-400" />,
		},
		{
			title: "Smart Scheduling",
			description: "Automatically find workshops, register for events, and sync them directly to your Google Calendar.",
			icon: <CalendarDays className="w-5 h-5 text-emerald-400" />,
		},
		{
			title: "Placement Lookup",
			description: "Check eligibility for upcoming drives, fetch placement policies, and prepare without the stress.",
			icon: <Briefcase className="w-5 h-5 text-blue-400" />,
		},
		{
			title: "Deep Reasoning Engine",
			description: "Powered by the Hermes 3-Layer Architecture. Watch the AI's real-time thought process and execution trace.",
			icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
		},
		{
			title: "Self-Healing Workflows",
			description: "If an external API fails, Dosth autonomously reads the error, rewrites its execution script, and recovers instantly.",
			icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
		},
		{
			title: "Stateful Memory",
			description: "Remembers conversation context perfectly without exposing secure API keys to the frontend browser.",
			icon: <Clock className="w-5 h-5 text-teal-400" />,
		},
	];

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0E14] via-[#0f1219] to-[#13161c] text-slate-200 overflow-y-auto overflow-x-hidden pt-20 pb-24"
		>
			{/* Smoother Background ambient glows */}
			<motion.div 
				animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.15, 0.1] }} 
				transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-0 right-0 w-[700px] h-[700px] bg-purple-600/20 blur-[180px] rounded-full pointer-events-none" 
			/>
			<motion.div 
				animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }} 
				transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
				className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-600/20 blur-[180px] rounded-full pointer-events-none" 
			/>

			<div className="max-w-6xl w-full px-8 flex flex-col items-center relative z-10 my-auto">
				{/* Hero Section */}
				<motion.div variants={itemUpVariants} className="text-center mb-16">
					<motion.div 
						whileHover={{ scale: 1.05 }}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 shadow-lg text-slate-300 text-xs font-semibold tracking-wide mb-8 backdrop-blur-md cursor-default"
					>
						<Sparkles className="w-4 h-4 text-purple-400" />
						Vasavi College of Engineering
					</motion.div>
					<h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 drop-shadow-sm">
						Meet Dosth
					</h1>
					<p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
						Your decentralized Smart Campus Assistant. Powered by the Hermes
						Orchestrator Engine to eliminate portal fatigue and seamlessly synchronize your college life.
					</p>
				</motion.div>

				{/* Feature Plug Cards (Grid of 6) */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-16">
					{cards.map((card, idx) => (
						<motion.div
							key={idx}
							variants={itemUpVariants}
							whileHover={{ y: -8, scale: 1.02 }}
							className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl bg-slate-900/30 relative overflow-hidden group transition-all duration-300 hover:bg-slate-800/40 hover:border-white/10"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
							<div className="w-10 h-10 rounded-2xl bg-slate-950/50 border border-slate-700/50 flex items-center justify-center mb-5 shadow-inner">
								{card.icon}
							</div>
							<h3 className="text-lg font-bold text-slate-100 mb-2 tracking-tight">
								{card.title}
							</h3>
							<p className="text-sm text-slate-400 leading-relaxed font-medium">
								{card.description}
							</p>
						</motion.div>
					))}
				</div>

				{/* CTA Button */}
				<motion.div variants={itemUpVariants}>
					<button
						onClick={onStart}
						className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] cursor-pointer"
					>
						Launch Dosth
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</button>
				</motion.div>
			</div>
		</motion.div>
	);
}
