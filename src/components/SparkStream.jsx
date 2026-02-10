import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const SparkStream = () => {
    const { ideas } = useAppContext();
    const [activity, setActivity] = useState("Welcome to World of Ideas...");

    // Generate dynamic activities from real ideas
    const generateActivities = () => {
        if (!ideas || ideas.length === 0) {
            return [
                "New idea from Tokyo: 'Bio-luminescent Streetlights'...",
                "🔱 5 people forked 'Federal Right to Disconnect' in the last hour...",
                "💬 'Underground Maglev' is trending in Infrastructure...",
                "Someone in London just submitted a Policy change...",
                "🔥 'Micro-Modular Solar' just hit #1 on Daily Top..."
            ];
        }

        const actions = [
            (idea) => `🔱 "${idea.title}" was just forked...`,
            (idea) => `💬 Hot discussion on "${idea.title}"...`,
            (idea) => `⚡ ${idea.votes || 0} sparks on "${idea.title}"...`,
            (idea) => `🔥 "${idea.title}" is trending in ${idea.type || 'Ideas'}...`,
            (idea) => `🛡️ Someone just red-teamed "${idea.title}"...`,
            (idea) => `🪙 New coins staked on "${idea.title}"...`,
        ];

        return ideas.slice(0, 10).map(idea => {
            const action = actions[Math.floor(Math.random() * actions.length)];
            return action(idea);
        });
    };

    useEffect(() => {
        const activities = generateActivities();
        if (activities.length > 0) {
            setActivity(activities[0]);
        }

        const interval = setInterval(() => {
            const currentActivities = generateActivities();
            const random = currentActivities[Math.floor(Math.random() * currentActivities.length)];
            setActivity(random);
        }, 5000);
        return () => clearInterval(interval);
    }, [ideas]);

    return (
        <div className="spark-stream" style={{
            background: '#2D3436',
            color: '#dfe6e9',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            textAlign: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 999
        }}>
            <span className="fade-in-text">{activity}</span>
        </div>
    );
};

export default SparkStream;
