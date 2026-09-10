const SHEET_ID = '1kdBgjactAXjXt0Jp0dtqmyZvacq8Clg3bN5_ePQ4l0k';
const SHEET_NAME = 'Đăng ký';
const PROOF_FOLDER_ID = '1bKDMfR7gXXEP86si_nTlHjSeuvdCr-cI';
const BAG_LIMIT = 250;

const PRICES = { blouseSet:375000, blouseShirt:280000, blousePants:120000, blouseHat:25000, sport:170000, union:75000, bag:180000, lanyard:22000 };
const MAJOR_CLASSES = {
  'Điều dưỡng':['ĐH ĐD 14A','ĐH ĐD 14B','ĐH ĐD 14C'],
  'GMHS':['ĐH ĐD 14E'],
  'Răng Hàm Mặt':['ĐH ĐD 14D'],
  'YTCC':['ĐH YTCC 10'],
  'Dược':['ĐH Dược học 14A','ĐH Dược học 14B'],
  'PHCN':['ĐH KT PHCN 13A','ĐH KT PHCN 13B'],
  'Hình ảnh y học':['ĐH KT HAYH 13A','ĐH KT HAYH 13B'],
  'Y khoa':['ĐH YK 12A','ĐH YK 12B','ĐH YK 12C','ĐH YK 12D'],
  'Xét nghiệm Y học':['ĐH KT XNYH 14A','ĐH KT XNYH 14B']
};

