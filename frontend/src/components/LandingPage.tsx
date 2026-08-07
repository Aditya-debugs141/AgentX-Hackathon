import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, CalendarDays, Briefcase, Zap, ArrowRight, BrainCircuit, ShieldCheck, Clock } from "lucide-react";

const TiltCard = ({ card, index }: { card: any, index: number }) => {
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
	const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;
		x.set(xPct);
		y.set(yPct);
	};

	const handleMouseLeave = () => {
		x.set(0);
		y.set(0);
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

	return (
		<motion.div
			variants={itemUpVariants}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			style={{
				rotateX,
				rotateY,
				transformStyle: "preserve-3d",
			}}
			className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl bg-slate-900/40 relative overflow-hidden group transition-colors duration-300 hover:bg-slate-800/50 hover:border-white/10"
		>
			<div 
				style={{ transform: "translateZ(30px)" }}
				className="w-10 h-10 rounded-2xl bg-slate-950/80 border border-slate-700/50 flex items-center justify-center mb-5 shadow-inner"
			>
				{card.icon}
			</div>
			<h3 
				style={{ transform: "translateZ(40px)" }}
				className="text-lg font-bold text-slate-100 mb-2 tracking-tight"
			>
				{card.title}
			</h3>
			<p 
				style={{ transform: "translateZ(20px)" }}
				className="text-sm text-slate-400 leading-relaxed font-medium"
			>
				{card.description}
			</p>
			
			<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
		</motion.div>
	);
};


export default function LandingPage({ onStart }: { onStart: () => void }) {
	const [typedText, setTypedText] = useState("");
	const fullText = "Meet Dosth.";

	useEffect(() => {
		let i = 0;
		const typingInterval = setInterval(() => {
			if (i < fullText.length) {
				setTypedText(fullText.substring(0, i + 1));
				i++;
			} else {
				clearInterval(typingInterval);
			}
		}, 100);
		return () => clearInterval(typingInterval);
	}, []);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
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
			title: "Deterministic Execution",
			description: "Bypasses portal fatigue. Ask in natural language, and the engine flawlessly computes and executes the correct API paths.",
			icon: <Zap className="w-5 h-5 text-yellow-400" />,
		},
		{
			title: "Self-Healing State",
			description: "If an upstream service fails, Dosth autonomously reads the stack trace, rewrites its execution path, and recovers.",
			icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
		},
		{
			title: "Zero-Latency Memory",
			description: "Maintains absolute conversation state and user context without ever exposing raw tokens to the client browser.",
			icon: <Clock className="w-5 h-5 text-teal-400" />,
		},
		{
			title: "Smart Scheduling",
			description: "Identifies conflicting events, registers you for workshops, and commits them securely to your personal calendar.",
			icon: <CalendarDays className="w-5 h-5 text-emerald-400" />,
		},
		{
			title: "Placement Intelligence",
			description: "Instantly scrapes and synthesizes eligibility criteria and company policies so you are always prepared.",
			icon: <Briefcase className="w-5 h-5 text-blue-400" />,
		},
		{
			title: "Hermes 3-Layer Logic",
			description: "Built on an advanced orchestrator that physically separates reasoning, formatting, and secure API bridging.",
			icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
		},
	];

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B0E14] text-slate-200 overflow-hidden"
		>
			{/* Dramatic Background glow */}
			<motion.div 
				animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }} 
				transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 blur-[180px] rounded-full pointer-events-none" 
			/>
			<motion.div 
				animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} 
				transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
				className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/20 blur-[180px] rounded-full pointer-events-none" 
			/>

			{/* Split Screen Layout */}
			<div className="max-w-[1400px] w-full h-full px-8 md:px-16 flex flex-col lg:flex-row items-center relative z-10 gap-16 py-12">
				
				{/* Left Side: Copy & CTA */}
				<div className="flex-1 flex flex-col justify-center max-w-xl">
					<motion.div variants={itemUpVariants}>
						<div 
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 shadow-lg text-slate-300 text-xs font-semibold tracking-wide mb-8 backdrop-blur-md cursor-default"
						>
							<Sparkles className="w-4 h-4 text-purple-400" />
							Vasavi College of Engineering
						</div>
					</motion.div>
					
					<motion.h1 
						variants={itemUpVariants}
						className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-600 drop-shadow-sm min-h-[1em]"
					>
						{typedText}
						<motion.span 
							animate={{ opacity: [0, 1, 0] }}
							transition={{ repeat: Infinity, duration: 0.8 }}
							className="inline-block ml-1 w-1 lg:w-2 h-[0.8em] bg-white align-baseline" 
						/>
					</motion.h1>

					<motion.p 
						variants={itemUpVariants}
						className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium mb-10"
					>
						Your Autonomous Smart Campus Assistant. Powered by a deterministic reasoning engine to eliminate portal fatigue and instantly synthesize college logistics.
					</motion.p>

					<motion.div variants={itemUpVariants}>
						<button
							onClick={onStart}
							className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] cursor-pointer"
						>
							Launch Dosth
							<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
						</button>
					</motion.div>
				</div>

				{/* Right Side: 3D Grid */}
				<div className="flex-1 w-full h-full flex items-center justify-center relative perspective-[2000px]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-h-[80vh] overflow-y-auto lg:overflow-visible pr-4 custom-scrollbar pb-10 pt-10">
						{cards.map((card, idx) => (
							<div key={idx} className={idx % 2 === 1 ? "md:mt-12" : ""}>
								<TiltCard card={card} index={idx} />
							</div>
						))}
					</div>
				</div>

			</div>
		</motion.div>
	);
}
