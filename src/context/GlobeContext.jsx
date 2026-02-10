import React, { createContext, useContext, useRef, useCallback } from 'react';

const GlobeContext = createContext();

export const GlobeProvider = ({ children }) => {
    const globeRef = useRef();

    const flyTo = useCallback((lat, lng, altitude = 1.5) => {
        if (globeRef.current) {
            globeRef.current.pointOfView({ lat, lng, altitude }, 2000);
        } else {
            console.warn("Globe ref not ready");
        }
    }, []);

    return (
        <GlobeContext.Provider value={{ globeRef, flyTo }}>
            {children}
        </GlobeContext.Provider>
    );
};

export const useGlobe = () => {
    const context = useContext(GlobeContext);
    if (!context) {
        // Fallback if used outside provider (mostly for safe building/testing)
        return { flyTo: () => console.log("Globe context missing") };
    }
    return context;
};
