const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');
const s3Service = require('../services/s3Service');

const uploadsDir = path.join(__dirname, '../uploads');

// ─── Layout constants ────────────────────────────────────────────────────────

const A4 = [595, 842];
const MARGIN_X = 30;
const TOP_MARGIN = 44;
const BOTTOM_MARGIN = 48;
const INLINE_MIN_SCALE = 0.85; // only place an embedded PDF page inline if it stays this readable

// ─── Minimal palette (soft greys, one muted accent per status) ───────────────

const C = {
  ink:    rgb(0.13, 0.15, 0.18),  // main text
  body:   rgb(0.30, 0.33, 0.37),  // secondary text
  muted:  rgb(0.55, 0.58, 0.62),  // labels, footers
  line:   rgb(0.88, 0.89, 0.91),  // hairlines
  ok:     rgb(0.25, 0.50, 0.38),  // attached
  bad:    rgb(0.70, 0.30, 0.30),  // missing
};

// ─── Helper: sanitize text for pdf-lib WinAnsi standard fonts ────────────────

function safeText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

// Truncate text with "..." so it fits in maxW
function fit(text, font, size, maxW) {
  let t = safeText(text);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
  return t + '...';
}

// Word-wrap text into lines that fit maxW
function wrap(text, font, size, maxW) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Small grey footer text (+ optional hairline on pages we own)
function stampFooter(page, font, text, withRule) {
  const { width } = page.getSize();
  if (withRule) {
    page.drawLine({
      start: { x: MARGIN_X, y: 24 }, end: { x: width - MARGIN_X, y: 24 },
      thickness: 0.5, color: C.line
    });
  }
  if (text) {
    page.drawText(fit(text, font, 7, width - MARGIN_X * 2 - 50), {
      x: MARGIN_X, y: 12, size: 7, font, color: C.muted
    });
  }
}

// ─── Helper: fetch a file buffer (local or S3) ───────────────────────────────

async function fetchFileBuffer(s3Key, isLocal, s3Bucket) {
  if (!s3Key) return null;

  const treatAsLocal = isLocal || s3Bucket === 'local-storage' || !s3Service.isS3Configured;

  if (treatAsLocal) {
    const cleanName = path.basename(s3Key);
    const safeKey = s3Key.replace(/\\/g, '/').replace(/^(\.\.\/)+/, '');
    const safeKeyWin = safeKey.replace(/\//g, path.sep);

    const candidates = [
      path.join(uploadsDir, safeKeyWin),
      path.join(uploadsDir, safeKey),
      path.resolve(uploadsDir, safeKeyWin),
      path.join(uploadsDir, 'req-files', cleanName),
      path.join(uploadsDir, 'uploads', cleanName),
      path.join(uploadsDir, cleanName),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 0) {
            console.log(`[fetchFileBuffer] Found: ${p} (${buf.length} bytes)`);
            return buf;
          }
        } catch (e) {
          console.error('[fetchFileBuffer] Error reading:', p, e.message);
        }
      }
    }
    console.warn(`[fetchFileBuffer] Not found for s3Key: ${s3Key}`);
    return null;
  } else {
    try {
      const region = process.env.AWS_REGION || 'us-east-1';
      const s3 = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      const cmd = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key
      });
      const response = await s3.send(cmd);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (err) {
      console.error('S3 fetch error for key', s3Key, err.message);
      return null;
    }
  }
}

// ─── PageWriter: flowing layout, lazy pages, auto-pagination ─────────────────
//
// Pages are created LAZILY: nothing is added until something is actually drawn.
// After a full-size external page is appended, call detach() so the next
// content opens a fresh page only when it exists (no blank pages).

class PageWriter {
  constructor(pdfDoc, font, boldFont, footerText) {
    this.pdfDoc = pdfDoc;
    this.font = font;
    this.boldFont = boldFont;
    this.footerText = footerText || '';
    this.page = null;
    this.y = 0;
  }

  newPage() {
    this.page = this.pdfDoc.addPage(A4);
    stampFooter(this.page, this.font, this.footerText, true);
    this.y = this.page.getHeight() - TOP_MARGIN;
  }

  get width() { return A4[0]; }

  /** Make sure a page exists and has `need` pts of room, else open a new page. */
  ensure(need) {
    if (!this.page) this.newPage();
    else if (this.y - need < BOTTOM_MARGIN) this.newPage();
  }

