import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * EditableText Component
 * Wraps text content. If Developer Mode is on, allows editing and saving local overrides.
 * 
 * @param {string} id - Unique ID for this text element (for persistence)
 * @param {string} defaultText - The default text to show
 * @param {object} style - Optional styles
 * @param {string} tag - HTML tag to use (default: span)
 */
const EditableText = ({ id, defaultText, style, tag = 'span', className, children }) => {
    const { developerMode } = useAppContext();
    const [text, setText] = useState(defaultText || children);
    const [isEditing, setIsEditing] = useState(false);

    // Load override from localStorage on mount
    useEffect(() => {
        try {
            const overrides = JSON.parse(localStorage.getItem('woi_text_overrides') || '{}');
            if (overrides[id]) {
                setText(overrides[id]);
            }
        } catch (e) {
            console.error("Failed to load text overrides", e);
        }
    }, [id]);

    const handleSave = () => {
        setIsEditing(false);
        try {
            const overrides = JSON.parse(localStorage.getItem('woi_text_overrides') || '{}');
            overrides[id] = text;
            localStorage.setItem('woi_text_overrides', JSON.stringify(overrides));
        } catch (e) {
            console.error("Failed to save text overrides", e);
        }
    };

    const Tag = tag;

    if (developerMode) {
        if (isEditing) {
            return (
                <div style={{ display: 'inline-block' }}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleSave}
                        autoFocus
                        style={{
                            ...style,
                            border: '2px solid #fdcb6e',
                            background: '#fff3cd',
                            padding: '4px',
                            borderRadius: '4px',
                            minWidth: '100px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit'
                        }}
                    />
                </div>
            );
        }

        return (
            <Tag
                className={className}
                style={{
                    ...style,
                    border: '1px dashed #fdcb6e',
                    cursor: 'text',
                    position: 'relative',
                    display: 'inline-block'
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                }}
                title={`DevMode: Click to edit (${id})`}
            >
                {text}
                <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    fontSize: '0.8rem',
                    background: '#fdcb6e',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2d3436',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>✎</span>
            </Tag>
        );
    }

    return (
        <Tag className={className} style={style}>
            {text}
        </Tag>
    );
};

export default EditableText;
