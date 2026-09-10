const PRODUCTS={
 blouse:{qty:'q_blouse',name:'Blouse (áo + quần + mũ)',price:375000,size:'sz_blouse',type:'type_blouse'},
 union:{qty:'q_union',name:'Áo Đoàn',price:75000,size:'sz_union'},
 sport:{qty:'q_sport',name:'Đồ thể dục',price:170000,size:'sz_sport'},
 bag:{qty:'q_bag',name:'Balo trường',price:180000},
 lanyard:{qty:'q_lanyard',name:'Dây đeo thẻ có logo trường',price:22000}
};

let state={total:0,lines:[],visit:null};
const $=id=>document.getElementById(id);
const clean=s=>(s||'').trim();
const money=n=>new Intl.NumberFormat('vi-VN').format(n)+'đ';

function setStep(n){
 ['step1','step2','step3','done'].forEach(id=>$(id).classList.add('hidden'));
 if(n===1)$('step1').classList.remove('hidden');
 if(n===2)$('step2').classList.remove('hidden');
 if(n===3)$('step3').classList.remove('hidden');
 if(n===4)$('done').classList.remove('hidden');
 ['s1','s2','s3'].forEach((id,i)=>{const el=$(id);el.classList.remove('active','done');if(i+1===n)el.classList.add('active');if(i+1<n||n===4)el.classList.add('done')});
 window.scrollTo({top:0,behavior:'smooth'});
}

function selectedDay(){
 const x=document.querySelector('input[name="visitDay"]:checked');
 if(!x)return null;
 const [date,time,groups]=x.value.split('|');
 return {date,time,groups};
}

function validatePerson(){
 const required=[['name','Họ và tên'],['studentId','Mã sinh viên'],['cccd','Số CCCD'],['major','Ngành / nhóm học'],['className','Lớp'],['phone','Số điện thoại'],['email','Email']];
 for(const [id,label] of required){if(!clean($(id).value)){alert('Vui lòng nhập/chọn '+label+'.');$(id).focus();return false}}
 if(!/^\d{12}$/.test(clean($('cccd').value))){alert('Số CCCD phải gồm đúng 12 chữ số.');$('cccd').focus();return false}
 const phone=clean($('phone').value).replace(/\s/g,'');
 if(!/^0?\d{9,10}$/.test(phone)){alert('Vui lòng kiểm tra lại số điện thoại.');$('phone').focus();return false}
 const email=clean($('email').value);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('Email chưa đúng định dạng.');$('email').focus();return false}
 state.visit=selectedDay();
 if(!state.visit){alert('Vui lòng chọn ngày dự kiến đến đăng ký / thử đồ.');return false}
 return true;
}

function updateControlState(){
 const b=+$('q_blouse').value>0;$('type_blouse').disabled=!b;$('sz_blouse').disabled=!b;
 const u=+$('q_union').value>0;$('sz_union').disabled=!u;
 const s=+$('q_sport').value>0;$('sz_sport').disabled=!s;
}

function compute(){
 state.total=0;state.lines=[];
 Object.values(PRODUCTS).forEach(p=>{
   const q=+$(p.qty).value;
   if(q>0){
     let meta='';
     if(p.type)meta+=$(p.type).value;
     if(p.size)meta+=(meta?' • ':'')+'Size '+$(p.size).value;
     const subtotal=q*p.price;
     state.total+=subtotal;
     state.lines.push({name:p.name,qty:q,price:p.price,subtotal,meta});
   }
 });
 $('liveTotal').textContent=money(state.total);
 $('liveNote').textContent=state.lines.length?state.lines.map(x=>x.qty+'× '+x.name).join(' • '):'Chưa chọn sản phẩm';
 updateControlState();
}

function validateProducts(){
 compute();
 if(state.total<=0){alert('Vui lòng đăng ký ít nhất một sản phẩm.');return false}
 if(+$('q_blouse').value>0&&!clean($('sz_blouse').value)){alert('Vui lòng chọn size blouse sau khi đã thử trực tiếp.');$('sz_blouse').focus();return false}
 if(+$('q_union').value>0&&!clean($('sz_union').value)){alert('Vui lòng chọn size áo Đoàn sau khi đã thử trực tiếp.');$('sz_union').focus();return false}
 if(+$('q_sport').value>0&&!clean($('sz_sport').value)){alert('Vui lòng chọn size đồ thể dục.');$('sz_sport').focus();return false}
 return true;
}

function go2(){if(validatePerson())setStep(2)}
function back1(){setStep(1)}
function go3(){if(!validateProducts())return;renderReview();setStep(3)}
function back2(){setStep(2)}

function renderReview(){
 state.visit=selectedDay();
 const person=[
  ['Họ tên',clean($('name').value)],['MSSV',clean($('studentId').value)],['CCCD',clean($('cccd').value)],['Ngành / nhóm',clean($('major').value)],['Lớp',clean($('className').value)],['SĐT',clean($('phone').value)],['Email',clean($('email').value)]
 ];
 const date=`<div class="review-date"><strong>Ngày dự kiến đến:</strong> ${state.visit.date} • ${state.visit.time}<br><span class="mini">Nhóm ưu tiên theo thông báo: ${state.visit.groups}. Sinh viên vẫn có thể đến bất kỳ thời gian nào trong 3 ngày.</span></div>`;
 const p='<div class="review"><div class="mini" style="font-weight:900;margin-bottom:4px">THÔNG TIN SINH VIÊN</div>'+person.map(x=>`<div class="line"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')+'</div>';
 const items='<div class="review" style="margin-top:12px"><div class="mini" style="font-weight:900;margin-bottom:4px">SẢN PHẨM ĐĂNG KÝ</div>'+state.lines.map(x=>`<div class="line"><span><strong>${x.name}</strong><br><span class="mini">${x.qty} × ${money(x.price)}${x.meta?' • '+x.meta:''}</span></span><strong>${money(x.subtotal)}</strong></div>`).join('')+'</div>';
 $('review').innerHTML=date+p+items;
 $('finalTotal').textContent=money(state.total);
}

function finish(){
 if(!$('confirm').checked){alert('Vui lòng tích xác nhận trước khi hoàn tất.');return}
 const day=state.visit||selectedDay();
 $('doneText').innerHTML=`Đăng ký của <strong>${clean($('name').value)}</strong> đã được tổng hợp.<br>Dự kiến đến: <strong>${day.date} • ${day.time}</strong>.<br>Số tiền dự kiến nộp trực tiếp: <strong>${money(state.total)}</strong>.`;
 setStep(4);
}

document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('.qty').forEach(el=>el.addEventListener('change',compute));
 ['type_blouse','sz_blouse','sz_union','sz_sport'].forEach(id=>$(id).addEventListener('change',compute));
 updateControlState();compute();
});