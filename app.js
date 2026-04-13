/**
 * File Structurer — Local Batch File Organizer
 * Core Logic (app.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // === State ===
    const state = {
        files: [], // Array of { id, file, originalName, newName, hint }
        bucket: '',
        group: '',
        memo: '',
        hintMode: 'auto',
        customHint: '',
        dateMode: 'today',
        customDate: '',
        history: []
    };

    // === DOM Elements ===
    const el = {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        browseBtn: document.getElementById('browse-btn'),
        fileCount: document.getElementById('file-count'),
        fileSummary: document.getElementById('file-list-summary'),
        clearAllBtn: document.getElementById('clear-all-btn'),
        
        bucketSelect: document.getElementById('bucket-select'),
        groupInput: document.getElementById('group-input'),
        groupHistory: document.getElementById('group-history'),
        memoInput: document.getElementById('memo-input'),
        hintRadios: document.getElementsByName('hint-mode'),
        customHintGroup: document.getElementById('custom-hint-group'),
        customHintInput: document.getElementById('custom-hint-input'),
        
        dateRadios: document.getElementsByName('date-mode'),
        customDateGroup: document.getElementById('custom-date-group'),
        customDateInput: document.getElementById('custom-date-input'),
        
        previewTable: document.getElementById('preview-table'),
        previewBody: document.getElementById('preview-body'),
        emptyPreview: document.getElementById('empty-preview'),
        generateBtn: document.getElementById('generate-btn')
    };

    // === Initialization ===
    function init() {
        loadHistory();
        loadSettings();
        bindEvents();
        updateUI();
    }

    // === Events ===
    function bindEvents() {
        // File Selection
        el.browseBtn.addEventListener('click', () => el.fileInput.click());
        el.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
        
        // Drag & Drop
        el.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.dropZone.classList.add('drag-over');
        });
        el.dropZone.addEventListener('dragleave', () => {
            el.dropZone.classList.remove('drag-over');
        });
        el.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            el.dropZone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

        // Inputs
        el.bucketSelect.addEventListener('change', (e) => {
            state.bucket = e.target.value;
            updateUI();
        });
        el.groupInput.addEventListener('input', (e) => {
            state.group = e.target.value;
            updateUI();
        });
        el.memoInput.addEventListener('input', (e) => {
            state.memo = e.target.value;
            updateUI();
        });
        el.customHintInput.addEventListener('input', (e) => {
            state.customHint = e.target.value;
            updateUI();
        });

        // Hint Mode Radios
        el.hintRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.hintMode = e.target.value;
                if (state.hintMode === 'custom') {
                    el.customHintGroup.classList.remove('hidden');
                } else {
                    el.customHintGroup.classList.add('hidden');
                }
                saveSettings();
                updateUI();
            });
        });

        // Date Mode Radios
        el.dateRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.dateMode = e.target.value;
                if (state.dateMode === 'custom') {
                    el.customDateGroup.classList.remove('hidden');
                } else {
                    el.customDateGroup.classList.add('hidden');
                }
                saveSettings();
                updateUI();
            });
        });

        el.customDateInput.addEventListener('change', (e) => {
            state.customDate = e.target.value;
            saveSettings();
            updateUI();
        });

        // Clear All
        el.clearAllBtn.addEventListener('click', () => {
            state.files = [];
            el.fileInput.value = '';
            updateUI();
        });

        // Generate
        el.generateBtn.addEventListener('click', generateArchive);
    }

    // === Core Logic ===

    function handleFiles(fileList) {
        if (!fileList.length) return;
        
        const newFiles = Array.from(fileList).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            originalName: file.name
        }));

        state.files = [...state.files, ...newFiles].slice(0, 200); // Limit to 200
        updateUI();
    }

    function removeFile(id) {
        state.files = state.files.filter(f => f.id !== id);
        updateUI();
    }

    function updateUI() {
        // Update summary
        if (state.files.length > 0) {
            el.fileSummary.classList.remove('hidden');
            el.fileCount.textContent = `${state.files.length} file${state.files.length > 1 ? 's' : ''} selected`;
            el.emptyPreview.classList.add('hidden');
        } else {
            el.fileSummary.classList.add('hidden');
            el.emptyPreview.classList.remove('hidden');
        }

        // Renaming logic and Preview table
        renderPreview();

        // Enable/Disable Generate button
        const isReady = state.files.length > 0 && state.bucket && state.group.trim();
        el.generateBtn.disabled = !isReady;
    }

    function renderPreview() {
        el.previewBody.innerHTML = '';
        
        state.files.forEach((fileObj, index) => {
            const seq = (index + 1).toString().padStart(3, '0');
            const hint = extractHint(fileObj.originalName, state.hintMode, state.customHint);
            const ext = getExtension(fileObj.originalName).toLowerCase();
            const dateStr = formatDateYYYYMMDD(getDateForFile(fileObj.file, state));
            const newName = `${hint}__${seq}__${dateStr}.${ext}`;
            
            fileObj.newName = newName; // Store for ZIP gen

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${fileObj.originalName}</td>
                <td class="arrow-col">→</td>
                <td><code>${newName}</code></td>
                <td class="action-col">
                    <button class="btn-remove" title="Remove file">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            
            tr.querySelector('.btn-remove').addEventListener('click', () => removeFile(fileObj.id));
            el.previewBody.appendChild(tr);
        });
    }

    // === Sanitization & Extraction ===

    function extractHint(filename, mode, customValue) {
        if (mode === 'custom') {
            return sanitizeToken(customValue) || 'file';
        }

        const ext = getExtension(filename).toLowerCase();

        if (mode === 'extension') {
            const map = {
                'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'webp': 'img', 'gif': 'img',
                'pdf': 'pdf',
                'doc': 'doc', 'docx': 'doc',
                'xls': 'xls', 'xlsx': 'xls', 'csv': 'xls',
                'mp4': 'video', 'mov': 'video', 'avi': 'video'
            };
            return map[ext] || ext || 'file';
        }

        // Auto mode
        const nameOnly = filename.substring(0, filename.lastIndexOf('.')) || filename;
        const normalized = nameOnly.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        const firstToken = normalized.split('_').filter(t => t.length > 0)[0];
        return firstToken || 'file';
    }

    function sanitizeToken(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    }

    function sanitizeGroup(str) {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s-_]/g, '') // Keep spaces for title gen, but filter unsafe
            .replace(/[\s-_]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function toHumanTitle(groupStr) {
        const sanitized = sanitizeGroup(groupStr);
        return sanitized.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function getExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop() : '';
    }

    function formatDateYYYYMMDD(date) {
        if (!date || isNaN(date.getTime())) date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    }

    function getDateForFile(file, state) {
        if (state.dateMode === 'fileModified') {
            const lastMod = file.lastModified;
            if (lastMod) {
                const date = new Date(lastMod);
                if (!isNaN(date.getTime())) return date;
            }
            return new Date(); // fallback to today
        }
        
        if (state.dateMode === 'custom' && state.customDate) {
            // Parse YYYY-MM-DD as local date to avoid timezone shift
            const [y, m, d] = state.customDate.split('-').map(Number);
            if (y && m && d) {
                return new Date(y, m - 1, d);
            }
        }
        
        return new Date(); // today
    }

    // === ZIP Generation ===

    async function generateArchive() {
        const sanitizedGroup = sanitizeGroup(state.group);
        if (!sanitizedGroup) {
            alert('Please provide a valid Group name.');
            return;
        }

        el.generateBtn.disabled = true;
        el.generateBtn.textContent = 'Generating...';

        try {
            const zip = new JSZip();
            const folder = zip.folder(sanitizedGroup);

            // 1. Add Files
            state.files.forEach(f => {
                folder.file(f.newName, f.file);
            });

            // 2. Generate TOC.md
            const humanTitle = toHumanTitle(state.group);
            let toc = `# ${humanTitle}\n\n`;
            if (state.memo.trim()) {
                toc += `${state.memo.trim()}\n\n`;
            }
            toc += `## Files\n`;
            state.files.forEach(f => {
                toc += `- ${f.newName}\n`;
            });

            folder.file('_TOC.md', toc);

            // 3. Generate ZIP
            const blob = await zip.generateAsync({ type: 'blob' });
            // For archive name, use first file's date or today
            const firstDateStr = state.files.length > 0 ? formatDateYYYYMMDD(getDateForFile(state.files[0].file, state)) : formatDateYYYYMMDD(new Date());
            const archiveName = `${sanitizedGroup}_pack_${firstDateStr}.zip`;

            // 4. Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = archiveName;
            a.click();
            URL.revokeObjectURL(url);

            // Save History
            saveHistory(state.group);
            
            alert('Archive generated successfully!');
        } catch (err) {
            console.error(err);
            alert('Error generating archive: ' + err.message);
        } finally {
            el.generateBtn.disabled = false;
            el.generateBtn.textContent = 'Generate structured archive';
        }
    }

    // === History Management ===

    function loadHistory() {
        const data = localStorage.getItem('fs_group_history');
        if (data) {
            state.history = JSON.parse(data);
            renderHistory();
        }
    }

    function saveHistory(group) {
        const trimmed = group.trim();
        if (!trimmed) return;
        
        let newHistory = [trimmed, ...state.history.filter(h => h !== trimmed)];
        newHistory = newHistory.slice(0, 10);
        
        state.history = newHistory;
        localStorage.setItem('fs_group_history', JSON.stringify(newHistory));
        renderHistory();
    }

    function renderHistory() {
        el.groupHistory.innerHTML = '';
        state.history.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            el.groupHistory.appendChild(option);
        });
    }

    function saveSettings() {
        const settings = {
            hintMode: state.hintMode,
            dateMode: state.dateMode,
            customDate: state.customDate
        };
        localStorage.setItem('fs_settings', JSON.stringify(settings));
    }

    function loadSettings() {
        const data = localStorage.getItem('fs_settings');
        if (data) {
            const settings = JSON.parse(data);
            state.hintMode = settings.hintMode || 'auto';
            state.dateMode = settings.dateMode || 'today';
            state.customDate = settings.customDate || '';

            // Update UI components
            el.hintRadios.forEach(r => {
                if (r.value === state.hintMode) r.checked = true;
            });
            if (state.hintMode === 'custom') el.customHintGroup.classList.remove('hidden');

            el.dateRadios.forEach(r => {
                if (r.value === state.dateMode) r.checked = true;
            });
            if (state.dateMode === 'custom') {
                el.customDateGroup.classList.remove('hidden');
                el.customDateInput.value = state.customDate;
            }
        }
    }

    init();
});
