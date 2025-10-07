// ----------------- HEADER FUNCTIONALITY -----------------
function initHeader() {
    const darkBtn = document.getElementById('darkModeToggle');
    if(darkBtn){
        darkBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }
}

// Wait for header to load
window.addEventListener('DOMContentLoaded', () => {
    initHeader();
});

// ----------------- TAB SWITCHING -----------------
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ----------------- PREVIEW FUNCTION -----------------
function showPreviews(files, containerId, type='image'){
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    Array.from(files).forEach(file => {
        let el;
        if(type==='image'){
            el=document.createElement('img');
            el.src=URL.createObjectURL(file);
        } else if(type==='video'){
            el=document.createElement('video');
            el.src=URL.createObjectURL(file);
            el.controls=true;
        } else if(type==='audio'){
            el=document.createElement('audio');
            el.src=URL.createObjectURL(file);
            el.controls=true;
        } else {
            el=document.createElement('span');
            el.innerText=file.name;
        }
        el.style.margin='0.5rem';
        container.appendChild(el);
    });
}

// ----------------- DRAG & DROP -----------------
function setupDropZone(dropId, inputId, previewId, type='image'){
    const dropZone=document.getElementById(dropId);
    const input=document.getElementById(inputId);

    dropZone.addEventListener('click', ()=>input.click());
    dropZone.addEventListener('dragover', e=>{e.preventDefault(); dropZone.classList.add('dragover');});
    dropZone.addEventListener('dragleave', ()=>dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e=>{
        e.preventDefault(); dropZone.classList.remove('dragover');
        input.files=e.dataTransfer.files;
        showPreviews(input.files, previewId, type);
    });
}

setupDropZone('dropImages','imageInput','imagePreviewContainer','image');
setupDropZone('dropVideos','videoInput','videoPreviewContainer','video');
setupDropZone('dropPDFs','pdfInput','pdfPreviewContainer','pdf');
setupDropZone('dropAudio','audioInput','audioPreviewContainer','audio');
setupDropZone('dropFiles','fileInput','filePreviewContainer','file');

// ----------------- IMAGE COMPRESSION -----------------
document.getElementById('compressImagesBtn').addEventListener('click', async ()=>{
    const files=document.getElementById('imageInput').files;
    if(!files.length) return alert('Select images first!');
    const level=parseInt(document.getElementById('imageLevel').value);
    const sizes=[5,4,3,2,1.5,1]; // MB
    const zip=new JSZip();
    let totalOriginal=0,totalCompressed=0;
    for(const file of files){
        totalOriginal+=file.size;
        const compressed=await imageCompression(file,{maxSizeMB:sizes[level-1],maxWidthOrHeight:1920,useWebWorker:true});
        totalCompressed+=compressed.size;
        zip.file(file.name,compressed);

        if(files[0]===file){
            document.getElementById('compareOriginalPreview').innerHTML=`<img src="${URL.createObjectURL(file)}">`;
            document.getElementById('compareCompressedPreview').innerHTML=`<img src="${URL.createObjectURL(compressed)}">`;
            document.getElementById('compareModal').style.display='block';
        }
    }
    document.getElementById('imageStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='images_compressed.zip'; a.click();
});

// ----------------- VIDEO COMPRESSION -----------------
document.getElementById('compressVideosBtn').addEventListener('click', async ()=>{
    alert("Video compression using ffmpeg.wasm works similarly to images; implement as needed.");
});

// ----------------- PDF COMPRESSION -----------------
document.getElementById('compressPDFsBtn').addEventListener('click', async ()=>{
    const files=document.getElementById('pdfInput').files;
    if(!files.length) return alert('Select PDFs first!');
    const level=parseInt(document.getElementById('pdfLevel').value);
    const zip=new JSZip();
    let totalOriginal=0,totalCompressed=0;
    for(const file of files){
        totalOriginal+=file.size;
        const arrayBuffer=await file.arrayBuffer();
        const pdfDoc=await PDFLib.PDFDocument.load(arrayBuffer);
        const compressedBytes=await pdfDoc.save({useObjectStreams:true});
        totalCompressed+=compressedBytes.length;
        zip.file(file.name,compressedBytes);
    }
    document.getElementById('pdfStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pdfs_compressed.zip'; a.click();
});

// ----------------- AUDIO COMPRESSION -----------------
document.getElementById('compressAudioBtn').addEventListener('click', async ()=>{
    alert("Audio compression using ffmpeg.wasm can be implemented similar to video compression.");
});

// ----------------- GENERAL FILES -----------------
document.getElementById('compressFilesBtn').addEventListener('click', async ()=>{
    const files=document.getElementById('fileInput').files;
    if(!files.length) return alert('Select files first!');
    const zip=new JSZip();
    let totalOriginal=0;
    for(const file of files){ totalOriginal+=file.size; zip.file(file.name,file); }
    document.getElementById('fileStats').innerText=`Original files size: ${(totalOriginal/1024/1024).toFixed(2)} MB`;
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='files_compressed.zip'; a.click();
});

// ----------------- MODAL -----------------
const modal=document.getElementById('compareModal');
modal.querySelector('.close').addEventListener('click', ()=>modal.style.display='none');
window.addEventListener('click', e=>{if(e.target==modal) modal.style.display='none';});
