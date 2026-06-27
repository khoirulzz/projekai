import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Setup pdfmake virtual file system fonts
if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

/**
 * Parse markdown text into structured blocks for document generation.
 * Handles headings, paragraphs, lists, quotes, and tables.
 */
function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let currentParagraph = [];
  let currentList = null;
  let currentTable = null;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push(currentTable);
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if table row
    if (trimmed.startsWith('|')) {
      flushParagraph();
      flushList();

      const isSeparator = trimmed.match(/^\|[\s\-\|:]+\|$/);
      if (!isSeparator) {
        const cells = trimmed.split('|')
          .slice(1, -1)
          .map(cell => cell.trim());
        
        if (currentTable) {
          currentTable.rows.push(cells);
        } else {
          currentTable = { type: 'table', rows: [cells] };
        }
      }
      continue;
    } else {
      flushTable();
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading3', content: trimmed.slice(4).trim() });
    } else if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading2', content: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading1', content: trimmed.slice(2).trim() });
    }
    // Bullet list
    else if (trimmed.match(/^[\-\*]\s/)) {
      flushParagraph();
      const itemContent = trimmed.replace(/^[\-\*]\s/, '').trim();
      if (currentList && currentList.type === 'bullet') {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: 'bullet', items: [itemContent] };
      }
    }
    // Numbered list
    else if (trimmed.match(/^\d+\.\s/)) {
      flushParagraph();
      const itemContent = trimmed.replace(/^\d+\.\s/, '').trim();
      if (currentList && currentList.type === 'numbered') {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: 'numbered', items: [itemContent] };
      }
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', content: trimmed.slice(2).trim() });
    }
    // Empty line
    else if (trimmed === '') {
      flushParagraph();
      flushList();
    }
    // Regular text
    else {
      flushList();
      currentParagraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  flushTable();

  return blocks;
}

/**
 * Parse inline markdown formatting (bold, italic) into styling tokens.
 */
