import React, { useState, useEffect, useRef } from 'react';
import {
  Database as DbIcon,
  Clock,
  Wifi,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Save,
  X,
  ChevronDown,
  Check,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom Dropdown Component
const getDay = (dateStr: string) => {
  if (!dateStr) return 0;
  const num = Number(dateStr);
  if (!isNaN(num) && num >= 1 && num <= 31) return num;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getDate();
};
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const day = getDay(dateStr);
  return day > 0 ? String(day) : '-';
};

const CustomDropdown = ({
  value,
  onChange,
  options,
  label,
  className = ""
}: {
  value: string,
  onChange: (val: string) => void,
  options: { value: string, label: string }[],
  label?: string,
  className?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-700 font-medium text-xs md:text-sm"
      >
        <span className="truncate">{selectedOption?.label || 'Pilih...'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 md:w-4 md:h-4 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto max-h-48 py-1"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm transition-colors ${value === option.value
                  ? 'bg-indigo-50 text-indigo-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {option.label}
                {value === option.value && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type Package = {
  id: number;
  name: string;
  price: number;
};

type Client = {
  id: number;
  name: string;
  package_id: number;
  package_name?: string;
  package_price?: number;
  join_date: string;
};

type Settings = {
  [key: string]: string;
};

type Menu = 'DATABASE' | 'SESI_PENARIKAN' | 'PAKET_WIFI' | 'PENGATURAN';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<Menu>('DATABASE');
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Form states
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    package_id: '',
    join_date: String(new Date().getDate())
  });

  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [packageForm, setPackageForm] = useState({ name: '', price: '' });

  const [activeSesi, setActiveSesi] = useState<number>(1);

  // Search and Sort states
  const [dbSearch, setDbSearch] = useState('');
  const [dbSort, setDbSort] = useState<string>('name_asc');
  const [sesiSearch, setSesiSearch] = useState('');
  const [sesiSort, setSesiSort] = useState<string>('name_asc');

  useEffect(() => {
    fetchData();
  }, []);

  // Dynamic page title from settings
  useEffect(() => {
    const storeName = settings['printer_store_name'];
    document.title = storeName ? `${storeName} - WiFi Manager` : 'WiFi Manager';
  }, [settings]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, packagesRes, settingsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/packages'),
        fetch('/api/settings')
      ]);
      setClients(await clientsRes.json());
      setPackages(await packagesRes.json());
      setSettings(await settingsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingClient ? 'PUT' : 'POST';
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientForm)
    });

    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({ name: '', package_id: '', join_date: String(new Date().getDate()) });
    fetchData();
  };

  const handleDeleteClient = (id: number) => {
    setConfirmModal({
      message: 'Yakin ingin menghapus pelanggan ini?',
      onConfirm: async () => {
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        showToast('Pelanggan berhasil dihapus');
        fetchData();
        setConfirmModal(null);
      }
    });
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingPackage ? 'PUT' : 'POST';
    const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packageForm)
    });

    setShowPackageModal(false);
    setEditingPackage(null);
    setPackageForm({ name: '', price: '' });
    fetchData();
  };

  const handleDeletePackage = (id: number) => {
    setConfirmModal({
      message: 'Yakin ingin menghapus paket ini?',
      onConfirm: async () => {
        await fetch(`/api/packages/${id}`, { method: 'DELETE' });
        showToast('Paket berhasil dihapus');
        fetchData();
        setConfirmModal(null);
      }
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    alert('Pengaturan disimpan');
    fetchData();
  };

  const handlePrintSesi = (sesiNum: number) => {
    const sessionClients = getClientsBySesi(sesiNum)
      .filter(c => {
        const searchLower = sesiSearch.toLowerCase();
        const priceStr = c.package_price ? `rp ${c.package_price.toLocaleString('id-ID')}` : '';
        return c.name.toLowerCase().includes(searchLower) ||
          (c.package_name || '').toLowerCase().includes(searchLower) ||
          priceStr.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        switch (sesiSort) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'date_asc': return getDay(a.join_date) - getDay(b.join_date);
          case 'date_desc': return getDay(b.join_date) - getDay(a.join_date);
          default: return 0;
        }
      });
    const storeName = settings['printer_store_name'] || 'WIFI MANAGER';
    const address = settings['printer_address'] || '';
    const footer = settings['printer_footer'] || 'Terima Kasih';
    const start = settings[`sesi_${sesiNum}_start`];
    const end = settings[`sesi_${sesiNum}_end`];
    const paperSize = settings['printer_paper_size'] || '80mm';

    let bodyWidth = '300px';
    let bodyMaxWidth = '300px';
    let windowWidth = '400';
    let fontSize = '12px';
    let titleSize = '18px';
    let pageMargin = '3mm';
    let pageSizeCSS = '80mm auto';

    if (paperSize === '58mm') {
      bodyWidth = '200px';
      bodyMaxWidth = '200px';
      windowWidth = '280';
      fontSize = '10px';
      titleSize = '16px';
      pageSizeCSS = '58mm auto';
    } else if (paperSize === 'A4') {
      bodyWidth = '100%';
      bodyMaxWidth = '100%';
      windowWidth = '800';
      fontSize = '14px';
      titleSize = '24px';
      pageMargin = '15mm';
      pageSizeCSS = 'A4';
    }

    const isThermal = paperSize !== 'A4';

    const printWindow = window.open('', '_blank', `width=${windowWidth},height=600`);
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Cetak Sesi ${sesiNum}</title>
          <style>
            @page { 
              size: ${pageSizeCSS} !important; 
              margin: ${pageMargin} !important; 
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: ${paperSize === 'A4' ? "'Segoe UI', Arial, sans-serif" : "'Courier New', Courier, monospace"}; 
              width: ${bodyWidth}; 
              max-width: ${bodyMaxWidth};
              padding: ${paperSize === 'A4' ? '20px' : '5px'}; 
              font-size: ${fontSize};
              color: #000;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .title { font-weight: bold; font-size: ${titleSize}; }
            .session-info { margin-bottom: 10px; text-align: center; font-size: ${paperSize === 'A4' ? '13px' : '11px'}; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px solid #000; padding: ${paperSize === 'A4' ? '8px 4px' : '5px 0'}; font-size: ${fontSize}; }
            td { padding: ${paperSize === 'A4' ? '8px 4px' : '5px 0'}; vertical-align: top; font-size: ${fontSize}; }
            .total { border-top: 1px solid #000; margin-top: 10px; padding-top: 5px; font-weight: bold; text-align: right; }
            .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: ${paperSize === 'A4' ? '12px' : '10px'}; }
            .page-break { page-break-after: always; break-after: page; }
            .page-info { text-align: center; font-size: ${isThermal ? '9px' : '11px'}; color: #666; margin-top: 8px; border-top: 1px dashed #999; padding-top: 5px; }
            @media print {
              html, body { 
                width: ${bodyWidth} !important; 
                max-width: ${bodyMaxWidth} !important; 
                margin: 0 !important;
                padding: ${isThermal ? '2px' : '20px'} !important;
              }
              .no-print { display: none; }
              .page-break { page-break-after: always; break-after: page; }
            }
          </style>
        </head>
        <body>
          ${(() => {
        const perPage = isThermal ? 25 : sessionClients.length;
        const totalPages = Math.ceil(sessionClients.length / perPage) || 1;
        const printDate = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })();
        let pages = '';
        for (let p = 0; p < totalPages; p++) {
          const chunk = sessionClients.slice(p * perPage, (p + 1) * perPage);
          const isLast = p === totalPages - 1;
          pages += `
                <div class="header">
                  <div class="title">${storeName}</div>
                  <div>${address}</div>
                </div>
                <div class="session-info">
                  <strong>LAPORAN SESI ${sesiNum}</strong><br>
                  Rentang: Tgl ${start} - ${end}<br>
                  Dicetak: ${printDate}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 30px">No</th>
                      <th>Nama</th>
                      <th>Paket</th>
                      <th style="text-align: right">Tgl</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${chunk.map((c, index) => `
                      <tr>
                        <td>${p * perPage + index + 1}</td>
                        <td>${c.name}</td>
                        <td>${c.package_price ? `Rp ${c.package_price.toLocaleString('id-ID')}` : '-'}</td>
                        <td style="text-align: right">${getDay(c.join_date)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${isLast ? `
                  <div class="total">
                    Total Pelanggan: ${sessionClients.length}
                  </div>
                  <div class="footer">
                    ${footer}
                  </div>
                ` : `
                  <div class="page-info">
                    Halaman ${p + 1} / ${totalPages}
                  </div>
                  <div class="page-break"></div>
                `}
              `;
        }
        return pages;
      })()}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getClientsBySesi = (sesiNum: number) => {
    const start = parseInt(settings[`sesi_${sesiNum}_start`] || '0');
    const end = parseInt(settings[`sesi_${sesiNum}_end`] || '0');

    return clients.filter(client => {
      const day = getDay(client.join_date);
      return day >= start && day <= end;
    });
  };

  const renderDatabase = () => {
    const filteredClients = clients
      .filter(c => {
        const searchLower = dbSearch.toLowerCase();
        const priceStr = c.package_price ? `rp ${c.package_price.toLocaleString('id-ID')}` : '';
        return c.name.toLowerCase().includes(searchLower) ||
          (c.package_name || '').toLowerCase().includes(searchLower) ||
          priceStr.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        switch (dbSort) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'date_asc': return getDay(a.join_date) - getDay(b.join_date);
          case 'date_desc': return getDay(b.join_date) - getDay(a.join_date);
          default: return 0;
        }
      });

    return (
      <div className="p-3 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-slate-800">Database Pelanggan</h2>
          <button
            onClick={() => {
              setEditingClient(null);
              setClientForm({ name: '', package_id: '', join_date: String(new Date().getDate()) });
              setShowClientModal(true);
            }}
            className="flex items-center gap-1.5 md:gap-2 bg-indigo-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm"
          >
            <Plus size={16} className="md:w-5 md:h-5" /> Add Client
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-row items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Cari..."
              value={dbSearch}
              onChange={(e) => setDbSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 md:pl-10 md:pr-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-[10px] md:text-sm"
            />
            <div className="absolute left-2.5 top-2 md:top-2.5 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="hidden sm:inline-block text-[10px] md:text-sm font-bold text-slate-500 uppercase whitespace-nowrap">Sortir:</label>
            <CustomDropdown
              value={dbSort}
              onChange={setDbSort}
              className="w-32 md:w-64"
              options={[
                { value: 'name_asc', label: 'Nama (A-Z)' },
                { value: 'name_desc', label: 'Nama (Z-A)' },
                { value: 'date_asc', label: 'Tgl Gabung (Lama)' },
                { value: 'date_desc', label: 'Tgl Gabung (Baru)' },
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-bottom border-slate-200">
              <tr>
                <th className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-slate-600 w-12">No</th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-slate-600">Nama</th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-slate-600 hidden sm:table-cell">Paket</th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-slate-600">Tgl</th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-slate-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.map((client, index) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500 text-xs md:text-sm font-medium">{index + 1}</td>
                  <td className="px-3 py-3 md:px-6 md:py-4 text-slate-800 font-medium text-xs md:text-sm">
                    {client.name}
                    <div className="sm:hidden text-[10px] text-slate-500 font-normal">{client.package_price ? `Rp ${client.package_price.toLocaleString('id-ID')}` : 'N/A'}</div>
                  </td>
                  <td className="px-3 py-3 md:px-6 md:py-4 text-slate-600 text-xs md:text-sm hidden sm:table-cell">{client.package_price ? `Rp ${client.package_price.toLocaleString('id-ID')}` : 'N/A'}</td>
                  <td className="px-3 py-3 md:px-6 md:py-4 text-slate-600 text-xs md:text-sm">{formatDate(client.join_date)}</td>
                  <td className="px-3 py-3 md:px-6 md:py-4 text-right space-x-1 md:space-x-2">
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setClientForm({
                          name: client.name,
                          package_id: client.package_id.toString(),
                          join_date: String(getDay(client.join_date))
                        });
                        setShowClientModal(true);
                      }}
                      className="p-1.5 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} className="md:w-[18px] md:h-[18px]" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-1.5 md:p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} className="md:w-[18px] md:h-[18px]" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 md:py-12 text-center text-slate-400 text-xs md:text-sm">
                    {dbSearch ? 'Pencarian tidak ditemukan' : 'Belum ada data pelanggan'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSesiPenarikan = () => {
    const filteredSesiClients = getClientsBySesi(activeSesi)
      .filter(c => {
        const searchLower = sesiSearch.toLowerCase();
        const priceStr = c.package_price ? `rp ${c.package_price.toLocaleString('id-ID')}` : '';
        return c.name.toLowerCase().includes(searchLower) ||
          (c.package_name || '').toLowerCase().includes(searchLower) ||
          priceStr.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        switch (sesiSort) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'date_asc': return getDay(a.join_date) - getDay(b.join_date);
          case 'date_desc': return getDay(b.join_date) - getDay(a.join_date);
          default: return 0;
        }
      });

    return (
      <div className="p-3 md:p-6">
        <h2 className="text-lg md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Sesi Penarikan</h2>

        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-6 md:mb-8">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => setActiveSesi(num)}
              className={`px-3 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${activeSesi === num
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
            >
              Sesi {num}
            </button>
          ))}
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-row items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Cari..."
              value={sesiSearch}
              onChange={(e) => setSesiSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 md:pl-10 md:pr-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-[10px] md:text-sm"
            />
            <div className="absolute left-2.5 top-2 md:top-2.5 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="hidden sm:inline-block text-[10px] md:text-sm font-bold text-slate-500 uppercase whitespace-nowrap">Sortir:</label>
            <CustomDropdown
              value={sesiSort}
              onChange={setSesiSort}
              className="w-32 md:w-64"
              options={[
                { value: 'name_asc', label: 'Nama (A-Z)' },
                { value: 'name_desc', label: 'Nama (Z-A)' },
                { value: 'date_asc', label: 'Tgl Gabung (Lama)' },
                { value: 'date_desc', label: 'Tgl Gabung (Baru)' },
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-sm md:text-lg font-semibold text-slate-800">
              Daftar Pelanggan Sesi {activeSesi}
            </h3>
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
              <button
                onClick={() => handlePrintSesi(activeSesi)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors text-[10px] md:text-sm font-medium"
              >
                Cetak Sesi
              </button>
              <span className="text-[10px] md:text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                Tgl {settings[`sesi_${activeSesi}_start`]} - {settings[`sesi_${activeSesi}_end`]}
              </span>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 md:px-6 md:py-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                  <th className="px-3 py-2 md:px-6 md:py-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                  <th className="px-3 py-2 md:px-6 md:py-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Paket</th>
                  <th className="px-3 py-2 md:px-6 md:py-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSesiClients.map((client, index) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium bg-slate-400/10 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-slate-800 font-medium text-xs md:text-sm">
                      {client.name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-slate-600 text-xs md:text-sm">{client.package_price ? `Rp ${client.package_price.toLocaleString('id-ID')}` : '-'}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-slate-600 text-xs md:text-sm">{formatDate(client.join_date)}</td>
                  </tr>
                ))}
                {filteredSesiClients.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 md:py-8 text-center text-slate-400 italic text-xs md:text-sm">
                      {sesiSearch ? 'Pencarian tidak ditemukan' : 'Tidak ada pelanggan'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPaketWifi = () => (
    <div className="p-3 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold text-slate-800">Paket WiFi</h2>
        <button
          onClick={() => {
            setEditingPackage(null);
            setPackageForm({ name: '', price: '' });
            setShowPackageModal(true);
          }}
          className="flex items-center gap-1.5 md:gap-2 bg-indigo-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm"
        >
          <Plus size={16} className="md:w-5 md:h-5" /> Add Package
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 relative group">
            <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditingPackage(pkg);
                  setPackageForm({ name: pkg.name, price: pkg.price.toString() });
                  setShowPackageModal(true);
                }}
                className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Edit2 size={14} className="md:w-[18px] md:h-[18px]" />
              </button>
              <button
                onClick={() => handleDeletePackage(pkg.id)}
                className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={14} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-3 md:mb-4">
              <Wifi size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-base md:text-xl font-bold text-slate-800 mb-0.5 md:mb-1">{pkg.name}</h3>
            <p className="text-lg md:text-2xl font-black text-indigo-600">
              Rp {pkg.price.toLocaleString('id-ID')}
              <span className="text-[10px] md:text-sm font-normal text-slate-400 ml-1">/ bln</span>
            </p>
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full py-8 md:py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl text-xs md:text-sm">
            Belum ada paket WiFi
          </div>
        )}
      </div>
    </div>
  );

  const renderPengaturan = () => (
    <div className="p-3 md:p-6 max-w-4xl">
      <h2 className="text-lg md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Pengaturan Sesi & Printer</h2>

      {/* Printer Thermal */}
      <form onSubmit={async (e) => {
        e.preventDefault();
        const printerSettings: Record<string, string> = {};
        ['printer_store_name', 'printer_address', 'printer_footer', 'printer_paper_size'].forEach(k => {
          if (settings[k] !== undefined) printerSettings[k] = settings[k];
        });
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(printerSettings)
        });
        showToast('Pengaturan Printer berhasil disimpan');
        fetchData();
      }} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
          <SettingsIcon size={18} className="text-indigo-600 md:w-5 md:h-5" /> Printer Thermal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1">Nama Toko / Usaha</label>
            <input
              type="text"
              value={settings['printer_store_name'] || ''}
              onChange={(e) => setSettings({ ...settings, 'printer_store_name': e.target.value })}
              placeholder="Contoh: WIFI BERKAH"
              className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1">Alamat / No. HP</label>
            <input
              type="text"
              value={settings['printer_address'] || ''}
              onChange={(e) => setSettings({ ...settings, 'printer_address': e.target.value })}
              placeholder="Jl. Merdeka No. 123"
              className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1">Pesan Kaki (Footer)</label>
            <input
              type="text"
              value={settings['printer_footer'] || ''}
              onChange={(e) => setSettings({ ...settings, 'printer_footer': e.target.value })}
              placeholder="Terima Kasih"
              className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
            />
          </div>
          <div>
            <CustomDropdown
              label="Ukuran Kertas"
              value={settings['printer_paper_size'] || '80mm'}
              onChange={(val) => setSettings({ ...settings, 'printer_paper_size': val })}
              options={[
                { value: '58mm', label: '58mm (Kecil)' },
                { value: '80mm', label: '80mm (Besar)' },
                { value: 'A4', label: 'A4 (Standar)' },
              ]}
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 md:px-8 md:py-3 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-xs md:text-base"
        >
          <Save size={16} className="md:w-5 md:h-5" /> Simpan Printer
        </button>
      </form>

      {/* Rentang Tanggal Sesi */}
      <form onSubmit={async (e) => {
        e.preventDefault();
        const sesiSettings: Record<string, string> = {};
        [1, 2, 3, 4, 5, 6].forEach(num => {
          const startKey = `sesi_${num}_start`;
          const endKey = `sesi_${num}_end`;
          if (settings[startKey] !== undefined) sesiSettings[startKey] = settings[startKey];
          if (settings[endKey] !== undefined) sesiSettings[endKey] = settings[endKey];
        });
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sesiSettings)
        });
        showToast('Pengaturan Sesi berhasil disimpan');
        fetchData();
      }} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200 mt-6">
        <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-1 md:mb-2 flex items-center gap-2">
          <Clock size={18} className="text-indigo-600 md:w-5 md:h-5" /> Rentang Tanggal Sesi
        </h3>
        <p className="text-[10px] md:text-sm text-slate-400 mb-4 md:mb-6">Atur rentang tanggal bergabung pelanggan.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8 mb-6 md:mb-8">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <div key={num} className="space-y-3 md:space-y-4">
              <h3 className="text-xs md:text-base font-bold text-slate-700 border-b pb-1 md:pb-2">Sesi {num}</h3>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1">Mulai</label>
                  <input
                    type="number"
                    min="1" max="31"
                    value={settings[`sesi_${num}_start`] || ''}
                    onChange={(e) => setSettings({ ...settings, [`sesi_${num}_start`]: e.target.value })}
                    className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1">Selesai</label>
                  <input
                    type="number"
                    min="1" max="31"
                    value={settings[`sesi_${num}_end`] || ''}
                    onChange={(e) => setSettings({ ...settings, [`sesi_${num}_end`]: e.target.value })}
                    className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 md:px-8 md:py-3 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-xs md:text-base"
        >
          <Save size={16} className="md:w-5 md:h-5" /> Simpan Sesi
        </button>
      </form>

      {/* Backup & Restore */}
      <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200 mt-6">
        <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
          <DbIcon size={18} className="text-indigo-600 md:w-5 md:h-5" /> Backup & Restore Database
        </h3>
        <p className="text-[10px] md:text-sm text-slate-400 mb-4 md:mb-6">Backup semua data (pelanggan, paket, pengaturan) ke file JSON, atau restore dari file backup.</p>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          {/* Backup Button */}
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/backup');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wifi_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                alert('Gagal membuat backup');
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold hover:bg-emerald-700 transition-all text-xs md:text-sm"
          >
            <Download size={16} className="md:w-5 md:h-5" /> Backup Database
          </button>

          {/* Restore Button */}
          <label className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold hover:bg-amber-700 transition-all cursor-pointer text-xs md:text-sm">
            <Upload size={16} className="md:w-5 md:h-5" /> Restore Database
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (!confirm('⚠️ Semua data saat ini akan diganti dengan data dari file backup. Lanjutkan?')) {
                  e.target.value = '';
                  return;
                }

                try {
                  const text = await file.text();
                  const backup = JSON.parse(text);

                  if (!backup.data || !backup.data.packages || !backup.data.clients || !backup.data.settings) {
                    alert('❌ Format file backup tidak valid');
                    e.target.value = '';
                    return;
                  }

                  const res = await fetch('/api/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backup)
                  });

                  if (res.ok) {
                    alert('✅ Database berhasil di-restore!');
                    fetchData();
                  } else {
                    const err = await res.json();
                    alert('❌ Gagal restore: ' + (err.error || 'Unknown error'));
                  }
                } catch (err) {
                  alert('❌ File tidak valid atau rusak');
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] md:text-xs text-amber-700">
            <strong>Perhatian:</strong> Restore akan menghapus semua data saat ini dan menggantinya dengan data dari file backup.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-white border-r border-slate-200 text-slate-600 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 text-slate-800 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Wifi size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight">WIFI MANAGER</h1>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Admin Dashboard</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveMenu('DATABASE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <DbIcon size={20} /> <span className="font-medium">DATABASE</span>
          </button>
          <button
            onClick={() => setActiveMenu('SESI_PENARIKAN')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === 'SESI_PENARIKAN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Clock size={20} /> <span className="font-medium">SESI PENARIKAN</span>
          </button>
          <button
            onClick={() => setActiveMenu('PAKET_WIFI')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === 'PAKET_WIFI' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Wifi size={20} /> <span className="font-medium">PAKET WIFI</span>
          </button>
          <button
            onClick={() => setActiveMenu('PENGATURAN')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === 'PENGATURAN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <SettingsIcon size={20} /> <span className="font-medium">PENGATURAN</span>
          </button>
        </nav>

        <div className="p-8 text-xs text-slate-400 border-t border-slate-200">
          &copy; 2026 WiFi Manager v1.0
          <br />by Andriy Chandra
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs md:text-sm font-medium">Dashboard</span>
            <ChevronRight size={14} />
            <span className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">{activeMenu.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">Administrator</p>
              <p className="text-xs text-slate-400">Online</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={activeMenu}
              transition={{ duration: 0.3 }}
            >
              {activeMenu === 'DATABASE' && renderDatabase()}
              {activeMenu === 'SESI_PENARIKAN' && renderSesiPenarikan()}
              {activeMenu === 'PAKET_WIFI' && renderPaketWifi()}
              {activeMenu === 'PENGATURAN' && renderPengaturan()}
            </motion.div>
          )}
        </div>
      </main>

      {/* Bottom Navbar - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex md:hidden items-center justify-around px-1 py-1 z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveMenu('DATABASE')}
          className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeMenu === 'DATABASE' ? 'text-indigo-600' : 'text-slate-400'
            }`}
        >
          <DbIcon size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Data</span>
        </button>
        <button
          onClick={() => setActiveMenu('SESI_PENARIKAN')}
          className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeMenu === 'SESI_PENARIKAN' ? 'text-indigo-600' : 'text-slate-400'
            }`}
        >
          <Clock size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Sesi</span>
        </button>

        {/* Centered Add Button */}
        <div className="relative -top-5">
          <button
            onClick={() => {
              setEditingClient(null);
              setClientForm({ name: '', package_id: '', join_date: String(new Date().getDate()) });
              setShowClientModal(true);
            }}
            className="bg-indigo-600 text-white p-3 rounded-full shadow-lg shadow-indigo-200 border-4 border-slate-50 active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>

        <button
          onClick={() => setActiveMenu('PAKET_WIFI')}
          className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeMenu === 'PAKET_WIFI' ? 'text-indigo-600' : 'text-slate-400'
            }`}
        >
          <Wifi size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Paket</span>
        </button>
        <button
          onClick={() => setActiveMenu('PENGATURAN')}
          className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeMenu === 'PENGATURAN' ? 'text-indigo-600' : 'text-slate-400'
            }`}
        >
          <SettingsIcon size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Set</span>
        </button>
      </nav>

      {/* Client Modal */}
      <AnimatePresence>
        {showClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClientModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 mx-4"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h3>
                <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>
              <form onSubmit={handleAddClient} className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Nama Pelanggan</label>
                  <input
                    required
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div>
                  <CustomDropdown
                    label="Paket WiFi"
                    value={clientForm.package_id}
                    onChange={(val) => setClientForm({ ...clientForm, package_id: val })}
                    options={[...packages].sort((a, b) => a.price - b.price).map(pkg => ({
                      value: pkg.id.toString(),
                      label: `${pkg.name} - Rp ${pkg.price.toLocaleString('id-ID')}`
                    }))}
                  />
                </div>
                <div>
                  <CustomDropdown
                    label="Tanggal Gabung"
                    value={clientForm.join_date}
                    onChange={(val) => setClientForm({ ...clientForm, join_date: val })}
                    options={Array.from({ length: 31 }, (_, i) => ({
                      value: String(i + 1),
                      label: String(i + 1)
                    }))}
                  />
                </div>
                <div className="pt-2 md:pt-4">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2.5 md:py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-xs md:text-base"
                  >
                    {editingClient ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Package Modal */}
      <AnimatePresence>
        {showPackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPackageModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden mx-4"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">
                  {editingPackage ? 'Edit Paket WiFi' : 'Tambah Paket Baru'}
                </h3>
                <button onClick={() => setShowPackageModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>
              <form onSubmit={handleAddPackage} className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Nama Paket</label>
                  <input
                    required
                    type="text"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
                    placeholder="Contoh: 20 Mbps"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Harga (Rp)</label>
                  <input
                    required
                    type="number"
                    value={packageForm.price}
                    onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                    className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm"
                    placeholder="Contoh: 150000"
                  />
                </div>
                <div className="pt-2 md:pt-4">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2.5 md:py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-xs md:text-base"
                  >
                    {editingPackage ? 'Simpan Perubahan' : 'Tambah Paket'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden mx-4 p-6 text-center"
            >
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Data</h3>
              <p className="text-sm text-slate-500 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors text-sm"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg font-medium text-sm ${toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
              }`}>
              {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
