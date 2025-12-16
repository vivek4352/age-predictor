import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanFace } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [dob, setDob] = useState('');
    const [countdown, setCountdown] = useState<number | null>(null);
    const [dobError, setDobError] = useState('');

    const formatDOB = (value: string) => {
        // Remove non-digits
        const cleaned = value.replace(/\D/g, '');

        // Format as DD/MM/YYYY
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
            formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
        }
        return formatted;
    };

    const validateDOB = (dateString: string): boolean => {
        if (!dateString) return true; // Optional

        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dateString)) return false;

        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        const now = new Date();

        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
            return false; // Invalid date (e.g., 31/02/2000)
        }

        if (year < 1900 || date > now) {
            return false; // Unreasonable year
        }

        return true;
    };

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Prevent typing more than 10 chars (10/10/1000)
        if (val.length > 10) return;

        // Handle deletion logic (allow deleting slashes naturally)
        // If length is less, just set it. If length is more, format it.
        if (val.length < dob.length) {
            setDob(val);
            setDobError('');
            return;
        }

        const formatted = formatDOB(val);
        setDob(formatted);
        setDobError('');
    };

    const handleAnalyze = () => {
        // Validate DOB
        if (dob && !validateDOB(dob)) {
            setDobError("Wrong DOB. Please fill it again.");
            return;
        }

        // Start Countdown
        setCountdown(5);
    };

    React.useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Countdown finished
            navigate('/camera');
        }
    }, [countdown, navigate]);

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

            {/* Countdown Overlay */}
            {countdown !== null && (
                <motion.div
                    key="countdown"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
                >
                    <motion.div
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 drop-shadow-[0_0_50px_rgba(168,85,247,0.5)]"
                    >
                        {countdown}
                    </motion.div>
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
                            placeholder="DD/MM/YYYY"
                            value={dob}
                            onChange={handleDobChange}
                            maxLength={10}
                            className={`w-full bg-white/5 border ${dobError ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-lg px-4 py-3 mt-1 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors text-center`}
                        />
                        {dobError && (
                            <p className="text-red-500 text-xs mt-2 font-bold animate-pulse">{dobError}</p>
                        )}
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

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