function parseInlineToTokens(text) {
  const runs = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|([^*_`]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push({ text: match[2], bold: true, italics: true });
    } else if (match[3]) {
      runs.push({ text: match[3], bold: true });
    } else if (match[4]) {
      runs.push({ text: match[4], italics: true });
    } else if (match[5]) {
      runs.push({ text: match[5], bold: true });
    } else if (match[6]) {
      runs.push({ text: match[6], italics: true });
    } else if (match[7]) {
      runs.push({ text: match[7], code: true });
    } else if (match[8]) {
      runs.push({ text: match[8] });
    }
  }

  return runs.length > 0 ? runs : [{ text }];
}

/**
 * Convert inline tokens to docx TextRun objects (TNR 12 font by default).
 */
function tokensToDocxRuns(tokens) {
  return tokens.map(t => new TextRun({
    text: t.text,
    bold: t.bold,
    italics: t.italics,
    font: t.code ? 'Courier New' : 'Times New Roman',
    size: t.code ? 22 : 24, // 24 half-points = 12pt
    color: t.code ? 'A31515' : undefined
  }));
}

/**
 * Generate a DOCX document from markdown text and trigger download.
 */
export async function generateDocx(markdownText, filename = 'document') {
  const blocks = parseMarkdownToBlocks(markdownText);
  const children = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading1': {
        const runs = tokensToDocxRuns(parseInlineToTokens(block.content));
        children.push(
          new Paragraph({
            children: runs.map(r => { r.size = 32; r.bold = true; return r; }),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
          })
        );
        break;
      }
      case 'heading2': {
        const runs = tokensToDocxRuns(parseInlineToTokens(block.content));
        children.push(
          new Paragraph({
            children: runs.map(r => { r.size = 28; r.bold = true; return r; }),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
        break;
      }
      case 'heading3': {
        const runs = tokensToDocxRuns(parseInlineToTokens(block.content));
        children.push(
          new Paragraph({
            children: runs.map(r => { r.size = 24; r.bold = true; return r; }),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
        break;
      }
      case 'bullet':
        for (const item of block.items) {
          const itemRuns = tokensToDocxRuns(parseInlineToTokens(item));
          children.push(
            new Paragraph({
              children: itemRuns,
              bullet: { level: 0 },
              spacing: { before: 60, after: 60 },
            })
          );
        }
        break;

      case 'numbered':
        for (const item of block.items) {
          const itemRuns = tokensToDocxRuns(parseInlineToTokens(item));
          children.push(
            new Paragraph({
              children: itemRuns,
              numbering: { reference: 'default-numbering', level: 0 },
              spacing: { before: 60, after: 60 },
            })
          );
        }
        break;

      case 'quote': {
        const runs = tokensToDocxRuns(parseInlineToTokens(block.content));
        children.push(
          new Paragraph({
            children: runs.map(r => { r.italics = true; return r; }),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: '7c5cfc', space: 24 },
            },
            spacing: { before: 120, after: 120 },
          })
        );
        break;
      }

      case 'table': {
        const docxTable = new Table({
          rows: block.rows.map(row => 
            new TableRow({
              children: row.map(cell => 
                new TableCell({
                  children: [
                    new Paragraph({ 
                      children: tokensToDocxRuns(parseInlineToTokens(cell)),
                      spacing: { before: 60, after: 60 }
                    })
                  ],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE }
                })
              )
            })
          ),
          width: { size: 100, type: WidthType.PERCENTAGE },
          spacing: { before: 120, after: 120 }
        });
        children.push(docxTable);
        break;
      }

      case 'paragraph':
      default: {
        const runs = tokensToDocxRuns(parseInlineToTokens(block.content));
        children.push(
          new Paragraph({
            children: runs,
            spacing: { before: 120, after: 120, line: 360 }, // 1.5 Line Spacing
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 }, // First line indent 0.5 inch (720 twips)
          })
        );
        break;
      }
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
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
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
 * Generate a PDF from markdown text and trigger download.
 * Generates true selectable-text PDF natively using pdfmake.
 */
export async function generatePdf(markdownText, filename = 'document') {
  const blocks = parseMarkdownToBlocks(markdownText);
  const content = [];

  const convertInlineToPdfNodes = (text) => {
    const tokens = parseInlineToTokens(text);
    return tokens.map((t) => {
      const node = { text: t.text };
      if (t.bold) node.bold = true;
      if (t.italics) node.italics = true;
      if (t.code) {
        node.background = '#f4f4f4';
        node.color = '#c7254e';
      }
      return node;
    });
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading1':
        content.push({
          text: convertInlineToPdfNodes(block.content),
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 15, 0, 10],
        });
        break;
      case 'heading2':
        content.push({
          text: convertInlineToPdfNodes(block.content),
          fontSize: 15,
          bold: true,
          margin: [0, 12, 0, 8],
        });
        break;
      case 'heading3':
        content.push({
          text: convertInlineToPdfNodes(block.content),
          fontSize: 13,
          bold: true,
          margin: [0, 10, 0, 6],
        });
        break;
      case 'bullet':
        content.push({
          ul: block.items.map(item => convertInlineToPdfNodes(item)),
          margin: [0, 4, 0, 4],
        });
        break;
      case 'numbered':
        content.push({
          ol: block.items.map(item => convertInlineToPdfNodes(item)),
          margin: [0, 4, 0, 4],
        });
        break;
      case 'quote':
        content.push({
          text: convertInlineToPdfNodes(block.content),
          italics: true,
          margin: [20, 8, 20, 8],
          color: '#555555',
        });
        break;
      case 'table':
        content.push({
          table: {
            headerRows: 1,
            widths: Array(block.rows[0].length).fill('*'),
            body: block.rows.map(row => 
              row.map(cell => ({
                stack: convertInlineToPdfNodes(cell),
                margin: [4, 4, 4, 4]
              }))
            )
          },
          margin: [0, 10, 0, 10]
        });
        break;
      case 'paragraph':
      default:
        content.push({
          text: convertInlineToPdfNodes(block.content),
          margin: [0, 6, 0, 6],
          alignment: 'justify',
          leadingIndent: 24, // first-line indentation
        });
        break;
    }
  }

  const docDefinition = {
    content: content,
    defaultStyle: {
      fontSize: 11,
      lineHeight: 1.4,
    },
    pageMargins: [72, 72, 72, 72], // 1 inch standard margins
  };

  pdfMake.createPdf(docDefinition).download(`${filename}.pdf`);
}
