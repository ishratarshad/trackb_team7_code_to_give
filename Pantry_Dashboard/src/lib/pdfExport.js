/**
 * PDF Export Utility for Pantry Dashboard
 *
 * Provides functions to export dashboard views and reports as PDFs.
 * Uses html2canvas for capturing DOM elements and jsPDF for PDF generation.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Export a DOM element as a PDF
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - The filename for the PDF (without .pdf extension)
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Title to add at the top of the PDF
 * @param {string} options.orientation - 'portrait' or 'landscape'
 * @param {boolean} options.includeTimestamp - Whether to add generation timestamp
 */
export async function exportElementToPDF(element, filename = 'report', options = {}) {
  const {
    title = null,
    orientation = 'portrait',
    includeTimestamp = true,
  } = options;

  if (!element) {
    throw new Error('No element provided for PDF export');
  }

  // Capture the element as a canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Higher resolution
    useCORS: true, // Allow cross-origin images
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Calculate dimensions
  const imgWidth = orientation === 'portrait' ? 210 : 297; // A4 dimensions in mm
  const pageHeight = orientation === 'portrait' ? 297 : 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  let yOffset = 10;

  // Add title if provided
  if (title) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, imgWidth / 2, yOffset, { align: 'center' });
    yOffset += 10;
  }

  // Add timestamp if requested
  if (includeTimestamp) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    const timestamp = new Date().toLocaleString();
    pdf.text(`Generated: ${timestamp}`, imgWidth / 2, yOffset, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yOffset += 10;
  }

  // Add the captured image
  const imgData = canvas.toDataURL('image/png');

  // Handle multi-page PDFs if content is too tall
  let heightLeft = imgHeight;
  let position = yOffset;

  // Add first page
  const availableHeight = pageHeight - yOffset - 10; // Leave margin at bottom

  if (imgHeight <= availableHeight) {
    // Fits on one page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  } else {
    // Multi-page handling
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= availableHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  // Save the PDF
  pdf.save(`${filename}.pdf`);
}

/**
 * Export dashboard summary data as a formatted PDF report
 *
 * @param {Object} data - Dashboard data to export
 * @param {string} data.title - Report title
 * @param {Object} data.stats - Summary statistics
 * @param {Array} data.pantries - Array of pantry data
 * @param {Object} options - Export options
 */
export async function exportDashboardReport(data, options = {}) {
  const {
    filename = 'lemontree-report',
    maxPantries = 20, // Limit pantries in report
  } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.title || 'Lemontree Food Pantry Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Timestamp
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 15;

  // Summary Stats Section
  if (data.stats) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, y);
    y += 8;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const stats = [
      `Total Pantries: ${data.stats.totalPantries || 'N/A'}`,
      `Images Analyzed: ${data.stats.totalImages || 'N/A'}`,
      `Neighborhoods Covered: ${data.stats.neighborhoods || 'N/A'}`,
    ];

    stats.forEach(stat => {
      pdf.text(stat, margin, y);
      y += 6;
    });
    y += 5;
  }

  // Pantries Section
  if (data.pantries && data.pantries.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Pantry Details', margin, y);
    y += 8;

    const pantriesToShow = data.pantries.slice(0, maxPantries);

    pantriesToShow.forEach((pantry, index) => {
      // Check if we need a new page
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${pantry.name || 'Unknown Pantry'}`, margin, y);
      y += 5;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      if (pantry.neighborhood) {
        pdf.text(`   Neighborhood: ${pantry.neighborhood}`, margin, y);
        y += 4;
      }

      if (pantry.zipCode) {
        pdf.text(`   Zip Code: ${pantry.zipCode}`, margin, y);
        y += 4;
      }

      if (pantry.foods && pantry.foods.length > 0) {
        const foodList = pantry.foods.slice(0, 5).join(', ');
        const foodText = pantry.foods.length > 5
          ? `${foodList}, +${pantry.foods.length - 5} more`
          : foodList;

        // Wrap long food lists
        const lines = pdf.splitTextToSize(`   Foods: ${foodText}`, contentWidth - 5);
        lines.forEach(line => {
          pdf.text(line, margin, y);
          y += 4;
        });
      }

      y += 3;
    });

    if (data.pantries.length > maxPantries) {
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`... and ${data.pantries.length - maxPantries} more pantries`, margin, y);
      pdf.setTextColor(0, 0, 0);
    }
  }

  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Lemontree Partner Dashboard | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Export current view with a simple download button handler
 * Call this from a button onClick
 *
 * @param {string} elementId - ID of the element to capture
 * @param {string} reportTitle - Title for the report
 */
export async function handleExportClick(elementId, reportTitle = 'Pantry Report') {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with ID "${elementId}" not found`);
    alert('Unable to export: content not found');
    return;
  }

  try {
    await exportElementToPDF(element, 'pantry-report', {
      title: reportTitle,
      orientation: 'portrait',
      includeTimestamp: true,
    });
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
