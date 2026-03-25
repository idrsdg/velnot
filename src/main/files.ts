import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { BrowserWindow } from 'electron';

export interface NoteData {
  title: string;
  date: number;
  duration_sec: number;
  summary: string[];
  action_items: { task: string; owner: string; deadline: string }[];
  transcript: string;
}

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*\n\r]/g, '').trim().slice(0, 80);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? (s > 0 ? `${m} dk ${s} sn` : `${m} dk`) : `${s} sn`;
}

function getOutputDir(): string {
  const dir = path.join(os.homedir(), 'Documents', 'Velnot');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getFilePath(data: NoteData, ext: string): string {
  const datePrefix = new Date(data.date).toISOString().slice(0, 10);
  const safeTitle = sanitize(data.title || 'Başlıksız Toplantı');
  return path.join(getOutputDir(), `${datePrefix} ${safeTitle}.${ext}`);
}

function buildTextContent(data: NoteData): string {
  const dateStr = new Date(data.date).toLocaleString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return [
    `# ${data.title || 'Başlıksız Toplantı'}`,
    `Tarih: ${dateStr}`,
    `Süre: ${formatDuration(data.duration_sec)}`,
    '',
    '## Özet',
    ...data.summary.map(s => `• ${s}`),
    '',
    '## Aksiyonlar',
    ...(data.action_items.length > 0
      ? data.action_items.map(a => `[ ] ${a.task}  —  ${a.owner}  —  ${a.deadline}`)
      : ['(Aksiyon bulunamadı)']),
    '',
    '---',
    '',
    '## Transkript',
    '',
    data.transcript,
  ].join('\n');
}

export function saveNoteAsText(data: NoteData): string {
  const filePath = getFilePath(data, 'txt');
  fs.writeFileSync(filePath, buildTextContent(data), 'utf8');
  return filePath;
}

export function saveNoteAsMarkdown(data: NoteData): string {
  const filePath = getFilePath(data, 'md');
  fs.writeFileSync(filePath, buildTextContent(data), 'utf8');
  return filePath;
}

export async function saveNoteAsDocx(data: NoteData): Promise<string> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const dateStr = new Date(data.date).toLocaleString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const children = [
    new Paragraph({ text: data.title || 'Başlıksız Toplantı', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: `Tarih: ${dateStr}`, color: '888888' })] }),
    new Paragraph({ children: [new TextRun({ text: `Süre: ${formatDuration(data.duration_sec)}`, color: '888888' })] }),
    new Paragraph({}),
    new Paragraph({ text: 'Özet', heading: HeadingLevel.HEADING_2 }),
    ...data.summary.map(s => new Paragraph({ text: `• ${s}` })),
    new Paragraph({}),
    new Paragraph({ text: 'Aksiyonlar', heading: HeadingLevel.HEADING_2 }),
    ...(data.action_items.length > 0
      ? data.action_items.map(a => new Paragraph({ text: `[ ] ${a.task}  —  ${a.owner}  —  ${a.deadline}` }))
      : [new Paragraph({ text: '(Aksiyon bulunamadı)' })]),
    new Paragraph({}),
    new Paragraph({ text: 'Transkript', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({}),
    ...data.transcript.split('\n').map(line => new Paragraph({ text: line })),
  ];

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  const filePath = getFilePath(data, 'docx');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function saveNoteAsPdf(data: NoteData, _win: BrowserWindow): Promise<string> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: sans-serif; max-width: 800px; margin: 40px auto; color: #222; line-height: 1.6; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 20px; }
  ul { padding-left: 20px; }
  .action { background: #f9f9f9; border-radius: 6px; padding: 8px 12px; margin: 6px 0; font-size: 13px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #444; }
</style></head><body>
<h1>${escapeHtml(data.title || 'Başlıksız Toplantı')}</h1>
<div class="meta">
  ${escapeHtml(new Date(data.date).toLocaleString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
  &nbsp;·&nbsp;${escapeHtml(formatDuration(data.duration_sec))}
</div>
${data.summary.length > 0 ? `<h2>Özet</h2><ul>${data.summary.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
${data.action_items.length > 0 ? `<h2>Aksiyonlar</h2>${data.action_items.map(a => `<div class="action">[ ] ${escapeHtml(a.task)} — ${escapeHtml(a.owner)} — ${escapeHtml(a.deadline)}</div>`).join('')}` : ''}
<h2>Transkript</h2>
<pre>${escapeHtml(data.transcript)}</pre>
</body></html>`;

  const filePath = getFilePath(data, 'pdf');

  // Use a hidden offscreen BrowserWindow to render HTML and print to PDF
  const { BrowserWindow: BW } = await import('electron');
  const pdfWin = new BW({ show: false, webPreferences: { offscreen: true } });
  await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const pdf = await pdfWin.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
  pdfWin.destroy();

  fs.writeFileSync(filePath, pdf);
  return filePath;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
