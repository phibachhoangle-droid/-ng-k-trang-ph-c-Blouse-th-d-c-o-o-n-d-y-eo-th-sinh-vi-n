const SHEET_ID = '1kdBgjactAXjXt0Jp0dtqmyZvacq8Clg3bN5_ePQ4l0k';
const SHEET_NAME = 'Đăng ký';
const PROOF_FOLDER_ID = '1bKDMfR7gXXEP86si_nTlHjSeuvdCr-cI';

const PRICES = {
  blouse: 375000,
  sport: 170000,
  lanyard: 22000,
  union: 75000,
};

function doGet() {
  return ContentService.createTextOutput('Trang phục sinh viên backend is running');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const result = saveRegistration_(data);
    return json_({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function saveRegistration_(data) {
  validate_(data);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet Đăng ký');

  const cls = clean_(data.className);
  const studentId = clean_(data.studentId);
  const transferCode = normalizeCode_(cls) + '-' + normalizeCode_(studentId);

  const qBlouse = qty_(data.qBlouse);
  const qSport = qty_(data.qSport);
  const qLanyard = qty_(data.qLanyard);
  const qUnion = qty_(data.qUnion);

  const blouseMoney = qBlouse * PRICES.blouse;
  const sportMoney = qSport * PRICES.sport;
  const lanyardMoney = qLanyard * PRICES.lanyard;
  const unionMoney = qUnion * PRICES.union;
  const total = blouseMoney + sportMoney + lanyardMoney + unionMoney;
  if (total <= 0) throw new Error('Chưa chọn sản phẩm');

  let proofUrl = '';
  if (data.proofBase64) {
    const bytes = Utilities.base64Decode(data.proofBase64);
    const mime = clean_(data.proofMime) || 'image/jpeg';
    const ext = mime.indexOf('png') >= 0 ? 'png' : mime.indexOf('webp') >= 0 ? 'webp' : 'jpg';
    const safeName = `${transferCode}-${Date.now()}.${ext}`;
    const blob = Utilities.newBlob(bytes, mime, safeName);
    const file = DriveApp.getFolderById(PROOF_FOLDER_ID).createFile(blob);
    proofUrl = file.getUrl();
  } else {
    throw new Error('Thiếu minh chứng chuyển khoản');
  }

  const now = new Date();
  const row = [
    now,
    transferCode,
    clean_(data.name),
    studentId,
    clean_(data.cccd),
    cls,
    clean_(data.phone),
    clean_(data.email),
    qBlouse ? clean_(data.blouseType) : '',
    qBlouse ? clean_(data.blouseSize) : '',
    qBlouse,
    blouseMoney,
    qSport,
    qSport ? clean_(data.sportSize) : '',
    sportMoney,
    qLanyard,
    lanyardMoney,
    qUnion,
    qUnion ? clean_(data.unionSize) : '',
    unionMoney,
    total,
    proofUrl,
    'Chờ kiểm tra',
    ''
  ];

  sh.appendRow(row);
  const r = sh.getLastRow();
  sh.getRange(r, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sh.getRange(r, 12).setNumberFormat('#,##0 [$₫-vi-VN]');
  sh.getRange(r, 15).setNumberFormat('#,##0 [$₫-vi-VN]');
  sh.getRange(r, 17).setNumberFormat('#,##0 [$₫-vi-VN]');
  sh.getRange(r, 20).setNumberFormat('#,##0 [$₫-vi-VN]');
  sh.getRange(r, 21).setNumberFormat('#,##0 [$₫-vi-VN]');
  sh.getRange(r, 22).setFormula(`=HYPERLINK("${proofUrl}","Xem minh chứng")`);

  sendConfirmation_(data, transferCode, total, {
    qBlouse, qSport, qLanyard, qUnion,
    blouseMoney, sportMoney, lanyardMoney, unionMoney
  });

  return { transferCode, total, proofUrl, row: r };
}

function sendConfirmation_(data, transferCode, total, x) {
  const email = clean_(data.email);
  if (!email) return;

  const lines = [];
  if (x.qBlouse) lines.push(`- Bộ blouse + mũ: ${x.qBlouse} | ${clean_(data.blouseType)} | Size ${clean_(data.blouseSize)} | ${money_(x.blouseMoney)}`);
  if (x.qSport) lines.push(`- Đồ thể dục: ${x.qSport} | Size ${clean_(data.sportSize)} | ${money_(x.sportMoney)}`);
  if (x.qLanyard) lines.push(`- Dây đeo thẻ sinh viên: ${x.qLanyard} | ${money_(x.lanyardMoney)}`);
  if (x.qUnion) lines.push(`- Áo Đoàn: ${x.qUnion} | Size ${clean_(data.unionSize)} | ${money_(x.unionMoney)}`);

  const subject = `[XÁC NHẬN] Đăng ký trang phục - ${transferCode}`;
  const body = [
    `Chào ${clean_(data.name)},`,
    '',
    'Hệ thống đã ghi nhận đăng ký và minh chứng chuyển khoản của bạn.',
    `Lớp: ${clean_(data.className)}`,
    `MSSV: ${clean_(data.studentId)}`,
    `Nội dung chuyển khoản: ${transferCode}`,
    '',
    ...lines,
    '',
    `TỔNG THANH TOÁN: ${money_(total)}`,
    '',
    'Trạng thái hiện tại: Chờ kiểm tra minh chứng.',
    'Vui lòng giữ email này để đối chiếu khi cần.'
  ].join('\n');

  MailApp.sendEmail(email, subject, body);
}

function validate_(d) {
  const required = ['name','studentId','cccd','className','phone','email'];
  required.forEach(k => { if (!clean_(d[k])) throw new Error(`Thiếu trường ${k}`); });
  if (!/^\d{12}$/.test(clean_(d.cccd))) throw new Error('CCCD phải đủ 12 số');
}

function qty_(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.floor(n) : 0;
}

function clean_(v) {
  return String(v == null ? '' : v).trim();
}

function normalizeCode_(v) {
  return clean_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase() || 'NA';
}

function money_(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