  /** Forget the current page (used after external pages were appended). */
  detach() {
    this.page = null;
  }

  /** Vertical space left on the current page (0 if no page open). */
  remaining() {
    return this.page ? Math.max(0, this.y - BOTTOM_MARGIN) : 0;
  }

  gap(h) {
    if (this.page) this.y -= h;
  }

  // ── Primitives ──

  skidHeading(title, count) {
    this.ensure(60);
    this.page.drawText(fit(title.toUpperCase(), this.boldFont, 11, this.width - MARGIN_X * 2), {
      x: MARGIN_X, y: this.y - 11, size: 11, font: this.boldFont, color: C.ink
    });
    this.y -= 20;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y }, end: { x: this.width - MARGIN_X, y: this.y },
      thickness: 0.5, color: C.line
    });
    this.y -= 14;
  }

  componentHeader(seq, name, statusText, statusColor) {
    this.ensure(70);
    const statusW = this.font.widthOfTextAtSize(statusText, 8);
    this.page.drawText(safeText(seq), {
      x: MARGIN_X, y: this.y - 10, size: 9, font: this.font, color: C.muted
    });
    this.page.drawText(
      fit(name, this.boldFont, 10.5, this.width - MARGIN_X * 2 - 38 - statusW - 12),
      { x: MARGIN_X + 34, y: this.y - 10, size: 10.5, font: this.boldFont, color: C.ink }
    );
    this.page.drawText(statusText, {
      x: this.width - MARGIN_X - statusW, y: this.y - 9, size: 8, font: this.font, color: statusColor
    });
    this.y -= 22;
  }

  /** Label / value row, value wraps. */
  row(label, value) {
    const valueX = MARGIN_X + 104;
    const maxW = this.width - MARGIN_X - valueX;
    const lines = wrap(value, this.font, 9, maxW);
    this.ensure(lines.length * 12 + 4);
    this.page.drawText(safeText(label).toUpperCase(), {
      x: MARGIN_X + 34, y: this.y - 9, size: 6.5, font: this.font, color: C.muted
    });
    for (const l of lines) {
      this.page.drawText(l, { x: valueX, y: this.y - 9, size: 9, font: this.font, color: C.body });
      this.y -= 12;
    }
    this.y -= 3;
  }

  paragraph(text, opts = {}) {
    const size = opts.size || 8.5;
    const x = opts.x ?? MARGIN_X + 34;
    const color = opts.color || C.muted;
    const lines = wrap(text, this.font, size, this.width - MARGIN_X - x);
    for (const l of lines) {
      this.ensure(size + 5);
      this.page.drawText(l, { x, y: this.y - size, size, font: this.font, color });
      this.y -= size + 4;
    }
  }

  /** Quiet inline notice (thin colored bar + text) for a file problem. */
  notice(title, message) {
    this.ensure(36);
    this.page.drawRectangle({
      x: MARGIN_X + 34, y: this.y - 26, width: 1.5, height: 26, color: C.bad
    });
    this.page.drawText(fit(title, this.boldFont, 8.5, this.width - MARGIN_X * 2 - 50), {
      x: MARGIN_X + 44, y: this.y - 10, size: 8.5, font: this.boldFont, color: C.bad
    });
    this.page.drawText(fit(message, this.font, 8, this.width - MARGIN_X * 2 - 50), {
      x: MARGIN_X + 44, y: this.y - 22, size: 8, font: this.font, color: C.muted
    });
    this.y -= 36;
  }

  divider() {
    this.ensure(16);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y - 6 }, end: { x: this.width - MARGIN_X, y: this.y - 6 },
      thickness: 0.4, color: C.line
    });
    this.y -= 18;
  }

  /** Place an image into the remaining space (or a fresh page if too little room). */
  async placeImage(img, caption) {
    const maxW = this.width - MARGIN_X * 2;
    if (!this.page || this.remaining() < 200) this.newPage();

    const capH = caption ? 14 : 0;
    const maxH = this.remaining() - capH - 8;
    const dims = img.scaleToFit(maxW, Math.max(maxH, 100));

    if (caption) {
      this.page.drawText(fit(caption, this.font, 7.5, maxW), {
        x: MARGIN_X, y: this.y - 8, size: 7.5, font: this.font, color: C.muted
      });
      this.y -= capH;
    }
    this.page.drawImage(img, {
      x: MARGIN_X + (maxW - dims.width) / 2,
      y: this.y - dims.height,
      width: dims.width,
      height: dims.height
    });
    this.y -= dims.height + 14;
  }
}

