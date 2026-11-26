const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');
const s3Service = require('../services/s3Service');

const uploadsDir = path.join(__dirname, '../uploads');

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

// ─── Helper: fetch a file buffer (local or S3) ───────────────────────────────

async function fetchFileBuffer(s3Key, isLocal, s3Bucket) {
  if (!s3Key) return null;

  // Treat as local if isLocal flag set, or bucket is local-storage, or S3 not configured
  const treatAsLocal = isLocal || s3Bucket === 'local-storage' || !s3Service.isS3Configured;

  if (treatAsLocal) {
    const cleanName = path.basename(s3Key);
    // Normalize forward/back slashes for Windows compatibility
    const safeKey = s3Key.replace(/\\/g, '/').replace(/^(\.\.\/)+/, '');
    const safeKeyWin = safeKey.replace(/\//g, path.sep);

    const candidates = [
      path.join(uploadsDir, safeKeyWin),               // exact relative path (Windows)
      path.join(uploadsDir, safeKey),                  // exact relative path (unix)
      path.resolve(uploadsDir, safeKeyWin),            // resolved (Windows)
      path.join(uploadsDir, 'req-files', cleanName),   // req-files folder by basename
      path.join(uploadsDir, 'uploads', cleanName),     // uploads folder by basename
      path.join(uploadsDir, cleanName),                // root uploads by basename
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 0) {
            console.log(`[fetchFileBuffer] ✓ Found: ${p} (${buf.length} bytes)`);
            return buf;
          }
        } catch (e) {
          console.error('[fetchFileBuffer] Error reading:', p, e.message);
        }
      }
    }
    console.warn(`[fetchFileBuffer] ✗ Not found for s3Key: ${s3Key}`);
    console.warn(`[fetchFileBuffer] Tried candidates:\n  ${candidates.join('\n  ')}`);
    return null;
  } else {
    // AWS S3 download
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

// ─── Helper: draw a "Document Received - Non-embeddable Format" Info Page ─────

async function addNonEmbeddablePage(pdfDoc, font, boldFont, skidName, comp, seqStr, compIndex, totalComps, fileName, mimeType) {
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Amber/Yellow header bar - document received but can't be rendered inline
  page.drawRectangle({
    x: 0, y: height - 70, width, height: 70,
    color: rgb(0.75, 0.52, 0.04)
  });

  page.drawText('DOCUMENT RECEIVED - FORMAT NOTE', {
    x: 35, y: height - 38, size: 16, font: boldFont, color: rgb(1, 1, 1)
  });
  page.drawText(`Sequence [${seqStr}]  |  Item ${compIndex + 1} of ${totalComps}`, {
    x: 35, y: height - 58, size: 10, font, color: rgb(1, 0.95, 0.75)
  });

  // Info box
  page.drawRectangle({
    x: 35, y: height - 480, width: width - 70, height: 395,
    borderColor: rgb(0.75, 0.52, 0.04), borderWidth: 1.5,
    color: rgb(0.99, 0.97, 0.9)
  });

  const lines = [
    { label: 'SEQUENCE NUMBER:', value: `Document #${seqStr} (Item ${compIndex + 1} of ${totalComps})` },
    { label: 'REPORT NAME / RECORD FORMAT:', value: comp.format_of_record || 'T.C / COMPLIANCE REPORT' },
    { label: 'COMPONENT / OPERATION:', value: comp.name || 'Component' },
    { label: 'SKID / PACKAGE:', value: skidName || 'General Skid' },
    { label: 'UPLOADED FILE NAME:', value: fileName || 'Document' },
    { label: 'DOCUMENT STATUS:', value: 'RECEIVED & STORED - Refer to Original File' }
  ];

  let y = height - 120;
  for (const { label, value } of lines) {
    page.drawText(label, { x: 55, y, size: 9, font: boldFont, color: rgb(0.55, 0.38, 0.04) });
    page.drawText(value, { x: 55, y: y - 16, size: 11, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    y -= 50;
  }

  // Note box
  page.drawRectangle({
    x: 55, y: height - 455, width: width - 110, height: 55,
    color: rgb(0.95, 0.9, 0.75), borderColor: rgb(0.8, 0.65, 0.2), borderWidth: 1
  });
  page.drawText('NOTE: This document was submitted as a non-PDF file (e.g. Word, Excel).', {
    x: 65, y: height - 416, size: 9, font: boldFont, color: rgb(0.5, 0.35, 0.02)
  });
  page.drawText('The document has been received and stored. To include full content in the', {
    x: 65, y: height - 430, size: 9, font, color: rgb(0.4, 0.3, 0.05)
  });
  page.drawText('QAP PDF report, please re-upload the document converted to PDF format.', {
    x: 65, y: height - 444, size: 9, font, color: rgb(0.4, 0.3, 0.05)
  });

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: rgb(0.08, 0.1, 0.16) });
  page.drawText('Quality Assurance Plan (QAP) System - Document Format Notice', {
    x: 35, y: 12, size: 9, font, color: rgb(0.65, 0.7, 0.85)
  });
}

// ─── Helper: draw a "MISSING / PENDING" Warning Page ─────────────────────────

async function addMissingPage(pdfDoc, font, boldFont, skidName, comp, seqStr, compIndex, totalComps) {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  // Top Red Warning Header
  page.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: rgb(0.85, 0.15, 0.15)
  });

  page.drawText('!  DOCUMENT MISSING / NOT RECEIVED', {
    x: 35,
    y: height - 38,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(`Sequence [${seqStr}]  -  Item ${compIndex + 1} of ${totalComps}`, {
    x: 35,
    y: height - 58,
    size: 10,
    font,
    color: rgb(1, 0.88, 0.88)
  });

  // Bordered Details Box
  page.drawRectangle({
    x: 35,
    y: height - 460,
    width: width - 70,
    height: 375,
    borderColor: rgb(0.85, 0.2, 0.2),
    borderWidth: 1.5,
    color: rgb(0.99, 0.96, 0.96)
  });

  const lines = [
    { label: 'SEQUENCE NUMBER:', value: `Document #${seqStr} (Item ${compIndex + 1} of ${totalComps})` },
    { label: 'REPORT NAME / RECORD FORMAT:', value: comp.format_of_record || 'T.C / COMPLIANCE REPORT' },
    { label: 'COMPONENT / OPERATION:', value: comp.name || 'Component' },
    { label: 'SKID / PACKAGE:', value: skidName || 'General Skid' },
    { label: 'CHECKING REQUIREMENT:', value: comp.check_requirement || 'As specified in QAP' },
    { label: 'DOCUMENT STATUS:', value: 'MISSING - PENDING VENDOR / SUPPLIER SUBMISSION' }
  ];

  let y = height - 120;
  for (const { label, value } of lines) {
    page.drawText(label, { x: 55, y, size: 9, font: boldFont, color: rgb(0.55, 0.15, 0.15) });
    page.drawText(value, { x: 55, y: y - 16, size: 12, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    y -= 50;
  }

  // Explanatory note box
  page.drawRectangle({
    x: 55,
    y: height - 435,
    width: width - 110,
    height: 48,
    color: rgb(0.93, 0.88, 0.88),
    borderColor: rgb(0.8, 0.4, 0.4),
    borderWidth: 1
  });

  page.drawText(
    'NOTE: This report is required under the Quality Assurance Plan (QAP) sequence.',
    { x: 65, y: height - 408, size: 9, font: boldFont, color: rgb(0.5, 0.1, 0.1) }
  );
  page.drawText(
    'No document or report has been submitted yet for this required sequence item.',
    { x: 65, y: height - 424, size: 9, font, color: rgb(0.4, 0.15, 0.15) }
  );

  // Footer bar
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: rgb(0.08, 0.1, 0.16) });
  page.drawText('Quality Assurance Plan (QAP) System - Audit Warning Sheet', {
    x: 35, y: 12, size: 9, font, color: rgb(0.65, 0.7, 0.85)
  });
}

// ─── Helper: draw a Document Introduction Header Page for an Attached File ───

async function addComponentDocHeaderPage(pdfDoc, font, boldFont, skidName, comp, seqStr, compIndex, totalComps, fileIndex, totalFiles, fileName) {
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Top Dark Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 85,
    width,
    height: 85,
    color: rgb(0.06, 0.09, 0.16)
  });

  page.drawText('QUALITY ASSURANCE PLAN - COMPONENT RECORD', {
    x: 35,
    y: height - 38,
    size: 15,
    font: boldFont,
    color: rgb(0.65, 0.71, 0.98)
  });

  page.drawText(`Skid: ${skidName}  |  Sequence #${seqStr} (Item ${compIndex + 1} of ${totalComps})`, {
    x: 35,
    y: height - 60,
    size: 10.5,
    font,
    color: rgb(0.8, 0.85, 1)
  });

  // Green Success Verification Card
  page.drawRectangle({
    x: 35,
    y: height - 465,
    width: width - 70,
    height: 365,
    borderColor: rgb(0.15, 0.65, 0.35),
    borderWidth: 1.5,
    color: rgb(0.96, 0.99, 0.97)
  });

  // Status Badge
  page.drawRectangle({
    x: 55,
    y: height - 132,
    width: 260,
    height: 24,
    color: rgb(0.15, 0.65, 0.35)
  });
  page.drawText('DOCUMENT ATTACHED & VERIFIED IN SEQUENCE', {
    x: 65,
    y: height - 125,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  const lines = [
    { label: 'SEQUENCE NUMBER:', value: `Document #${seqStr} (Item ${compIndex + 1} of ${totalComps})` },
    { label: 'REPORT NAME / RECORD FORMAT:', value: comp.format_of_record || 'T.C / COMPLIANCE REPORT' },
    { label: 'COMPONENT / OPERATION:', value: comp.name || 'Component' },
    { label: 'ATTACHED FILE NAME:', value: fileName || 'Uploaded Document' },
    { label: 'CHECKING / TEST REQUIREMENT:', value: comp.check_requirement || 'Per QAP Specification' },
    { label: 'REFERENCE STANDARD / DRAWING:', value: comp.ref_document || '-' }
  ];

  let y = height - 170;
  for (const { label, value } of lines) {
    page.drawText(safeText(label), { x: 55, y, size: 9, font: boldFont, color: rgb(0.15, 0.45, 0.25) });
    page.drawText(safeText(value), { x: 55, y: y - 16, size: 12, font: boldFont, color: rgb(0.1, 0.15, 0.1) });
    y -= 46;
  }

  // Pointer note
  page.drawRectangle({
    x: 55,
    y: height - 442,
    width: width - 110,
    height: 38,
    color: rgb(0.9, 0.96, 0.92),
    borderColor: rgb(0.6, 0.8, 0.68),
    borderWidth: 1
  });

  page.drawText(
    `--> The original report pages for "${comp.format_of_record || comp.name}" follow below:`,
    { x: 65, y: height - 426, size: 9.5, font: boldFont, color: rgb(0.12, 0.45, 0.22) }
  );

  // Footer bar
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: rgb(0.06, 0.09, 0.16) });
  page.drawText('Quality Assurance Plan (QAP) System - Verified Document Section', {
    x: 35, y: 12, size: 9, font, color: rgb(0.65, 0.7, 0.85)
  });
}

