const SHEET_ID = '1kdBgjactAXjXt0Jp0dtqmyZvacq8Clg3bN5_ePQ4l0k';
const SHEET_NAME = 'Đăng ký';
const PROOF_FOLDER_ID = '1bKDMfR7gXXEP86si_nTlHjSeuvdCr-cI';
const BAG_LIMIT = 250;
const STATUS_TTL_SECONDS = 600;

const PRICES = {
  blouseSet:375000,
  blouseShirt:280000,
  blousePants:120000,
  blouseHat:25000,
  sport:170000,
  union:75000,
  bag:180000,
  lanyard:22000
};

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

const OFFICIAL_CLASSES = [
  'ĐH ĐD 14A','ĐH ĐD 14B','ĐH ĐD 14C','ĐH ĐD 14D','ĐH ĐD 14E',
  'ĐH KT XNYH 14A','ĐH KT XNYH 14B',
  'ĐH KT HAYH 13A','ĐH KT HAYH 13B',
  'ĐH KT PHCN 13A','ĐH KT PHCN 13B',
  'ĐH Dược học 14A','ĐH Dược học 14B',
  'ĐH YK 12A','ĐH YK 12B','ĐH YK 12C','ĐH YK 12D',
  'ĐH YTCC 10'
];

const THREE_LEAF_HAT_MAJORS = ['Điều dưỡng','GMHS','Răng Hàm Mặt'];

