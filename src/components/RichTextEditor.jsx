import React, { useRef } from 'react';

const ToolbarButton = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        title={label}
        style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '14px',
            borderRadius: '12px',
            transition: 'background 0.2s, color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-pill-hover)';
            e.currentTarget.style.color = 'var(--color-text-main)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
    >
        {icon}
    </button>
);

const Divider = () => (
    <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 4px' }}></div>
);

const RichTextEditor = ({ value, onChange, placeholder, onSubmit, onCancel, submitLabel = "Comment", onImageUpload = null, maxImageBytes = 5 * 1024 * 1024 }) => {
    const textareaRef = useRef(null);

    const applyWrap = (prefix, suffix = prefix, fallback = '') => {
        const el = textareaRef.current;
        if (!el) {
            onChange(`${value}${prefix}${fallback}${suffix}`);
            return;
        }
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const selected = value.slice(start, end);
        const insertion = `${prefix}${selected || fallback}${suffix}`;
        const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
            const pos = start + insertion.length;
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    };

    const applyLinePrefix = (prefix, fallback = '') => {
        const el = textareaRef.current;
        if (!el) {
            onChange(`${value}\n${prefix}${fallback}`);
            return;
        }
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const selected = value.slice(start, end);
        const line = selected || fallback;
        const insertion = `\n${prefix}${line}`;
        const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
            const pos = start + insertion.length;
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    };

    const insertMarkdown = (syntax) => {
        switch (syntax) {
            case 'bold': applyWrap('**', '**', 'bold'); break;
            case 'italic': applyWrap('*', '*', 'italic'); break;
            case 'strikethrough': applyWrap('~~', '~~', 'strike'); break;
            case 'code': applyWrap('`', '`', 'code'); break;
            case 'link': applyWrap('[', '](url)', 'title'); break;
            case 'list': applyLinePrefix('- ', 'item'); break;
            case 'quote': applyLinePrefix('> ', 'quote'); break;
            default: break;
        }
    };

    const handleInsertImage = async (file) => {
        if (!file || typeof onImageUpload !== 'function') return;
        if (file.size > maxImageBytes) {
            alert(`Image too large. Max ${Math.floor(maxImageBytes / (1024 * 1024))}MB.`);
            return;
        }
        const uploaded = await onImageUpload(file);
        if (!uploaded) return;
        applyWrap('![image](', ')', uploaded);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-pill)', // Pill background
            border: '1px solid var(--color-border)',
            borderRadius: '24px', // Highly rounded
            overflow: 'hidden',
            fontFamily: 'inherit',
            boxShadow: 'var(--shadow-soft)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-secondary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
            {/* Toolbar - Minimalist & Transparent */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                borderBottom: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: '2px',
                background: 'transparent'
            }}>
                <ToolbarButton icon={<span style={{ fontWeight: 'bold' }}>B</span>} label="Bold" onClick={() => insertMarkdown('bold')} />
                <ToolbarButton icon={<span style={{ fontStyle: 'italic', fontFamily: 'serif' }}>i</span>} label="Italic" onClick={() => insertMarkdown('italic')} />
                <ToolbarButton icon={<span style={{ textDecoration: 'line-through' }}>S</span>} label="Strikethrough" onClick={() => insertMarkdown('strikethrough')} />
                <Divider />
                <ToolbarButton icon={<span style={{ fontFamily: 'monospace' }}>&lt;&gt;</span>} label="Code" onClick={() => insertMarkdown('code')} />
                <ToolbarButton icon="🔗" label="Link" onClick={() => insertMarkdown('link')} />
                <Divider />
                <ToolbarButton icon="≡" label="List" onClick={() => insertMarkdown('list')} />
                <ToolbarButton icon="❝" label="Quote" onClick={() => insertMarkdown('quote')} />

                <div style={{ flex: 1 }}></div>

                <button
                    type="button"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: 0.8,
                        fontWeight: '600'
                    }}
                >
                    Markdown
                </button>
            </div>

            {/* Editing Area */}
            <textarea
                ref={textareaRef}
                name="rich_text_editor"
                value={value}
                onChange={e => onChange(e.target.value)}
                onDrop={async (e) => {
                    if (!onImageUpload) return;
                    e.preventDefault();
                    const file = e.dataTransfer?.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                        await handleInsertImage(file);
                    }
                }}
                onPaste={async (e) => {
                    if (!onImageUpload) return;
                    const files = Array.from(e.clipboardData?.files || []);
                    const image = files.find((f) => f.type.startsWith('image/'));
                    if (!image) return;
                    e.preventDefault();
                    await handleInsertImage(image);
                }}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '16px',
                    background: 'transparent',
                    color: 'var(--color-text-main)',
                    border: 'none',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: '1.6',
                    fontSize: '0.95rem'
                }}
            />

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end', // Aligned to right as single item
                alignItems: 'center',
                padding: '8px 16px 12px 16px',
                background: 'transparent'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!value.trim()}
                        style={{
                            padding: '6px 20px',
                            borderRadius: '20px', // Pill
                            border: 'none',
                            background: value.trim() ? 'var(--color-primary)' : 'var(--color-border)',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: value.trim() ? 'pointer' : 'not-allowed',
                            transition: '0.2s',
                            boxShadow: value.trim() ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RichTextEditor;
