import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, CalendarDays, Briefcase, FileText, ArrowRight } from "lucide-react";

const TiltCard = ({ card }: { card: any }) => {
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
			className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl bg-slate-900/40 relative overflow-hidden group transition-colors duration-300 hover:bg-slate-800/60 hover:border-white/10 h-full flex flex-col"
		>
			<div 
				style={{ transform: "translateZ(30px)" }}
				className="w-12 h-12 rounded-2xl bg-slate-950/80 border border-slate-700/50 flex items-center justify-center mb-6 shadow-inner"
			>
				{card.icon}
			</div>
			<h3 
				style={{ transform: "translateZ(40px)" }}
				className="text-xl font-bold text-slate-100 mb-3 tracking-tight"
			>
				{card.title}
			</h3>
			<p 
				style={{ transform: "translateZ(20px)" }}
				className="text-sm text-slate-400 leading-relaxed font-medium flex-1"
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

	// Strictly aligned to PRD Problem Statement & Core Agents
	const cards = [
		{
			title: "Placement Eligibility",
			description: "Instantly check your eligibility against company criteria for upcoming placement drives based on your profile.",
			icon: <Briefcase className="w-6 h-6 text-blue-400" />,
		},
		{
			title: "Workshop Registration",
			description: "Find upcoming campus workshops, register seamlessly, and sync them directly to your personal calendar.",
			icon: <CalendarDays className="w-6 h-6 text-emerald-400" />,
		},
		{
			title: "Campus Policies",
			description: "Query examination rules and campus policies instantly through our secure Knowledge RAG system.",
			icon: <FileText className="w-6 h-6 text-purple-400" />,
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

			{/* Vertical Centered Layout for Maximum Visibility Above the Fold */}
			<div className="max-w-6xl w-full px-8 flex flex-col items-center justify-center relative z-10 h-full py-8">
				
				{/* Hero Section */}
				<div className="flex flex-col items-center text-center max-w-3xl mb-12">
					<motion.div variants={itemUpVariants}>
						<div 
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 shadow-lg text-slate-300 text-xs font-semibold tracking-wide mb-6 backdrop-blur-md cursor-default"
						>
							<Sparkles className="w-4 h-4 text-purple-400" />
							Vasavi College of Engineering
						</div>
					</motion.div>
					
					<motion.h1 
						variants={itemUpVariants}
						className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-600 drop-shadow-sm min-h-[1em]"
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
						className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium mb-8"
					>
						Your Unified Smart Campus Assistant. Stop navigating fragmented portals—simply chat to autonomously execute campus workflows.
					</motion.p>

					<motion.div variants={itemUpVariants}>
						<button
							onClick={onStart}
							className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] cursor-pointer"
						>
							Launch Dosth
							<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
						</button>
					</motion.div>
				</div>

				{/* Horizontal Grid (Fits perfectly above fold) */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
					{cards.map((card, idx) => (
						<TiltCard key={idx} card={card} />
					))}
				</div>

			</div>
		</motion.div>
	);
}
