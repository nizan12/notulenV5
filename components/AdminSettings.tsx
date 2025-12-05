
import React, { useState, useEffect, useRef } from 'react';
import { getGlobalSettings, saveGlobalSettings } from '../services/firestoreService';
import { GlobalSettings } from '../types';
import { Save, Upload, Loader2, Image as ImageIcon, Trash2, Settings } from 'lucide-react';
import { useToast } from './Toast';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>({});
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getGlobalSettings();
      setSettings(data);
      if (data.logoBase64) {
        setLogoPreview(data.logoBase64);
      }
    } catch (error) {
      showToast('Gagal memuat pengaturan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showToast("Ukuran file logo terlalu besar. Maksimal 2MB", 'error');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setSettings(prev => ({ ...prev, logoBase64: base64 }));
    };
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setSettings(prev => ({ ...prev, logoBase64: '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveGlobalSettings(settings);
      showToast('Pengaturan berhasil disimpan');
    } catch (error) {
      showToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={28} className="text-slate-900" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pengaturan Global</h2>
          <p className="text-slate-500">Konfigurasi tampilan aplikasi dan dokumen</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon size={18} /> Logo Instansi / Kop Surat
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Logo Preview Area */}
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3">
              <div className="w-full aspect-square md:w-48 md:h-48 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center relative overflow-hidden group">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo Instansi" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={handleRemoveLogo}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Hapus Logo"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-xs text-slate-400">Belum ada logo</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Upload size={14} /> Upload Logo Baru
              </button>
              <p className="text-xs text-slate-400 text-center">Format PNG/JPG, Transparan disarankan. Max 2MB.</p>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                 <h4 className="font-bold text-blue-800 text-sm mb-1">Informasi Penggunaan Logo</h4>
                 <p className="text-sm text-blue-700">
                   Logo yang diupload disini akan otomatis ditampilkan pada:
                 </p>
                 <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                   <li>Header (Kop Surat) file PDF Notulen</li>
                   <li>Header (Kop Surat) file PDF Daftar Hadir</li>
                 </ul>
                 <p className="text-xs text-blue-600 mt-3 italic">
                   Disarankan menggunakan logo dengan latar belakang transparan (PNG) agar menyatu dengan kertas dokumen.
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
