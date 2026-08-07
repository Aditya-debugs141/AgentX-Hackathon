import { motion } from "framer-motion";
import { Sparkles, CalendarDays, Briefcase, Zap, ArrowRight } from "lucide-react";

export default function LandingPage({ onStart }: { onStart: () => void }) {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.2,
				delayChildren: 0.1,
			},
		},
		exit: {
			opacity: 0,
			y: -50,
			transition: { duration: 0.4, ease: "easeInOut" },
		},
	};

	const itemUpVariants = {
		hidden: { opacity: 0, y: 40 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring", stiffness: 300, damping: 24 },
		},
	};

	const itemLeftVariants = {
		hidden: { opacity: 0, x: -60 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { type: "spring", stiffness: 200, damping: 20 },
		},
	};

	const itemRightVariants = {
		hidden: { opacity: 0, x: 60 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { type: "spring", stiffness: 200, damping: 20 },
		},
	};

	const cards = [
		{
			title: "Instant Answers",
			description: "Stop hunting through disjointed campus portals. Just ask in natural language and get immediate, accurate answers.",
			icon: <Zap className="w-6 h-6 text-yellow-400" />,
			variant: itemLeftVariants,
		},
		{
			title: "Smart Scheduling",
			description: "Automatically find workshops, register for events, and sync them directly to your Google Calendar.",
			icon: <CalendarDays className="w-6 h-6 text-emerald-400" />,
			variant: itemUpVariants,
		},
		{
			title: "Placement Lookup",
			description: "Check eligibility for upcoming drives, fetch placement policies, and prepare without the stress.",
			icon: <Briefcase className="w-6 h-6 text-blue-400" />,
			variant: itemRightVariants,
		},
	];

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0E14] to-[#13161c] text-slate-200 overflow-hidden"
		>
			{/* Background ambient glows */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none" />
			<div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />

			<div className="max-w-5xl w-full px-8 flex flex-col items-center relative z-10">
				{/* Hero Section */}
				<motion.div variants={itemUpVariants} className="text-center mb-16">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold tracking-wide mb-6">
						<Sparkles className="w-4 h-4" />
						Vasavi College of Engineering
					</div>
					<h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
						Meet AgentX
					</h1>
					<p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
						Your decentralized Smart Campus Assistant. Powered by the Hermes
						Orchestrator Engine to eliminate portal fatigue and streamline your
						college experience.
					</p>
				</motion.div>

				{/* Feature Plug Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
					{cards.map((card, idx) => (
						<motion.div
							key={idx}
							variants={card.variant}
							whileHover={{ y: -5, scale: 1.02 }}
							className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
							<div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-6 shadow-lg">
								{card.icon}
							</div>
							<h3 className="text-xl font-bold text-white mb-3">
								{card.title}
							</h3>
							<p className="text-sm text-slate-400 leading-relaxed">
								{card.description}
							</p>
						</motion.div>
					))}
				</div>

				{/* CTA Button */}
				<motion.div variants={itemUpVariants}>
					<button
						onClick={onStart}
						className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] cursor-pointer"
					>
						Launch Assistant
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</button>
				</motion.div>
			</div>
		</motion.div>
	);
}
