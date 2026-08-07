import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, ArrowRight, GraduationCap, Briefcase, CalendarDays, Users, Mail, Library } from "lucide-react";

const TiltCard = ({ card, index }: { card: any, index: number }) => {
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
	const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

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

	return (
		<motion.div
			initial={{ opacity: 0, x: 50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.5, delay: 0.2 + index * 0.1, type: "spring" }}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			style={{
				rotateX,
				rotateY,
				transformStyle: "preserve-3d",
			}}
			className="glass-panel p-5 rounded-3xl border border-white/5 shadow-xl bg-slate-900/40 relative overflow-hidden group transition-colors duration-300 hover:bg-slate-800/60 hover:border-white/10 h-full flex flex-col"
		>
			<div className="flex items-center gap-3 mb-3">
				<div 
					style={{ transform: "translateZ(20px)" }}
					className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-700/50 flex items-center justify-center shadow-inner shrink-0"
				>
					{card.icon}
				</div>
				<h3 
					style={{ transform: "translateZ(30px)" }}
					className="text-lg font-bold text-slate-100 tracking-tight"
				>
					{card.title}
				</h3>
			</div>
			
			<p 
				style={{ transform: "translateZ(20px)" }}
				className="text-xs text-slate-400 leading-relaxed font-medium flex-1"
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
			transition: { staggerChildren: 0.1 },
		},
		exit: {
			opacity: 0,
			y: -40,
			transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
		},
	};

	const cards = [
		{
			title: "Academics",
			description: "Ask about course info, timetables, attendance status, and upcoming exam schedules.",
			icon: <GraduationCap className="w-5 h-5 text-blue-400" />,
		},
		{
			title: "Placements",
			description: "Ask to check internship opportunities, your company eligibility, and for resume analysis.",
			icon: <Briefcase className="w-5 h-5 text-emerald-400" />,
		},
		{
			title: "Events & Workshops",
			description: "Ask to discover workshops, register for hackathons, and set event calendar reminders.",
			icon: <CalendarDays className="w-5 h-5 text-purple-400" />,
		},
		{
			title: "Student Services",
			description: "Ask for hostel information, library services, scholarships, and campus transport details.",
			icon: <Users className="w-5 h-5 text-rose-400" />,
		},
		{
			title: "Communications",
			description: "Ask to draft professional emails, send notifications, and schedule appointments.",
			icon: <Mail className="w-5 h-5 text-amber-400" />,
		},
		{
			title: "Campus Knowledge",
			description: "Ask for summaries of campus policies, handbooks, circulars, and general FAQs.",
			icon: <Library className="w-5 h-5 text-cyan-400" />,
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

			{/* Left/Right Split Layout */}
			<div className="max-w-7xl w-full px-8 flex flex-col lg:flex-row items-center justify-between relative z-10 h-full py-12 gap-12">
				
				{/* Left Side: Hero Text */}
				<div className="flex flex-col items-start text-left w-full lg:w-[45%]">
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<div 
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 shadow-lg text-slate-300 text-xs font-semibold tracking-wide mb-6 backdrop-blur-md cursor-default"
						>
							<Sparkles className="w-4 h-4 text-purple-400" />
							Vasavi College of Engineering
						</div>
					</motion.div>
					
					<motion.h1 
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
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-lg text-slate-400 leading-relaxed font-medium mb-10 max-w-lg"
					>
						Your Unified Smart Campus Assistant. Ask Dosth anything—from checking your placement eligibility to finding upcoming workshops.
					</motion.p>

					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
					>
						<button
							onClick={onStart}
							className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] cursor-pointer"
						>
							Launch Dosth
							<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
						</button>
					</motion.div>
				</div>

				{/* Right Side: Cards Grid */}
				<div className="w-full lg:w-[55%]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{cards.map((card, idx) => (
							<TiltCard key={idx} card={card} index={idx} />
						))}
					</div>
				</div>

			</div>
		</motion.div>
	);
}
