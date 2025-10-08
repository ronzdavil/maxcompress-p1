// ----------------- DARK MODE -----------------
const darkBtn = document.getElementById('darkModeToggle');
if(darkBtn){
    darkBtn.addEventListener('click', () => document.body.classList.toggle('dark'));
}

// ----------------- TAB SWITCHING -----------------
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ----------------- DROP ZONE + CLICK SUPPORT -----------------
function setupDrop(dropId, inputId, previewId, type='image') {
    const dropZone = document.getElementById(dropId);
    const input = document.getElementById(inputId);

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        showPreviews(input.files, previewId, type);
    });

    input.addEventListener('change', () => {
        showPreviews(input.files, previewId, type);
    });
}

// ----------------- SHOW PREVIEWS -----------------
function showPreviews(files, containerId, type='image') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    Array.from(files).forEach(file => {
        let el;
        if(type==='image'){ el = document.createElement('img'); el.src = URL.createObjectURL(file); }
        else if(type==='video'){ el = document.createElement('video'); el.src = URL.createObjectURL(file); el.controls = true; }
        else if(type==='audio'){ el = document.createElement('audio'); el.src = URL.createObjectURL(file); el.controls = true; }
        else { el = document.createElement('span'); el.innerText = file.name; }
        container.appendChild(el);
    });
}

// ----------------- INITIALIZE DROP ZONES -----------------
setupDrop('dropImages','imageInput','imagePreviewContainer','image');
setupDrop('dropVideos','videoInput','videoPreviewContainer','video');
setupDrop('dropPDFs','pdfInput','pdfPreviewContainer','pdf');
setupDrop('dropAudio','audioInput','audioPreviewContainer','audio');
setupDrop('dropFiles','fileInput','filePreviewContainer','file');

// ----------------- COMPRESSION HELPERS -----------------
async function compressImages() {
    const files = document.getElementById('imageInput').files;
    if(!files.length) return alert('Select images first!');
    const level = parseInt(document.getElementById('imageLevel').value);
    const sizesMB = [5,4,3,2,1.5,1]; // Level 1–6
    const zip = new JSZip();
    let totalOriginal=0, totalCompressed=0;

    for(const file of files){
        totalOriginal += file.size;
        const compressed = await imageCompression(file,{maxSizeMB:sizesMB[level-1], maxWidthOrHeight:1920, useWebWorker:true});
        totalCompressed += compressed.size;
        zip.file(file.name, compressed);

        // Show first file in modal
        if(files[0]===file){
            document.getElementById('compareOriginalPreview').innerHTML = `<img src="${URL.createObjectURL(file)}">`;
            document.getElementById('compareCompressedPreview').innerHTML = `<img src="${URL.createObjectURL(compressed)}">`;
            document.getElementById('compareModal').style.display = 'block';
        }
    }

    document.getElementById('imageStats').innerText = `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='images_compressed.zip'; a.click();
}

// ----------------- PDF COMPRESSION -----------------
async function compressPDFs() {
    const files = document.getElementById('pdfInput').files;
    if(!files.length) return alert('Select PDFs first!');
    const zip = new JSZip();
    let totalOriginal=0, totalCompressed=0;

    for(const file of files){
        totalOriginal += file.size;
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const bytes = await pdfDoc.save({useObjectStreams:true});
        totalCompressed += bytes.length;
        zip.file(file.name, bytes);
    }

    document.getElementById('pdfStats').innerText = `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='pdfs_compressed.zip'; a.click();
}

// ----------------- GENERAL FILE COMPRESSION -----------------
async function compressFiles() {
    const files = document.getElementById('fileInput').files;
    if(!files.length) return alert('Select files first!');
    const zip = new JSZip();
    let totalOriginal = 0;
    for(const file of files){ totalOriginal += file.size; zip.file(file.name,file); }
    document.getElementById('fileStats').innerText = `Original size: ${(totalOriginal/1024/1024).toFixed(2)} MB`;
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='files_compressed.zip'; a.click();
}

// ----------------- FFMPEG FOR VIDEO & AUDIO -----------------
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log:true });

async function compressVideos() {
    const files = document.getElementById('videoInput').files;
    if(!files.length) return alert('Select videos first!');
    const level = parseInt(document.getElementById('videoLevel').value);
    const zip = new JSZip();
    let totalOriginal = 0, totalCompressed = 0;

    if(!ffmpeg.isLoaded()) await ffmpeg.load();

    for(const file of files){
        totalOriginal += file.size;
        ffmpeg.FS('writeFile', file.name, await fetchFile(file));
        const outputName = 'compressed_'+file.name;
        const crf = 40 - (level*5);
        await ffmpeg.run('-i', file.name, '-vcodec','libx264','-crf',`${crf}`, outputName);
        const data = ffmpeg.FS('readFile', outputName);
        totalCompressed += data.length;
        zip.file(file.name, data);
        ffmpeg.FS('unlink', file.name); ffmpeg.FS('unlink', outputName);
    }

    document.getElementById('videoStats').innerText = `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='videos_compressed.zip'; a.click();
}

async function compressAudio() {
    const files = document.getElementById('audioInput').files;
    if(!files.length) return alert('Select audio first!');
    const level = parseInt(document.getElementById('audioLevel').value);
    const zip = new JSZip();
    let totalOriginal = 0, totalCompressed = 0;

    if(!ffmpeg.isLoaded()) await ffmpeg.load();

    for(const file of files){
        totalOriginal += file.size;
        ffmpeg.FS('writeFile', file.name, await fetchFile(file));
        const outputName = 'compressed_'+file.name;
        const bitrate = 128 - (level*16);
        await ffmpeg.run('-i', file.name, '-b:a', `${bitrate}k`, outputName);
        const data = ffmpeg.FS('readFile', outputName);
        totalCompressed += data.length;
        zip.file(file.name, data);
        ffmpeg.FS('unlink', file.name); ffmpeg.FS('unlink', outputName);
    }

    document.getElementById('audioStats').innerText = `Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='audio_compressed.zip'; a.click();
}

// ----------------- BUTTON EVENTS -----------------
document.getElementById('compressImagesBtn').addEventListener('click', compressImages);
document.getElementById('compressPDFsBtn').addEventListener('click', compressPDFs);
document.getElementById('compressFilesBtn').addEventListener('click', compressFiles);
document.getElementById('compressVideosBtn').addEventListener('click', compressVideos);
document.getElementById('compressAudioBtn').addEventListener('click', compressAudio);

// ----------------- MODAL -----------------
const modal = document.getElementById('compareModal');
modal.querySelector('.close').addEventListener('click', ()=> modal.style.display='none');
window.addEventListener('click', e => { if(e.target == modal) modal.style.display='none'; });
