import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanFace } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [dob, setDob] = useState('');
    const [showToast, setShowToast] = useState(false);

    const handleAnalyze = () => {
        if (dob.trim().length > 0) {
            setShowToast(true);
            setTimeout(() => {
                navigate('/camera');
            }, 3000); // 3 seconds to read the insult
        } else {
            navigate('/camera');
        }
    };

    return (
        <div className="relative w-full h-[100dvh] flex flex-col items-center justify-center bg-black overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={`${import.meta.env.BASE_URL}skull_bg.jpg`}
                    alt="Skull Background"
                    className="w-full h-full object-cover opacity-50"
                    style={{ filter: 'grayscale(100%) contrast(120%)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
            </div>

            {/* Sarcastic Toast Overlay */}
            {showToast && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                >
                    <div className="bg-zinc-900 border border-red-500/50 p-6 rounded-xl max-w-sm text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                        <h3 className="text-xl font-bold text-red-500 mb-2">NICE TRY.</h3>
                        <p className="text-gray-300">
                            We don't believe you. <br />
                            <span className="text-white font-medium italic">"People judge you by your face, not your birthday."</span>
                        </p>
                        <div className="mt-4 text-xs text-gray-500 animate-pulse">
                            Analyzing the truth...
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Content Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white/10 rounded-full">
                        <ScanFace className="w-12 h-12 text-cyan-400" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
                    Age predictor
                </h1>

                <p className="text-gray-400 mb-8 text-sm">
                    Dare to face the truth? <br />
                    My algorithms are colder than your ex's heart.
                </p>

                <div className="space-y-4">
                    <div className="text-center">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. 12/05/1998"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 mt-1 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors text-center"
                        />
                        <p className="text-[10px] text-gray-600 mt-1">*We probably won't use this.</p>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        className="w-full bg-gradient-to-r from-cyan-600/20 to-cyan-400/20 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/30 text-cyan-400 font-bold py-3 rounded-lg transition-all duration-300 tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]"
                    >
                        ANALYZE MY FACE
                    </button>
                </div>
            </motion.div>

            <div className="absolute bottom-4 text-xs text-gray-600 z-10">
                NO REFUNDS ON EMOTIONAL DAMAGE
            </div>
        </div>
    );
};

export default LandingPage;