// ─── Cover page + paginated contents ─────────────────────────────────────────

async function addCoverPage(pdfDoc, font, boldFont, projectName, projectCode, skids, footerText) {
  let curPage = pdfDoc.addPage(A4);
  const { width, height } = curPage.getSize();
  stampFooter(curPage, font, footerText, true);

  curPage.drawText('Quality Assurance Plan', {
    x: MARGIN_X, y: height - 70, size: 20, font: boldFont, color: C.ink
  });
  curPage.drawText('Consolidated documentation package', {
    x: MARGIN_X, y: height - 90, size: 10, font, color: C.muted
  });

  const exportDate = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'
  });

  const meta = [['Project', projectName || 'Untitled Project']];
  if (projectCode) meta.push(['Code', `#${projectCode}`]);
  meta.push(['Date', `${exportDate} IST`]);

  let my = height - 130;
  for (const [label, value] of meta) {
    curPage.drawText(label.toUpperCase(), { x: MARGIN_X, y: my, size: 6.5, font, color: C.muted });
    curPage.drawText(fit(value, font, 10, width - MARGIN_X * 2 - 80), {
      x: MARGIN_X + 70, y: my - 1, size: 10, font, color: C.ink
    });
    my -= 18;
  }

  curPage.drawLine({
    start: { x: MARGIN_X, y: my - 6 }, end: { x: width - MARGIN_X, y: my - 6 },
    thickness: 0.5, color: C.line
  });
  curPage.drawText('CONTENTS', { x: MARGIN_X, y: my - 28, size: 7.5, font: boldFont, color: C.muted });

  let y = my - 52;

  const startNewTocPage = () => {
    curPage = pdfDoc.addPage(A4);
    stampFooter(curPage, font, footerText, true);
    curPage.drawText('CONTENTS (CONTINUED)', {
      x: MARGIN_X, y: height - TOP_MARGIN, size: 7.5, font: boldFont, color: C.muted
    });
    y = height - TOP_MARGIN - 26;
  };

  for (let si = 0; si < skids.length; si++) {
    const skid = skids[si];
    if (y < BOTTOM_MARGIN + 50) startNewTocPage();

    curPage.drawText(fit(`${si + 1}.  ${skid.name}`, boldFont, 10, width - MARGIN_X * 2), {
      x: MARGIN_X, y, size: 10, font: boldFont, color: C.ink
    });
    y -= 16;

    for (let ci = 0; ci < (skid.components || []).length; ci++) {
      const comp = skid.components[ci];
      if (y < BOTTOM_MARGIN + 28) startNewTocPage();

      const hasFiles = comp.fileCount > 0;
      const status = hasFiles ? `${comp.fileCount} file${comp.fileCount > 1 ? 's' : ''}` : 'Missing';
      const statusW = font.widthOfTextAtSize(status, 8);

      curPage.drawText(`${si + 1}.${ci + 1}`, {
        x: MARGIN_X + 8, y, size: 8.5, font, color: C.muted
      });
      curPage.drawText(fit(comp.name, font, 9, width - MARGIN_X * 2 - 40 - statusW - 12), {
        x: MARGIN_X + 38, y, size: 9, font, color: C.ink
      });
      curPage.drawText(status, {
        x: width - MARGIN_X - statusW, y: y + 0.5, size: 8, font,
        color: hasFiles ? C.ok : C.bad
      });
      y -= 11;

      curPage.drawText(fit(comp.format_of_record || 'T.C / Compliance Report', font, 7.5, width - MARGIN_X * 2 - 40), {
        x: MARGIN_X + 38, y, size: 7.5, font, color: C.muted
      });
      y -= 14;
    }
    y -= 8;
  }
}

// ─── Main export handler ──────────────────────────────────────────────────────

