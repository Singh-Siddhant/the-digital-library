import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Landmark, Book, Share2, Coffee, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Donate() {
  const [selectedAmount, setSelectedAmount] = useState('₹500');

  const handleDonate = () => {
    const numericAmount = parseInt(selectedAmount.replace(/[^\d]/g, ''), 10);
    if (isNaN(numericAmount)) return;

    if (typeof window.Razorpay === 'undefined') {
      alert("Razorpay checkout is loading, please try again in a few seconds.");
      return;
    }

    const options = {
      key: "rzp_test_placeholder",
      amount: numericAmount * 100,
      currency: "INR",
      name: "The Digital Library",
      description: "Community Support Donation",
      handler: function (response: any) {
        alert(`Thank you so much for your generous support of ${selectedAmount}! Your contribution keeps our library alive.`);
      },
      theme: { color: "#06b6d4" }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-20">
        <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="w-20 h-20 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500"
        >
          <Heart size={40} fill="currentColor" />
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">Support Our Community</h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          The Digital Library is built by students, for students. We rely on your contributions to keep the servers running and the library free for everyone.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        {/* Support financially */}
        <div className="glass-card p-10 space-y-8 flex flex-col items-start bg-gradient-to-br from-slate-900 to-indigo-950/30">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
            <Coffee className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Donate Funds</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Contribute to server costs, maintenance, and development of new features. Every small bit counts.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8 w-full">
               {['₹100', '₹500', '₹1000'].map(amt => (
                 <button 
                   key={amt} 
                   onClick={() => setSelectedAmount(amt)}
                   className={`py-3 rounded-xl border font-bold transition-all ${selectedAmount === amt ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-white'}`}
                 >
                   {amt}
                 </button>
               ))}
            </div>
            <button 
              onClick={handleDonate}
              className="w-full h-14 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
               Support with UPI <Landmark size={18} />
            </button>
          </div>
        </div>

        {/* Support with resources */}
        <div className="glass-card p-10 space-y-8 flex flex-col items-start bg-gradient-to-br from-slate-900 to-emerald-950/30">
          <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
            <Book className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Donate Resources</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              The richest contribution you can make is shared knowledge. Upload your notes, PYQs, or textbooks today.
            </p>
            <ul className="space-y-4 mb-10">
               {[
                 'Handwritten Semester Notes',
                 'Entrance Exam Solved Papers',
                 'Placement Interview Experiences',
                 'Technical Reference Guides'
               ].map(item => (
                 <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <Sparkles size={14} className="text-emerald-500" />
                    {item}
                 </li>
               ))}
            </ul>
            <a href="/upload" className="w-full h-14 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
               Upload Your Notes <Share2 size={18} />
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-32 text-center max-w-2xl mx-auto p-12 glass-card border-slate-800/50">
         <h3 className="text-xl font-bold mb-4">Wall of Gratitude</h3>
         <p className="text-slate-500 text-sm mb-8 leading-relaxed">
           We would like to thank our incredible community of contributors who have shared over 10,000 resources. You are the heartbeat of this platform.
         </p>
         <div className="flex flex-wrap justify-center gap-4">
            {['Ananya S.', 'Rahul M.', 'Priya K.', 'Vikram R.', 'Sneha T.'].map(name => (
              <span key={name} className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                {name}
              </span>
            ))}
            <span className="px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/20 text-xs font-medium text-blue-400 animate-pulse">
              And You?
            </span>
         </div>
      </div>
    </div>
  );
}
