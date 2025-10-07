// ----------------- TAB SWITCHING -----------------
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ----------------- DARK MODE TOGGLE -----------------
const darkBtn = document.getElementById('darkModeToggle');
darkBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
});

// ----------------- HELPER FUNCTION TO SHOW PREVIEWS -----------------
function showPreviews(files, containerId, type = 'image') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    Array.from(files).forEach(file => {
        let el;
        if (type === 'image') {
            el = document.createElement('img');
            el.src = URL.createObjectURL(file);
        } else if (type === 'video') {
            el = document.createElement('video');
            el.src = URL.createObjectURL(file);
            el.controls = true;
        } else if (type === 'audio') {
            el = document.createElement('audio');
            el.src = URL.createObjectURL(file);
            el.controls = true;
        } else if (type === 'pdf') {
            el = document.createElement('span');
            el.innerText = file.name;
        } else {
            el = document.createElement('span');
            el.innerText = file.name;
        }
        el.style.margin = '0.5rem';
        container.appendChild(el);
    });
}

// ----------------- GENERIC DRAG & DROP -----------------
function setupDropZone(dropId, inputId, previewId, type = 'image') {
    const dropZone = document.getElementById(dropId);
    const input = document.getElementById(inputId);

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        showPreviews(input.files, previewId, type);
    });
}

// ----------------- SETUP DROP ZONES -----------------
setupDropZone('dropImages', 'imageInput', 'imagePreviewContainer', 'image');
setupDropZone('dropVideos', 'videoInput', 'videoPreviewContainer', 'video');
setupDropZone('dropPDFs', 'pdfInput', 'pdfPreviewContainer', 'pdf');
setupDropZone('dropAudio', 'audioInput', 'audioPreviewContainer', 'audio');
setupDropZone('dropFiles', 'fileInput', 'filePreviewContainer', 'file');

// ----------------- IMAGE COMPRESSION -----------------
document.getElementById('compressImagesBtn').addEventListener('click', async () => {
    const files = document.getElementById('imageInput').files;
    if (!files.length) return alert('Select images first!');
    const level = parseInt(document.getElementById('imageLevel').value);
    const sizes = [5,4,3,2,1.5,1]; // MB

    const zip = new JSZip();
    let totalOriginal=0, totalCompressed=0;

    for (const file of files) {
        totalOriginal += file.size;
        const compressed = await imageCompression(file, { maxSizeMB: sizes[level-1], maxWidthOrHeight:1920, useWebWorker:true });
        totalCompressed += compressed.size;
        zip.file(file.name, compressed);

        if (files[0] === file) { // first file modal preview
            document.getElementById('compareOriginalPreview').innerHTML = `<img src="${URL.createObjectURL(file)}">`;
            document.getElementById('compareCompressedPreview').innerHTML = `<img src="${URL.createObjectURL(compressed)}">`;
            document.getElementById('compareModal').style.display = 'block';
        }
    }

    document.getElementById('imageStats').innerText =
        `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;

    const blob = await zip.generateAsync({ type:'blob' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='images_compressed.zip'; a.click();
});

// ----------------- VIDEO COMPRESSION -----------------
document.getElementById('compressVideosBtn').addEventListener('click', async () => {
    const files = document.getElementById('videoInput').files;
    if (!files.length) return alert('Select videos first!');
    const level = parseInt(document.getElementById('videoLevel').value);
    const ffmpeg = FFmpeg.createFFmpeg({ log: true });
    await ffmpeg.load();

    const zip = new JSZip();
    let totalOriginal=0, totalCompressed=0;

    for (const file of files) {
        totalOriginal += file.size;
        const reader = new FileReader();
        reader.onload = async () => {
            ffmpeg.FS('writeFile', file.name, new Uint8Array(reader.result));
            const bitrate = [1000,800,600,400,300,200][level-1];
            await ffmpeg.run('-i', file.name, '-b:v', `${bitrate}k`, 'out_'+file.name);
            const data = ffmpeg.FS('readFile', 'out_'+file.name);
            totalCompressed += data.length;
            zip.file(file.name, data);
            if(files[0] === file) { // modal preview
                const blob = new Blob([data.buffer], { type: file.type });
                document.getElementById('compareOriginalPreview').innerHTML = `<video src="${URL.createObjectURL(file)}" controls></video>`;
                document.getElementById('compareCompressedPreview').innerHTML = `<video src="${URL.createObjectURL(blob)}" controls></video>`;
                document.getElementById('compareModal').style.display='block';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    setTimeout(async ()=>{
        const blob = await zip.generateAsync({ type:'blob' });
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='videos_compressed.zip'; a.click();
    }, 5000);
});

// ----------------- PDF COMPRESSION -----------------
document.getElementById('compressPDFsBtn').addEventListener('click', async () => {
    const files = document.getElementById('pdfInput').files;
    if(!files.length) return alert('Select PDFs first!');
    const level = parseInt(document.getElementById('pdfLevel').value);

    const zip = new JSZip();
    let totalOriginal=0, totalCompressed=0;

    for(const file of files){
        totalOriginal+=file.size;
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const compressedBytes = await pdfDoc.save({ useObjectStreams:true });
        totalCompressed+=compressedBytes.length;
        zip.file(file.name, compressedBytes);
    }

    document.getElementById('pdfStats').innerText =
        `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;

    const blob = await zip.generateAsync({ type:'blob' });
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pdfs_compressed.zip'; a.click();
});

// ----------------- AUDIO COMPRESSION -----------------
document.getElementById('compressAudioBtn').addEventListener('click', async () => {
    alert("Audio compression requires ffmpeg.wasm; implement similar to video section.");
});

// ----------------- GENERAL FILES -----------------
document.getElementById('compressFilesBtn').addEventListener('click', async () => {
    const files = document.getElementById('fileInput').files;
    if(!files.length) return alert('Select files first!');
    const zip = new JSZip();
    let totalOriginal=0;

    for(const file of files){
        totalOriginal+=file.size;
        zip.file(file.name, file);
    }
    document.getElementById('fileStats').innerText = `Original files size: ${(totalOriginal/1024/1024).toFixed(2)} MB`;

    const blob = await zip.generateAsync({ type:'blob' });
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='files_compressed.zip'; a.click();
});

// ----------------- MODAL CLOSE -----------------
const modal = document.getElementById('compareModal');
modal.querySelector('.close').addEventListener('click', ()=>modal.style.display='none');
window.addEventListener('click', e=>{if(e.target==modal) modal.style.display='none';});