const exportProjectPdf = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { skidOrder = [], componentOrder = {} } = req.body;

    console.log(`[exportProjectPdf] Starting PDF generation for project: ${projectId}`);

    // 1. Fetch project
    let project = null;
    if (db.isPgConnected()) {
      const projRes = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length) project = projRes.rows[0];
    } else {
      project = memoryStore.projects.find(p => p.id === projectId);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // 2. Fetch packages/skids
    let packages = [];
    if (db.isPgConnected()) {
      const pkgsRes = await db.query(
        'SELECT * FROM packages WHERE project_id = $1 ORDER BY COALESCE(sort_order, 0) ASC, created_at ASC',
        [projectId]
      );
      packages = pkgsRes.rows;
    } else {
      packages = memoryStore.packages
        .filter(p => p.project_id === projectId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }

    if (Array.isArray(skidOrder) && skidOrder.length > 0) {
      const ordered = skidOrder.map(id => packages.find(p => p.id === id)).filter(Boolean);
      if (ordered.length > 0) packages = ordered;
    }

    // 3. Fetch requirements + files per skid
    const enrichedSkids = [];
    for (const pkg of packages) {
      let reqs = [];
      if (db.isPgConnected()) {
        const reqsRes = await db.query(
          'SELECT * FROM requirements WHERE package_id = $1 ORDER BY COALESCE(sort_order, 0) ASC, created_at ASC',
          [pkg.id]
        );
        reqs = reqsRes.rows;
      } else {
        reqs = memoryStore.requirements
          .filter(r => r.package_id === pkg.id)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }

      const compOrd = componentOrder[pkg.id];
      if (Array.isArray(compOrd) && compOrd.length > 0) {
        const orderMap = Object.fromEntries(compOrd.map((id, i) => [id, i]));
        reqs = reqs.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));
      }

      const components = [];
      for (const req of reqs) {
        let files = [];
        if (db.isPgConnected()) {
          const filesRes = await db.query(
            'SELECT * FROM requirement_files WHERE requirement_id = $1 ORDER BY created_at ASC',
            [req.id]
          );
          files = filesRes.rows;
        } else {
          files = memoryStore.requirementFiles.filter(rf => rf.requirement_id === req.id);
        }
        components.push({
          ...req,
          name: safeText(req.name),
          format_of_record: safeText(req.format_of_record),
          check_requirement: safeText(req.check_requirement),
          ref_document: safeText(req.ref_document),
          files: files.map(f => ({ ...f, original_name: safeText(f.original_name) }))
        });
      }
      enrichedSkids.push({ ...pkg, name: safeText(pkg.name), components });
    }

    // 4. Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const footerText = `QAP - ${safeText(project.name)}${project.code ? '  |  ' + safeText(project.code) : ''}`;

    // Cover + paginated contents
    const coverSkidsSummary = enrichedSkids.map(s => ({
      name: s.name,
      components: s.components.map(c => ({
        name: c.name,
        format_of_record: c.format_of_record,
        fileCount: c.files.length
      }))
    }));
    await addCoverPage(
      pdfDoc, font, boldFont,
      safeText(project.name), safeText(project.code),
      coverSkidsSummary, footerText
    );

    // Body writer (pages are created lazily - no blank pages)
    const writer = new PageWriter(pdfDoc, font, boldFont, footerText);

    for (let si = 0; si < enrichedSkids.length; si++) {
      const skid = enrichedSkids[si];
      if (skid.components.length === 0) continue;

      writer.skidHeading(skid.name, skid.components.length);

      for (let ci = 0; ci < skid.components.length; ci++) {
        const comp = skid.components[ci];
        const seqStr = `${si + 1}.${ci + 1}`;
        const hasFiles = comp.files && comp.files.length > 0;

        // Header + meta rows (flows onto the current page if there is room)
        writer.componentHeader(
          seqStr,
          comp.name || 'Component',
          hasFiles ? `${comp.files.length} file${comp.files.length > 1 ? 's' : ''} attached` : 'Missing',
          hasFiles ? C.ok : C.bad
        );
        writer.row('Report', comp.format_of_record || 'T.C / Compliance Report');
        writer.row('Check / Test', comp.check_requirement || 'Per QAP');
        writer.row('Ref. Standard', comp.ref_document || '-');

        if (!hasFiles) {
          writer.paragraph('No document has been submitted yet for this item.', { color: C.bad });
          writer.divider();
          continue;
        }

        writer.gap(4);

        // Embed every file for this requirement
        for (let fi = 0; fi < comp.files.length; fi++) {
          const file = comp.files[fi];
          const buffer = await fetchFileBuffer(file.s3_key, file.is_local, file.s3_bucket);

          if (!buffer) {
            writer.notice(`File ${fi + 1}/${comp.files.length} unavailable`, file.original_name);
            continue;
          }

          const mimeType = (file.mime_type || '').toLowerCase();
          const origName = (file.original_name || '').toLowerCase();

          try {
            if (mimeType === 'application/pdf' || origName.endsWith('.pdf')) {
              const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
              const pageCount = srcDoc.getPageCount();
              console.log(`[exportProjectPdf] Merging ${pageCount} pages for [Seq ${seqStr}] (${file.original_name})`);

              for (let pIdx = 0; pIdx < pageCount; pIdx++) {
                const srcPage = srcDoc.getPage(pIdx);
                const { width: sw, height: sh } = srcPage.getSize();
                const rotated = srcPage.getRotation().angle % 360 !== 0;

                // Small page (certificate, short report)? Place it inline in the free space.
                let placedInline = false;
                if (!rotated && writer.page) {
                  const maxW = A4[0] - MARGIN_X * 2;
                  const maxH = writer.remaining() - 16;
                  const scale = Math.min(1, maxW / sw, maxH / sh);
                  if (maxH > 0 && scale >= INLINE_MIN_SCALE) {
                    const [embedded] = await pdfDoc.embedPdf(srcDoc, [pIdx]);
                    const w = sw * scale;
                    const h = sh * scale;
                    writer.page.drawPage(embedded, {
                      x: MARGIN_X + (maxW - w) / 2,
                      y: writer.y - h - 4,
                      width: w,
                      height: h
                    });
                    writer.page.drawRectangle({
                      x: MARGIN_X + (maxW - w) / 2, y: writer.y - h - 4, width: w, height: h,
                      borderColor: C.line, borderWidth: 0.5
                    });
                    writer.y -= h + 18;
                    placedInline = true;
                  }
                }
                if (placedInline) continue;

                // Otherwise append as its own full-size page
                const [copied] = await pdfDoc.copyPages(srcDoc, [pIdx]);
                const repName = comp.format_of_record || 'QAP Document';
                copied.drawText(
                  fit(
                    `[Seq ${seqStr}] ${comp.name}  |  ${repName}  |  File ${fi + 1}/${comp.files.length}  |  Page ${pIdx + 1}/${pageCount}`,
                    font, 6.5, copied.getWidth() - 90
                  ),
                  { x: 8, y: 6, size: 6.5, font, color: C.muted }
                );
                pdfDoc.addPage(copied);
                writer.detach(); // next body content opens a new page only if needed
              }
            } else if (mimeType === 'image/webp' || /\.webp$/i.test(origName)) {
              writer.notice('Image format .webp not embeddable', `${file.original_name} - please re-upload as PDF/PNG/JPG`);
            } else if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(origName)) {
              const img = (origName.endsWith('.png') || mimeType === 'image/png')
                ? await pdfDoc.embedPng(buffer)
                : await pdfDoc.embedJpg(buffer);
              await writer.placeImage(img, `File ${fi + 1}/${comp.files.length}  -  ${file.original_name}`);
            } else {
              writer.notice(`Non-PDF file: ${file.original_name}`, 'Re-upload as PDF to embed content in this QAP export');
            }
          } catch (embedErr) {
            console.error('Failed to embed file:', file.original_name, embedErr.message);
            writer.notice(`Could not embed ${file.original_name}`, 'File may be corrupt or in an unsupported format');
          }
        }

        writer.divider();
      }
    }

    // Page numbers on every page (quiet, bottom-right)
    const total = pdfDoc.getPageCount();
    for (let i = 0; i < total; i++) {
      const p = pdfDoc.getPage(i);
      const label = `${i + 1} / ${total}`;
      const w = font.widthOfTextAtSize(label, 7);
      p.drawText(label, { x: p.getWidth() - MARGIN_X - w, y: 12, size: 7, font, color: C.muted });
    }

    // 5. Serialize & send
    const pdfBytes = await pdfDoc.save();
    const safeProjectName = (project.name || 'QAP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `QAP_${safeProjectName}_${Date.now()}.pdf`;

    console.log(`[exportProjectPdf] PDF built successfully: ${pdfBytes.length} bytes, ${pdfDoc.getPageCount()} pages`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length
    });
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('exportProjectPdf error:', err);
    res.status(500).json({ error: 'Failed to generate PDF. ' + err.message });
  }
};

module.exports = { exportProjectPdf };