'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface AnalyticsReportData {
  title: string;
  borough: string;
  timeframe: string;
  generatedAt: string;
  resourceCount: number;
  kpis: {
    averageWaitMinutes: number | null;
    helpSuccessRate: number | null;
    unmetDemand: number | null;
    inaccuratePercentage: number | null;
  };
  supplyBreakdown: Array<{
    label: string;
    value: number;
  }>;
  topDisruptions: Array<{
    name: string;
    score: number;
    wait: number;
    unmet: number;
  }>;
  barriers: Array<{
    label: string;
    count: number;
  }>;
}

/**
 * Export the insights view element as a PDF
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename = 'report',
  options: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    includeTimestamp?: boolean;
  } = {},
): Promise<void> {
  const { title = null, orientation = 'landscape', includeTimestamp = true } = options;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgWidth = orientation === 'portrait' ? 210 : 297;
  const pageHeight = orientation === 'portrait' ? 297 : 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  let yOffset = 10;

  if (title) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, imgWidth / 2, yOffset, { align: 'center' });
    yOffset += 10;
  }

  if (includeTimestamp) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, imgWidth / 2, yOffset, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yOffset += 10;
  }

  const imgData = canvas.toDataURL('image/png');
  let heightLeft = imgHeight;
  let position = yOffset;
  const availableHeight = pageHeight - yOffset - 10;

  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  } else {
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= availableHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Export analytics data as a structured PDF report
 */
