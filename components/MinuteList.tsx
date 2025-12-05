
import React, { useState, useEffect } from 'react';
import { Minute, MinuteStatus, UserRole, AttendanceStatus } from '../types';
import { Calendar, MapPin, Users, ChevronRight, FileClock, Download, Filter, Search, Trash2, Clock, UserCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUsers, getUnits, getGlobalSettings } from '../services/firestoreService';
import Pagination from './Pagination';

interface MinuteListProps {
  minutes: Minute[];
  onView: (minute: Minute) => void;
  onCreate: () => void;
  onDelete?: (minute: Minute) => void;
  userRole: UserRole;
}

const MinuteList: React.FC<MinuteListProps> = ({ minutes, onView, onCreate, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Changed from boolean to string | null to track specific item ID
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 Grid looks good

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    try {
      return new Date(dateValue).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getDayName = (dateValue: any) => {
    try {
      const d = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
      return d.toLocaleDateString('id-ID', { weekday: 'long' });
    } catch (e) {
      return '';
    }
  };

  const filteredMinutes = minutes.filter(minute => {
    const matchSearch = minute.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        minute.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStart = startDate ? minute.date >= startDate : true;
    const matchEnd = endDate ? minute.date <= endDate : true;
    return matchSearch && matchStart && matchEnd;
  });

  // Calculate Pagination Slices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMinutes = filteredMinutes.slice(indexOfFirstItem, indexOfLastItem);

  // Strip HTML tags for PDF content
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const isImage = (path: string) => path.startsWith('data:image');

  const handleDownloadPDF = async (minute: Minute, e: React.MouseEvent) => {
    e.stopPropagation();
    if (minute.id) setDownloadingId(minute.id);
    
    try {
      // Fetch fresh data & Settings
      const [allUsers, allUnits, globalSettings] = await Promise.all([
        getUsers(), 
        getUnits(),
        getGlobalSettings()
      ]);
      
      const logo = globalSettings.logoBase64;

      // LANDSCAPE ORIENTATION
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width; // ~297mm for A4 Landscape

      // --- HEADER (Mimic Borang Notulen) ---
      // FONT: Times New Roman
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      
      const headerTextX = logo ? 45 : 14; // Shift text right if logo exists
      
      // Render Logo if exists
      if (logo) {
         try {
           // x=14, y=10, w=25, h=25 (approx square logo area)
           doc.addImage(logo, 'PNG', 14, 5, 25, 25); 
         } catch (err) {
           console.warn("Could not render logo", err);
         }
      }

      doc.text("No.BO.29.3.1-V3 Borang Notulen", headerTextX, 15);
      // doc.text(formatDate(minute.date), headerTextX, 20); // OLD
      doc.setFontSize(10);
      doc.text("30 Agustus 2017", headerTextX, 20); // NEW STATIC DATE
      
      // Line separator
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // --- MEETING INFO (2 Columns - Landscape Adjusted) ---
      const startY = 40; // Push down due to bigger header area
      // Center of landscape page is ~148. Let's put col2 around 160.
      const col2X = 160; 
      const labelWidth = 35; // Slightly wider for landscape readability

      doc.setFontSize(11); // Slightly larger font for landscape
      doc.setFont("times", "bold");

      // Left Column
      doc.text("Acara", 14, startY); 
      doc.text(":", 14 + 20, startY); // Label width visual adjustment
      doc.setFont("times", "normal");
      
      // Handle multiline title - wider width allowed in landscape (approx 120mm)
      const titleLines = doc.splitTextToSize(minute.title, 120);
      doc.text(titleLines, 14 + 20 + 3, startY);

      doc.setFont("times", "bold");
      const titleHeight = titleLines.length * 5;
      const row2Y = startY + titleHeight + 2;
      
      doc.text("Tempat", 14, row2Y);
      doc.text(":", 14 + 20, row2Y);
      doc.setFont("times", "normal");
      doc.text(minute.location, 14 + 20 + 3, row2Y);

      doc.setFont("times", "bold");
      const row3Y = row2Y + 7;
      doc.text("Peserta", 14, row3Y);
      doc.text(":", 14 + 20, row3Y);
      doc.setFont("times", "normal");
      doc.text("Sesuai Daftar Hadir (Terlampir)", 14 + 20 + 3, row3Y);

      // Right Column
      doc.setFont("times", "bold");
      doc.text("Hari/Tanggal", col2X, startY);
      doc.text(":", col2X + labelWidth, startY);
      doc.setFont("times", "normal");
      doc.text(`${getDayName(minute.date)} / ${formatDate(minute.date)}`, col2X + labelWidth + 3, startY);

      doc.setFont("times", "bold");
      doc.text("Jam", col2X, startY + 7);
      doc.text(":", col2X + labelWidth, startY + 7);
      doc.setFont("times", "normal");
      doc.text(`${minute.time || '-'} WIB`, col2X + labelWidth + 3, startY + 7);

      doc.setFont("times", "bold");
      doc.text("PIC", col2X, startY + 14);
      doc.text(":", col2X + labelWidth, startY + 14);
      doc.setFont("times", "normal");
      doc.text(minute.picName || '-', col2X + labelWidth + 3, startY + 14);

      // --- 1. TABLE OF CONTENTS (AGENDA) ---
      const tableStartY = Math.max(row3Y, startY + 14) + 10;
      
      const tableColumn = ["No", "Pokok Bahasan", "Keputusan", "Tindakan", "PIC", "Monitoring"];
      const tableRows = [];

      if (minute.items && minute.items.length > 0) {
        minute.items.forEach((item, index) => {
          const itemData = [
            index + 1,
            item.topic,
            stripHtml(item.decision),
            stripHtml(item.action),
            item.pic,
            item.monitoring
          ];
          tableRows.push(itemData);
        });
      } else {
          tableRows.push(['-', 'Tidak ada item pembahasan', '-', '-', '-', '-']);
      }

      autoTable(doc, {
        startY: tableStartY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [0, 0, 0], 
          lineWidth: 0.1, 
          lineColor: [0,0,0],
          halign: 'center',
          valign: 'middle',
          font: 'times', // Set font to Times
          fontStyle: 'bold'
        },
        styles: { 
          font: 'times', // Set font to Times
          fontSize: 10, 
          cellPadding: 3, 
          lineColor: [0,0,0], 
          lineWidth: 0.1,
          textColor: [0,0,0],
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 65 },
          3: { cellWidth: 65 }, // Wider columns due to landscape
          4: { cellWidth: 35 },
          5: { cellWidth: 40 }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 10;

      // --- 2. SIGNATURES (PIC) - MOVED HERE BELOW AGENDA TABLE ---
      // Check if we have enough space, otherwise add page
      if (currentY + 40 > 190) { 
          doc.addPage(); 
          currentY = 20; 
      }
      
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      
      // Position at right side of Landscape page (PageWidth ~297)
      const signX = 230; 
      doc.text("Mengetahui,", signX, currentY);
      doc.text("Penanggung Jawab Rapat", signX, currentY + 5);
      
      if (minute.picSignature) {
          try {
            doc.addImage(minute.picSignature, 'PNG', signX, currentY + 10, 30, 15);
          } catch(e) {}
          doc.text(`( ${minute.picName} )`, signX, currentY + 35);
      } else {
          doc.text("..........................................", signX, currentY + 30);
          doc.text(`( ${minute.picName} )`, signX, currentY + 35);
      }

      // Add space after signature for attachments
      currentY += 45;


      // --- 3. ATTACHMENTS (LAMPIRAN) ---
      if (minute.attachments && minute.attachments.length > 0) {
        if (currentY > 180) { doc.addPage(); currentY = 20; } // Lower threshold for landscape page break
        
        doc.setFont("times", "bold");
        doc.text("Lampiran:", 14, currentY);
        currentY += 8;

        minute.attachments.forEach((att) => {
          if (isImage(att.filePath)) {
            if (currentY + 85 > 190) { doc.addPage(); currentY = 20; }
            
            doc.setFont("times", "normal");
            doc.setFontSize(10);
            doc.text(`- ${att.fileName}`, 14, currentY);
            try {
                // Adjust image scaling for PDF
                doc.addImage(att.filePath, 'JPEG', 14, currentY + 2, 100, 75); 
                currentY += 80;
            } catch (err) {
                doc.text("(Error rendering image)", 14, currentY + 10);
                currentY += 15;
            }
          } else {
            if (currentY > 190) { doc.addPage(); currentY = 20; }
            doc.setFont("times", "normal");
            doc.setFontSize(10);
            doc.text(`- ${att.fileName} (Dokumen)`, 14, currentY);
            currentY += 6;
          }
        });
      }

      // --- 4. PARTICIPANTS (BORANG DAFTAR HADIR) - NEW PAGE ---
      doc.addPage(); // Landscape page added
      
      // Header for Daftar Hadir
      doc.setFont("times", "bold");
      doc.setFontSize(12);

      // Render Logo for Daftar Hadir as well
      if (logo) {
        try {
          doc.addImage(logo, 'PNG', 14, 5, 25, 25); 
        } catch (err) {}
      }

      doc.text("No.BO.29.3.2-V1 Borang Daftar Hadir", headerTextX, 15);
      doc.setFontSize(10);
      doc.text("27 November 2017", headerTextX, 20); // NEW STATIC DATE
      // doc.text(notulenDate, headerTextX, 20); // OLD

      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32); // Adjusted line Y to match first page header

      // Meeting Info block for Attendance
      const attStartY = 40; // Push down
      doc.setFontSize(11);
      
      const attInfoX = 14; 

      // Helper to print row
      const printInfoRow = (label: string, value: string, y: number) => {
        doc.setFont("times", "bold");
        doc.text(label, attInfoX, y);
        doc.text(":", attInfoX + 35, y);
        doc.setFont("times", "normal");
        doc.text(value, attInfoX + 35 + 3, y);
      };

      printInfoRow("Hari / Tanggal", `${getDayName(minute.date)} / ${formatDate(minute.date)}`, attStartY);
      printInfoRow("Jam", `${minute.time || '-'} WIB`, attStartY + 6);
      printInfoRow("Tempat", minute.location, attStartY + 12);
      printInfoRow("Acara", minute.title, attStartY + 18);

      // Prepare Participant Data with Unit Name Resolution
      const participantsData = minute.participants.map((p, index) => {
        let unitName = p.unitName;
        
        // If unitName is missing, try to resolve it from fetched users/units
        if (!unitName) {
           const userObj = allUsers.find(u => u.id === p.userId);
           if (userObj && userObj.unitId) {
              const unitObj = allUnits.find(u => u.id === userObj.unitId);
              if (unitObj) unitName = unitObj.name;
           }
        }

        // Column 3 is PARAF.
        // If Absent, we want to show "Tidak Hadir" text (colored later).
        // If Present, we leave it empty (to draw signature later) or put a placeholder.
        const parafContent = p.attendance === AttendanceStatus.TIDAK_HADIR ? 'Tidak Hadir' : '';

        return [index + 1, p.name, unitName || '-', parafContent];
      });
      
      autoTable(doc, {
        startY: attStartY + 28,
        head: [['No.', 'NAMA', 'BAGIAN', 'PARAF']], // Matching "Borang Daftar Hadir"
        body: participantsData,
        theme: 'grid',
        headStyles: { 
          fillColor: [220, 220, 220], 
          textColor: [0, 0, 0],
          lineWidth: 0.1, 
          lineColor: [0,0,0],
          halign: 'center',
          fontStyle: 'bold',
          font: 'times' // Times font
        },
        styles: {
          lineColor: [0,0,0], 
          lineWidth: 0.1,
          textColor: [0,0,0],
          fontSize: 11,
          cellPadding: 3,
          font: 'times' // Times font
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 90 }, // Wider columns for landscape
          2: { cellWidth: 80 },
          3: { cellWidth: 60, minCellHeight: 15 } // Space for signature
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
             const p = minute.participants[data.row.index];
             if (p.attendance === AttendanceStatus.TIDAK_HADIR) {
                 data.cell.styles.textColor = [220, 38, 38]; // Red color
                 data.cell.styles.fontStyle = 'italic';
             }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
              const participantIndex = data.row.index;
              const p = minute.participants[participantIndex];
              if (p.signature && p.attendance === AttendanceStatus.HADIR) {
                  const imageWidth = 25; 
                  const imageHeight = 10; 
                  const x = data.cell.x + 10;
                  const y = data.cell.y + 2;
                  try {
                    doc.addImage(p.signature, 'PNG', x, y, imageWidth, imageHeight);
                  } catch(e) {}
              }
          }
        }
      });

      doc.save(`Notulen-${minute.title.replace(/\s+/g, '-')}.pdf`);

    } catch (error) {
      console.error("Export failed", error);
      alert("Gagal mengexport PDF. Coba refresh halaman.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daftar Notulen</h2>
          <p className="text-slate-500 mt-1">
            {userRole === UserRole.ADMIN ? 'Seluruh notulen rapat (Read Only)' : 'Kelola data notulen rapat'}
          </p>
        </div>
        {userRole === UserRole.NOTULIS && (
          <button 
            onClick={onCreate}
            className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <span className="text-lg">+</span> Tambah Notulen
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Cari Judul atau Lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="bg-white text-slate-900 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="bg-white text-slate-900 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {filteredMinutes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FileClock className="text-slate-400 mx-auto mb-4" size={32} />
          <h3 className="text-lg font-medium text-slate-900">Tidak ada notulen ditemukan</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMinutes.map((minute) => (
              <div 
                key={minute.id}
                onClick={() => onView(minute)}
                className="group bg-white rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full relative"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${minute.status === MinuteStatus.FINAL ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {minute.status === MinuteStatus.FINAL ? 'Final' : 'Draft'}
                    </span>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => !downloadingId && handleDownloadPDF(minute, e)} 
                        disabled={!!downloadingId}
                        className="text-slate-400 hover:text-primary p-1 disabled:opacity-50" 
                        title="Download PDF"
                      >
                        {downloadingId === minute.id ? <Clock size={18} className="animate-spin"/> : <Download size={18} />}
                      </button>
                      {userRole === UserRole.NOTULIS && onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(minute); }} className="text-slate-400 hover:text-red-500 p-1" title="Hapus Notulen"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">{minute.title}</h3>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      <span>{formatDate(minute.date)} &bull; {minute.time}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <MapPin size={14} className="mr-2 text-slate-400" />
                      <span className="truncate">{minute.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <UserCheck size={14} className="mr-2 text-slate-400" />
                      <span className="truncate">PIC: {minute.picName || '-'}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Users size={14} className="mr-2 text-slate-400" />
                      <span>{minute.participants?.length || 0} Peserta</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalItems={filteredMinutes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default MinuteList;