function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:true,service:'Trang phục sinh viên backend'})).setMimeType(ContentService.MimeType.JSON)}
function doPost(e){try{const data=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');return json_({ok:true,...saveRegistration_(data)})}catch(err){console.error(err);return json_({ok:false,error:String(err&&err.message||err)})}}

function saveRegistration_(data){
  validatePerson_(data);
  const ss=SpreadsheetApp.openById(SHEET_ID),sh=ss.getSheetByName(SHEET_NAME);if(!sh)throw new Error('Không tìm thấy sheet Đăng ký');
  const name=clean_(data.name),studentId=clean_(data.studentId),major=clean_(data.majorName),cls=clean_(data.className),gender=clean_(data.gender),blouseMode=clean_(data.blouseMode)||'none';
  const qBlouseSet=blouseMode==='set'?qty_(data.qBlouseSet):0,qBlouseShirt=blouseMode==='separate'?qty_(data.qBlouseShirt):0,qBlousePants=blouseMode==='separate'?qty_(data.qBlousePants):0,qBlouseHat=blouseMode==='separate'?qty_(data.qBlouseHat):0,qSport=qty_(data.qSport),qUnion=qty_(data.qUnion),qBag=qty_(data.qBag),qLanyard=qty_(data.qLanyard);
  validateProducts_(data,{blouseMode,qBlouseSet,qBlouseShirt,qBlousePants,qBlouseHat,qSport,qUnion,qBag,qLanyard});
  const blouseSetMoney=qBlouseSet*PRICES.blouseSet,blouseShirtMoney=qBlouseShirt*PRICES.blouseShirt,blousePantsMoney=qBlousePants*PRICES.blousePants,blouseHatMoney=qBlouseHat*PRICES.blouseHat,sportMoney=qSport*PRICES.sport,unionMoney=qUnion*PRICES.union,bagMoney=qBag*PRICES.bag,lanyardMoney=qLanyard*PRICES.lanyard;
  const total=blouseSetMoney+blouseShirtMoney+blousePantsMoney+blouseHatMoney+sportMoney+unionMoney+bagMoney+lanyardMoney;if(total<=0)throw new Error('Chưa chọn sản phẩm');
  const hasHat=qBlouseSet>0||qBlouseHat>0;const hatType=(major==='Điều dưỡng'&&hasHat)?(gender==='Nam'?'Mũ Nam':'Mũ Nữ'):'';const transferContent=`${name} - ${studentId}`;const proofUrl=saveProof_(data,cls,studentId);
  const lock=LockService.getScriptLock();lock.waitLock(20000);let row;
  try{
    if(qBag>0){const sold=currentBagCount_(sh),remaining=Math.max(0,BAG_LIMIT-sold);if(qBag>remaining)throw new Error(`Balo chỉ còn ${remaining} cái. Vui lòng giảm số lượng balo.`)}
    const notes=hatType?`Ngành Điều dưỡng: ${hatType}`:'';
    sh.appendRow([new Date(),name,studentId,clean_(data.cccd),gender,Number(data.height),Number(data.weight),major,cls,clean_(data.phone),clean_(data.email),clean_(data.sourceQr),blouseMode,qBlouseSet?clean_(data.blouseSetSize):'',qBlouseSet,blouseSetMoney,qBlouseShirt?clean_(data.blouseShirtSize):'',qBlouseShirt,blouseShirtMoney,qBlousePants?clean_(data.blousePantsSize):'',qBlousePants,blousePantsMoney,qBlouseHat,hatType,blouseHatMoney,qSport,qSport?clean_(data.sportSize):'',sportMoney,qUnion,qUnion?clean_(data.unionSize):'',unionMoney,qBag,bagMoney,qLanyard,lanyardMoney,total,transferContent,proofUrl,'Chờ kiểm tra',notes]);
    row=sh.getLastRow();applyRowFormats_(sh,row,proofUrl);
  }finally{lock.releaseLock()}
  let emailSent=false;
  try{sendConfirmation_(data,{name,studentId,cls,major,gender,hatType,transferContent,total,blouseMode,qBlouseSet,qBlouseShirt,qBlousePants,qBlouseHat,qSport,qUnion,qBag,qLanyard,blouseSetMoney,blouseShirtMoney,blousePantsMoney,blouseHatMoney,sportMoney,unionMoney,bagMoney,lanyardMoney});emailSent=true}catch(mailErr){console.error('Email error',mailErr);const c=sh.getRange(row,40),old=clean_(c.getValue());c.setValue((old?old+' | ':'')+'Chưa gửi được email xác nhận: '+String(mailErr.message||mailErr))}
  return {total,transferContent,proofUrl,row,emailSent,hatType};
}

function validatePerson_(d){const required=['name','studentId','cccd','gender','height','weight','majorName','className','phone','email'];required.forEach(k=>{if(d[k]===null||d[k]===undefined||clean_(d[k])==='')throw new Error(`Thiếu trường ${k}`)});if(!/^\d{12}$/.test(clean_(d.cccd)))throw new Error('CCCD phải đủ 12 số');if(['Nam','Nữ'].indexOf(clean_(d.gender))<0)throw new Error('Giới tính không hợp lệ');const h=Number(d.height),w=Number(d.weight);if(!Number.isFinite(h)||h<120||h>220)throw new Error('Chiều cao không hợp lệ');if(!Number.isFinite(w)||w<25||w>200)throw new Error('Cân nặng không hợp lệ');const major=clean_(d.majorName),cls=clean_(d.className),other=d.classWasOther===true||String(d.classWasOther).toLowerCase()==='true';if(!MAJOR_CLASSES[major])throw new Error('Ngành / nhóm học không hợp lệ');if(!other&&MAJOR_CLASSES[major].indexOf(cls)<0)throw new Error('Ngành / nhóm học và lớp không khớp danh mục')}
function validateProducts_(d,q){const sizes=['S','M','L','XL','XXL'];if(['none','set','separate'].indexOf(q.blouseMode)<0)throw new Error('Hình thức mua blouse không hợp lệ');if(q.blouseMode==='set'){if(q.qBlouseSet<=0)throw new Error('Chưa chọn số lượng bộ blouse');if(sizes.indexOf(clean_(d.blouseSetSize))<0)throw new Error('Thiếu hoặc sai size bộ blouse')}if(q.blouseMode==='separate'){if(q.qBlouseShirt+q.qBlousePants+q.qBlouseHat<=0)throw new Error('Chưa chọn món blouse mua riêng');if(q.qBlouseShirt>0&&sizes.indexOf(clean_(d.blouseShirtSize))<0)throw new Error('Thiếu hoặc sai size áo blouse');if(q.qBlousePants>0&&sizes.indexOf(clean_(d.blousePantsSize))<0)throw new Error('Thiếu hoặc sai size quần blouse')}if(q.qSport>0&&sizes.indexOf(clean_(d.sportSize))<0)throw new Error('Thiếu hoặc sai size đồ thể dục');if(q.qUnion>0&&sizes.indexOf(clean_(d.unionSize))<0)throw new Error('Thiếu hoặc sai size áo Đoàn')}
function saveProof_(data,cls,studentId){if(!data.proofBase64)throw new Error('Thiếu ảnh minh chứng chuyển khoản');const bytes=Utilities.base64Decode(data.proofBase64);if(bytes.length>6*1024*1024)throw new Error('Ảnh minh chứng quá lớn');const mime=clean_(data.proofMime)||'image/jpeg';if(mime.indexOf('image/')!==0)throw new Error('Minh chứng phải là file hình ảnh');const ext=mime.indexOf('png')>=0?'png':mime.indexOf('webp')>=0?'webp':'jpg';const safeName=`${normalizeCode_(cls)}-${normalizeCode_(studentId)}-${Date.now()}.${ext}`;return DriveApp.getFolderById(PROOF_FOLDER_ID).createFile(Utilities.newBlob(bytes,mime,safeName)).getUrl()}
function currentBagCount_(sh){const last=sh.getLastRow();if(last<2)return 0;return sh.getRange(2,32,last-1,1).getValues().reduce((sum,r)=>sum+Number(r[0]||0),0)}
function applyRowFormats_(sh,row,proofUrl){sh.getRange(row,1).setNumberFormat('dd/MM/yyyy HH:mm:ss');[16,19,22,25,28,31,33,35,36].forEach(col=>sh.getRange(row,col).setNumberFormat('#,##0 [$₫-vi-VN]'));sh.getRange(row,6).setNumberFormat('0');sh.getRange(row,7).setNumberFormat('0.0');if(proofUrl)sh.getRange(row,38).setFormula(`=HYPERLINK("${proofUrl}","Xem minh chứng")`)}
function sendConfirmation_(data,x){const email=clean_(data.email);if(!email)return;const lines=[];if(x.qBlouseSet)lines.push(`- Bộ blouse (áo + quần + mũ): ${x.qBlouseSet} bộ | Size ${clean_(data.blouseSetSize)}${x.hatType?' | '+x.hatType:''} | ${money_(x.blouseSetMoney)}`);if(x.qBlouseShirt)lines.push(`- Áo blouse: ${x.qBlouseShirt} cái | Size ${clean_(data.blouseShirtSize)} | ${money_(x.blouseShirtMoney)}`);if(x.qBlousePants)lines.push(`- Quần blouse: ${x.qBlousePants} cái | Size ${clean_(data.blousePantsSize)} | ${money_(x.blousePantsMoney)}`);if(x.qBlouseHat)lines.push(`- Mũ blouse: ${x.qBlouseHat} cái${x.hatType?' | '+x.hatType:''} | ${money_(x.blouseHatMoney)}`);if(x.qSport)lines.push(`- Đồ thể dục: ${x.qSport} bộ | Size ${clean_(data.sportSize)} | ${money_(x.sportMoney)}`);if(x.qUnion)lines.push(`- Áo Đoàn: ${x.qUnion} cái | Size ${clean_(data.unionSize)} | ${money_(x.unionMoney)}`);if(x.qBag)lines.push(`- Balo trường: ${x.qBag} cái | ${money_(x.bagMoney)}`);if(x.qLanyard)lines.push(`- Dây đeo thẻ có logo trường: ${x.qLanyard} cái | ${money_(x.lanyardMoney)}`);const subject=`[XÁC NHẬN] Đăng ký đồng phục - ${x.studentId}`;const body=[`Chào ${x.name},`,'','Hệ thống đã ghi nhận đăng ký và ảnh minh chứng chuyển khoản của bạn.',`MSSV: ${x.studentId}`,`Ngành / nhóm: ${x.major}`,`Lớp: ${x.cls}`,`Giới tính: ${x.gender}`,`Nội dung chuyển khoản: ${x.transferContent}`,'','CÁC HẠNG MỤC ĐÃ ĐĂNG KÝ:',...lines,'',`TỔNG THANH TOÁN: ${money_(x.total)}`,'','Trạng thái: Chờ kiểm tra chuyển khoản.','Vui lòng giữ email này để đối chiếu khi cần.'].join('\n');MailApp.sendEmail(email,subject,body)}
function qty_(v){const n=Number(v||0);return Number.isFinite(n)&&n>=0&&n<=5?Math.floor(n):0}function clean_(v){return String(v==null?'':v).trim()}function normalizeCode_(v){return clean_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9]/g,'').toUpperCase()||'NA'}function money_(n){return Number(n||0).toLocaleString('vi-VN')+'đ'}function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}