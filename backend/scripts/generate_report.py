#!/usr/bin/env python3
"""
Library Management System - PDF Report Generator
Generates PDF reports with graphs using LaTeX and matplotlib
"""

import sys
import json
import os
import subprocess
import tempfile
from datetime import datetime
import mysql.connector
from mysql.connector import Error
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),  # Default password is 'root'
    'database': os.getenv('DB_NAME', 'library_system')
}

def connect_to_database():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        sys.exit(1)

def get_statistics(connection):
    """Fetch statistics from database"""
    cursor = connection.cursor(dictionary=True)
    stats = {}
    
    # Total books
    cursor.execute("SELECT COUNT(*) as total FROM books")
    stats['total_books'] = cursor.fetchone()['total']
    
    cursor.execute("SELECT SUM(total_copies) as total FROM books")
    result = cursor.fetchone()
    stats['total_copies'] = result['total'] if result['total'] else 0
    
    cursor.execute("SELECT SUM(available_copies) as total FROM books")
    result = cursor.fetchone()
    stats['available_copies'] = result['total'] if result['total'] else 0
    
    # Total users
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'user'")
    stats['total_users'] = cursor.fetchone()['total']
    
    # Total loans
    cursor.execute("SELECT COUNT(*) as total FROM loans")
    stats['total_loans'] = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM loans WHERE status = 'active'")
    stats['active_loans'] = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM loans WHERE status = 'returned'")
    stats['returned_loans'] = cursor.fetchone()['total']
    
    # Overdue loans
    cursor.execute("""
        SELECT COUNT(*) as total FROM loans 
        WHERE status = 'active' AND due_date < CURDATE()
    """)
    stats['overdue_loans'] = cursor.fetchone()['total']
    
    # Total fines
    cursor.execute("SELECT SUM(amount) as total FROM fines WHERE status = 'pending'")
    result = cursor.fetchone()
    stats['total_fines'] = float(result['total']) if result['total'] else 0.0
    
    # Total holds
    cursor.execute("SELECT COUNT(*) as total FROM holds WHERE status IN ('pending', 'available')")
    stats['active_holds'] = cursor.fetchone()['total']
    
    # Loans by month (last 12 months)
    cursor.execute("""
        SELECT DATE_FORMAT(loan_date, '%Y-%m') as month, COUNT(*) as count
        FROM loans
        WHERE loan_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month
    """)
    stats['loans_by_month'] = cursor.fetchall()
    
    # Books by category
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM books
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
    """)
    stats['books_by_category'] = cursor.fetchall()
    
    # Most borrowed books
    cursor.execute("""
        SELECT b.title, b.author, COUNT(l.id) as borrow_count
        FROM books b
        LEFT JOIN loans l ON b.id = l.book_id
        GROUP BY b.id, b.title, b.author
        ORDER BY borrow_count DESC
        LIMIT 10
    """)
    stats['most_borrowed'] = cursor.fetchall()
    
    cursor.close()
    return stats

def generate_graphs(stats, output_dir):
    """Generate graphs using matplotlib"""
    graphs = []
    
    # 1. Loans by Month
    if stats['loans_by_month']:
        months = [row['month'] for row in stats['loans_by_month']]
        counts = [row['count'] for row in stats['loans_by_month']]
        
        plt.figure(figsize=(10, 6))
        plt.plot(months, counts, marker='o', linewidth=2, markersize=8)
        plt.title('Loans by Month (Last 12 Months)', fontsize=14, fontweight='bold')
        plt.xlabel('Month', fontsize=12)
        plt.ylabel('Number of Loans', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        graph_path = os.path.join(output_dir, 'loans_by_month.png')
        plt.savefig(graph_path, dpi=300, bbox_inches='tight')
        plt.close()
        graphs.append(graph_path)
    
    # 2. Books by Category
    if stats['books_by_category']:
        categories = [row['category'][:20] for row in stats['books_by_category']]  # Truncate long names
        counts = [row['count'] for row in stats['books_by_category']]
        
        plt.figure(figsize=(10, 6))
        plt.barh(categories, counts, color='steelblue')
        plt.title('Books by Category (Top 10)', fontsize=14, fontweight='bold')
        plt.xlabel('Number of Books', fontsize=12)
        plt.ylabel('Category', fontsize=12)
        plt.tight_layout()
        
        graph_path = os.path.join(output_dir, 'books_by_category.png')
        plt.savefig(graph_path, dpi=300, bbox_inches='tight')
        plt.close()
        graphs.append(graph_path)
    
    # 3. Most Borrowed Books
    if stats['most_borrowed']:
        titles = [row['title'][:30] + '...' if len(row['title']) > 30 else row['title'] 
                  for row in stats['most_borrowed']]
        counts = [row['borrow_count'] for row in stats['most_borrowed']]
        
        plt.figure(figsize=(10, 6))
        plt.barh(titles, counts, color='darkgreen')
        plt.title('Most Borrowed Books (Top 10)', fontsize=14, fontweight='bold')
        plt.xlabel('Number of Borrows', fontsize=12)
        plt.ylabel('Book Title', fontsize=12)
        plt.tight_layout()
        
        graph_path = os.path.join(output_dir, 'most_borrowed.png')
        plt.savefig(graph_path, dpi=300, bbox_inches='tight')
        plt.close()
        graphs.append(graph_path)
    
    # 4. Loan Status Pie Chart
    plt.figure(figsize=(8, 8))
    labels = ['Active', 'Returned', 'Overdue']
    sizes = [
        stats['active_loans'],
        stats['returned_loans'],
        stats['overdue_loans']
    ]
    colors = ['#3498db', '#2ecc71', '#e74c3c']
    explode = (0.05, 0, 0.1)
    
    plt.pie(sizes, explode=explode, labels=labels, colors=colors, autopct='%1.1f%%',
            shadow=True, startangle=90, textprops={'fontsize': 12})
    plt.title('Loan Status Distribution', fontsize=14, fontweight='bold')
    plt.axis('equal')
    
    graph_path = os.path.join(output_dir, 'loan_status.png')
    plt.savefig(graph_path, dpi=300, bbox_inches='tight')
    plt.close()
    graphs.append(graph_path)
    
    return graphs

def generate_pdf_with_reportlab(stats, graphs, output_path):
    """Generate PDF using reportlab (no LaTeX required)"""
    # Create PDF document
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Title
    elements.append(Paragraph("Library Management System", title_style))
    elements.append(Paragraph("Statistical Report", styles['Heading2']))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    # Executive Summary
    elements.append(Paragraph("Executive Summary", heading_style))
    elements.append(Paragraph(
        "This report provides a comprehensive overview of the library management system's statistics and performance metrics.",
        styles['Normal']
    ))
    elements.append(Spacer(1, 0.2*inch))
    
    # Key Statistics Table
    elements.append(Paragraph("Key Statistics", styles['Heading3']))
    stats_data = [
        ['Metric', 'Value'],
        ['Total Books', str(stats['total_books'])],
        ['Total Copies', str(stats['total_copies'])],
        ['Available Copies', str(stats['available_copies'])],
        ['Total Users', str(stats['total_users'])],
        ['Total Loans', str(stats['total_loans'])],
        ['Active Loans', str(stats['active_loans'])],
        ['Returned Loans', str(stats['returned_loans'])],
        ['Overdue Loans', str(stats['overdue_loans'])],
        ['Active Reservations', str(stats['active_holds'])],
        ['Total Pending Fines', f"{stats['total_fines']:.2f} EGP"]
    ]
    
    stats_table = Table(stats_data, colWidths=[4*inch, 2*inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
    ]))
    elements.append(stats_table)
    elements.append(PageBreak())
    
    # Visual Analytics
    elements.append(Paragraph("Visual Analytics", heading_style))
    
    # Add graphs
    graph_dir = os.path.dirname(output_path)
    for graph_path in graphs:
        if os.path.exists(graph_path):
            graph_name = os.path.basename(graph_path)
            # Add caption based on graph name
            if 'loans_by_month' in graph_name:
                elements.append(Paragraph("Loans Trend (Last 12 Months)", styles['Heading3']))
            elif 'loan_status' in graph_name:
                elements.append(Paragraph("Loan Status Distribution", styles['Heading3']))
            elif 'books_by_category' in graph_name:
                elements.append(Paragraph("Books by Category (Top 10)", styles['Heading3']))
            elif 'most_borrowed' in graph_name:
                elements.append(Paragraph("Most Borrowed Books (Top 10)", styles['Heading3']))
            
            # Add image
            img = Image(graph_path, width=6*inch, height=3.6*inch)
            elements.append(img)
            elements.append(Spacer(1, 0.3*inch))
    
    elements.append(PageBreak())
    
    # Detailed Statistics
    elements.append(Paragraph("Detailed Statistics", heading_style))
    
    # Most Borrowed Books Table
    elements.append(Paragraph("Most Borrowed Books", styles['Heading3']))
    books_data = [['Book Title', 'Author', 'Borrow Count']]
    for book in stats['most_borrowed'][:10]:
        books_data.append([
            book['title'][:50],
            book['author'][:30],
            str(book['borrow_count'])
        ])
    
    books_table = Table(books_data, colWidths=[3*inch, 2*inch, 1*inch])
    books_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2ecc71')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
    ]))
    elements.append(books_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Books by Category Table
    elements.append(Paragraph("Books by Category", styles['Heading3']))
    category_data = [['Category', 'Count']]
    for cat in stats['books_by_category']:
        category_data.append([cat['category'], str(cat['count'])])
    
    category_table = Table(category_data, colWidths=[4*inch, 2*inch])
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
    ]))
    elements.append(category_table)
    
    # Build PDF
    doc.build(elements)
    return output_path if os.path.exists(output_path) else None

def generate_latex_document(stats, graphs, output_path):
    """Generate LaTeX document"""
    latex_content = r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{graphicx}
\usepackage{geometry}
\usepackage{fancyhdr}
\usepackage{booktabs}
\usepackage{multirow}
\usepackage{xcolor}
\usepackage{hyperref}

\geometry{margin=1in}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\textbf{Library Management System}}
\fancyhead[R]{\today}
\fancyfoot[C]{\thepage}

\title{\textbf{Library Management System\\Statistical Report}}
\author{Generated Report}
\date{\today}

\begin{document}

\maketitle

\section*{Executive Summary}

This report provides a comprehensive overview of the library management system's statistics and performance metrics.

\subsection*{Key Statistics}

\begin{table}[h]
\centering
\begin{tabular}{lr}
\toprule
\textbf{Metric} & \textbf{Value} \\
\midrule
Total Books & """ + str(stats['total_books']) + r""" \\
Total Copies & """ + str(stats['total_copies']) + r""" \\
Available Copies & """ + str(stats['available_copies']) + r""" \\
Total Users & """ + str(stats['total_users']) + r""" \\
Total Loans & """ + str(stats['total_loans']) + r""" \\
Active Loans & """ + str(stats['active_loans']) + r""" \\
Returned Loans & """ + str(stats['returned_loans']) + r""" \\
Overdue Loans & """ + str(stats['overdue_loans']) + r""" \\
Active Reservations & """ + str(stats['active_holds']) + r""" \\
Total Pending Fines & """ + f"{stats['total_fines']:.2f}" + r""" EGP \\
\bottomrule
\end{tabular}
\end{table}

\newpage
\section*{Visual Analytics}
"""
    
    # Add graphs
    if graphs:
        if 'loans_by_month.png' in str(graphs):
            latex_content += r"""
\subsection*{Loans Trend (Last 12 Months)}

\begin{figure}[h]
\centering
\includegraphics[width=0.9\textwidth]{loans_by_month.png}
\caption{Monthly loan activity over the past 12 months}
\end{figure}
"""
        
        if 'loan_status.png' in str(graphs):
            latex_content += r"""
\subsection*{Loan Status Distribution}

\begin{figure}[h]
\centering
\includegraphics[width=0.6\textwidth]{loan_status.png}
\caption{Distribution of loan statuses}
\end{figure}
"""
        
        if 'books_by_category.png' in str(graphs):
            latex_content += r"""
\subsection*{Books by Category}

\begin{figure}[h]
\centering
\includegraphics[width=0.9\textwidth]{books_by_category.png}
\caption{Book distribution across categories}
\end{figure}
"""
        
        if 'most_borrowed.png' in str(graphs):
            latex_content += r"""
\subsection*{Most Borrowed Books}

\begin{figure}[h]
\centering
\includegraphics[width=0.9\textwidth]{most_borrowed.png}
\caption{Top 10 most frequently borrowed books}
\end{figure}
"""
    
    # Add detailed tables
    latex_content += r"""
\newpage
\section*{Detailed Statistics}

\subsection*{Most Borrowed Books}

\begin{table}[h]
\centering
\begin{tabular}{lcc}
\toprule
\textbf{Book Title} & \textbf{Author} & \textbf{Borrow Count} \\
\midrule
"""
    
    for book in stats['most_borrowed'][:10]:
        title = book['title'].replace('&', '\\&')
        author = book['author'].replace('&', '\\&')
        latex_content += f"{title[:50]} & {author[:30]} & {book['borrow_count']} \\\\\n"
    
    latex_content += r"""
\bottomrule
\end{tabular}
\end{table}

\subsection*{Books by Category}

\begin{table}[h]
\centering
\begin{tabular}{lc}
\toprule
\textbf{Category} & \textbf{Count} \\
\midrule
"""
    
    for cat in stats['books_by_category']:
        category = cat['category'].replace('&', '\\&')
        latex_content += f"{category} & {cat['count']} \\\\\n"
    
    latex_content += r"""
\bottomrule
\end{tabular}
\end{table}

\vfill
\begin{center}
\textit{Report generated on \today}
\end{center}

\end{document}
"""
    
    # Write LaTeX file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(latex_content)

