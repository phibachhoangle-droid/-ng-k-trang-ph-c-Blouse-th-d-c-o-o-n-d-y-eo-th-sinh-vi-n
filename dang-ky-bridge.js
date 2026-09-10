const REGISTRATION_MESSAGE_TYPE='registration-result';

function submitViaIframe(payload){
  return new Promise((resolve,reject)=>{
    const requestId='REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
    payload.requestId=requestId;
    const frameName='registrationBridge_'+requestId.replace(/[^A-Za-z0-9_]/g,'');
    const callbackName='__regStatus_'+requestId.replace(/[^A-Za-z0-9_]/g,'');

    const iframe=document.createElement('iframe');
    iframe.name=frameName;
    iframe.style.display='none';
    iframe.setAttribute('aria-hidden','true');
    document.body.appendChild(iframe);

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND_URL;
    form.target=frameName;
    form.style.display='none';
    form.acceptCharset='UTF-8';
    const input=document.createElement('input');
    input.type='hidden';
    input.name='payload';
    input.value=JSON.stringify(payload);
    form.appendChild(input);
    document.body.appendChild(form);

    let finished=false;
    let pollTimer=null;
    let timeoutTimer=null;
    const scripts=[];

    const cleanup=()=>{
      if(finished)return;
      finished=true;
      window.removeEventListener('message',onMessage);
      if(pollTimer)clearTimeout(pollTimer);
      if(timeoutTimer)clearTimeout(timeoutTimer);
      try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
      scripts.forEach(s=>{try{s.remove()}catch(_){}});
      setTimeout(()=>{try{form.remove();iframe.remove()}catch(_){}},100);
    };

    const finishFromData=(data)=>{
      if(!data||data.requestId!==requestId)return false;
      if(data.status==='done'&&data.ok){cleanup();resolve(data);return true}
      if(data.status==='error'||data.ok===false&&data.error){cleanup();reject(new Error(data.error||'Không thể lưu đăng ký'));return true}
      return false;
    };

    const onMessage=(event)=>{
      const data=event.data;
      if(!data||data.type!==REGISTRATION_MESSAGE_TYPE)return;
      finishFromData(data);
    };
    window.addEventListener('message',onMessage);

    window[callbackName]=(data)=>{
      if(finished)return;
      if(!finishFromData(data)) schedulePoll(1200);
    };

    const pollStatus=()=>{
      if(finished)return;
      const script=document.createElement('script');
      scripts.push(script);
      script.async=true;
      script.src=BACKEND_URL+'?action=status&requestId='+encodeURIComponent(requestId)+'&callback='+encodeURIComponent(callbackName)+'&_='+Date.now();
      script.onerror=()=>{if(!finished)schedulePoll(1800)};
      script.onload=()=>{setTimeout(()=>{try{script.remove()}catch(_){}},50)};
      document.head.appendChild(script);
    };

    function schedulePoll(delay){
      if(finished)return;
      if(pollTimer)clearTimeout(pollTimer);
      pollTimer=setTimeout(pollStatus,delay);
    }

    timeoutTimer=setTimeout(()=>{
      if(finished)return;
      cleanup();
      reject(new Error('Hệ thống chưa xác nhận kết quả sau 120 giây. Vui lòng kiểm tra Google Sheet/Email trước khi gửi lại để tránh trùng đăng ký.'));
    },120000);

    try{
      form.submit();
      schedulePoll(1000);
    }catch(err){
      cleanup();
      reject(err);
    }
  });
}

