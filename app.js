const BANK={id:'TPB',name:'TPBank',account:'10001778727',owner:'HOANG LE PHI BACH'};
const PRODUCTS={
 blouse:{qty:'q_blouse',name:'Bộ blouse + mũ',price:375000,size:'sz_blouse',type:'type_blouse'},
 sport:{qty:'q_sport',name:'Đồ thể dục',price:170000,size:'sz_sport'},
 lanyard:{qty:'q_lanyard',name:'Dây đeo thẻ sinh viên',price:22000},
 union:{qty:'q_union',name:'Áo Đoàn',price:75000,size:'sz_union'}
};

const MAJOR_CLASSES={
 'Điều dưỡng đa khoa':['ĐH ĐD 14A','ĐH ĐD 14B','ĐH ĐD 14C'],
 'Điều dưỡng nha khoa':['ĐH ĐD 14D'],
 'Điều dưỡng gây mê hồi sức':['ĐH ĐD 14E'],
 'Kỹ thuật xét nghiệm y học':['ĐH KT XNYH 14A','ĐH KT XNYH 14B'],
 'Kỹ thuật hình ảnh y học':['ĐH KT HAYH 13A','ĐH KT HAYH 13B'],
 'Kỹ thuật phục hồi chức năng':['ĐH KT PHCN 13A','ĐH KT PHCN 13B'],
 'Dược học':['ĐH Dược học 14A','ĐH Dược học 14B'],
 'Y khoa':['ĐH YK 12A','ĐH YK 12B','ĐH YK 12C','ĐH YK 12D'],
 'Y tế công cộng':['ĐH YTCC 10']
};

let state={total:0,lines:[],code:''};
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('vi-VN').format(n)+'đ';
const clean=s=>(s||'').trim();

function setupAcademicFields(){
 const oldClass=$('className');
 if(!oldClass||$('majorName')) return;
 const classWrap=oldClass.parentElement;
 const grid=classWrap.parentElement;
 const majorWrap=document.createElement('div');
 majorWrap.innerHTML='<label>Ngành học *</label><select id="majorName"><option value="">— Chọn ngành học —</option></select>';
 grid.insertBefore(majorWrap,classWrap);
 const classSelect=document.createElement('select');
 classSelect.id='className';
 classSelect.innerHTML='<option value="">— Chọn ngành học trước —</option>';
 classWrap.innerHTML='<label>Lớp *</label>';
 classWrap.appendChild(classSelect);
 const major=$('majorName');
 Object.keys(MAJOR_CLASSES).forEach(x=>{const op=document.createElement('option');op.value=x;op.textContent=x;major.appendChild(op)});
 major.addEventListener('change',()=>{
   const classes=MAJOR_CLASSES[major.value]||[];
   classSelect.innerHTML='<option value="">— Chọn lớp —</option>';
   classes.forEach(x=>{const op=document.createElement('option');op.value=x;op.textContent=x;classSelect.appendChild(op)});
   classSelect.disabled=!classes.length;
   state.code='';
 });
 classSelect.disabled=true;
 classSelect.addEventListener('change',()=>state.code='');
}

function setStep(n){
 ['step1','step2','step3','done'].forEach(id=>$(id).classList.add('hidden'));
 if(n===1)$('step1').classList.remove('hidden');
 if(n===2)$('step2').classList.remove('hidden');
 if(n===3)$('step3').classList.remove('hidden');
 if(n===4)$('done').classList.remove('hidden');
 ['s1','s2','s3'].forEach((id,i)=>{const el=$(id);el.classList.remove('active','done');if(i+1===n)el.classList.add('active');if(i+1<n||n===4)el.classList.add('done')});
 window.scrollTo({top:0,behavior:'smooth'});
}

function updateControlState(){
 const b=+$('q_blouse').value>0;$('type_blouse').disabled=!b;$('sz_blouse').disabled=!b;
 const s=+$('q_sport').value>0;$('sz_sport').disabled=!s;
 const u=+$('q_union').value>0;$('sz_union').disabled=!u;
}

function compute(){
 state.total=0;state.lines=[];
 Object.values(PRODUCTS).forEach(p=>{
  const q=+$(p.qty).value;
  if(q>0){
   let meta='';
   if(p.type) meta+=$(p.type).value;
   if(p.size) meta+=(meta?' • ':'')+'Size '+$(p.size).value;
   const subtotal=q*p.price;
   state.total+=subtotal;
   state.lines.push({name:p.name,qty:q,price:p.price,subtotal,meta});
  }
 });
 $('liveTotal').textContent=money(state.total);
 $('liveNote').textContent=state.lines.length?state.lines.map(x=>x.qty+'× '+x.name).join(' • '):'Chưa chọn sản phẩm';
 updateControlState();
}