function doGet(e){
  const action=clean_(e&&e.parameter&&e.parameter.action);
  if(action==='status'){
    const requestId=clean_(e&&e.parameter&&e.parameter.requestId);
    const callback=clean_(e&&e.parameter&&e.parameter.callback);
    const result=getRequestStatus_(requestId);
    if(callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)){
      return ContentService
        .createTextOutput(callback+'('+JSON.stringify(result)+');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return json_(result);
  }
  return json_({ok:true,service:'Trang phục sinh viên backend',version:'2026-09-11-class-sheets-hat-note'});
}

function doPost(e){
  let requestId='';
  try{
    const raw=(e&&e.parameter&&e.parameter.payload)
      ? e.parameter.payload
      : ((e&&e.postData&&e.postData.contents)||'{}');
    const data=JSON.parse(raw);
    requestId=clean_(data.requestId);
    if(!requestId) throw new Error('Thiếu requestId');

    setRequestStatus_(requestId,{type:'registration-result',requestId,status:'processing',ok:false});
    const saved=saveRegistration_(data);
    const result={type:'registration-result',requestId,status:'done',ok:true,...saved};
    setRequestStatus_(requestId,result);
    return htmlBridge_(result);
  }catch(err){
    console.error(err);
    const result={type:'registration-result',requestId,status:'error',ok:false,error:String(err&&err.message||err)};
    if(requestId) setRequestStatus_(requestId,result);
    return htmlBridge_(result);
  }
}

function statusKey_(requestId){return 'registration:'+clean_(requestId)}
function setRequestStatus_(requestId,obj){
  CacheService.getScriptCache().put(statusKey_(requestId),JSON.stringify(obj),STATUS_TTL_SECONDS);
}
function getRequestStatus_(requestId){
  if(!requestId) return {type:'registration-result',requestId:'',status:'error',ok:false,error:'Thiếu requestId'};
  const raw=CacheService.getScriptCache().get(statusKey_(requestId));
  if(!raw) return {type:'registration-result',requestId,status:'pending',ok:false};
  try{return JSON.parse(raw)}catch(_){return {type:'registration-result',requestId,status:'pending',ok:false}}
}

function htmlBridge_(obj){
  const safe=JSON.stringify(obj).replace(/</g,'\\u003c');
  return HtmlService
    .createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><script>window.parent.postMessage('+safe+',"*");<\/script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveRegistration_(data){
  validatePerson_(data);

  const ss=SpreadsheetApp.openById(SHEET_ID);
  const totalSheet=ss.getSheetByName(SHEET_NAME);
  if(!totalSheet) throw new Error('Không tìm thấy sheet Đăng ký');

  const name=clean_(data.name);
  const studentId=clean_(data.studentId);
  const major=clean_(data.majorName);
  const cls=clean_(data.className);
  const gender=clean_(data.gender);
  const blouseMode=clean_(data.blouseMode)||'none';
  const classWasOther=data.classWasOther===true||String(data.classWasOther).toLowerCase()==='true';

  const qBlouseSet=blouseMode==='set'?qty_(data.qBlouseSet):0;
  const qBlouseShirt=blouseMode==='separate'?qty_(data.qBlouseShirt):0;
  const qBlousePants=blouseMode==='separate'?qty_(data.qBlousePants):0;
  const qBlouseHat=blouseMode==='separate'?qty_(data.qBlouseHat):0;
  const qSport=qty_(data.qSport);
  const qUnion=qty_(data.qUnion);
  const qBag=qty_(data.qBag);
  const qLanyard=qty_(data.qLanyard);

  validateProducts_(data,{blouseMode,qBlouseSet,qBlouseShirt,qBlousePants,qBlouseHat,qSport,qUnion,qBag,qLanyard});

  const blouseSetMoney=qBlouseSet*PRICES.blouseSet;
  const blouseShirtMoney=qBlouseShirt*PRICES.blouseShirt;
  const blousePantsMoney=qBlousePants*PRICES.blousePants;
  const blouseHatMoney=qBlouseHat*PRICES.blouseHat;
  const sportMoney=qSport*PRICES.sport;
  const unionMoney=qUnion*PRICES.union;
  const bagMoney=qBag*PRICES.bag;
  const lanyardMoney=qLanyard*PRICES.lanyard;
  const total=blouseSetMoney+blouseShirtMoney+blousePantsMoney+blouseHatMoney+sportMoney+unionMoney+bagMoney+lanyardMoney;
  if(total<=0) throw new Error('Chưa chọn sản phẩm');

  const hasHat=qBlouseSet>0||qBlouseHat>0;
  const hatNote=getHatNote_(major,gender,hasHat);
  const transferContent=`${name} - ${studentId}`;
  const targetSheetName=classWasOther?'KHÁC':cls;

  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  let row,proofUrl='',classRow;
  try{
    if(qBag>0){
      const sold=currentBagCount_(totalSheet);
      const remaining=Math.max(0,BAG_LIMIT-sold);
      if(qBag>remaining) throw new Error(`Balo chỉ còn ${remaining} cái. Vui lòng giảm số lượng balo.`);
    }

    proofUrl=saveProof_(data,cls,studentId);
    const now=new Date();
    const notes=hatNote?`${major}: ${hatNote}`:'';
    const rowData=[
      now,name,studentId,clean_(data.cccd),gender,Number(data.height),Number(data.weight),major,cls,
      clean_(data.phone),clean_(data.email),clean_(data.sourceQr),blouseMode,
      qBlouseSet?clean_(data.blouseSetSize):'',qBlouseSet,blouseSetMoney,
      qBlouseShirt?clean_(data.blouseShirtSize):'',qBlouseShirt,blouseShirtMoney,
      qBlousePants?clean_(data.blousePantsSize):'',qBlousePants,blousePantsMoney,
      qBlouseHat,hatNote,blouseHatMoney,
      qSport,qSport?clean_(data.sportSize):'',sportMoney,
      qUnion,qUnion?clean_(data.unionSize):'',unionMoney,
      qBag,bagMoney,qLanyard,lanyardMoney,total,transferContent,proofUrl,'Chờ kiểm tra',notes
    ];

    row=appendRegistrationRow_(totalSheet,rowData,proofUrl);

    const classSheet=ensureClassSheet_(ss,targetSheetName,classWasOther);
    classRow=appendRegistrationRow_(classSheet,rowData,proofUrl);
  }finally{
    lock.releaseLock();
  }

  let emailSent=false;
  try{
    sendConfirmation_(data,{
      name,studentId,cls,major,gender,hatNote,transferContent,total,blouseMode,
      qBlouseSet,qBlouseShirt,qBlousePants,qBlouseHat,qSport,qUnion,qBag,qLanyard,
      blouseSetMoney,blouseShirtMoney,blousePantsMoney,blouseHatMoney,
      sportMoney,unionMoney,bagMoney,lanyardMoney
    });
    emailSent=true;
  }catch(mailErr){
    console.error('Email error',mailErr);
    const c=totalSheet.getRange(row,40);
    const old=clean_(c.getValue());
    c.setValue((old?old+' | ':'')+'Chưa gửi được email xác nhận: '+String(mailErr.message||mailErr));
    const classSheet=ss.getSheetByName(targetSheetName);
    if(classSheet&&classRow){
      const cc=classSheet.getRange(classRow,40);
      const oldClass=clean_(cc.getValue());
      cc.setValue((oldClass?oldClass+' | ':'')+'Chưa gửi được email xác nhận: '+String(mailErr.message||mailErr));
    }
  }

  return {total,transferContent,proofUrl,row,classRow,classSheet:targetSheetName,emailSent,hatType:hatNote};
}

function getHatNote_(major,gender,hasHat){
  return hasHat && gender==='Nữ' && THREE_LEAF_HAT_MAJORS.indexOf(major)>=0 ? 'Mũ 3 lá (Nữ)' : '';
}

function ensureClassSheet_(ss,sheetName,isOther){
  const title=isOther?'KHÁC':clean_(sheetName);
  if(!isOther && OFFICIAL_CLASSES.indexOf(title)<0) throw new Error('Lớp không thuộc danh mục chính thức');
  let sh=ss.getSheetByName(title);
  if(sh) return sh;
  sh=ss.insertSheet(title);
  sh.getRange(1,1,1,40).setValues([headerRow_()]);
  sh.setFrozenRows(1);
  const header=sh.getRange(1,1,1,40);
  header.setBackground('#0F766E').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  return sh;
}

function headerRow_(){
  return [
    'Thời gian đăng ký','Họ và tên','MSSV','CCCD','Giới tính','Chiều cao (cm)','Cân nặng (kg)','Ngành học','Lớp','SĐT','Email','Nguồn QR',
    'Hình thức blouse','Size bộ blouse','SL bộ blouse','Tiền bộ blouse','Size áo blouse riêng','SL áo blouse riêng','Tiền áo blouse riêng',
    'Size quần blouse riêng','SL quần blouse riêng','Tiền quần blouse riêng','SL mũ blouse riêng','Ghi chú mũ','Tiền mũ riêng',
    'SL đồ thể dục','Size thể dục','Tiền thể dục','SL áo Đoàn','Size áo Đoàn','Tiền áo Đoàn','SL balo','Tiền balo','SL dây đeo','Tiền dây đeo',
    'Tổng tiền','Nội dung chuyển khoản','Minh chứng chuyển khoản','Trạng thái','Ghi chú'
  ];
}

function appendRegistrationRow_(sh,rowData,proofUrl){
  sh.appendRow(rowData);
  const row=sh.getLastRow();
  applyRowFormats_(sh,row,proofUrl);
  return row;
}

function validatePerson_(d){
  const required=['name','studentId','cccd','gender','height','weight','majorName','className','phone','email'];
  required.forEach(k=>{
    if(d[k]===null||d[k]===undefined||clean_(d[k])==='') throw new Error(`Thiếu trường ${k}`);
  });
  if(!/^\d{12}$/.test(clean_(d.cccd))) throw new Error('CCCD phải đủ 12 số');
  if(['Nam','Nữ'].indexOf(clean_(d.gender))<0) throw new Error('Giới tính không hợp lệ');

  const h=Number(d.height),w=Number(d.weight);
  if(!Number.isFinite(h)||h<120||h>220) throw new Error('Chiều cao không hợp lệ');
  if(!Number.isFinite(w)||w<25||w>200) throw new Error('Cân nặng không hợp lệ');

  const major=clean_(d.majorName);
  const cls=clean_(d.className);
  const other=d.classWasOther===true||String(d.classWasOther).toLowerCase()==='true';
  if(!MAJOR_CLASSES[major]) throw new Error('Ngành / nhóm học không hợp lệ');
  if(!other&&MAJOR_CLASSES[major].indexOf(cls)<0) throw new Error('Ngành / nhóm học và lớp không khớp danh mục');
}

function validateProducts_(d,q){
  const sizes=['S','M','L','XL','XXL'];
  if(['none','set','separate'].indexOf(q.blouseMode)<0) throw new Error('Hình thức mua blouse không hợp lệ');

  if(q.blouseMode==='set'){
    if(q.qBlouseSet<=0) throw new Error('Chưa chọn số lượng bộ blouse');
    if(sizes.indexOf(clean_(d.blouseSetSize))<0) throw new Error('Thiếu hoặc sai size bộ blouse');
  }

  if(q.blouseMode==='separate'){
    if(q.qBlouseShirt+q.qBlousePants+q.qBlouseHat<=0) throw new Error('Chưa chọn món blouse mua riêng');
    if(q.qBlouseShirt>0&&sizes.indexOf(clean_(d.blouseShirtSize))<0) throw new Error('Thiếu hoặc sai size áo blouse');
    if(q.qBlousePants>0&&sizes.indexOf(clean_(d.blousePantsSize))<0) throw new Error('Thiếu hoặc sai size quần blouse');
  }

  if(q.qSport>0&&sizes.indexOf(clean_(d.sportSize))<0) throw new Error('Thiếu hoặc sai size đồ thể dục');
  if(q.qUnion>0&&sizes.indexOf(clean_(d.unionSize))<0) throw new Error('Thiếu hoặc sai size áo Đoàn');
}

function saveProof_(data,cls,studentId){
  if(!data.proofBase64) throw new Error('Thiếu ảnh minh chứng chuyển khoản');
  const bytes=Utilities.base64Decode(data.proofBase64);
  if(bytes.length>6*1024*1024) throw new Error('Ảnh minh chứng quá lớn');

  const mime=clean_(data.proofMime)||'image/jpeg';
  if(mime.indexOf('image/')!==0) throw new Error('Minh chứng phải là file hình ảnh');

  const ext=mime.indexOf('png')>=0?'png':mime.indexOf('webp')>=0?'webp':'jpg';
  const safeName=`${normalizeCode_(cls)}-${normalizeCode_(studentId)}-${Date.now()}.${ext}`;
  return DriveApp.getFolderById(PROOF_FOLDER_ID).createFile(Utilities.newBlob(bytes,mime,safeName)).getUrl();
}

function currentBagCount_(sh){
  const last=sh.getLastRow();
  if(last<2) return 0;
  return sh.getRange(2,32,last-1,1).getValues().reduce((sum,r)=>sum+Number(r[0]||0),0);
}

function applyRowFormats_(sh,row,proofUrl){
  sh.getRange(row,1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  [16,19,22,25,28,31,33,35,36].forEach(col=>sh.getRange(row,col).setNumberFormat('#,##0 [$₫-vi-VN]'));
  sh.getRange(row,6).setNumberFormat('0');
  sh.getRange(row,7).setNumberFormat('0.0');
  if(proofUrl) sh.getRange(row,38).setFormula(`=HYPERLINK("${proofUrl}","Xem minh chứng")`);
}

function sendConfirmation_(data,x){
  const email=clean_(data.email);
  if(!email) return;

  const lines=[];
  if(x.qBlouseSet) lines.push(`- Bộ blouse (áo + quần + mũ): ${x.qBlouseSet} bộ | Size ${clean_(data.blouseSetSize)}${x.hatNote?' | '+x.hatNote:''} | ${money_(x.blouseSetMoney)}`);
  if(x.qBlouseShirt) lines.push(`- Áo blouse: ${x.qBlouseShirt} cái | Size ${clean_(data.blouseShirtSize)} | ${money_(x.blouseShirtMoney)}`);
  if(x.qBlousePants) lines.push(`- Quần blouse: ${x.qBlousePants} cái | Size ${clean_(data.blousePantsSize)} | ${money_(x.blousePantsMoney)}`);
  if(x.qBlouseHat) lines.push(`- Mũ blouse: ${x.qBlouseHat} cái${x.hatNote?' | '+x.hatNote:''} | ${money_(x.blouseHatMoney)}`);
  if(x.qSport) lines.push(`- Đồ thể dục: ${x.qSport} bộ | Size ${clean_(data.sportSize)} | ${money_(x.sportMoney)}`);
  if(x.qUnion) lines.push(`- Áo Đoàn: ${x.qUnion} cái | Size ${clean_(data.unionSize)} | ${money_(x.unionMoney)}`);
  if(x.qBag) lines.push(`- Balo trường: ${x.qBag} cái | ${money_(x.bagMoney)}`);
  if(x.qLanyard) lines.push(`- Dây đeo thẻ có logo trường: ${x.qLanyard} cái | ${money_(x.lanyardMoney)}`);

  const subject=`[XÁC NHẬN] Đăng ký đồng phục - ${x.studentId}`;
  const body=[
    `Chào ${x.name},`,'',
    'Hệ thống đã ghi nhận đăng ký và ảnh minh chứng chuyển khoản của bạn.',
    `MSSV: ${x.studentId}`,
    `Ngành / nhóm: ${x.major}`,
    `Lớp: ${x.cls}`,
    `Giới tính: ${x.gender}`,
    `Nội dung chuyển khoản: ${x.transferContent}`,'',
    'CÁC HẠNG MỤC ĐÃ ĐĂNG KÝ:',
    ...lines,'',
    `TỔNG THANH TOÁN: ${money_(x.total)}`,'',
    'Trạng thái: Chờ kiểm tra chuyển khoản.',
    'Vui lòng giữ email này để đối chiếu khi cần.'
  ].join('\n');

  MailApp.sendEmail(email,subject,body);
}

function qty_(v){
  const n=Number(v||0);
  return Number.isFinite(n)&&n>=0&&n<=5?Math.floor(n):0;
}

function clean_(v){return String(v==null?'':v).trim()}

function normalizeCode_(v){
  return clean_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/Đ/g,'D')
    .replace(/đ/g,'d')
    .replace(/[^A-Za-z0-9]/g,'')
    .toUpperCase()||'NA';
}

function money_(n){return Number(n||0).toLocaleString('vi-VN')+'đ'}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}