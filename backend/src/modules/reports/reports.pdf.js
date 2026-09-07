const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1B5E20',
  text: '#222222',
  muted: '#666666',
  border: '#DDDDDD'
};

function startPdf(res, filename) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function addHeader(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);

  doc
    .fillColor('#FFFFFF')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('Uzalendo Chama Investment Group', 40, 24);

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#C8E6C9')
    .text(title, 40, 48);

  doc.fillColor(COLORS.muted).fontSize(9)
    .text(`Generated: ${new Date().toLocaleString('en-KE')}`, 40, 90, {
      align: 'right',
      width: doc.page.width - 80
    });

  doc.y = 110;

  if (subtitle) {
    doc.fillColor(COLORS.text).fontSize(11).font('Helvetica-Bold')
      .text(subtitle, 40, doc.y);
    doc.moveDown();
  }
}

function addFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `Page ${i + 1} of ${range.count} — Uzalendo Chama Investment Group`,
        40,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 80 }
      );
  }
}

function addTable(doc, { headers, rows, columnWidths }) {
  const startX = 40;
  let y = doc.y + 10;
  const rowHeight = 22;
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);

  const drawRowBg = (yPos, color) => {
    doc.rect(startX, yPos, totalWidth, rowHeight).fill(color);
  };

  const drawHeaderRow = () => {
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    drawRowBg(y, '#E8F5E9');
    let x = startX;
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9);
    headers.forEach((h, i) => {
      doc.text(String(h), x + 6, y + 6, { width: columnWidths[i] - 10 });
      x += columnWidths[i];
    });
    y += rowHeight;
  };

  drawHeaderRow();

  doc.font('Helvetica').fontSize(9);
  if (rows.length === 0) {
    doc.fillColor(COLORS.muted).text('No records found.', startX + 6, y + 6);
    y += rowHeight;
  } else {
    rows.forEach((row, idx) => {
      if (y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawHeaderRow();
      }
      if (idx % 2 === 1) drawRowBg(y, '#FAFAFA');
      let x = startX;
      row.forEach((cell, i) => {
        doc.fillColor(COLORS.text).text(cell === null || cell === undefined ? '—' : String(cell), x + 6, y + 6, {
          width: columnWidths[i] - 10
        });
        x += columnWidths[i];
      });
      y += rowHeight;
    });
  }

  doc.y = y + 10;
}

function addSectionTitle(doc, text) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text(text, 40, doc.y);
  doc.moveDown(0.3);
}

function addSummaryLine(doc, label, value) {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text)
    .text(`${label}: ${value}`, 40);
}

module.exports = { startPdf, addHeader, addFooter, addTable, addSectionTitle, addSummaryLine, COLORS };