function validatePerson(){
 const required=[['name','Họ và tên'],['studentId','Mã sinh viên'],['cccd','Số CCCD'],['majorName','Ngành học'],['className','Lớp'],['phone','Số điện thoại'],['email','Email']];
 for(const [id,label] of required){if(!clean($(id).value)){alert('Vui lòng chọn/nhập '+label+'.');$(id).focus();return false}}
 const allowed=MAJOR_CLASSES[clean($('majorName').value)]||[];
 if(!allowed.includes(clean($('className').value))){alert('Lớp không thuộc ngành đã chọn. Vui lòng chọn lại.');$('majorName').focus();return false}
 if(!/^\d{12}$/.test(clean($('cccd').value))){alert('Số CCCD phải gồm đúng 12 chữ số.');$('cccd').focus();return false}
 const phone=clean($('phone').value).replace(/\s/g,'');if(!/^0?\d{9,10}$/.test(phone)){alert('Vui lòng kiểm tra lại số điện thoại.');$('phone').focus();return false}
 const email=clean($('email').value);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('Email chưa đúng định dạng.');$('email').focus();return false}
 if(+$('q_blouse').value>0 && !clean($('sz_blouse').value)){alert('Vui lòng chọn size blouse đã thử trực tiếp.');$('sz_blouse').focus();return false}
 return true;
}

function buildCode(){
 if(state.code)return state.code;
 state.code=clean($('className').value)+'-'+clean($('studentId').value);
 return state.code;
}

function renderReview(){
 const p=[
  ['Họ tên',clean($('name').value)],
  ['Mã sinh viên',clean($('studentId').value)],
  ['CCCD',clean($('cccd').value)],
  ['Ngành học',clean($('majorName').value)],
  ['Lớp',clean($('className').value)],
  ['Điện thoại',clean($('phone').value)],
  ['Email',clean($('email').value)]
 ];
 $('personReview').innerHTML='<div class="review"><div class="mini" style="font-weight:900;margin-bottom:4px">THÔNG TIN HÀNH CHÍNH</div>'+p.map(x=>`<div class="line"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')+'</div>';
 $('orderLines').innerHTML='<div class="review"><div class="mini" style="font-weight:900;margin-bottom:4px">SẢN PHẨM ĐĂNG KÝ</div>'+state.lines.map(x=>`<div class="line"><span><strong>${x.name}</strong><br><span class="mini">${x.qty} × ${money(x.price)}${x.meta?' • '+x.meta:''}</span></span><strong>${money(x.subtotal)}</strong></div>`).join('')+'</div>';
 $('totalText').textContent=money(state.total);$('orderCode').textContent=buildCode();
 const addInfo=encodeURIComponent(state.code);const owner=encodeURIComponent(BANK.owner);
 $('qr').src=`https://img.vietqr.io/image/${BANK.id}-${BANK.account}-compact2.png?amount=${state.total}&addInfo=${addInfo}&accountName=${owner}`;
 $('transferContent').textContent=state.code;$('bankAmount').textContent=money(state.total);
}

function go2(){if(!validatePerson())return;compute();if(state.total<=0){alert('Vui lòng đăng ký ít nhất một sản phẩm.');return}renderReview();setStep(2)}
function back1(){setStep(1)}
function go3(){setStep(3)}
function back2(){setStep(2)}

function previewFile(){
 const f=$('proof').files[0];if(!f)return;
 if(!f.type.startsWith('image/')){alert('Vui lòng chọn file ảnh.');$('proof').value='';return}
 if(f.size>8*1024*1024){alert('Ảnh minh chứng tối đa 8 MB.');$('proof').value='';return}
 const r=new FileReader();r.onload=e=>{const im=$('preview');im.src=e.target.result;im.style.display='inline-block'};r.readAsDataURL(f);
}

function finish(){
 if(!$('proof').files[0]){alert('Vui lòng tải ảnh minh chứng chuyển khoản.');return}
 if(!$('confirm').checked){alert('Vui lòng xác nhận thông tin trước khi hoàn tất.');return}
 const items=state.lines.map(x=>`<li><strong>${x.name}:</strong> ${x.qty}${x.meta?' — '+x.meta:''} — ${money(x.subtotal)}</li>`).join('');
 $('emailBody').innerHTML=`<p>Chào <strong>${clean($('name').value)}</strong>,</p><p>Thông tin đăng ký của bạn đã được tổng hợp như sau:</p><p><strong>Nội dung chuyển khoản:</strong> <span class="order-code">${state.code}</span></p><p><strong>Mã sinh viên:</strong> ${clean($('studentId').value)}<br><strong>CCCD:</strong> ${clean($('cccd').value)}<br><strong>Ngành học:</strong> ${clean($('majorName').value)}<br><strong>Lớp:</strong> ${clean($('className').value)}</p><ul>${items}</ul><p><strong>Lưu ý:</strong> Size blouse trong đăng ký là size đã được thử trực tiếp.</p><p><strong>Tổng thanh toán: ${money(state.total)}</strong></p><p class="mini">Email dự kiến gửi tới: ${clean($('email').value)}</p>`;
 setStep(4);
}

async function copyText(text,btn){
 try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Đã copy';setTimeout(()=>btn.textContent=old,1200)}catch(e){prompt('Sao chép nội dung:',text)}
}

document.addEventListener('DOMContentLoaded',()=>{
 setupAcademicFields();
 document.querySelectorAll('.qty').forEach(el=>el.addEventListener('change',compute));
 $('type_blouse').addEventListener('change',compute);
 $('sz_blouse').addEventListener('change',compute);
 $('sz_sport').addEventListener('change',compute);
 $('sz_union').addEventListener('change',compute);
 $('studentId').addEventListener('input',()=>state.code='');
 updateControlState();compute();
});