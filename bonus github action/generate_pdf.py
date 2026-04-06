"""
Script de conversion Markdown -> PDF pour le guide GitHub Actions
Utilise reportlab pour generer un PDF propre et lisible.
"""
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Flowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Couleurs
BLUE = HexColor('#2563EB')
DARK_BLUE = HexColor('#1E40AF')
LIGHT_BLUE = HexColor('#EFF6FF')
GRAY_BG = HexColor('#F3F4F6')
DARK_GRAY = HexColor('#374151')
BORDER_GRAY = HexColor('#D1D5DB')
GREEN_BG = HexColor('#F0FDF4')
GREEN_BORDER = HexColor('#22C55E')
ORANGE_BG = HexColor('#FFFBEB')
ORANGE_BORDER = HexColor('#F59E0B')

MAX_HEIGHT = 650

class ColoredBox(Flowable):
    def __init__(self, text, bg_color, border_color=None, max_width=None):
        Flowable.__init__(self)
        self.text = text
        self.bg_color = bg_color
        self.border_color = border_color or bg_color
        self.max_width = max_width or 170*mm

    def wrap(self, availWidth, availHeight):
        self.width = min(self.max_width, availWidth)
        lines = self.text.split('\n')
        self.height = min(len(lines) * 11 + 16, MAX_HEIGHT)
        return (self.width, self.height)

    def draw(self):
        self.canv.setFillColor(self.bg_color)
        self.canv.setStrokeColor(self.border_color)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        self.canv.setFillColor(DARK_GRAY)
        self.canv.setFont('Courier', 8)
        lines = self.text.split('\n')
        y = self.height - 14
        for line in lines:
            if y < 6:
                self.canv.drawString(8, y, "...")
                break
            self.canv.drawString(8, y, line[:120])
            y -= 11

class BlockquoteBox(Flowable):
    def __init__(self, text, max_width=None):
        Flowable.__init__(self)
        self.text = text
        self.max_width = max_width or 170*mm

    def wrap(self, availWidth, availHeight):
        self.width = min(self.max_width, availWidth)
        lines = self.text.split('\n')
        self.height = min(len(lines) * 12 + 16, MAX_HEIGHT)
        return (self.width, self.height)

    def draw(self):
        self.canv.setFillColor(LIGHT_BLUE)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        self.canv.setStrokeColor(BLUE)
        self.canv.setLineWidth(3)
        self.canv.line(0, 0, 0, self.height)
        self.canv.setFillColor(DARK_GRAY)
        self.canv.setFont('Helvetica', 8.5)
        lines = self.text.split('\n')
        y = self.height - 14
        for line in lines:
            if y < 6:
                break
            self.canv.drawString(12, y, line[:110])
            y -= 12