// ─── Helper: draw a cover page with Table of Contents ────────────────────────

async function addCoverPage(pdfDoc, font, boldFont, projectName, projectCode, skids) {
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Header bar
  page.drawRectangle({ x: 0, y: height - 85, width, height: 85, color: rgb(0.06, 0.09, 0.16) });
  page.drawText('QUALITY ASSURANCE PLAN (QAP)', {
    x: 35, y: height - 42, size: 21, font: boldFont, color: rgb(0.65, 0.71, 0.98)
  });
  page.drawText('Consolidated Documentation Package', {
    x: 35, y: height - 64, size: 12, font, color: rgb(0.75, 0.80, 1)
  });

  // Project info section
  page.drawText('PROJECT:', { x: 40, y: height - 116, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(projectName || 'Untitled Project', { x: 110, y: height - 116, size: 13, font: boldFont, color: rgb(0.05, 0.05, 0.05) });

  if (projectCode) {
    page.drawText('CODE:', { x: 40, y: height - 136, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`#${projectCode}`, { x: 110, y: height - 136, size: 10.5, font: boldFont, color: rgb(0.3, 0.3, 0.7) });
  }

  const exportDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  page.drawText('DATE:', { x: 40, y: height - 154, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`${exportDate} IST`, { x: 110, y: height - 154, size: 9.5, font, color: rgb(0.3, 0.3, 0.3) });

  // Divider
  page.drawLine({ start: { x: 40, y: height - 170 }, end: { x: width - 40, y: height - 170 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

  // Table of Contents Header
  page.drawText('Document Sequence & Report Verification Status', { x: 40, y: height - 192, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.1) });

  let y = height - 215;
  for (let si = 0; si < skids.length; si++) {
    const skid = skids[si];
    // Skid header
    page.drawText(`${si + 1}.  ${skid.name.toUpperCase()}`, {
      x: 40, y, size: 10.5, font: boldFont, color: rgb(0.12, 0.15, 0.45)
    });
    y -= 15;

    for (let ci = 0; ci < (skid.components || []).length; ci++) {
      const comp = skid.components[ci];
      const hasFiles = comp.fileCount > 0;
      const reportName = comp.format_of_record || 'T.C/ COMPLIANCE REPORT';

      // Sequence line: Component Name
      page.drawText(
        `     ${si + 1}.${ci + 1}  ${comp.name}`,
        { x: 40, y, size: 9, font: boldFont, color: rgb(0.15, 0.15, 0.2) }
      );

      // Status Badge
      const statusTag = hasFiles ? `[ ATTACHED - ${comp.fileCount} FILE(S) ]` : '[ MISSING - WARNING INCLUDED ]';
      page.drawText(
        statusTag,
        { x: width - 215, y, size: 8, font: boldFont, color: hasFiles ? rgb(0.15, 0.55, 0.25) : rgb(0.8, 0.2, 0.2) }
      );
      y -= 12;

      // Report Name Sub-line
      page.drawText(
        `          Report: ${reportName}`,
        { x: 40, y, size: 8, font, color: rgb(0.4, 0.45, 0.55) }
      );
      y -= 14;

      if (y < 60) break;
    }
    y -= 6;
    if (y < 60) break;
  }

  // Footer bar
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: rgb(0.06, 0.09, 0.16) });
  page.drawText('Generated by Biogas Quality Assurance Plan Document Manager', {
    x: 35, y: 12, size: 9, font, color: rgb(0.65, 0.7, 0.85)
  });
}

// ─── Helper: draw a skid separator page ──────────────────────────────────────

async function addSkidSeparatorPage(pdfDoc, font, boldFont, skidName, skidIndex) {
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.06, 0.09, 0.16) });

  page.drawText(`SECTION ${skidIndex}`, {
    x: 45, y: height / 2 + 55, size: 15, font, color: rgb(0.65, 0.71, 0.98)
  });
  page.drawText(skidName.toUpperCase(), {
    x: 45, y: height / 2 + 15, size: 26, font: boldFont, color: rgb(1, 1, 1)
  });

  page.drawLine({
    start: { x: 45, y: height / 2 - 10 },
    end: { x: width - 45, y: height / 2 - 10 },
    thickness: 1.5,
    color: rgb(0.35, 0.45, 0.75)
  });

  page.drawText('All received component documents and inspection records follow in sequence.', {
    x: 45, y: height / 2 - 35, size: 10, font, color: rgb(0.65, 0.7, 0.85)
  });
}

// ─── Main export handler ──────────────────────────────────────────────────────

const exportProjectPdf = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { skidOrder = [], componentOrder = {} } = req.body;

    console.log(`[exportProjectPdf] Starting PDF generation for project: ${projectId}`);

    // 1. Fetch project (Postgres or MemoryStore)
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

    // Filter/Order skids if skidOrder was provided
    if (Array.isArray(skidOrder) && skidOrder.length > 0) {
      const ordered = skidOrder.map(id => packages.find(p => p.id === id)).filter(Boolean);
      if (ordered.length > 0) {
        packages = ordered;
      }
    }

    // 3. For each skid, fetch requirements and their files
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

      // Apply client-side component ordering if provided
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

    // 4. Build PDF with pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Cover page with TOC, Report Names and status flags
    const coverSkidsSummary = enrichedSkids.map(s => ({
      name: s.name,
      components: s.components.map(c => ({
        name: c.name,
        format_of_record: c.format_of_record,
        fileCount: c.files.length
      }))
    }));
    await addCoverPage(pdfDoc, font, boldFont, safeText(project.name), safeText(project.code), coverSkidsSummary);

    // Pages for each skid and component
    for (let si = 0; si < enrichedSkids.length; si++) {
      const skid = enrichedSkids[si];

      // Section separator page
      await addSkidSeparatorPage(pdfDoc, font, boldFont, skid.name, si + 1);

      // Components in order of sequence
      for (let ci = 0; ci < skid.components.length; ci++) {
        const comp = skid.components[ci];
        const seqStr = `${si + 1}.${ci + 1}`;

        if (!comp.files || comp.files.length === 0) {
          // Document missing -> add warning placeholder page with sequence & report name
          await addMissingPage(
            pdfDoc,
            font,
            boldFont,
            skid.name,
            comp,
            seqStr,
            ci,
            skid.components.length
          );
        } else {
          // Embed each uploaded file for this component
          for (let fi = 0; fi < comp.files.length; fi++) {
            const file = comp.files[fi];
            const buffer = await fetchFileBuffer(file.s3_key, file.is_local, file.s3_bucket);

            if (!buffer) {
              console.warn(`[exportProjectPdf] Could not find buffer for file: ${file.original_name} (${file.s3_key})`);
              await addMissingPage(
                pdfDoc,
                font,
                boldFont,
                skid.name,
                comp,
                seqStr,
                ci,
                skid.components.length
              );
              continue;
            }

            // Add official Document Introduction Sheet before the document
            await addComponentDocHeaderPage(
              pdfDoc,
              font,
              boldFont,
              skid.name,
              comp,
              seqStr,
              ci,
              skid.components.length,
              fi,
              comp.files.length,
              file.original_name
            );

            const mimeType = (file.mime_type || '').toLowerCase();
            const origName = (file.original_name || '').toLowerCase();

            try {
              if (mimeType === 'application/pdf' || origName.endsWith('.pdf')) {
                // Merge all pages of the uploaded PDF with a running header banner
                const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
                const pageCount = srcDoc.getPageCount();
                console.log(`[exportProjectPdf] Merging ${pageCount} pages for [Seq ${seqStr}] Report: ${comp.format_of_record} (${file.original_name})`);

                const copiedPages = await pdfDoc.copyPages(srcDoc, Array.from({ length: pageCount }, (_, i) => i));
                for (let pIdx = 0; pIdx < pageCount; pIdx++) {
                  const copiedPage = copiedPages[pIdx];
                  const { width, height } = copiedPage.getSize();

                  // Draw running header strip on top of every page
                  copiedPage.drawRectangle({
                    x: 0,
                    y: height - 20,
                    width: width,
                    height: 20,
                    color: rgb(0.06, 0.09, 0.16)
                  });

                  const repName = comp.format_of_record || 'QAP Document';
                  const headerText = `[Seq ${seqStr}] ${comp.name}  |  Report: ${repName}  |  Page ${pIdx + 1} of ${pageCount}`;
                  copiedPage.drawText(headerText, {
                    x: 10,
                    y: height - 14,
                    size: 8,
                    font: boldFont,
                    color: rgb(0.85, 0.92, 1)
                  });

                  pdfDoc.addPage(copiedPage);
                }
              } else if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(origName)) {
                // Embed image as a full page with running header
                let img;
                if (mimeType === 'image/png' || origName.endsWith('.png')) {
                  img = await pdfDoc.embedPng(buffer);
                } else {
                  img = await pdfDoc.embedJpg(buffer);
                }

                const page = pdfDoc.addPage([595, 842]);
                const { width, height } = page.getSize();

                // Running header strip
                page.drawRectangle({
                  x: 0,
                  y: height - 22,
                  width: width,
                  height: 22,
                  color: rgb(0.06, 0.09, 0.16)
                });

                const repName = comp.format_of_record || 'Photographs / Visual Record';
                const headerText = `[Seq ${seqStr}] ${comp.name}  |  Report: ${repName}`;
                page.drawText(headerText, {
                  x: 12,
                  y: height - 15,
                  size: 8.5,
                  font: boldFont,
                  color: rgb(0.85, 0.92, 1)
                });

                const imgDims = img.scaleToFit(555, 780);
                page.drawImage(img, {
                  x: (595 - imgDims.width) / 2,
                  y: (height - 30 - imgDims.height),
                  width: imgDims.width,
                  height: imgDims.height
                });
              } else {
                // Non-embeddable format (docx, xlsx, doc, etc.) – show a styled info page
                console.log(`[exportProjectPdf] [Seq ${seqStr}] Non-embeddable format: ${file.original_name} (${mimeType})`);
                await addNonEmbeddablePage(
                  pdfDoc, font, boldFont,
                  skid.name, comp, seqStr, ci, skid.components.length,
                  file.original_name, mimeType
                );
              }
            } catch (embedErr) {
              console.error('Failed to embed file:', file.original_name, embedErr.message);
              await addMissingPage(
                pdfDoc,
                font,
                boldFont,
                skid.name,
                comp,
                seqStr,
                ci,
                skid.components.length
              );
            }
          }
        }
      }
    }

    // 5. Serialize and download
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
