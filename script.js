document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appContainer = document.querySelector('.app-container'); // Get main container
    const notesListElement = document.getElementById('notes-list');
    // const addNoteBtn = document.getElementById('add-note-btn'); // REMOVED
    const fabAddNoteBtn = document.getElementById('fab-add-note-btn'); // ADDED
    const editorSection = document.getElementById('editor-section');
    const editorPlaceholder = document.getElementById('editor-placeholder');
    const editorContent = document.getElementById('editor-content');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentEditable = document.getElementById('note-content-editable');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const statusMessageElement = document.getElementById('status-message');
    const searchInput = document.getElementById('search-input');
    const navHomeBtn = document.getElementById('nav-home-btn');
    const navNotesBtn = document.getElementById('nav-notes-btn');
    const boldBtn = document.getElementById('bold-btn');
    const imageBtn = document.getElementById('image-btn');
    const imageUploadInput = document.getElementById('image-upload');

    // --- State ---
    let notes = [];
    let currentNoteId = null;
    let saveTimeout = null;

    // --- LocalStorage Functions --- (Keep as before)
    const NOTES_STORAGE_KEY = 'notebook-notes-orange-fab'; // New key just in case

    function getNotesFromStorage() {
        const notesJson = localStorage.getItem(NOTES_STORAGE_KEY);
        try {
            const loadedNotes = notesJson ? JSON.parse(notesJson) : [];
            if (Array.isArray(loadedNotes)) {
                return loadedNotes.filter(note => note && typeof note.id !== 'undefined');
            }
            return [];
        } catch (e) { console.error("Error parsing notes:", e); localStorage.removeItem(NOTES_STORAGE_KEY); return []; }
    }
    function saveNotesToStorage() {
        try {
             if (!Array.isArray(notes)) { console.error("Invalid notes data:", notes); notes = []; }
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        } catch (e) {
             console.error("Error saving notes:", e);
             if (e.name === 'QuotaExceededError' || (e.code && (e.code === 22 || e.code === 1014))) {
                 showStatusMessage('Storage full! Cannot save.', true);
             } else { showStatusMessage('Error saving note.', true); }
        }
    }

    // --- Helper Function for Nav State --- (Keep as before)
    function updateNavActiveState() {
        if (currentNoteId === null) {
            navHomeBtn.classList.add('active');
            navNotesBtn.classList.remove('active');
        } else {
            navHomeBtn.classList.remove('active');
            navNotesBtn.classList.add('active');
        }
    }

    // --- Helper Function for View State (Mobile) --- ADDED
    function updateMobileViewState() {
        if (currentNoteId !== null) {
            appContainer.classList.add('viewing-note');
        } else {
            appContainer.classList.remove('viewing-note');
        }
    }

    // --- Core Functions ---

    // filterAndRenderNotesList() - (Keep as before)
    function filterAndRenderNotesList() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        notesListElement.innerHTML = '';
        const sortedNotes = [...notes].sort((a, b) => b.id - a.id);
        let hasVisibleNotes = false;

        sortedNotes.forEach(note => {
            if (!note || typeof note.id === 'undefined') return;
            const noteTitle = note.title || '';
            const noteContent = note.content || '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = noteContent;
            const contentText = tempDiv.textContent || tempDiv.innerText || '';
            const isMatch = searchTerm === '' || noteTitle.toLowerCase().includes(searchTerm) || contentText.toLowerCase().includes(searchTerm);

            const listItem = document.createElement('li');
            listItem.textContent = noteTitle || 'Untitled Note';
            listItem.dataset.id = note.id;
            if (note.id === currentNoteId) { listItem.classList.add('selected-note'); }
            if (!isMatch) { listItem.classList.add('hidden'); }
             else { hasVisibleNotes = true; }

            listItem.addEventListener('click', () => handleNoteSelect(note.id));
            notesListElement.appendChild(listItem);
        });

        if (!hasVisibleNotes) {
             const placeholderLi = document.createElement('li');
             placeholderLi.classList.add('no-notes');
             placeholderLi.textContent = searchTerm ? 'No matching notes found.' : 'No notes yet! Add one below.';
             notesListElement.appendChild(placeholderLi);
        }
    }


    /** Displays the editor and updates view state. */
    function displayEditor(noteId) {
        const note = notes.find(n => n && n.id === noteId);

        if (note) {
            currentNoteId = note.id;
            noteTitleInput.value = note.title || '';
            noteContentEditable.innerHTML = note.content || '';
            editorPlaceholder.classList.add('hidden');
            editorContent.classList.remove('hidden');
            clearStatusMessage();
        } else {
            currentNoteId = null;
            noteTitleInput.value = '';
            noteContentEditable.innerHTML = '';
            editorPlaceholder.classList.remove('hidden');
            editorContent.classList.add('hidden');
        }
        filterAndRenderNotesList(); // Update list selection/filter
        updateNavActiveState(); // Update bottom nav highlight
        updateMobileViewState(); // <<<<<< ADDED: Update mobile sidebar/editor visibility
    }


    /** Creates a new note. */
    function addNewNote() {
        if (currentNoteId) { saveCurrentNote(false); } // Save current before adding new

        const newNote = { id: Date.now(), title: 'New Note', content: '' };
        notes.unshift(newNote);
        saveNotesToStorage();
        displayEditor(newNote.id); // Select the new note (this will also switch view on mobile)

        // Focus title
        setTimeout(() => { // Timeout ensures element is visible before focus
             noteTitleInput.focus();
             noteTitleInput.select();
        }, 50); // Short delay
        showStatusMessage('New note created.');
    }

    // saveCurrentNote() - (Keep as before)
    function saveCurrentNote(showStatus = true) {
        clearTimeout(saveTimeout);
        if (!currentNoteId) return;
        const noteIndex = notes.findIndex(n => n && n.id === currentNoteId);
        if (noteIndex > -1) {
            const note = notes[noteIndex];
            const newTitle = noteTitleInput.value.trim();
            const newContent = noteContentEditable.innerHTML;
             if (note.title !== newTitle || note.content !== newContent) {
                 note.title = newTitle;
                 note.content = newContent;
                 notes.splice(noteIndex, 1); notes.unshift(note); // Move to top
                 saveNotesToStorage();
                 filterAndRenderNotesList(); // Update list
                 if (showStatus) { showStatusMessage('Note saved!'); }
             }
        } else {
            console.error("Save Error: Note ID not found:", currentNoteId);
            if (showStatus) showStatusMessage('Error saving note.', true);
        }
    }

    // deleteCurrentNote() - (Keep as before)
    function deleteCurrentNote() {
        if (!currentNoteId) return;
        const noteToDelete = notes.find(n => n && n.id === currentNoteId);
        const confirmTitle = noteTitleInput.value.trim() || (noteToDelete ? noteToDelete.title : '') || 'Untitled Note';
        setTimeout(() => {
            if (confirm(`Delete "${confirmTitle}"?`)) {
                const initialLength = notes.length;
                notes = notes.filter(note => !note || note.id !== currentNoteId);
                if (notes.length < initialLength) {
                    saveNotesToStorage();
                    const sortedNotes = [...notes].sort((a, b) => b.id - a.id);
                    const nextNoteId = sortedNotes.length > 0 ? sortedNotes[0].id : null;
                    displayEditor(nextNoteId); // Show next or clear
                    showStatusMessage('Note deleted.', false);
                }
            }
        }, 0);
    }


    /** Handles selecting a note from the list. */
    function handleNoteSelect(noteId) {
         if (currentNoteId && currentNoteId !== noteId) { saveCurrentNote(false); }
         if (currentNoteId !== noteId) {
            displayEditor(noteId); // Show selected note (will trigger mobile view change)
         }
    }

    // formatText() - (Keep as before)
    function formatText(command, value = null) {
         noteContentEditable.focus();
        document.execCommand(command, false, value);
    }

    // handleImageUpload() - (Keep as before)
    function handleImageUpload(event) {
        const file = event.target.files[0];
        imageUploadInput.value = null;
        if (!file || !file.type.startsWith('image/')) { if(file) showStatusMessage('Please select an image file.', true); return; }
        const maxSizeMB = 2;
        if (file.size > maxSizeMB * 1024 * 1024) { showStatusMessage(`Image too large (max ${maxSizeMB}MB).`, true); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            noteContentEditable.focus();
            const imgHtml = `<img src="${reader.result}" alt="Uploaded Image">`;
            document.execCommand('insertHTML', false, imgHtml + ' ');
             setTimeout(() => saveCurrentNote(true), 100);
        }
        reader.onerror = (error) => { showStatusMessage('Error reading image file.', true); console.error("FileReader error:", error); }
        reader.readAsDataURL(file);
    }

    // Status Message Functions - (Keep as before)
    let statusTimeout;
    function showStatusMessage(message, isError = false) { /* ... */ }
    function clearStatusMessage() { /* ... */ }
    function showStatusMessage(message, isError = false) {
        clearTimeout(statusTimeout);
        statusMessageElement.textContent = message;
        statusMessageElement.style.color = isError ? '#e53935' : '#4CAF50';
        statusMessageElement.classList.add('visible');
        statusTimeout = setTimeout(clearStatusMessage, 3500);
    }
    function clearStatusMessage() {
        statusMessageElement.classList.remove('visible');
        setTimeout(() => { if (!statusMessageElement.classList.contains('visible')) statusMessageElement.textContent = ''; }, 500);
    }


    // Debounced Auto-Save on Blur - (Keep as before)
    function handleBlurSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if(currentNoteId) { saveCurrentNote(false); }
        }, 250);
    }


    // --- Event Listeners ---
    // addNoteBtn.addEventListener('click', addNewNote); // REMOVED
    fabAddNoteBtn.addEventListener('click', addNewNote); // ADDED
    saveNoteBtn.addEventListener('click', () => saveCurrentNote(true));
    deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    searchInput.addEventListener('input', filterAndRenderNotesList);

    // Navigation Listeners
    navHomeBtn.addEventListener('click', () => {
        // If a note is currently viewed, save it silently first
        if (currentNoteId) { saveCurrentNote(false); }
        // Go back to the list view (which hides editor on mobile)
        displayEditor(null);
    });
    navNotesBtn.addEventListener('click', () => {
        // If already viewing a note, do nothing (stay in editor view)
        // If in home/list view, select the most recent note
        if (!currentNoteId && notes.length > 0) {
             const mostRecentNoteId = [...notes].sort((a, b) => b.id - a.id)[0]?.id;
             if(mostRecentNoteId) {
                 displayEditor(mostRecentNoteId); // This selects note & shows editor
             }
        } else if (currentNoteId) {
            // If already viewing a note, ensure the view state is correct (it should be)
            updateMobileViewState();
            updateNavActiveState();
        }
        // If no notes exist, clicking notes does nothing (stays on placeholder/list)
    });

    // Editor Action Listeners - (Keep as before)
    boldBtn.addEventListener('click', () => formatText('bold'));
    imageBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', handleImageUpload);

    // Auto-save on Blur Listeners - (Keep as before)
    noteTitleInput.addEventListener('blur', handleBlurSave);
    noteContentEditable.addEventListener('blur', handleBlurSave);


    // --- Initial Load ---
    notes = getNotesFromStorage();
    const initialNoteId = notes.length > 0 ? [...notes].sort((a, b) => b.id - a.id)[0].id : null;
    // Display editor initially only if a note exists, otherwise show list/placeholder view
    displayEditor(initialNoteId);
    // Ensure correct initial view state on mobile if no notes exist
    if (!initialNoteId) {
         updateMobileViewState(); // Should remove viewing-note class
    }

    console.log("Notebook App Initialized. Notes loaded:", notes.length);

}); // End DOMContentLoaded