def parse_markdown_to_pdf(md_path, pdf_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle('Title1', parent=styles['Title'],
        fontSize=22, textColor=DARK_BLUE, spaceAfter=6, spaceBefore=12))
    styles.add(ParagraphStyle('H2Custom', parent=styles['Heading2'],
        fontSize=16, textColor=DARK_BLUE, spaceAfter=6, spaceBefore=14,
        borderPadding=4))
    styles.add(ParagraphStyle('H3Custom', parent=styles['Heading3'],
        fontSize=13, textColor=BLUE, spaceAfter=4, spaceBefore=10))
    styles.add(ParagraphStyle('H4Custom', parent=styles['Heading4'],
        fontSize=11, textColor=DARK_GRAY, spaceAfter=3, spaceBefore=8))
    styles.add(ParagraphStyle('BodyCustom', parent=styles['BodyText'],
        fontSize=10, spaceAfter=4, spaceBefore=2, leading=14))
    styles.add(ParagraphStyle('BulletCustom', parent=styles['BodyText'],
        fontSize=10, leftIndent=20, spaceAfter=2, leading=13))

    story = []
    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Horizontal rule
        if line.strip() == '---':
            story.append(Spacer(1, 8))
            i += 1
            continue

        # Code block
        if line.strip().startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code_text = '\n'.join(code_lines)
            story.append(Spacer(1, 4))
            story.append(ColoredBox(code_text, GRAY_BG, BORDER_GRAY))
            story.append(Spacer(1, 4))
            continue

        # Blockquote
        if line.strip().startswith('> '):
            quote_lines = []
            while i < len(lines) and (lines[i].strip().startswith('> ') or lines[i].strip() == '>'):
                text = lines[i].strip()
                if text == '>':
                    quote_lines.append('')
                else:
                    quote_lines.append(text[2:])
                i += 1
            quote_text = '\n'.join(quote_lines)
            story.append(Spacer(1, 4))
            story.append(BlockquoteBox(quote_text))
            story.append(Spacer(1, 4))
            continue

        # Table
        if '|' in line and i + 1 < len(lines) and '---' in lines[i + 1]:
            table_lines = []
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            # Parse table
            headers = [c.strip() for c in table_lines[0].split('|') if c.strip()]
            rows = []
            for tl in table_lines[2:]:  # skip header and separator
                cells = [c.strip() for c in tl.split('|') if c.strip()]
                if cells:
                    rows.append(cells)

            # Build table
            ncols = len(headers)
            data = [headers] + rows
            # Ensure all rows have same number of columns
            for r in range(len(data)):
                while len(data[r]) < ncols:
                    data[r].append('')

            # Wrap in Paragraphs
            cell_style = ParagraphStyle('Cell', fontSize=8, leading=10)
            header_style = ParagraphStyle('HeaderCell', fontSize=8, leading=10, textColor=white)
            for r in range(len(data)):
                for c in range(len(data[r])):
                    s = header_style if r == 0 else cell_style
                    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', data[r][c])
                    data[r][c] = Paragraph(text, s)

            col_width = 170*mm / ncols
            t = Table(data, colWidths=[col_width]*ncols)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BLUE]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(Spacer(1, 4))
            story.append(t)
            story.append(Spacer(1, 4))
            continue

        # Headings
        if line.startswith('# '):
            text = line[2:].strip()
            story.append(Paragraph(text, styles['Title1']))
            i += 1
            continue
        if line.startswith('## '):
            text = line[3:].strip()
            story.append(Paragraph(text, styles['H2Custom']))
            i += 1
            continue
        if line.startswith('### '):
            text = line[4:].strip()
            story.append(Paragraph(text, styles['H3Custom']))
            i += 1
            continue
        if line.startswith('#### '):
            text = line[5:].strip()
            story.append(Paragraph(text, styles['H4Custom']))
            i += 1
            continue

        # Bullet points
        if line.strip().startswith('- ') or line.strip().startswith('* '):
            text = line.strip()[2:]
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'`(.*?)`', r'<font face="Courier" size="9">\1</font>', text)
            story.append(Paragraph(f"&bull; {text}", styles['BulletCustom']))
            i += 1
            continue

        # Numbered list
        m = re.match(r'^(\d+)\.\s+(.*)', line.strip())
        if m:
            num = m.group(1)
            text = m.group(2)
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'`(.*?)`', r'<font face="Courier" size="9">\1</font>', text)
            story.append(Paragraph(f"{num}. {text}", styles['BulletCustom']))
            i += 1
            continue

        # Empty line
        if not line.strip():
            story.append(Spacer(1, 4))
            i += 1
            continue

        # Regular paragraph
        text = line.strip()
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'`(.*?)`', r'<font face="Courier" size="9">\1</font>', text)
        if text:
            story.append(Paragraph(text, styles['BodyCustom']))
        i += 1

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    doc.build(story)
    print(f"PDF genere : {pdf_path}")

if __name__ == '__main__':
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    md_file = os.path.join(base, 'GUIDE-GITHUB-ACTIONS.md')
    pdf_file = os.path.join(base, 'GUIDE-GITHUB-ACTIONS.pdf')
    parse_markdown_to_pdf(md_file, pdf_file)
