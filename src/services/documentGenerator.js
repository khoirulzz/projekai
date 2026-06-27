import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Parse markdown text into structured blocks for document generation.
 */
function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() });
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({ type: 'heading3', content: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ type: 'heading2', content: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      flushParagraph();
      blocks.push({ type: 'heading1', content: line.slice(2).trim() });
    }
    // Bullet list
    else if (line.match(/^[\-\*]\s/)) {
      flushParagraph();
      blocks.push({ type: 'bullet', content: line.replace(/^[\-\*]\s/, '').trim() });
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      flushParagraph();
      blocks.push({ type: 'numbered', content: line.replace(/^\d+\.\s/, '').trim() });
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      flushParagraph();
      blocks.push({ type: 'quote', content: line.slice(2).trim() });
    }
    // Empty line
    else if (line.trim() === '') {
      flushParagraph();
    }
    // Regular text
    else {
      currentParagraph.push(line);
    }
  }
  flushParagraph();

  return blocks;
}

/**
 * Parse inline markdown formatting (bold, italic) into TextRun objects.
 */
function parseInlineFormatting(text) {
  const runs = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|([^*_`]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold + Italic (***text***)
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, font: 'Times New Roman', size: 24 }));
    } else if (match[3]) {
      // Bold (**text**)
      runs.push(new TextRun({ text: match[3], bold: true, font: 'Times New Roman', size: 24 }));
    } else if (match[4]) {
      // Italic (*text*)
      runs.push(new TextRun({ text: match[4], italics: true, font: 'Times New Roman', size: 24 }));
    } else if (match[5]) {
      // Bold (__text__)
      runs.push(new TextRun({ text: match[5], bold: true, font: 'Times New Roman', size: 24 }));
    } else if (match[6]) {
      // Italic (_text_)
      runs.push(new TextRun({ text: match[6], italics: true, font: 'Times New Roman', size: 24 }));
    } else if (match[7]) {
      // Code (`text`)
      runs.push(new TextRun({ text: match[7], font: 'Courier New', size: 22 }));
    } else if (match[8]) {
      // Regular text
      runs.push(new TextRun({ text: match[8], font: 'Times New Roman', size: 24 }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, font: 'Times New Roman', size: 24 }));
  }

  return runs;
}

/**
 * Generate a DOCX document from markdown text and trigger download.
 */
export async function generateDocx(markdownText, filename = 'document') {
  const blocks = parseMarkdownToBlocks(markdownText);
  const children = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading1':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.content, bold: true, font: 'Times New Roman', size: 28 })],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
          })
        );
        break;

      case 'heading2':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.content, bold: true, font: 'Times New Roman', size: 26 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
        break;

      case 'heading3':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.content, bold: true, font: 'Times New Roman', size: 24 })],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
        break;

      case 'bullet':
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.content),
            bullet: { level: 0 },
            spacing: { before: 40, after: 40 },
          })
        );
        break;

      case 'numbered':
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.content),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { before: 40, after: 40 },
          })
        );
        break;

      case 'quote':
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: block.content, italics: true, font: 'Times New Roman', size: 24, color: '555555' }),
            ],
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: '7c5cfc' },
            },
            spacing: { before: 80, after: 80 },
          })
        );
        break;

      case 'paragraph':
      default:
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.content),
            spacing: { before: 80, after: 80, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
          })
        );
        break;
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Generate a PDF from HTML content and trigger download.
 */
export async function generatePdf(elementId, filename = 'document') {
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found for PDF generation');

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  await html2pdf().set(opt).from(element).save();
}
