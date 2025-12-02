import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Activity, 
  Settings, 
  Plus, 
  Check, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronLeft,
  Pill,
  Trash2,
  BrainCircuit,
  Pencil,
  History,
  Download,
  XCircle,
  ClipboardList,
  Bell,
  BellOff,
  ExternalLink,
  Info,
  CheckSquare,
  StickyNote,
  ArrowUpDown,
  Filter,
  Archive,
  RefreshCw,
  Ban,
  Zap,
  Key,
  HeartPulse
} from 'lucide-react';
import { 
  Patient, 
  Medication, 
  MedicationLog, 
  ViewState, 
  FrequencyType, 
  FREQUENCY_HOURS,
  LogStatus
} from './types';
import { askDrugInfo } from './services/geminiService';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const getRelativeTimeStatus = (timestamp: number) => {
  const diff = timestamp - Date.now();
  const diffMinutes = Math.floor(diff / 1000 / 60);
  
  if (diffMinutes < 0) return 'overdue';
  if (diffMinutes < 60) return 'soon';
  return 'future';
};
const toLocalISOString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

// --- COMPONENTS ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const AiResponseDisplay = ({ text }: { text: string }) => {
  if (!text) return null;
  
  // Normalize and split lines
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  
  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-5 mb-2 space-y-1">
          {listBuffer}
        </ul>
      );
      listBuffer = [];
    }
  };

  const parseLine = (str: string) => {
    // Basic bold parser: **text**
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-indigo-950">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, i) => {
    const trim = line.trim();
    if (!trim) {
      flushList();
      return;
    }

    if (trim.startsWith('* ') || trim.startsWith('- ') || trim.startsWith('• ')) {
      const content = trim.replace(/^[\*\-\•]\s*/, '');
      listBuffer.push(<li key={`li-${i}`}>{parseLine(content)}</li>);
    } else {
      flushList();
      if (trim.startsWith('### ')) {
        elements.push(<h4 key={`h4-${i}`} className="font-bold text-sm uppercase tracking-wide mt-3 mb-1 text-indigo-800">{parseLine(trim.substring(4))}</h4>);
      } else if (trim.startsWith('## ')) {
        elements.push(<h3 key={`h3-${i}`} className="font-bold text-base mt-4 mb-2 text-indigo-900">{parseLine(trim.substring(3))}</h3>);
      } else {
        elements.push(<p key={`p-${i}`} className="mb-2 last:mb-0">{parseLine(trim)}</p>);
      }
    }
  });
  flushList();

  return (
    <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-900 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-3 border-b border-indigo-200 pb-2">
         <BrainCircuit className="w-4 h-4 text-indigo-600" />
         <span className="font-bold text-indigo-700 text-xs uppercase tracking-wider">AI Assistant Response</span>
      </div>
      <div className="space-y-1">
         {elements}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  // State
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Data State (persisted)
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('patients');
    return saved ? JSON.parse(saved) : [];
  });
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState<MedicationLog[]>(() => {
    const saved = localStorage.getItem('logs');
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [formFrequency, setFormFrequency] = useState<FrequencyType>(FrequencyType.STAT); // Controls form UI
  
  const [loggingMed, setLoggingMed] = useState<Medication | null>(null); // For manual log modal
  const [viewHistoryMedId, setViewHistoryMedId] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dashboardSort, setDashboardSort] = useState<'TIME' | 'PATIENT' | 'MEDICATION'>('TIME');

  // Bulk Selection State
  const [selectedMedIds, setSelectedMedIds] = useState<Set<string>>(new Set());

  // Specific Drug Info AI State
  const [drugInfoModal, setDrugInfoModal] = useState<{
    isOpen: boolean;
    medName: string;
    loading: boolean;
    content: string;
  }>({ isOpen: false, medName: '', loading: false, content: '' });

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  // Track alerted doses to avoid spam: "medId_dueTime"
  const [alertedDoses, setAlertedDoses] = useState<Set<string>>(() => new Set());


  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Persistence Effects
  useEffect(() => localStorage.setItem('patients', JSON.stringify(patients)), [patients]);
  useEffect(() => localStorage.setItem('medications', JSON.stringify(medications)), [medications]);
  useEffect(() => localStorage.setItem('logs', JSON.stringify(logs)), [logs]);

  // Clear selections when changing patients
  useEffect(() => {
    setSelectedMedIds(new Set());
  }, [selectedPatientId, view]);

  // Notification Init
  useEffect(() => {
    if ('Notification' in window) {
      console.log("Notification API supported. Current permission:", Notification.permission);
      setNotificationPermission(Notification.permission);
    } else {
        console.log("Notification API not supported");
    }
  }, []);

  // Notification Loop (Every 30s)
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkDoses = () => {
      const now = Date.now();
      medications.forEach(med => {
        // Skip PRN or Completed meds
        if (!med.nextDueAt || med.frequency === FrequencyType.PRN || med.isCompleted) return;
        
        // If due time is in the past (up to 24 hours ago) or imminent (next 1 min)
        // We avoid alerting for things weeks old by checking reasonable window
        const isDue = med.nextDueAt <= now;
        const isReasonablyRecent = (now - med.nextDueAt) < (24 * 60 * 60 * 1000); // 24hr window

        if (isDue && isReasonablyRecent) {
          const alertKey = `${med.id}_${med.nextDueAt}`;
          
          if (!alertedDoses.has(alertKey)) {
            // Find patient name
            const patient = patients.find(p => p.id === med.patientId);
            const patientName = patient ? patient.name : 'Unknown Patient';

            // Fire Notification
            try {
                new Notification(`Medication Due: ${med.name}`, {
                  body: `${patientName} - ${med.dose} ${med.route}\nDue at ${formatTime(med.nextDueAt)}`,
                  icon: '/favicon.ico', // Fallback
                  tag: alertKey // Prevent duplicates on OS level
                });
            } catch (e) {
                console.error("Failed to fire notification", e);
            }

            // Mark as alerted
            setAlertedDoses(prev => new Set(prev).add(alertKey));
          }
        }
      });
    };

    const intervalId = setInterval(checkDoses, 30000); // Check every 30s
    checkDoses(); // Initial check

    return () => clearInterval(intervalId);
  }, [medications, patients, notificationPermission, alertedDoses]);

  const requestNotificationPermission = () => {
    // 1. Support Check
    if (!('Notification' in window)) {
      alert("This browser does not support system notifications.");
      return;
    }

    // 2. Iframe Warning (Common in previews)
    if (window.self !== window.top) {
        alert("Warning: You seem to be using the app inside a preview frame/iframe. Notifications may be blocked by browser security policies. \n\nPlease open the app in a new full tab/window.");
    }

    // 3. Request
    // We use the Promise pattern without async/await to be extra safe with user gesture handling on older/strict engines
    Notification.requestPermission()
      .then((permission) => {
        console.log("Permission result:", permission);
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
           try {
               new Notification("NurseFlow", { 
                   body: "Notifications enabled successfully!", 
               });
           } catch (e) {
               console.error("Notification test failed", e);
           }
        } else if (permission === 'denied') {
            alert("Permission was DENIED. You must go to your browser settings (Lock icon in URL bar) and manually allow Notifications for this site.");
        }
      })
      .catch((err) => {
         console.error("Permission request error:", err);
         alert("Error requesting permission: " + err);
      });
  };

  const sendTestNotification = () => {
      if (Notification.permission === 'granted') {
          new Notification("Test Alert", { body: "This is a test notification from NurseFlow." });
      } else {
          alert("Cannot send test: Permission is " + Notification.permission);
      }
  };


  // --- ACTIONS ---

  const addPatient = (name: string, roomNumber: string) => {
    const newPatient: Patient = { id: generateId(), name, roomNumber };
    setPatients(prev => [...prev, newPatient]);
    setIsAddPatientOpen(false);
  };

  const updatePatient = (id: string, name: string, roomNumber: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, name, roomNumber } : p));
    setIsAddPatientOpen(false);
    setEditingPatient(null);
  };

  const deletePatient = (id: string) => {
    setConfirmConfig({
        isOpen: true,
        title: 'Delete Patient?',
        message: 'This will permanently remove the patient and all their records. This action cannot be undone.',
        onConfirm: () => {
            setPatients(prev => prev.filter(p => p.id !== id));
            setMedications(prev => prev.filter(m => m.patientId !== id));
            setView('PATIENTS');
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const addMedication = (med: Omit<Medication, 'id' | 'lastServedAt' | 'nextDueAt' | 'isCompleted'>) => {
    const newMed: Medication = {
      ...med,
      id: generateId(),
      lastServedAt: null,
      // STAT doses are due immediately upon creation. Others wait for first serve.
      nextDueAt: med.frequency === FrequencyType.STAT ? Date.now() : null, 
      isCompleted: false
    };
    setMedications(prev => [...prev, newMed]);
    setIsAddMedOpen(false);
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    setMedications(prev => prev.map(m => {
        if (m.id !== id) return m;
        
        const updatedMed = { ...m, ...updates };

        // Logic for transitioning TO STAT: Make it due now if it wasn't already STAT
        if (updates.frequency === FrequencyType.STAT && m.frequency !== FrequencyType.STAT) {
             updatedMed.nextDueAt = Date.now();
        }
        
        // Recalculate nextDueAt if interval changed and currently serving
        if (updates.intervalHours !== undefined && updates.intervalHours !== m.intervalHours) {
            // Only recalculate if NOT currently STAT (STAT handled above) and NOT PRN
            if (updatedMed.frequency !== FrequencyType.STAT && updatedMed.frequency !== FrequencyType.PRN && m.lastServedAt) {
                 updatedMed.nextDueAt = m.lastServedAt + (updatedMed.intervalHours * 3600000);
            } else if (updatedMed.frequency === FrequencyType.PRN) {
                updatedMed.nextDueAt = null;
            }
        }
        return updatedMed;
    }));
    setIsAddMedOpen(false);
    setEditingMed(null);
  };

  const toggleMedicationComplete = (medId: string) => {
    setMedications(prev => prev.map(m => {
        if (m.id !== medId) return m;
        
        const isNowCompleted = !m.isCompleted;
        
        return {
            ...m,
            isCompleted: isNowCompleted,
            // If completing, clear reminders. If resuming, set due to now (so they can log next dose)
            nextDueAt: isNowCompleted ? null : Date.now() 
        };
    }));
    // Remove from selection set if it was selected
    if (selectedMedIds.has(medId)) {
        const newSet = new Set(selectedMedIds);
        newSet.delete(medId);
        setSelectedMedIds(newSet);
    }
  };

  const deleteMedication = (id: string) => {
      setConfirmConfig({
        isOpen: true,
        title: 'Delete Medication?',
        message: 'Are you sure you want to remove this medication? All reminders for it will be stopped.',
        onConfirm: () => {
             setMedications(prev => prev.filter(m => m.id !== id));
             setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
  };

  // Quick serve (default: Given Now)
  const quickServe = (medId: string) => {
    handleManualLog(medId, 'SERVED', Date.now());
  };

  // Detailed logging (Overrides, Missed, etc)
  const handleManualLog = (medId: string, status: LogStatus, timestamp: number, notes?: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;

    let nextDue: number | null = med.nextDueAt;
    let isNowCompleted = med.isCompleted;

    if (med.frequency === FrequencyType.STAT) {
        // STAT Dose Logic: Once served or missed, it is complete. No next due.
        nextDue = null;
        isNowCompleted = true; 
    } else if (med.frequency !== FrequencyType.PRN) {
        // Regular Schedule Logic
        if (status === 'SERVED') {
            // If served (even late/early), next due is from THIS serve time
            nextDue = timestamp + (med.intervalHours * 60 * 60 * 1000);
        } else if (status === 'MISSED') {
            // If missed, skip the current slot. 
            if (med.nextDueAt) {
                nextDue = med.nextDueAt + (med.intervalHours * 60 * 60 * 1000);
            } else {
                nextDue = timestamp + (med.intervalHours * 60 * 60 * 1000);
            }
        }
    }

    // Update med state
    setMedications(prev => prev.map(m => {
        if (m.id !== medId) return m;
        return {
            ...m,
            lastServedAt: status === 'SERVED' ? timestamp : m.lastServedAt,
            nextDueAt: nextDue,
            isCompleted: isNowCompleted
        };
    }));

    // Log it
    setLogs(prev => [...prev, { 
        id: generateId(), 
        medicationId: medId, 
        servedAt: timestamp, 
        status,
        notes 
    }]);

    setLoggingMed(null);
  };

  // Bulk Serve
  const toggleMedSelection = (medId: string) => {
    const newSet = new Set(selectedMedIds);
    if (newSet.has(medId)) {
        newSet.delete(medId);
    } else {
        newSet.add(medId);
    }
    setSelectedMedIds(newSet);
  };

  const handleBulkServe = () => {
    if (selectedMedIds.size === 0) return;
    const now = Date.now();
    
    // Process each selected med as a SERVED event at "now"
    selectedMedIds.forEach(id => {
        handleManualLog(id, 'SERVED', now, 'Batch served');
    });

    // Clear selection
    setSelectedMedIds(new Set());
  };

  const handleAskAi = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    const answer = await askDrugInfo(aiQuery);
    setAiResponse(answer);
    setIsAiLoading(false);
  };

  const openDrugInfo = async (medName: string) => {
    setDrugInfoModal({ isOpen: true, medName, loading: true, content: '' });
    const response = await askDrugInfo(`Provide a concise clinical summary for ${medName} including indications, common dosage, and key nursing warnings/adverse effects. Keep it under 100 words.`);
    setDrugInfoModal(prev => ({ ...prev, loading: false, content: response }));
  };

  const exportData = () => {
    const headers = [
      "Patient Name",
      "Room Number",
      "Medication Name",
      "Dose",
      "Form",
      "Route",
      "Frequency",
      "Status",
      "Last Served",
      "Next Due",
      "Notes"
    ];
  
    const csvRows = [headers.join(",")];
  
    for (const p of patients) {
      const pMeds = medications.filter(m => m.patientId === p.id);
      if (pMeds.length === 0) {
        csvRows.push([
          `"${p.name}"`,
          `"${p.roomNumber || ''}"`,
          "", "", "", "", "", "", "", "", ""
        ].join(","));
      } else {
        for (const m of pMeds) {
          csvRows.push([
             `"${p.name}"`,
             `"${p.roomNumber || ''}"`,
             `"${m.name}"`,
             `"${m.dose}"`,
             `"${m.form || ''}"`,
             `"${m.route}"`,
             `"${m.frequency}"`,
             `"${m.isCompleted ? 'COMPLETED' : 'ACTIVE'}"`,
             `"${m.lastServedAt ? new Date(m.lastServedAt).toLocaleString() : ''}"`,
             `"${m.nextDueAt ? new Date(m.nextDueAt).toLocaleString() : ''}"`,
             `"${m.notes || ''}"`
          ].join(","));
        }
      }
    }
  
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nurseflow_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- DERIVED STATE ---

  const upcomingDoses = useMemo(() => {
    const sorted = medications
      .filter(m => m.nextDueAt !== null && m.frequency !== FrequencyType.PRN && !m.isCompleted)
      .map(m => {
        const patient = patients.find(p => p.id === m.patientId);
        return { ...m, patientName: patient?.name || 'Unknown', patientRoom: patient?.roomNumber };
      });

    // Sort Logic
    sorted.sort((a, b) => {
        if (dashboardSort === 'TIME') return (a.nextDueAt || 0) - (b.nextDueAt || 0);
        if (dashboardSort === 'PATIENT') return a.patientName.localeCompare(b.patientName);
        if (dashboardSort === 'MEDICATION') return a.name.localeCompare(b.name);
        return 0;
    });

    return sorted;
  }, [medications, patients, dashboardSort]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientMeds = medications.filter(m => m.patientId === selectedPatientId);
  const activeMeds = patientMeds.filter(m => !m.isCompleted);
  const completedMeds = patientMeds.filter(m => m.isCompleted);

  // --- VIEWS ---

  const renderDashboard = () => (
    <div className="space-y-4 pb-24 md:pb-10 h-full">
      <header className="px-4 md:px-8 pt-6 pb-2 flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">Upcoming</h1>
           <p className="text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}</p>
        </div>
        {notificationPermission !== 'granted' && (
            <button 
                onClick={() => setView('SETTINGS')}
                className="p-2 bg-amber-100 text-amber-700 rounded-full animate-pulse md:hidden"
                title="Enable Notifications in Settings"
            >
                <BellOff className="w-6 h-6" />
            </button>
        )}
      </header>

      {/* Sorting Controls */}
      <div className="px-4 md:px-8 flex items-center gap-2 overflow-x-auto no-scrollbar">
         <span className="text-xs font-bold text-slate-400 uppercase mr-1">Sort By:</span>
         <button 
            onClick={() => setDashboardSort('TIME')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                dashboardSort === 'TIME' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
            }`}
         >
            <Clock className="w-3 h-3 inline mr-1" /> Time
         </button>
         <button 
            onClick={() => setDashboardSort('PATIENT')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                dashboardSort === 'PATIENT' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
            }`}
         >
            <Users className="w-3 h-3 inline mr-1" /> Patient
         </button>
         <button 
            onClick={() => setDashboardSort('MEDICATION')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                dashboardSort === 'MEDICATION' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
            }`}
         >
            <Pill className="w-3 h-3 inline mr-1" /> Med Name
         </button>
      </div>
      
      {/* Grid Content */}
      <div className="px-4 md:px-8">
        {upcomingDoses.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl text-center shadow-sm border border-slate-100 mt-4 max-w-md mx-auto md:max-w-none">
            <Check className="w-12 h-12 text-teal-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-800">All Caught Up</h3>
            <p className="text-slate-400">No scheduled doses pending.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
            {upcomingDoses.map(med => {
                const isStat = med.frequency === FrequencyType.STAT;
                const status = isStat ? 'stat' : getRelativeTimeStatus(med.nextDueAt!);
                let statusColor = "bg-teal-50 border-teal-200";
                let textColor = "text-teal-900";
                let timeColor = "text-teal-700";
                
                if (status === 'overdue') {
                statusColor = "bg-red-50 border-red-200 animate-pulse";
                textColor = "text-red-900";
                timeColor = "text-red-700";
                } else if (status === 'stat') {
                statusColor = "bg-rose-50 border-rose-200";
                textColor = "text-rose-900";
                timeColor = "text-rose-700";
                } else if (status === 'soon') {
                statusColor = "bg-amber-50 border-amber-200";
                textColor = "text-amber-900";
                timeColor = "text-amber-700";
                }

                return (
                <div key={med.id} className={`p-4 rounded-xl border ${statusColor} shadow-sm flex justify-between items-center`}>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isStat ? (
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 flex items-center gap-1 ${timeColor}`}>
                                <Zap className="w-3 h-3 fill-current" /> STAT
                            </span>
                        ) : (
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 ${timeColor}`}>
                                {status === 'overdue' ? 'OVERDUE' : formatTime(med.nextDueAt!)}
                            </span>
                        )}
                        <span className="text-xs text-slate-500 font-medium truncate">{med.patientName}</span>
                    </div>
                    <h3 className={`text-lg font-bold ${textColor} truncate`}>{med.name}</h3>
                    <p className={`text-sm opacity-80 ${textColor} truncate`}>
                        {med.dose} • {med.form ? `${med.form} • ` : ''}{med.route}
                    </p>
                    {med.notes && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500 italic">
                            <StickyNote className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{med.notes}</span>
                        </div>
                    )}
                    </div>
                    <button 
                    onClick={() => quickServe(med.id)}
                    className="ml-3 bg-white p-3 rounded-full shadow-md active:scale-95 transition-transform border border-slate-100 flex-shrink-0"
                    >
                    <Check className={`w-6 h-6 ${status === 'overdue' ? 'text-red-600' : 'text-teal-600'}`} />
                    </button>
                </div>
                );
            })}
            </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="px-4 md:px-8 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-bold uppercase">Active Patients</p>
            <p className="text-2xl font-bold text-slate-800">{patients.length}</p>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-bold uppercase">Active Meds</p>
            <p className="text-2xl font-bold text-slate-800">{medications.filter(m => !m.isCompleted).length}</p>
         </div>
      </div>
    </div>
  );

  const renderPatientList = () => (
    <div className="space-y-4 pb-24 md:pb-10 h-full">
      <header className="px-4 md:px-8 pt-6 pb-2 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Patients</h1>
            <p className="text-slate-500">{patients.length} admitted</p>
        </div>
        <button 
          onClick={() => { setEditingPatient(null); setIsAddPatientOpen(true); }}
          className="bg-teal-600 text-white p-2 md:px-4 md:py-2 md:rounded-xl rounded-full shadow-lg active:bg-teal-700 flex items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="hidden md:inline font-bold">Add Patient</span>
        </button>
      </header>

      <div className="px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {patients.map(patient => {
            const activeMeds = medications.filter(m => m.patientId === patient.id && !m.isCompleted).length;
            return (
                <div 
                  key={patient.id}
                  onClick={() => { setSelectedPatientId(patient.id); setView('PATIENT_DETAIL'); }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-teal-200 hover:shadow-md cursor-pointer active:bg-slate-50 transition-all flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg">
                        {patient.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{patient.name}</h3>
                        <p className="text-sm text-slate-500">
                            {patient.roomNumber ? `Room ${patient.roomNumber}` : 'No room assigned'}
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-medium">
                        {activeMeds} Active
                     </span>
                     <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                  </div>
                </div>
            );
        })}
      </div>
      {patients.length === 0 && (
        <div className="text-center py-10 text-slate-400">
            <p>No patients added yet.</p>
            <p className="text-sm">Tap + to add one.</p>
        </div>
       )}
    </div>
  );

  const renderPatientDetail = () => {
    if (!selectedPatient) return null;
    return (
      <div className="space-y-4 pb-24 md:pb-10 h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#f1f5f9] md:static z-10 px-4 md:px-8 pt-6 pb-2">
            <button 
                onClick={() => setView('PATIENTS')}
                className="flex items-center gap-1 text-slate-500 mb-2 active:opacity-60 hover:text-teal-600 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{selectedPatient.name}</h1>
                    <p className="text-slate-500">{selectedPatient.roomNumber || "No Room"}</p>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => {
                            setEditingPatient(selectedPatient);
                            setIsAddPatientOpen(true);
                        }}
                        className="p-2 text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => deletePatient(selectedPatient.id)}
                        className="p-2 text-red-400 bg-red-50 rounded-full hover:bg-red-100"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="mt-4">
                <button 
                    onClick={() => { 
                        setEditingMed(null); 
                        setFormFrequency(FrequencyType.STAT); // Default for new
                        setIsAddMedOpen(true); 
                    }}
                    className="w-full md:w-auto md:px-8 bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
                >
                    <Plus className="w-5 h-5" /> Add Medication
                </button>
            </div>
        </div>

        {/* Active Meds List */}
        <div className="px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeMeds.map(med => {
                const isStat = med.frequency === FrequencyType.STAT;
                const isPRN = med.frequency === FrequencyType.PRN;
                let nextDueDisplay = 'Not Started';
                if (isStat) nextDueDisplay = 'Immediate';
                else if (isPRN) nextDueDisplay = 'PRN';
                else if (med.nextDueAt) nextDueDisplay = formatTime(med.nextDueAt);
                
                const isOverdue = med.nextDueAt && med.nextDueAt < Date.now() && !isPRN && !isStat;
                const isSelected = selectedMedIds.has(med.id);

                return (
                    <div key={med.id} className={`flex items-stretch bg-white rounded-xl shadow-sm border transition-all ${isSelected ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50' : isStat ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 hover:border-teal-200'}`}>
                        {/* Checkbox Area */}
                        <div 
                            className={`w-12 flex items-center justify-center border-r cursor-pointer ${isStat ? 'border-rose-200' : 'border-slate-100'}`}
                            onClick={() => toggleMedSelection(med.id)}
                        >
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                        
                        {/* Content Area */}
                        <div className="flex-1 p-4 overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0 flex-1 mr-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-lg font-bold text-slate-800">{med.name}</h3>
                                        {isStat && (
                                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-rose-200">
                                                <Zap className="w-3 h-3 fill-current" /> STAT
                                            </span>
                                        )}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDrugInfo(med.name);
                                            }}
                                            className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full"
                                            title="AI Drug Info"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-slate-500 text-sm truncate">
                                        {med.dose} • {med.form ? `${med.form} • ` : ''}{med.route} • {med.frequency}
                                    </p>
                                    {med.notes && (
                                        <div className="flex items-start gap-1 mt-1 text-xs text-amber-700 bg-amber-50 p-1.5 rounded-md border border-amber-100">
                                            <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                            <span className="leading-tight">{med.notes}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button 
                                        onClick={() => toggleMedicationComplete(med.id)}
                                        className="text-slate-400 p-1 hover:text-teal-600 bg-slate-50 rounded-full"
                                        title="Mark Complete / Archive"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setViewHistoryMedId(med.id)}
                                        className="text-slate-400 p-1 hover:text-indigo-600 bg-slate-50 rounded-full"
                                        title="History"
                                    >
                                        <History className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditingMed(med);
                                            setFormFrequency(med.frequency); // Sync state
                                            setIsAddMedOpen(true);
                                        }}
                                        className="text-slate-400 p-1 hover:text-teal-600 bg-slate-50 rounded-full"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => deleteMedication(med.id)}
                                        className="text-slate-400 p-1 hover:text-red-500 bg-slate-50 rounded-full"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wide">Next Due</span>
                                    <span className={`font-mono font-bold ${isOverdue ? 'text-red-500' : isStat ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1"/>}
                                        {nextDueDisplay}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setLoggingMed(med)}
                                    className="bg-white border border-teal-600 text-teal-600 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm active:bg-teal-50 hover:bg-teal-50 transition-colors flex items-center gap-1.5"
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Log
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
             {activeMeds.length === 0 && (
                <div className="text-center py-10 text-slate-400 col-span-full">
                    <Pill className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No active medications.</p>
                </div>
            )}
        </div>

        {/* Completed Meds Section */}
        {completedMeds.length > 0 && (
            <div className="px-4 md:px-8 mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> Completed / Discontinued
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-75">
                {completedMeds.map(med => (
                    <div key={med.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1 mr-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-600 line-through decoration-slate-400">{med.name}</h3>
                                    {med.frequency === FrequencyType.STAT && (
                                        <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Zap className="w-3 h-3" /> STAT
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-sm">
                                    {med.dose} • {med.form ? `${med.form} • ` : ''}{med.route}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => toggleMedicationComplete(med.id)}
                                    className="text-teal-600 p-1.5 hover:bg-teal-50 bg-white border border-slate-200 rounded-full"
                                    title="Continue / Restart"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => deleteMedication(med.id)}
                                    className="text-slate-400 p-1.5 hover:text-red-500 hover:bg-slate-100 rounded-full"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                         <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 italic">
                             <Ban className="w-3 h-3" />
                             Completed / Stopped
                         </div>
                    </div>
                ))}
                </div>
            </div>
        )}
        
        {/* Bulk Action Sticky Bar */}
        {selectedMedIds.size > 0 && (
            <div className="fixed bottom-[72px] md:bottom-8 left-0 right-0 md:left-64 p-4 z-30 animate-in slide-in-from-bottom-5 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button 
                        onClick={handleBulkServe}
                        className="w-full bg-teal-800 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-between px-6 active:scale-95 transition-transform hover:bg-teal-900"
                    >
                        <span className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5" />
                            {selectedMedIds.size} Selected
                        </span>
                        <span>Mark as Served</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="pb-24 px-4 md:px-8 pt-6 space-y-6 max-w-2xl mx-auto md:mx-0">
        <h1 className="text-3xl font-bold text-slate-800">Settings & Tools</h1>
        
        {/* Notifications Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-500" />
                Notifications
            </h3>
            
            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-sm text-slate-800">System Alerts</p>
                        <p className="text-xs text-slate-500">
                            {notificationPermission === 'granted' 
                                ? 'Active. Alerts will appear for due meds.' 
                                : 'Disabled. Tap below to enable.'}
                        </p>
                    </div>
                     <span className={`text-[10px] font-mono px-2 py-1 rounded border ${
                         notificationPermission === 'granted' ? 'bg-teal-100 text-teal-800 border-teal-200' : 
                         notificationPermission === 'denied' ? 'bg-red-100 text-red-800 border-red-200' :
                         'bg-slate-200 text-slate-600 border-slate-300'
                     }`}>
                        {notificationPermission}
                    </span>
                </div>

                {notificationPermission !== 'granted' && (
                     <button 
                        onClick={requestNotificationPermission}
                        className="w-full bg-teal-600 text-white text-sm font-bold py-2 rounded-lg shadow-sm active:bg-teal-700 flex justify-center gap-2 hover:bg-teal-700 transition-colors"
                     >
                        Enable Alerts
                        {window.self !== window.top && <ExternalLink className="w-4 h-4 opacity-50"/>}
                     </button>
                )}

                {notificationPermission === 'granted' && (
                     <button 
                        onClick={sendTestNotification}
                        className="w-full bg-white border border-slate-300 text-slate-600 text-xs font-bold py-2 rounded-lg active:bg-slate-50 hover:bg-slate-50 transition-colors"
                     >
                        Send Test Alert
                     </button>
                )}
                
                {window.self !== window.top && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 rounded text-amber-800 text-xs border border-amber-100">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>Preview mode detected. Notifications might be blocked. Open in full tab for best results.</p>
                    </div>
                )}
            </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-600 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="text-white w-6 h-6" />
                    <h2 className="text-white font-bold text-lg">AI Drug Assistant</h2>
                </div>
                <button 
                    onClick={async () => {
                        try {
                            await window.aistudio.openSelectKey();
                        } catch (e) {
                            alert("Key selection tool not available.");
                        }
                    }}
                    className="flex items-center gap-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-2 py-1.5 rounded border border-indigo-500 transition-colors"
                >
                    <Key className="w-3 h-3" /> Config Key
                </button>
            </div>
            <div className="p-4 space-y-3">
                <p className="text-sm text-slate-500">Ask clinical questions about dosage, interactions, or generic names.</p>
                <textarea 
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
                    placeholder="e.g., Max daily dose of Ibuprofen?"
                    rows={2}
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                />
                <button 
                    onClick={handleAskAi}
                    disabled={isAiLoading || !aiQuery.trim()}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                    {isAiLoading ? 'Thinking...' : 'Ask Assistant'}
                </button>
                {aiResponse && <AiResponseDisplay text={aiResponse} />}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-bold text-slate-700 mb-3">Data Management</h3>
            <div className="space-y-3">
                <button 
                    onClick={exportData}
                    className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Export Data (CSV)
                </button>

                <button 
                    onClick={() => {
                        setConfirmConfig({
                            isOpen: true,
                            title: "Reset All Data",
                            message: "Are you sure? This will delete ALL patients, medications, and history logs. This action cannot be undone.",
                            onConfirm: () => {
                                localStorage.clear();
                                window.location.reload();
                            }
                        });
                    }}
                    className="w-full py-3 border border-red-100 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                >
                    Reset Application Data
                </button>
            </div>
        </div>
        
        <div className="text-center text-xs text-slate-400 mt-10">
            NurseFlow v1.0.4 (Offline Capable)
        </div>
    </div>
  );

  // --- RENDER ---

  const NavItem = ({ targetView, icon: Icon, label }: { targetView: ViewState, icon: any, label: string }) => {
     const isActive = view === targetView || (targetView === 'PATIENTS' && view === 'PATIENT_DETAIL');
     return (
        <button 
            onClick={() => setView(targetView)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${isActive ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
        >
            <Icon className={`w-6 h-6 ${isActive ? 'text-teal-600' : ''}`} />
            <span className="text-sm">{label}</span>
        </button>
     );
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 flex bg-[#f1f5f9]">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
             <div className="bg-teal-600 text-white p-1.5 rounded-lg">
                <HeartPulse className="w-6 h-6" />
             </div>
             <span className="font-bold text-xl text-slate-800 tracking-tight">NurseFlow</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <NavItem targetView="DASHBOARD" icon={Activity} label="Dashboard" />
              <NavItem targetView="PATIENTS" icon={Users} label="Patients" />
              <NavItem targetView="SETTINGS" icon={Settings} label="Settings" />
          </nav>
          <div className="p-4 border-t border-slate-100">
             <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                    NF
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">Nurse Logged In</p>
                    <p className="text-[10px] text-slate-400">Shift A</p>
                 </div>
             </div>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scroll-smooth">
        <div className="w-full mx-auto min-h-full flex flex-col">
            
            {/* View Router */}
            <div className="flex-1">
                {view === 'DASHBOARD' && renderDashboard()}
                {view === 'PATIENTS' && renderPatientList()}
                {view === 'PATIENT_DETAIL' && renderPatientDetail()}
                {view === 'SETTINGS' && renderSettings()}
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 pb-safe">
                <button 
                    onClick={() => setView('DASHBOARD')}
                    className={`flex flex-col items-center gap-1 ${view === 'DASHBOARD' ? 'text-teal-600' : 'text-slate-400'}`}
                >
                    <Activity className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Upcoming</span>
                </button>
                <button 
                    onClick={() => setView('PATIENTS')}
                    className={`flex flex-col items-center gap-1 ${view === 'PATIENTS' || view === 'PATIENT_DETAIL' ? 'text-teal-600' : 'text-slate-400'}`}
                >
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Patients</span>
                </button>
                <button 
                    onClick={() => setView('SETTINGS')}
                    className={`flex flex-col items-center gap-1 ${view === 'SETTINGS' ? 'text-teal-600' : 'text-slate-400'}`}
                >
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Tools</span>
                </button>
            </nav>
        </div>

        {/* Add/Edit Patient Modal */}
        <Modal 
            isOpen={isAddPatientOpen} 
            onClose={() => {
                setIsAddPatientOpen(false);
                setEditingPatient(null);
            }} 
            title={editingPatient ? "Edit Patient" : "New Patient"}
        >
            <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = fd.get('name') as string;
                const room = fd.get('room') as string;
                
                if (editingPatient) {
                    updatePatient(editingPatient.id, name, room);
                } else {
                    addPatient(name, room);
                }
            }} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input 
                        name="name" 
                        defaultValue={editingPatient?.name}
                        required 
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" 
                        placeholder="e.g. John Doe" 
                        autoFocus 
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Bed / Room (Optional)</label>
                    <input 
                        name="room" 
                        defaultValue={editingPatient?.roomNumber}
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" 
                        placeholder="e.g. 104-A" 
                    />
                </div>
                <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl mt-4">
                    {editingPatient ? "Update Patient" : "Add Patient"}
                </button>
            </form>
        </Modal>

        {/* Add/Edit Medication Modal */}
        <Modal 
            isOpen={isAddMedOpen} 
            onClose={() => {
                setIsAddMedOpen(false);
                setEditingMed(null);
            }} 
            title={editingMed ? "Edit Medication" : "Add Medication"}
        >
             <form 
                key={editingMed ? editingMed.id : 'new-med-form'}
                onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const freq = fd.get('frequency') as FrequencyType;
                const customInt = Number(fd.get('customInterval'));
                const interval = freq === FrequencyType.CUSTOM ? customInt : FREQUENCY_HOURS[freq];
                
                const medData = {
                    name: fd.get('name') as string,
                    dose: fd.get('dose') as string,
                    form: fd.get('form') as string,
                    route: fd.get('route') as string,
                    frequency: freq,
                    intervalHours: interval,
                    notes: fd.get('notes') as string
                };

                if (editingMed) {
                    updateMedication(editingMed.id, medData);
                } else {
                    addMedication({
                        patientId: selectedPatientId!,
                        ...medData
                    });
                }
            }} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Drug Name</label>
                    <input 
                        name="name" 
                        defaultValue={editingMed?.name}
                        required 
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" 
                        placeholder="e.g. Paracetamol" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dose</label>
                        <input 
                            name="dose" 
                            defaultValue={editingMed?.dose}
                            required 
                            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" 
                            placeholder="e.g. 500mg" 
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Form</label>
                        <select 
                            name="form" 
                            defaultValue={editingMed?.form || "Tablet"}
                            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="Tablet">Tablet</option>
                            <option value="Capsule">Capsule</option>
                            <option value="Syrup">Syrup</option>
                            <option value="Suspension">Suspension</option>
                            <option value="Solution">Solution</option>
                            <option value="Injection">Injection</option>
                            <option value="Drops">Drops</option>
                            <option value="Inhaler">Inhaler</option>
                            <option value="Cream">Cream</option>
                            <option value="Ointment">Ointment</option>
                            <option value="Patch">Patch</option>
                            <option value="Suppository">Suppository</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Route</label>
                        <select 
                            name="route" 
                            defaultValue={editingMed?.route}
                            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="PO">PO (Oral)</option>
                            <option value="IV">IV</option>
                            <option value="IM">IM</option>
                            <option value="SC">SC</option>
                            <option value="TOP">Topical</option>
                            <option value="INH">Inhalation</option>
                            <option value="PR">Rectal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Frequency</label>
                        <select 
                            name="frequency" 
                            value={formFrequency}
                            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                            onChange={(e) => setFormFrequency(e.target.value as FrequencyType)}
                        >
                            <option value="STAT">STAT (Immediate Dose)</option>
                            <option value="BD">BD (Every 12h)</option>
                            <option value="TID">TID (Every 8h)</option>
                            <option value="QID">QID (Every 6h)</option>
                            <option value="DAILY">Daily (Every 24h)</option>
                            <option value="PRN">PRN (As Needed)</option>
                            <option value="CUSTOM">Custom Interval</option>
                        </select>
                    </div>
                </div>
                {formFrequency === FrequencyType.CUSTOM && (
                    <div id="custom-interval-wrapper">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Interval (Hours)</label>
                         <input 
                            type="number" 
                            name="customInterval" 
                            defaultValue={editingMed?.intervalHours}
                            min="1" 
                            disabled={formFrequency !== FrequencyType.CUSTOM}
                            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" 
                            placeholder="e.g. 4" 
                        />
                    </div>
                )}
                
                <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Instructions (Optional)</label>
                     <textarea 
                        name="notes" 
                        defaultValue={editingMed?.notes}
                        rows={2}
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none" 
                        placeholder="e.g. Take with food, Check BP before serving..." 
                    />
                </div>

                <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl mt-4">
                    {editingMed ? "Update Medication" : "Save Medication"}
                </button>
            </form>
        </Modal>

        {/* Manual Log / Override Modal */}
        <Modal 
            isOpen={!!loggingMed} 
            onClose={() => setLoggingMed(null)} 
            title="Log Dose"
        >
            <form onSubmit={(e) => {
                e.preventDefault();
                if (!loggingMed) return;
                const fd = new FormData(e.currentTarget);
                const status = fd.get('status') as LogStatus;
                const dateStr = fd.get('timestamp') as string;
                const notes = fd.get('notes') as string;
                
                const timestamp = new Date(dateStr).getTime();
                handleManualLog(loggingMed.id, status, timestamp, notes);
            }} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="cursor-pointer">
                        <input type="radio" name="status" value="SERVED" className="peer hidden" defaultChecked />
                        <div className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-100 peer-checked:border-teal-500 peer-checked:bg-teal-50 transition-all">
                            <Check className="w-8 h-8 text-teal-600 mb-2" />
                            <span className="font-bold text-slate-700">Given</span>
                        </div>
                    </label>
                    <label className="cursor-pointer">
                        <input type="radio" name="status" value="MISSED" className="peer hidden" />
                        <div className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-100 peer-checked:border-red-500 peer-checked:bg-red-50 transition-all">
                            <XCircle className="w-8 h-8 text-red-500 mb-2" />
                            <span className="font-bold text-slate-700">Missed/Held</span>
                        </div>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
                    <input 
                        type="datetime-local"
                        name="timestamp"
                        required
                        defaultValue={toLocalISOString(new Date())}
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" 
                    />
                    <p className="text-xs text-slate-400 mt-1">Adjust this time to override the schedule.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Notes (Optional)</label>
                    <textarea 
                        name="notes"
                        rows={2}
                        className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        placeholder="e.g. Patient refused, BP too low..."
                    ></textarea>
                </div>

                <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-2">
                    Confirm Log
                </button>
            </form>
        </Modal>

        {/* History Modal */}
        <Modal
            isOpen={!!viewHistoryMedId}
            onClose={() => setViewHistoryMedId(null)}
            title="Dose History"
        >
            <div className="space-y-4">
                {(() => {
                    const medLogs = logs
                        .filter(l => l.medicationId === viewHistoryMedId)
                        .sort((a, b) => b.servedAt - a.servedAt);
                    
                    if (medLogs.length === 0) {
                        return (
                            <div className="text-center py-8 text-slate-400">
                                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No doses recorded yet.</p>
                            </div>
                        );
                    }

                    return medLogs.map(log => {
                        const isServed = log.status !== 'MISSED'; // Default to served for old logs without status
                        return (
                            <div key={log.id} className={`flex items-start justify-between p-3 rounded-lg border ${isServed ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full mt-1 ${isServed ? 'bg-teal-100' : 'bg-red-100'}`}>
                                        {isServed ? <Check className="w-4 h-4 text-teal-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{formatDate(log.servedAt)}</p>
                                        <p className={`text-xs font-bold ${isServed ? 'text-slate-500' : 'text-red-500'}`}>
                                            {isServed ? 'Served' : 'Missed/Held'}
                                        </p>
                                        {log.notes && (
                                            <p className="text-xs text-slate-500 italic mt-1">"{log.notes}"</p>
                                        )}
                                    </div>
                                </div>
                                <span className="font-mono text-lg font-bold text-slate-800">
                                    {formatTime(log.servedAt)}
                                </span>
                            </div>
                        );
                    });
                })()}
            </div>
        </Modal>

        {/* Drug Info Modal */}
        <Modal
            isOpen={drugInfoModal.isOpen}
            onClose={() => setDrugInfoModal(prev => ({ ...prev, isOpen: false }))}
            title={drugInfoModal.medName}
        >
            <div className="space-y-4">
                {drugInfoModal.loading ? (
                    <div className="py-8 flex flex-col items-center justify-center text-indigo-600">
                        <BrainCircuit className="w-10 h-10 animate-pulse mb-3" />
                        <p className="font-medium animate-pulse">Consulting AI Knowledge Base...</p>
                    </div>
                ) : (
                    <div>
                        <AiResponseDisplay text={drugInfoModal.content} />
                        <p className="text-[10px] text-slate-400 mt-4 text-center">
                            AI-generated content. Always verify with official clinical guidelines.
                        </p>
                    </div>
                )}
            </div>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
            isOpen={confirmConfig.isOpen}
            onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            title={confirmConfig.title}
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100">
                     <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                     <p className="text-sm font-medium leading-relaxed">{confirmConfig.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                        onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                        className="w-full py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmConfig.onConfirm}
                        className="w-full py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </Modal>

      </main>
    </div>
  );
}