export function exportAnalyticsReport(data: AnalyticsReportData): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(data.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Subtitle
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(`${data.borough} | ${data.timeframe} | ${data.resourceCount} resources`, pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(`Generated: ${data.generatedAt}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // KPIs Section
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('KEY PERFORMANCE INDICATORS', margin + 5, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setTextColor(31, 41, 55);
  const kpiCol1 = margin + 5;
  const kpiCol2 = margin + contentWidth / 2;

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Average Wait Time: `, kpiCol1, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatWait(data.kpis.averageWaitMinutes), kpiCol1 + 42, y);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Help Success Rate: `, kpiCol2, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatPct(data.kpis.helpSuccessRate), kpiCol2 + 42, y);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Unmet Demand: `, kpiCol1, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatPct(data.kpis.unmetDemand), kpiCol1 + 35, y);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Listing Accuracy Issues: `, kpiCol2, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatPct(data.kpis.inaccuratePercentage), kpiCol2 + 48, y);
  y += 20;

  // Supply Breakdown
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Pantry Supply Breakdown', margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  data.supplyBreakdown.forEach((item) => {
    pdf.setTextColor(107, 114, 128);
    pdf.text(item.label, margin, y);
    pdf.setTextColor(31, 41, 55);
    pdf.text(`${item.value.toFixed(1)}%`, margin + 50, y);

    // Progress bar
    pdf.setFillColor(229, 231, 235);
    pdf.roundedRect(margin + 70, y - 3, 100, 4, 1, 1, 'F');
    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(margin + 70, y - 3, Math.min(item.value, 100), 4, 1, 1, 'F');
    y += 7;
  });
  y += 8;

  // Top Disruptions
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Locations Needing Attention', margin, y);
  y += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('LOCATION', margin, y);
  pdf.text('WAIT', margin + 100, y);
  pdf.text('UNMET', margin + 120, y);
  pdf.text('SCORE', margin + 145, y);
  y += 5;

  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  data.topDisruptions.slice(0, 8).forEach((item, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFontSize(10);
    const name = item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name;
    pdf.text(`${idx + 1}. ${name}`, margin, y);
    pdf.text(`${item.wait}m`, margin + 100, y);
    pdf.text(`${item.unmet.toFixed(0)}%`, margin + 120, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 38, 38);
    pdf.text(item.score.toFixed(1), margin + 145, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    y += 6;
  });
  y += 8;

  // Reported Barriers
  if (data.barriers.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Reported Barriers', margin, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    data.barriers.slice(0, 6).forEach((barrier) => {
      pdf.setTextColor(107, 114, 128);
      pdf.text(barrier.label, margin, y);
      pdf.setTextColor(31, 41, 55);
      pdf.text(`${barrier.count} reports`, margin + 60, y);
      y += 6;
    });
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(156, 163, 175);
    pdf.text(`Lemontree Partner Dashboard | Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' });
  }

  pdf.save(`${data.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
}

function formatWait(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  return `${Math.round(minutes)} min`;
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

/**
 * Export individual resource details as PDF
 */
export interface ResourceReportData {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  resourceType: string;
  schedule: string[];
  status: string;
  rating: number | null;
  reviewCount: number;
  dietaryFlags: {
    hasFreshProduce: boolean;
    hasHalal: boolean;
    hasKosher: boolean;
    hasMeat: boolean;
    hasDairy: boolean;
    hasGrains: boolean;
  };
  demographics?: {
    borough: string | null;
    povertyRate: number | null;
    snapRate: number | null;
    isFoodDesert: boolean;
  };
  reviewMetrics?: {
    averageWait: number | null;
    helpSuccessRate: number | null;
  };
}

export function exportResourceReport(data: ResourceReportData): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  let y = 20;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(data.name, margin, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(data.resourceType, margin, y);
  y += 12;

  // Contact Info Box
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'F');
  y += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', margin + 5, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.address, margin + 25, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', margin + 5, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.phone ?? 'Not listed', margin + 25, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Status:', margin + 5, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.status, margin + 25, y);
  y += 15;

  // Rating & Reviews
  if (data.rating !== null || data.reviewCount > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Rating & Reviews', margin, y);
    y += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Rating: ${data.rating?.toFixed(1) ?? 'N/A'} / 5`, margin, y);
    pdf.text(`Reviews: ${data.reviewCount}`, margin + 50, y);
    y += 10;
  }

  // Dietary Availability
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Food Availability (AI Detected)', margin, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const flags = data.dietaryFlags;
  const dietaryItems = [
    { label: 'Fresh Produce', value: flags.hasFreshProduce },
    { label: 'Halal Options', value: flags.hasHalal },
    { label: 'Kosher Options', value: flags.hasKosher },
    { label: 'Meat/Protein', value: flags.hasMeat },
    { label: 'Dairy', value: flags.hasDairy },
    { label: 'Grains/Staples', value: flags.hasGrains },
  ];

  dietaryItems.forEach((item, idx) => {
    const col = idx % 2 === 0 ? margin : margin + 90;
    if (idx % 2 === 0 && idx > 0) y += 5;
    pdf.setTextColor(item.value ? 16 : 156, item.value ? 185 : 163, item.value ? 129 : 175);
    pdf.text(`${item.value ? '✓' : '✗'} ${item.label}`, col, y);
  });
  y += 12;

  // Demographics
  if (data.demographics) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Neighborhood Demographics', margin, y);
    y += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    if (data.demographics.borough) {
      pdf.text(`Borough: ${data.demographics.borough}`, margin, y);
      y += 5;
    }
    if (data.demographics.povertyRate !== null) {
      pdf.text(`Poverty Rate: ${data.demographics.povertyRate.toFixed(1)}%`, margin, y);
      y += 5;
    }
    if (data.demographics.snapRate !== null) {
      pdf.text(`SNAP Households: ${data.demographics.snapRate.toFixed(1)}%`, margin, y);
      y += 5;
    }
    if (data.demographics.isFoodDesert) {
      pdf.setTextColor(220, 38, 38);
      pdf.text('⚠ Located in a Food Desert area', margin, y);
      pdf.setTextColor(31, 41, 55);
      y += 5;
    }
    y += 8;
  }

  // Schedule
  if (data.schedule.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Schedule', margin, y);
    y += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    data.schedule.slice(0, 5).forEach((line) => {
      pdf.text(line, margin, y);
      y += 5;
    });
  }

  // Footer
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 280);
  pdf.text('Lemontree Partner Dashboard', pageWidth - margin - 50, 280);

  pdf.save(`${data.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf`);
}
