const REGISTRATION_MESSAGE_TYPE='registration-result';

function submitViaIframe(payload){
  return new Promise((resolve,reject)=>{
    const requestId='REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
    payload.requestId=requestId;
    const frameName='registrationBridge_'+requestId.replace(/[^A-Za-z0-9_]/g,'');
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
    const cleanup=()=>{
      if(finished)return;
      finished=true;
      window.removeEventListener('message',onMessage);
      clearTimeout(timer);
      setTimeout(()=>{try{form.remove();iframe.remove()}catch(_){}},100);
    };
    const onMessage=(event)=>{
      const data=event.data;
      if(!data||data.type!==REGISTRATION_MESSAGE_TYPE||data.requestId!==requestId)return;
      cleanup();
      if(data.ok)resolve(data);else reject(new Error(data.error||'Không thể lưu đăng ký'));
    };
    window.addEventListener('message',onMessage);
    const timer=setTimeout(()=>{
      if(finished)return;
      cleanup();
      reject(new Error('Hệ thống chưa phản hồi sau 60 giây. Vui lòng kiểm tra Google Sheet/Email trước khi gửi lại để tránh trùng đăng ký.'));
    },60000);

    try{form.submit()}catch(err){cleanup();reject(err)}
  });
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
    const mailText=data.emailSent?`Email xác nhận đã được gửi đến <strong>${payload.email}</strong>.`:`Đăng ký đã lưu thành công nhưng email xác nhận chưa gửi được; ban tổ chức sẽ kiểm tra lại.`;
    $('doneText').innerHTML=`Đăng ký của <strong>${payload.name}</strong> — lớp <strong>${payload.className}</strong> đã được ghi nhận.<br>Tổng thanh toán: <strong>${money(data.total||state.total)}</strong>.<br>${mailText}`;
    setStep(5);
  }catch(err){
    alert('Không thể gửi đăng ký: '+(err&&err.message?err.message:err));
  }finally{
    btn.disabled=false;
    btn.textContent='Gửi đăng ký & minh chứng';
  }
}
