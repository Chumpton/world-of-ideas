import React, { useState, useEffect } from 'react';

const QuickSubmit = ({ onExpand }) => {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = [
        "What's your Invention?",
        "What's your Policy change?",
        "Share an Idea...",
        "Solve a Problem..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hero-input-container">
            <div
                className="hero-input-trigger"
                onClick={() => onExpand('')}
            >
                <span key={placeholderIndex} className="input-anim fade-in">
                    {placeholders[placeholderIndex]}
                </span>
            </div>
        </div>
    );
};

export default QuickSubmit;