def compile_latex_to_pdf(latex_path, output_dir):
    """Compile LaTeX document to PDF"""
    try:
        import platform
        is_windows = platform.system() == 'Windows'
        
        # Use absolute paths
        abs_latex_path = os.path.abspath(latex_path)
        abs_output_dir = os.path.abspath(output_dir)
        
        # Run pdflatex twice to resolve references
        result = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', '-output-directory', abs_output_dir, abs_latex_path],
            capture_output=True,
            text=True,
            cwd=abs_output_dir,
            shell=is_windows
        )
        
        if result.returncode != 0:
            print(f"LaTeX compilation error: {result.stderr}", file=sys.stderr)
            return None
        
        # Run again for references
        subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', '-output-directory', abs_output_dir, abs_latex_path],
            capture_output=True,
            text=True,
            cwd=abs_output_dir,
            shell=is_windows
        )
        
        pdf_path = os.path.join(abs_output_dir, os.path.basename(latex_path).replace('.tex', '.pdf'))
        return pdf_path if os.path.exists(pdf_path) else None
    except FileNotFoundError:
        print("Error: pdflatex not found. Please install LaTeX distribution.", file=sys.stderr)
        return None

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python generate_report.py <output_directory>", file=sys.stderr)
        sys.exit(1)
    
    output_dir = sys.argv[1]
    os.makedirs(output_dir, exist_ok=True)
    
    # Connect to database
    connection = connect_to_database()
    
    try:
        # Get statistics
        print("Fetching statistics...", file=sys.stderr)
        stats = get_statistics(connection)
        
        # Generate graphs
        print("Generating graphs...", file=sys.stderr)
        graphs = generate_graphs(stats, output_dir)
        
        # Generate PDF using reportlab (no LaTeX required)
        print("Generating PDF...", file=sys.stderr)
        pdf_path = os.path.join(output_dir, 'report.pdf')
        pdf_path = generate_pdf_with_reportlab(stats, graphs, pdf_path)
        
        if pdf_path and os.path.exists(pdf_path):
            print(json.dumps({'success': True, 'pdf_path': pdf_path}))
        else:
            print(json.dumps({'success': False, 'error': 'Failed to generate PDF'}))
            sys.exit(1)
    
    finally:
        connection.close()

if __name__ == '__main__':
    main()