function escapeHtml(value){
  return String(value==null?'':value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function renderFinalConfirmation(payload,data){
  compute();
  const finalTotal=Number(data&&data.total)||state.total;
  const status='Chờ kiểm tra chuyển khoản';
  const mailText=data&&data.emailSent
    ? `Email xác nhận đã được gửi đến <strong>${escapeHtml(payload.email)}</strong>.`
    : `Đăng ký đã được ghi nhận. Email xác nhận đang được hệ thống xử lý cho <strong>${escapeHtml(payload.email)}</strong>.`;

  const itemRows=state.lines.map(item=>{
    const meta=item.meta?`<div style="font-size:12px;color:#64748b;margin-top:3px">${escapeHtml(item.meta)}</div>`:'';
    return `<div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid #e2e8f0;text-align:left">
      <div><strong>${escapeHtml(item.name)}</strong>${meta}<div style="font-size:12px;color:#64748b;margin-top:3px">${item.qty} × ${money(item.price)}</div></div>
      <strong style="white-space:nowrap">${money(item.subtotal)}</strong>
    </div>`;
  }).join('');

  const done=$('done');
  done.innerHTML=`
    <div class="success" style="max-width:780px;margin:0 auto">
      <div class="check">✓</div>
      <div style="font-size:12px;font-weight:950;letter-spacing:.08em;color:#0f766e;margin-bottom:8px">BƯỚC 5 — XÁC NHẬN ĐĂNG KÝ</div>
      <h2 style="margin-bottom:6px">Cảm ơn bạn đã đăng ký!</h2>
      <div class="sub" style="margin-bottom:18px">Hệ thống đã ghi nhận đăng ký và ảnh minh chứng chuyển khoản của bạn.</div>

      <div style="text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:14px">
        <div style="font-size:12px;font-weight:900;color:#475569;margin-bottom:8px">THÔNG TIN ĐĂNG KÝ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;line-height:1.55">
          <div><span style="color:#64748b">Họ và tên:</span><br><strong>${escapeHtml(payload.name)}</strong></div>
          <div><span style="color:#64748b">MSSV:</span><br><strong>${escapeHtml(payload.studentId)}</strong></div>
          <div><span style="color:#64748b">Ngành / nhóm:</span><br><strong>${escapeHtml(payload.majorName)}</strong></div>
          <div><span style="color:#64748b">Lớp:</span><br><strong>${escapeHtml(payload.className)}</strong></div>
          <div><span style="color:#64748b">Giới tính:</span><br><strong>${escapeHtml(payload.gender)}</strong></div>
          <div><span style="color:#64748b">Email:</span><br><strong>${escapeHtml(payload.email)}</strong></div>
        </div>
      </div>

      <div style="text-align:left;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:12px">
        <div style="font-size:12px;font-weight:900;color:#475569;margin-bottom:4px">CÁC HẠNG MỤC ĐÃ ĐĂNG KÝ</div>
        ${itemRows}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:14px">
          <strong>TỔNG THANH TOÁN</strong>
          <strong style="font-size:24px">${money(finalTotal)}</strong>
        </div>
      </div>

      <div style="text-align:left;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:14px 16px;margin-top:12px;line-height:1.6">
        <div><span style="color:#475569">Nội dung chuyển khoản:</span> <strong>${escapeHtml(payload.transferContent)}</strong></div>
        <div><span style="color:#475569">Trạng thái:</span> <strong>${status}</strong></div>
        <div style="margin-top:6px">${mailText}</div>
      </div>

      <div style="margin-top:18px;font-size:17px;font-weight:900">Cảm ơn bạn đã đăng ký. Vui lòng giữ lại email xác nhận để đối chiếu khi cần.</div>
      <div class="actions" style="justify-content:center;margin-top:18px"><button class="secondary" onclick="location.reload()">Tạo đăng ký mới</button></div>
    </div>`;
}

async function submitRegistration(){
  if(!$('confirm').checked){alert('Vui lòng tích xác nhận trước khi gửi.');return}
  const file=$('proof').files[0];
  if(!file){alert('Vui lòng tải ảnh chụp màn hình chuyển khoản thành công.');return}
  if(file.size>5*1024*1024){alert('Ảnh minh chứng tối đa 5 MB.');return}
  if(!BACKEND_URL){alert('Form chưa được nối với Google Apps Script Web App.');return}
  const btn=$('submitBtn');
  btn.disabled=true;
  btn.textContent='Đang gửi...';
  try{
    const payload=payloadBase();
    payload.proofBase64=await fileToBase64(file);
    payload.proofMime=file.type||'image/jpeg';
    payload.proofName=file.name||'minh-chung.jpg';
    const data=await submitViaIframe(payload);
    renderFinalConfirmation(payload,data);
    setStep(5);
  }catch(err){
    alert('Không thể gửi đăng ký: '+(err&&err.message?err.message:err));
  }finally{
    btn.disabled=false;
    btn.textContent='Gửi đăng ký & minh chứng';
  }
}

// Quy tắc mũ: Nữ thuộc Điều dưỡng / GMHS / Răng Hàm Mặt dùng mũ 3 lá.
const HAT_THREE_LEAF_MAJORS=['Điều dưỡng','GMHS','Răng Hàm Mặt'];
hatType=function(){
  const major=clean($('major').value);
  const gender=clean($('gender').value);
  return HAT_THREE_LEAF_MAJORS.includes(major)&&gender==='Nữ'?'Mũ 3 lá (Nữ)':'';
};
updateHatNote=function(){
  const noteText=hatType()?`🎓 Ghi chú mũ: ${hatType()}`:'';
  let setNote=$('hatSetNote');
  if(!setNote){
    const panel=$('blouseSetPanel');
    const target=panel&&panel.querySelector('.hint');
    if(target){
      setNote=document.createElement('div');
      setNote.id='hatSetNote';
      setNote.className='hint';
      setNote.style.marginTop='6px';
      setNote.style.fontWeight='800';
      target.insertAdjacentElement('afterend',setNote);
    }
  }
  if(setNote)setNote.textContent=noteText;
  const separateNote=$('hatNote');
  if(separateNote)separateNote.textContent=noteText;
};

function ensureFiveStepUI(){
  const steps=document.querySelector('.steps');
  if(steps){
    steps.style.gridTemplateColumns='repeat(5,1fr)';
    if(!$('s5')){
      const s5=document.createElement('div');
      s5.className='step';
      s5.id='s5';
      s5.textContent='5. Xác nhận';
      steps.appendChild(s5);
    }
  }
  const topSub=document.querySelector('.top .sub');
  if(topSub)topSub.textContent='Khai thông tin → chọn sản phẩm & size → thanh toán QR → gửi minh chứng → xác nhận đăng ký';
}

const baseSetStep=setStep;
setStep=function(n){
  ensureFiveStepUI();
  ['step1','step2','step3','step4','done'].forEach(id=>{const el=$(id);if(el)el.classList.add('hidden')});
  if(n===1)$('step1').classList.remove('hidden');
  if(n===2)$('step2').classList.remove('hidden');
  if(n===3)$('step3').classList.remove('hidden');
  if(n===4)$('step4').classList.remove('hidden');
  if(n===5)$('done').classList.remove('hidden');
  ['s1','s2','s3','s4','s5'].forEach((id,i)=>{
    const el=$(id);if(!el)return;
    el.classList.remove('active','done');
    if(i+1===n)el.classList.add('active');
    if(i+1<n)el.classList.add('done');
  });
  window.scrollTo({top:0,behavior:'smooth'});
};

document.addEventListener('DOMContentLoaded',()=>{
  ensureFiveStepUI();
  updateHatNote();
  ['major','gender'].forEach(id=>{
    const el=$(id);
    if(el)el.addEventListener('change',()=>{updateHatNote();compute()});
  });
});