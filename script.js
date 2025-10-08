// ----------------- TAB SWITCHING -----------------
document.querySelectorAll('.tab-button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ----------------- DRAG & DROP -----------------
function setupDrop(dropId,inputId,previewId,type='image'){
  const drop=document.getElementById(dropId);
  const input=document.getElementById(inputId);
  drop.addEventListener('click',()=>input.click());
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
  drop.addEventListener('drop',e=>{
    e.preventDefault(); drop.classList.remove('dragover');
    input.files=e.dataTransfer.files;
    showPreviews(input.files,previewId,type);
  });
}

function showPreviews(files,containerId,type='image'){
  const container=document.getElementById(containerId); container.innerHTML='';
  Array.from(files).forEach(file=>{
    let el;
    if(type==='image'){ el=document.createElement('img'); el.src=URL.createObjectURL(file); }
    else if(type==='video'){ el=document.createElement('video'); el.src=URL.createObjectURL(file); el.controls=true; }
    else if(type==='audio'){ el=document.createElement('audio'); el.src=URL.createObjectURL(file); el.controls=true; }
    else { el=document.createElement('span'); el.innerText=file.name; }
    container.appendChild(el);
  });
}

// Setup all
setupDrop('dropImages','imageInput','imagePreviewContainer','image');
setupDrop('dropVideos','videoInput','videoPreviewContainer','video');
setupDrop('dropPDFs','pdfInput','pdfPreviewContainer','pdf');
setupDrop('dropAudio','audioInput','audioPreviewContainer','audio');
setupDrop('dropFiles','fileInput','filePreviewContainer','file');

// ----------------- DARK MODE -----------------
document.getElementById('darkModeToggle').addEventListener('click',()=>document.body.classList.toggle('dark'));

// ----------------- MODAL -----------------
const modal=document.getElementById('compareModal');
modal.querySelector('.close').addEventListener('click',()=>modal.style.display='none');
window.addEventListener('click',e=>{if(e.target==modal) modal.style.display='none';});

// ----------------- COMPRESSION -----------------
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log:true });

// ---------- IMAGE COMPRESSION ----------
document.getElementById('compressImagesBtn').addEventListener('click',async()=>{
  const files=document.getElementById('imageInput').files; if(!files.length){alert('Select images first!'); return;}
  const level=parseInt(document.getElementById('imageLevel').value);
  const sizesMB=[5,4,3,2,1.5,1];
  const zip=new JSZip();
  let totalOriginal=0,totalCompressed=0;
  const progress=document.getElementById('imageProgress'); progress.style.width='0';

  for(let i=0;i<files.length;i++){
    const file=files[i]; totalOriginal+=file.size;
    const compressed=await imageCompression(file,{maxSizeMB:sizesMB[level-1],maxWidthOrHeight:1920,useWebWorker:true});
    totalCompressed+=compressed.size;
    zip.file(file.name,compressed);
    if(i===0){document.getElementById('compareOriginalPreview').innerHTML=`<img src="${URL.createObjectURL(file)}">`;
               document.getElementById('compareCompressedPreview').innerHTML=`<img src="${URL.createObjectURL(compressed)}">`;
               modal.style.display='block';}
    progress.style.width=`${(i+1)/files.length*100}%`;
  }

  document.getElementById('imageStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
  const blob=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='images_compressed.zip'; a.click();
});

// ---------- PDF COMPRESSION ----------
document.getElementById('compressPDFsBtn').addEventListener('click',async()=>{
  const files=document.getElementById('pdfInput').files; if(!files.length){alert('Select PDFs first!'); return;}
  const zip=new JSZip(); let totalOriginal=0,totalCompressed=0;
  const progress=document.getElementById('pdfProgress'); progress.style.width='0';

  for(let i=0;i<files.length;i++){
    const file=files[i]; totalOriginal+=file.size;
    const arrayBuffer=await file.arrayBuffer();
    const pdfDoc=await PDFLib.PDFDocument.load(arrayBuffer);
    const bytes=await pdfDoc.save({useObjectStreams:true});
    totalCompressed+=bytes.length;
    zip.file(file.name,bytes);
    progress.style.width=`${(i+1)/files.length*100}%`;
  }

  document.getElementById('pdfStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
  const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pdfs_compressed.zip'; a.click();
});

// ---------- GENERAL FILES ----------
document.getElementById('compressFilesBtn').addEventListener('click',async()=>{
  const files=document.getElementById('fileInput').files; if(!files.length){alert('Select files first!'); return;}
  const zip=new JSZip(); let totalOriginal=0;
  const progress=document.getElementById('fileProgress'); progress.style.width='0';

  for(let i=0;i<files.length;i++){ const file=files[i]; totalOriginal+=file.size; zip.file(file.name,file); progress.style.width=`${(i+1)/files.length*100}%`; }
  document.getElementById('fileStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB`;
  const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='files_compressed.zip'; a.click();
});

// ---------- VIDEO COMPRESSION ----------
document.getElementById('compressVideosBtn').addEventListener('click',async()=>{
  const files=document.getElementById('videoInput').files; if(!files.length){alert('Select videos first!'); return;}
  const level=parseInt(document.getElementById('videoLevel').value);
  const zip=new JSZip(); let totalOriginal=0,totalCompressed=0;
  const progress=document.getElementById('videoProgress'); progress.style.width='0';

  if(!ffmpeg.isLoaded()) await ffmpeg.load();

  for(let i=0;i<files.length;i++){
    const file=files[i]; totalOriginal+=file.size;
    ffmpeg.FS('writeFile',file.name,await fetchFile(file));
    const outputName='compressed_'+file.name; const crf=40-(level*5);
    await ffmpeg.run('-i',file.name,'-vcodec','libx264','-crf',`${crf}`,outputName);
    const data=ffmpeg.FS('readFile',outputName); totalCompressed+=data.length; zip.file(file.name,data);
    ffmpeg.FS('unlink',file.name); ffmpeg.FS('unlink',outputName);
    progress.style.width=`${(i+1)/files.length*100}%`;
  }

  document.getElementById('videoStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
  const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='videos_compressed.zip'; a.click();
});

// ---------- AUDIO COMPRESSION ----------
document.getElementById('compressAudioBtn').addEventListener('click',async()=>{
  const files=document.getElementById('audioInput').files; if(!files.length){alert('Select audio first!'); return;}
  const level=parseInt(document.getElementById('audioLevel').value);
  const zip=new JSZip(); let totalOriginal=0,totalCompressed=0;
  const progress=document.getElementById('audioProgress'); progress.style.width='0';

  if(!ffmpeg.isLoaded()) await ffmpeg.load();

  for(let i=0;i<files.length;i++){
    const file=files[i]; totalOriginal+=file.size;
    ffmpeg.FS('writeFile',file.name,await fetchFile(file));
    const outputName='compressed_'+file.name; const bitrate=128-(level*16);
    await ffmpeg.run('-i',file.name,'-b:a',`${bitrate}k`,outputName);
    const data=ffmpeg.FS('readFile',outputName); totalCompressed+=data.length; zip.file(file.name,data);
    ffmpeg.FS('unlink',file.name); ffmpeg.FS('unlink',outputName);
    progress.style.width=`${(i+1)/files.length*100}%`;
  }

  document.getElementById('audioStats').innerText=`Original: ${(totalOriginal/1024/1024).toFixed(2)} MB, Compressed: ${(totalCompressed/1024/1024).toFixed(2)} MB`;
  const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='audio_compressed.zip'; a.click();
});
