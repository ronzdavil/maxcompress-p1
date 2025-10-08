// ----------------- TAB SWITCHING -----------------
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ----------------- DRAG & DROP + CLICK -----------------
function setupDrop(dropId, inputId, previewId, type='image') {
    const dropZone = document.getElementById(dropId);
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewId);

    // Click triggers file input
    dropZone.addEventListener('click', () => input.click());

    // Drag & Drop
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        showPreviews(input.files, container, type);
    });

    // Input change (file selected via click)
    input.addEventListener('change', () => {
        showPreviews(input.files, container, type);
    });
}

function showPreviews(files, container, type='image') {
    container.innerHTML = '';
    Array.from(files).forEach(file => {
        let el;
        if(type==='image') { 
            el = document.createElement('img'); 
            el.src = URL.createObjectURL(file); 
        }
        else if(type==='video') { 
            el = document.createElement('video'); 
            el.src = URL.createObjectURL(file); 
            el.controls = true; 
        }
        else if(type==='audio') { 
            el = document.createElement('audio'); 
            el.src = URL.createObjectURL(file); 
            el.controls = true; 
        }
        else { 
            el = document.createElement('span'); 
            el.innerText = file.name; 
        }
        container.appendChild(el);
    });
}

// ----------------- Initialize all drop zones -----------------
setupDrop('dropImages','imageInput','imagePreviewContainer','image');
setupDrop('dropVideos','videoInput','videoPreviewContainer','video');
setupDrop('dropPDFs','pdfInput','pdfPreviewContainer','pdf');
setupDrop('dropAudio','audioInput','audioPreviewContainer','audio');
setupDrop('dropFiles','fileInput','filePreviewContainer','file');
