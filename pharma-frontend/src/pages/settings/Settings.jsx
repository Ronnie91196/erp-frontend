import React, { useState } from 'react';
import {
  Store, Database, Receipt, BellRing, MessageSquare, Users,
  Save, UploadCloud, DownloadCloud, History, FileSpreadsheet
} from 'lucide-react';
import ImportWorkspace from './importer/ImportWorkspace';
import ImportHistory from './importer/ImportHistory';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Data Management');
  const [dataSubTab, setDataSubTab] = useState('import'); // 'import' | 'export' | 'history'

  const tabs = [
    { name: 'Store Profile', icon: Store, status: 'active' },
    { name: 'Data Management', icon: Database, status: 'active' },
    { name: 'Billing & POS', icon: Receipt, status: 'soon' },
    { name: 'Inventory Alerts', icon: BellRing, status: 'soon' },
    { name: 'WhatsApp', icon: MessageSquare, status: 'soon' },
    { name: 'Roles', icon: Users, status: 'soon' },
  ];

  return (
    <div className="settings-page min-h-[calc(100vh-4rem)] p-5 md:p-7 font-sans">
      {/* PAGE HEADER */}
      <div className="settings-header max-w-6xl mx-auto">
        <div>
          <p className="settings-kicker">Workspace control room</p>
          <h1 className="text-3xl font-bold tracking-tight">Settings &amp; Configuration</h1>
          <p className="settings-subtitle">Manage pharmacy identity, data movement, and operational preferences.</p>
        </div>
        <div className="settings-status"><span className="settings-status-dot" /> All systems ready</div>
      </div>

      <div className="settings-layout max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT SIDEBAR TABS */}
        <div className="settings-nav col-span-1 md:col-span-3 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            const isSoon = tab.status === 'soon';

            return (
              <button
                key={tab.name}
                onClick={() => !isSoon && setActiveTab(tab.name)}
                disabled={isSoon}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? 'settings-nav-active text-white shadow-md'
                    : isSoon
                    ? 'bg-transparent border-transparent opacity-50 cursor-not-allowed text-[#64748B]'
                    : 'settings-nav-item text-[#334155] hover:text-[#087c83] shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={isActive ? 'text-white' : 'text-current'} size={18} />
                  <span className="font-semibold text-[14.5px]">{tab.name}</span>
                </div>
                {isSoon && (
                  <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-md uppercase tracking-wider">Soon</span>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="settings-content col-span-1 md:col-span-9">
          {/* TAB 1: STORE PROFILE */}
          {activeTab === 'Store Profile' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
              <div className="p-6 md:p-8 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                <h2 className="text-xl font-bold text-[#0F172A]">Pharmacy Profile</h2>
                <p className="text-sm text-[#64748B] mt-1">Official details printed on your classic & WhatsApp invoices.</p>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#334155] mb-2">Pharmacy Name <span className="text-red-500">*</span></label>
                  <input type="text" defaultValue="Gurukripa Medical & Surgical Stores" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none transition-all text-[#0F172A] font-semibold" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#334155] mb-2">WhatsApp Number</label>
                  <input type="text" defaultValue="7772093527" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none transition-all text-[#0F172A] font-mono" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#334155] mb-2">Email Address</label>
                  <input type="email" placeholder="contact@gurukripa.in" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none transition-all text-[#0F172A]" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#334155] mb-2">Full Address</label>
                  <input type="text" defaultValue="Near HeraGanj Petrol Pump, Besides Shani Dev Mandir, Katni" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none transition-all text-[#0F172A]" />
                </div>

                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] md:col-span-2 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-[#334155] mb-2">DL No. 1</label>
                    <input type="text" defaultValue="20/1495/55/2025" className="w-full px-4 py-2.5 rounded-lg border border-[#CBD5E1] focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none font-mono text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-[#334155] mb-2">DL No. 2</label>
                    <input type="text" defaultValue="21/1496/55/2025" className="w-full px-4 py-2.5 rounded-lg border border-[#CBD5E1] focus:ring-2 focus:ring-[#2E7D68]/20 focus:border-[#2E7D68] outline-none font-mono text-sm" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 bg-[#F8FAFC] border-t border-[#F1F5F9] flex justify-end">
                <button className="bg-[#2E7D68] hover:bg-[#246554] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#2E7D68]/20 transition-all cursor-pointer">
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA MANAGEMENT (UNIVERSAL IMPORT / EXPORT / HISTORY) */}
          {activeTab === 'Data Management' && (
            <div className="space-y-6">
              {/* SUB-TABS NAVIGATION */}
              <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex items-center gap-1 shadow-sm">
                <button
                  onClick={() => setDataSubTab('import')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dataSubTab === 'import'
                      ? 'settings-segment-active text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Import Data
                </button>

                <button
                  onClick={() => setDataSubTab('export')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dataSubTab === 'export'
                      ? 'settings-segment-active text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <DownloadCloud className="w-4 h-4" />
                  Export Data
                </button>

                <button
                  onClick={() => setDataSubTab('history')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dataSubTab === 'history'
                      ? 'settings-segment-active text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Import History
                </button>
              </div>

              {/* SUB-TAB CONTENTS */}
              {dataSubTab === 'import' && <ImportWorkspace />}

              {dataSubTab === 'export' && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DownloadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Export Engine (Phase 2)</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Full data export capability in CSV, Excel, and JSON formats for Products, Customers, Purchases, and Suppliers is scheduled for Phase 2.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mt-6 text-left">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-700 block">Inventory</span>
                      <span className="text-[10px] text-slate-400">Stock & Batches</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-700 block">Purchases</span>
                      <span className="text-[10px] text-slate-400">Inward Bills</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-700 block">Parties</span>
                      <span className="text-[10px] text-slate-400">Customers & Vendors</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-slate-700 block">Ledgers</span>
                      <span className="text-[10px] text-slate-400">Accounts & GST</span>
                    </div>
                  </div>
                </div>
              )}

              {dataSubTab === 'history' && <ImportHistory />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
