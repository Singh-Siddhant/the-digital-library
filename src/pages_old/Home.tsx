import { motion } from 'motion/react';
import { BookOpen, Search, Briefcase, Heart, Rocket, GraduationCap, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { name: 'GATE Archive', path: '/explore?category=GATE' },
  { name: 'UPSC Notes', path: '/explore?category=UPSC' },
  { name: 'Career Updates', path: '/jobs' },
  { name: 'SSC Prep', path: '/explore?category=SSC' },
  { name: 'Internships', path: '/jobs' },
];

const features = [
  {
    title: "Academic Excellence",
    description: "Access curated notes, previous year questions, and textbooks tailored for Indian universities.",
    icon: GraduationCap,
    color: "blue"
  },
  {
    title: "Competitive Ready",
    description: "Specialized resources for GATE, UPSC, SSC, and CAT to help you ace your entrance exams.",
    icon: Rocket,
    color: "purple"
  },
  {
    title: "Career Advancement",
    description: "Real-time job and internship updates integrated with placement preparation guides.",
    icon: Briefcase,
    color: "emerald"
  }
];

export default function Home() {
  return (
    <div className="immersive-bg min-h-[calc(100vh-64px)]">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-400/10 border border-cyan-400/20 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              All-in-One Learning Resource
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 text-white">
              The Digital <span className="text-cyan-400">Library</span>
            </h1>
            <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed px-4">
              Experience a restricted viewing ecosystem for Indian scholars. Curated notes, PYQs, and career pathways accessible in one unified archive.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 px-4">
              <Link to="/explore" className="w-full sm:w-auto px-10 py-4 rounded-xl bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 neon-glow-cyan hover:bg-cyan-400 transition-all active:scale-95">
                Explore Resources <ChevronRight size={20} />
              </Link>
              <Link to="/jobs" className="w-full sm:w-auto px-10 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                Latest Job Updates
              </Link>
            </div>

            {/* Quick Access Bar */}
            <div className="max-w-4xl mx-auto mx-4 p-4 glass-card bg-white/[0.02] flex flex-col sm:flex-row justify-center items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest sm:border-r sm:border-white/10 sm:pr-6">
                <Zap size={14} className="text-yellow-500" />
                Quick Access
              </div>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                {quickLinks.map((link) => (
                  <Link key={link.name} to={link.path} className="text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Heartbeat Section */}
      <section className="py-24 relative z-10 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Heart className="text-pink-500" size={24} />
          </div>
          <h2 className="text-3xl font-display font-bold text-white mb-6">Community Heartbeat</h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            We would like to thank our incredible community of contributors who have shared over 10,000 resources. You are the heartbeat of this platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Ananya S.', 'Rahul M.', 'Priya K.', 'Vikram R.'].map((name) => (
              <div key={name} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-10 flex flex-col items-start gap-8 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/50 transition-all`}>
                  <feature.icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
                <div className="mt-auto pt-6 w-full">
                  <Link to={feature.title === 'Career Advancement' ? '/jobs' : '/explore'} className="text-sm font-bold text-cyan-400 hover:text-white transition-colors">
                    Explore Now →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
