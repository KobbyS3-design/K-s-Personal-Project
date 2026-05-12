import React, { useState, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { 
  Users, 
  Activity, 
  Settings, 
  Plus, 
  Check, 
  AlertTriangle, 
  Clock, 
  ChevronLeft,
  Pill,
  Trash2,
  BrainCircuit,
  Pencil,
  History,
  Download,
  ClipboardList,
  Bell,
  Info,
  CheckSquare,
  StickyNote,
  Archive,
  RefreshCw,
  Ban,
  Zap,
  Key,
  HeartPulse,
  Mic,
  Square,
  Loader2,
  User,
  LogOut,
  BadgeCheck,
  Moon,
  Sun,
  X,
  MoreVertical,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { 
  Patient, 
  Medication, 
  MedicationLog, 
  ViewState, 
  FrequencyType, 
  FREQUENCY_HOURS,
  LogStatus,
  Nurse
} from './types';
import { askDrugInfo, parseMedicationFromAudio } from './services/geminiService';
import { EmptyDashboardGraphic, EmptyMedsGraphic, EmptyPatientsGraphic } from './components/EmptyStates';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  User as FirebaseUser
} from './firebase';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const AVATAR_COLORS = [
  'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
];

// --- STYLING CONSTANTS FOR REUSE ---
// Enhanced border and text contrast for better accessibility in light mode
const INPUT_CLASS = "w-full p-4 bg-white dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 focus:ring-4 focus:ring-teal-500/20 text-slate-900 dark:text-white font-bold outline-none transition-all placeholder:text-slate-400";
const SELECT_CLASS = "w-full p-4 bg-white dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 focus:ring-4 focus:ring-teal-500/20 text-slate-900 dark:text-white font-bold outline-none transition-all cursor-pointer";
const TEXTAREA_CLASS = "w-full p-4 bg-white dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 focus:ring-4 focus:ring-teal-500/20 text-slate-900 dark:text-white font-medium outline-none transition-all placeholder:text-slate-400";
const LABEL_CLASS = "text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-2 block";

// --- COMPONENTS ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const AiResponseDisplay = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-3 border-b border-indigo-200 dark:border-indigo-800 pb-2">
         <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
         <span className="font-bold text-indigo-700 dark:text-indigo-300 text-xs uppercase tracking-wider">Clinical Intelligence</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-indigo-950 dark:prose-p:text-indigo-200 prose-headings:text-indigo-900 dark:prose-headings:text-indigo-100 prose-li:text-indigo-950 dark:prose-li:text-indigo-200 prose-strong:text-indigo-950 dark:prose-strong:text-indigo-100">
        <Markdown>{text}</Markdown>
      </div>
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-24 h-24 bg-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-teal-600/40">
          <HeartPulse className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">NurseFlow</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10">Secure Clinical Management</p>
        
        <button 
          onClick={onLogin}
          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 py-5 rounded-3xl flex items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" referrerPolicy="no-referrer" />
          <span className="font-black text-slate-700 dark:text-slate-200">Sign in with Google</span>
        </button>
        
        <p className="mt-10 text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
          By signing in, you agree to follow clinical protocols and maintain patient confidentiality.
        </p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- CORE STATE ---
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Nurse | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  // --- UI STATE ---
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [formFrequency, setFormFrequency] = useState<FrequencyType>(FrequencyType.STAT); 
  const [loggingMed, setLoggingMed] = useState<Medication | null>(null);
  const [expandedHistoryMedId, setExpandedHistoryMedId] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dashboardSort, setDashboardSort] = useState<'TIME' | 'PATIENT' | 'MEDICATION'>('TIME');
  const [isCreateProfileOpen, setIsCreateProfileOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [selectedMedIds, setSelectedMedIds] = useState<Set<string>>(new Set());
  const [drugInfoModal, setDrugInfoModal] = useState({ isOpen: false, medName: '', loading: false, content: '' });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alertedDoses, setAlertedDoses] = useState<Set<string>>(new Set());
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const doseInputRef = useRef<HTMLInputElement>(null);
  const freqInputRef = useRef<HTMLSelectElement>(null);
  const intervalInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE & FIREBASE ---
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch or create nurse profile
        const nurseDoc = await getDoc(doc(db, 'users', user.uid));
        if (nurseDoc.exists()) {
          setCurrentUser(nurseDoc.data() as Nurse);
        } else {
          // If no profile, we'll show the create profile modal
          setIsCreateProfileOpen(true);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!firebaseUser) {
      setPatients([]);
      setMedications([]);
      setLogs([]);
      return;
    }

    const qPatients = query(collection(db, 'patients'));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
    });

    const qMeds = query(collection(db, 'medications'));
    const unsubMeds = onSnapshot(qMeds, (snapshot) => {
      setMedications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medication)));
    });

    const qLogs = query(collection(db, 'logs'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MedicationLog)));
    });

    return () => {
      unsubPatients();
      unsubMeds();
      unsubLogs();
    };
  }, [firebaseUser]);

  useEffect(() => { setSelectedMedIds(new Set()); }, [selectedPatientId, view]);
  useEffect(() => { if ('Notification' in window) setNotificationPermission(Notification.permission); }, []);

  // Register Service Worker for background notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistration(reg);
      }).catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  // --- NOTIFICATION ENGINE ---
  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    const checkDoses = () => {
      const now = Date.now();
      medications.forEach(med => {
        if (!med.nextDueAt || med.frequency === FrequencyType.PRN || med.isCompleted) return;
        if (med.nextDueAt <= now && (now - med.nextDueAt) < 86400000) {
          const key = `${med.id}_${med.nextDueAt}`;
          if (!alertedDoses.has(key)) {
            const patient = patients.find(p => p.id === med.patientId);
            const title = `Med Due: ${med.name}`;
            const options = { 
              body: `${patient?.name || 'Unknown'} - ${med.dose} ${med.route}`, 
              tag: key,
              renotify: true,
              silent: false,
              requireInteraction: true
            };

            try {
              if (swRegistration) {
                swRegistration.showNotification(title, options);
              } else {
                new Notification(title, options);
              }
            } catch (e) { console.warn("Notifications blocked", e); }
            setAlertedDoses(prev => new Set(prev).add(key));
          }
        }
      });
    };
    const intervalId = setInterval(checkDoses, 30000);
    checkDoses();
    return () => clearInterval(intervalId);
  }, [medications, patients, notificationPermission, alertedDoses, swRegistration]);

  // --- ACTIONS ---
  const handleManualLog = async (medId: string, status: LogStatus, timestamp: number, notes?: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med || !currentUser) return;
    let nextDue: number | null = med.nextDueAt;
    let completed = med.isCompleted;
    if (med.frequency === FrequencyType.STAT) { nextDue = null; completed = true; }
    else if (med.frequency !== FrequencyType.PRN) {
      const interval = (med.intervalHours || FREQUENCY_HOURS[med.frequency] || 0) * 3600000;
      nextDue = status === 'SERVED' ? timestamp + interval : (med.nextDueAt || timestamp) + interval;
    }
    
    await updateDoc(doc(db, 'medications', medId), { 
      lastServedAt: status === 'SERVED' ? timestamp : med.lastServedAt, 
      lastServedByInitials: status === 'SERVED' ? currentUser.initials : med.lastServedByInitials,
      nextDueAt: nextDue, 
      isCompleted: completed 
    });

    await addDoc(collection(db, 'logs'), { 
      medicationId: medId, 
      patientId: med.patientId,
      servedAt: timestamp, 
      status, 
      notes: notes || "", 
      nurseId: currentUser.id, 
      nurseName: currentUser.name, 
      nurseInitials: currentUser.initials, 
      nurseColor: currentUser.color || ""
    });
    setLoggingMed(null);
  };

  const resumeMedication = async (medId: string) => {
    const m = medications.find(med => med.id === medId);
    if (!m) return;
    let nextDue = m.nextDueAt;
    const now = Date.now();
    
    if (m.frequency !== FrequencyType.PRN) {
       if (!nextDue || nextDue < now) {
          nextDue = now;
       }
    }
    
    await updateDoc(doc(db, 'medications', medId), { isCompleted: false, nextDueAt: nextDue });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsProcessingAudio(true);
        const reader = new FileReader();
        reader.readAsDataURL(new Blob(audioChunksRef.current, { type: mime }));
        reader.onloadend = async () => {
          try {
            const res = await parseMedicationFromAudio((reader.result as string).split(',')[1], mime);
            if (res.name && nameInputRef.current) nameInputRef.current.value = res.name;
            if (res.dose && doseInputRef.current) doseInputRef.current.value = res.dose;
            if (res.frequency && freqInputRef.current) { 
              freqInputRef.current.value = res.frequency; 
              setFormFrequency(res.frequency as FrequencyType); 
            }
          } catch (e) { alert("AI parsing failed."); }
          finally {
            setIsProcessingAudio(false);
            setIsRecording(false);
            stream.getTracks().forEach(t => t.stop());
          }
        };
      };
      recorder.start();
      setIsRecording(true);
    } catch { alert("Microphone access denied."); }
  };

  const exportData = () => {
    const csv = [["Date", "Time", "Patient", "Room", "Medication", "Dose", "Route", "Frequency", "Status", "Nurse", "Notes"].join(",")];
    patients.forEach(p => medications.filter(m => m.patientId === p.id).forEach(m => {
      const medLogs = logs.filter(l => l.medicationId === m.id).sort((a, b) => a.servedAt - b.servedAt);
      if (medLogs.length === 0) csv.push([`"-"`,`"-"`,`"${p.name}"`,`"${p.roomNumber || ''}"`,`"${m.name}"`,`"${m.dose}"`,`"${m.route}"`,`"${m.frequency}"`,`"${m.isCompleted ? 'COMPLETED' : 'ACTIVE'}"`,`"-"`,`"${m.notes || ''}"`].join(","));
      else medLogs.forEach(l => {
        const d = new Date(l.servedAt);
        csv.push([`"${d.toLocaleDateString()}"`,`"${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}"`,`"${p.name}"`,`"${p.roomNumber || ''}"`,`"${m.name}"`,`"${m.dose}"`,`"${m.route}"`,`"${m.frequency}"`,`"${l.status}"`,`"${l.nurseName}"`,`"${(m.notes || '') + ' ' + (l.notes || '')}"`].join(","));
      });
    }));
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(new Blob([csv.join("\n")], { type: "text/csv" }));
    a.download = `nurseflow_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // --- DERIVED STATE ---
  const upcomingDoses = useMemo(() => {
    if (!medications || !patients) return [];
    return medications
      .filter(m => m.nextDueAt !== null && !m.isCompleted && m.frequency !== FrequencyType.PRN)
      .map(m => ({ ...m, p: patients.find(p => p.id === m.patientId) }))
      .sort((a, b) => {
        if (dashboardSort === 'TIME') return (a.nextDueAt || 0) - (b.nextDueAt || 0);
        if (dashboardSort === 'PATIENT') return (a.p?.name || '').localeCompare(b.p?.name || '');
        return a.name.localeCompare(b.name);
      });
  }, [medications, patients, dashboardSort]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientActiveMeds = medications.filter(m => m.patientId === selectedPatientId && !m.isCompleted && m.frequency !== FrequencyType.PRN);
  const patientPrnMeds = medications.filter(m => m.patientId === selectedPatientId && !m.isCompleted && m.frequency === FrequencyType.PRN);
  const patientArchivedMeds = medications.filter(m => m.patientId === selectedPatientId && m.isCompleted);

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Clinical Timeline</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
          <button onClick={() => setDashboardSort('TIME')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${dashboardSort === 'TIME' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600' : 'text-slate-500'}`}>By Time</button>
          <button onClick={() => setDashboardSort('PATIENT')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${dashboardSort === 'PATIENT' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600' : 'text-slate-500'}`}>By Patient</button>
        </div>
      </header>

      {upcomingDoses.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20">
          <EmptyDashboardGraphic />
          <p className="text-slate-400 mt-4 font-bold">No doses scheduled. MAR is clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingDoses.map(m => {
            const isOverdue = m.nextDueAt! < Date.now();
            return (
              <div key={m.id} className={`p-5 bg-white dark:bg-slate-800 rounded-3xl border-2 shadow-sm flex justify-between items-center transition-all ${isOverdue ? 'border-rose-200 dark:border-rose-900/30 animate-pulse-subtle' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isOverdue ? 'bg-rose-600 text-white' : 'bg-teal-50 text-teal-700'}`}>{formatTime(m.nextDueAt!)}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase truncate tracking-tight">
                      {m.p?.name} • Rm {m.p?.roomNumber} {m.lastServedByInitials && `• Last: ${m.lastServedByInitials}`}
                    </span>
                  </div>
                  <h3 className="font-black text-lg truncate text-slate-900 dark:text-white tracking-tight">{m.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-500 font-bold">{m.dose} • {m.route}</p>
                </div>
                <button 
                  onClick={() => handleManualLog(m.id, 'SERVED', Date.now())} 
                  className={`ml-4 p-4 rounded-2xl transition-all active:scale-90 ${isOverdue ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' : 'bg-teal-50 text-teal-600 hover:bg-teal-100 shadow-lg shadow-teal-500/10'}`}
                >
                  <Check className="w-6 h-6 stroke-[3px]" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPatientDetail = () => {
    if (!selectedPatient) return null;
    return (
      <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('PATIENTS')} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold hover:text-teal-600 transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <ChevronLeft className="w-5 h-5" /> Patient Roster
          </button>
          <div className="flex gap-2">
            <button onClick={() => { setEditingPatient(selectedPatient); setIsAddPatientOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><Pencil className="w-5 h-5" /></button>
            <button 
              onClick={() => setConfirmConfig({
                isOpen: true,
                title: "Discharge Patient?",
                message: "This will permanently remove the patient and all associated MAR records.",
                onConfirm: async () => {
                  await deleteDoc(doc(db, 'patients', selectedPatientId!));
                  const medsToDelete = medications.filter(m => m.patientId === selectedPatientId);
                  for (const m of medsToDelete) {
                    await deleteDoc(doc(db, 'medications', m.id));
                    const logsToDelete = logs.filter(l => l.medicationId === m.id);
                    for (const l of logsToDelete) {
                      await deleteDoc(doc(db, 'logs', l.id));
                    }
                  }
                  setView('PATIENTS');
                  setConfirmConfig(p => ({...p, isOpen: false}));
                }
              })}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
            ><Trash2 className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedPatient.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-teal-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Room {selectedPatient.roomNumber || 'TBD'}</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">{medications.filter(m => m.patientId === selectedPatientId && !m.isCompleted).length} Active Orders</span>
            </div>
          </div>
          <button 
            onClick={() => { setEditingMed(null); setIsAddMedOpen(true); }} 
            className="bg-teal-600 hover:bg-teal-700 text-white font-black py-4 px-8 rounded-3xl shadow-2xl shadow-teal-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" /> New Medication Order
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Scheduled Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
               <Clock className="w-4 h-4 text-teal-600" />
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Scheduled Medications</h2>
            </div>
            {patientActiveMeds.length === 0 ? <p className="text-slate-500 dark:text-slate-400 font-medium italic p-8 bg-white dark:bg-slate-900/40 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">No scheduled medications active.</p> : (
              <div className="space-y-4">
                {patientActiveMeds.map(m => renderMedCard(m))}
              </div>
            )}
          </div>

          {/* PRN Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
               <AlertTriangle className="w-4 h-4 text-amber-500" />
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">PRN (As Needed) Orders</h2>
            </div>
            {patientPrnMeds.length === 0 ? <p className="text-slate-500 dark:text-slate-400 font-medium italic p-8 bg-white dark:bg-slate-900/40 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">No PRN medications ordered.</p> : (
              <div className="space-y-4">
                {patientPrnMeds.map(m => renderMedCard(m))}
              </div>
            )}
          </div>
        </div>

        {/* Discontinued / History Section */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-2 mb-4">
             <Archive className="w-4 h-4 text-slate-400" />
             <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Discontinued / Order History</h2>
          </div>
          {patientArchivedMeds.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold italic pl-2">No archived medication history for this admission.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientArchivedMeds.map(m => (
                <div key={m.id} className="p-5 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group relative overflow-hidden shadow-sm">
                   <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <h3 className="text-base font-black text-slate-400 dark:text-slate-500 line-through truncate">{m.name}</h3>
                         <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter border border-slate-200 dark:border-slate-700 px-1 rounded">Archived</span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold">{m.dose} • {m.route}</p>
                   </div>
                   <button 
                    onClick={() => resumeMedication(m.id)}
                    className="ml-4 p-3 bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-400 active:scale-90 transition-all flex items-center gap-2"
                   >
                     <RotateCcw className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase">Resume</span>
                   </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedMedIds.size > 0 && (
          <div className="fixed bottom-24 md:bottom-10 left-0 right-0 md:left-72 px-4 z-50 pointer-events-none animate-in slide-in-from-bottom-10">
            <div className="max-w-md mx-auto pointer-events-auto shadow-2xl rounded-3xl overflow-hidden bg-slate-900 text-white flex items-center p-2 border border-white/10">
              <div className="flex-1 px-4 font-black flex items-center gap-3 text-sm">
                <div className="bg-teal-600 w-8 h-8 rounded-xl flex items-center justify-center">{selectedMedIds.size}</div>
                Meds Selected
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSelectedMedIds(new Set())} className="px-4 py-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest">Cancel</button>
                <button 
                  onClick={async () => {
                    const now = Date.now();
                    for (const id of selectedMedIds) {
                      await handleManualLog(id, 'SERVED', now, 'Batch administration');
                    }
                    setSelectedMedIds(new Set());
                  }}
                  className="bg-teal-600 hover:bg-teal-500 px-6 py-3 font-black text-xs uppercase rounded-2xl transition-all"
                >
                  Serve All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMedCard = (m: Medication) => {
    const isSelected = selectedMedIds.has(m.id);
    const isHistoryExpanded = expandedHistoryMedId === m.id;
    const medLogs = logs.filter(l => l.medicationId === m.id).sort((a,b) => b.servedAt - a.servedAt);
    const isOverdue = m.nextDueAt && m.nextDueAt < Date.now();

    return (
      <div key={m.id} className={`bg-white dark:bg-slate-800 rounded-3xl border-2 transition-all overflow-hidden shadow-sm hover:shadow-md ${isSelected ? 'border-teal-500 ring-8 ring-teal-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-stretch">
          <div 
            onClick={() => {
              const newSet = new Set(selectedMedIds);
              if (newSet.has(m.id)) newSet.delete(m.id);
              else newSet.add(m.id);
              setSelectedMedIds(newSet);
            }}
            className={`w-14 border-r dark:border-slate-700 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-teal-600 border-teal-600 scale-110 shadow-lg shadow-teal-500/20' : 'border-slate-200 dark:border-slate-600'}`}>
              {isSelected && <Check className="w-4 h-4 text-white stroke-[4px]" />}
            </div>
          </div>
          
          <div className="flex-1 p-5">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{m.name}</h3>
                  <button 
                    onClick={async () => {
                      setDrugInfoModal({ isOpen: true, medName: m.name, loading: true, content: '' });
                      const res = await askDrugInfo(m.name);
                      setDrugInfoModal({ isOpen: true, medName: m.name, loading: false, content: res });
                    }}
                    className="p-1.5 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-500 font-bold uppercase tracking-tight">{m.dose} • {m.route} • {m.frequency}</p>
                {m.notes && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic flex items-center gap-1"><StickyNote className="w-3 h-3" /> {m.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setExpandedHistoryMedId(isHistoryExpanded ? null : m.id)} className={`p-2.5 rounded-2xl transition-all ${isHistoryExpanded ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><History className="w-5 h-5" /></button>
                <div className="relative group">
                   <button className="p-2.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl"><MoreVertical className="w-5 h-5" /></button>
                   <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all scale-95 group-hover:scale-100 origin-top-right">
                      <button onClick={() => { setEditingMed(m); setIsAddMedOpen(true); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Order</button>
                      <button onClick={async () => await updateDoc(doc(db, 'medications', m.id), {isCompleted: true})} className="w-full text-left px-4 py-2.5 text-xs font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl flex items-center gap-2"><Archive className="w-4 h-4" /> Discontinue</button>
                      <button 
                        onClick={() => setConfirmConfig({
                          isOpen: true,
                          title: "Delete Order?",
                          message: "This will remove the medication order and history.",
                          onConfirm: async () => {
                            await deleteDoc(doc(db, 'medications', m.id));
                            setConfirmConfig(p => ({...p, isOpen: false}));
                          }
                        })}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl flex items-center gap-2"
                      ><Trash2 className="w-4 h-4" /> Delete</button>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="mt-5 flex items-center gap-4">
               <div className={`flex-1 flex justify-between items-center p-3.5 rounded-2xl border-2 ${isOverdue ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-50 dark:border-slate-800'}`}>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Status</p>
                  <p className={`font-black text-xs uppercase ${isOverdue ? 'text-rose-600' : 'text-teal-600'}`}>
                    {m.frequency === 'STAT' ? 'Immediate STAT' : m.frequency === 'PRN' ? 'As Needed' : isOverdue ? 'Dose Overdue' : 'Scheduled'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                    {m.lastServedByInitials ? `By ${m.lastServedByInitials}` : 'Next Due'}
                  </p>
                  <p className={`font-black tracking-tight ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
                    {m.nextDueAt ? formatTime(m.nextDueAt) : (m.frequency === 'PRN' ? 'PRN' : 'N/A')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setLoggingMed(m)} 
                className={`h-full px-6 py-4 font-black text-xs uppercase rounded-2xl shadow-lg transition-all active:scale-95 ${isOverdue ? 'bg-rose-600 text-white shadow-rose-600/20' : 'bg-teal-600 text-white shadow-teal-600/20'}`}
              >
                Log Dose
              </button>
            </div>
          </div>
        </div>

        {isHistoryExpanded && (
          <div className="border-t dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em]">Administration History</h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">{medLogs.length} Records</span>
            </div>
            {medLogs.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400 font-bold italic py-4">No administrations logged yet.</p> : (
              <div className="space-y-6 relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-8 pb-2">
                {medLogs.map(l => (
                  <div key={l.id} className="relative group">
                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-xl border-4 border-white dark:border-slate-900 shadow-md transition-transform group-hover:scale-110 ${l.status === 'SERVED' ? 'bg-teal-500' : 'bg-rose-500'}`} />
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-200">{l.status === 'SERVED' ? 'Successfully Administered' : 'Dose Missed/Refused'}</p>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(l.servedAt)} at {formatTime(l.servedAt)}</p>
                        </div>
                        <div className="flex items-center gap-3 pl-3 border-l-2 border-slate-100 dark:border-slate-700">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-md border-2 border-white dark:border-slate-800 ${l.nurseColor || 'bg-slate-200'}`}>
                            {l.nurseInitials}
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none tracking-tight">{l.nurseName}</p>
                            <p className="text-[8px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] mt-0.5">Administered By</p>
                          </div>
                        </div>
                      </div>
                      {l.notes && (
                        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700">
                          <p className="text-xs text-slate-600 dark:text-slate-500 font-medium italic"><StickyNote className="w-3 h-3 inline mr-1 opacity-50" /> {l.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="p-4 md:p-8 space-y-10 max-w-2xl animate-in fade-in duration-300 pb-32">
      <header>
         <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Nurse Control</h1>
         <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Tools & Configuration</p>
      </header>
      
      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col sm:flex-row items-center gap-8 shadow-xl">
        <div className={`w-28 h-28 rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl transition-transform hover:scale-105 ${currentUser?.color || 'bg-slate-200'}`}>
          {currentUser?.initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentUser?.name}</h2>
          <p className="text-teal-600 dark:text-teal-400 font-black uppercase text-xs tracking-[0.3em] mt-1">{currentUser?.designation}</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-6">
            <button onClick={() => signOut(auth)} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all hover:bg-rose-100"><LogOut className="w-4 h-4" /> Sign Out</button>
            <button onClick={() => { setIsDarkMode(!isDarkMode); }} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all hover:bg-slate-200">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} Mode</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-600/30 relative overflow-hidden group">
          <BrainCircuit className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6"><div className="bg-white/20 p-2 rounded-xl"><Zap className="w-5 h-5 text-white" /></div><h3 className="font-black text-xl tracking-tight">Clinical Intelligence</h3></div>
            <p className="text-indigo-100 text-sm font-medium mb-6 leading-relaxed">Query dosage guidelines, drug-drug interactions, or side effects.</p>
            <div className="flex flex-col gap-3">
              <input 
                value={aiQuery} 
                onChange={e => setAiQuery(e.target.value)} 
                placeholder="Query clinical info..." 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-sm outline-none placeholder:text-white/40 focus:ring-4 focus:ring-white/10 transition-all text-white font-bold" 
              />
              <button 
                onClick={async () => {
                  setIsAiLoading(true);
                  const res = await askDrugInfo(aiQuery);
                  setAiResponse(res);
                  setIsAiLoading(false);
                }}
                disabled={isAiLoading || !aiQuery.trim()}
                className="w-full bg-white text-indigo-700 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Search Clinical Intel'}
              </button>
            </div>
            {aiResponse && <AiResponseDisplay text={aiResponse} />}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4"><div className="bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl text-teal-600"><Download className="w-5 h-5" /></div><h3 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Audit Logs</h3></div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">Download a comprehensive clinical record of all medication events in CSV format.</p>
            </div>
            <button onClick={exportData} className="mt-8 w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">Export MAR Records (.CSV)</button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3 mb-4"><div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600"><Bell className="w-5 h-5" /></div><h3 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Notifications</h3></div>
             <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">System alerts are currently <strong>{notificationPermission}</strong>.</p>
             <div className="flex gap-4 mt-4">
               {notificationPermission !== 'granted' && (
                 <button onClick={() => { Notification.requestPermission().then(setNotificationPermission); }} className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">Request Permission</button>
               )}
               {notificationPermission === 'granted' && (
                 <button 
                  onClick={() => {
                    const title = "NurseFlow Test Alert";
                    const options = { body: "Background notifications are active and ready.", tag: 'test' };
                    if (swRegistration) swRegistration.showNotification(title, options);
                    else new Notification(title, options);
                  }} 
                  className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline"
                 >
                   Send Test Alert
                 </button>
               )}
             </div>
             <p className="text-[9px] text-slate-400 mt-4 leading-tight">Note: For background alerts to function, keep the NurseFlow tab open in your mobile browser. Some systems may require "Background App Refresh" enabled.</p>
          </div>
        </div>
      </section>
    </div>
  );

  // --- MAIN APP RENDER ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <Login onLogin={() => signInWithPopup(auth, googleProvider)} />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 p-10 w-full max-w-lg text-center">
          <div className="bg-teal-600 p-5 rounded-[2.5rem] shadow-2xl mb-8 border-4 border-white dark:border-slate-800 inline-block mx-auto"><HeartPulse className="w-12 h-12 text-white" /></div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Complete Your Profile</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mb-10">Welcome! Please set up your professional identity to continue.</p>
          
          <form onSubmit={async e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const nurseData: Nurse = {
              id: firebaseUser.uid,
              name: fd.get('name') as string,
              initials: (fd.get('initials') as string).toUpperCase(),
              designation: fd.get('designation') as string,
              color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
              email: firebaseUser.email || '',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), nurseData);
            setCurrentUser(nurseData);
            setIsCreateProfileOpen(false);
          }} className="space-y-6 text-left">
            <div>
               <label className={LABEL_CLASS}>Full Legal Name</label>
               <input name="name" required defaultValue={firebaseUser.displayName || ''} className={INPUT_CLASS} placeholder="e.g. Jonathan Doe" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className={LABEL_CLASS}>Clinical Initials</label>
                 <input name="initials" required maxLength={3} className={INPUT_CLASS} placeholder="JD" />
              </div>
              <div>
                 <label className={LABEL_CLASS}>Nursing Designation</label>
                 <select name="designation" className={SELECT_CLASS}>
                  <option value="RN">RN (Registered Nurse)</option>
                  <option value="LPN">LPN/LVN</option>
                  <option value="NP">Nurse Practitioner</option>
                  <option value="Student">Student Nurse</option>
                 </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-teal-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-teal-600/30 active:scale-95 transition-all">
              Establish Clinical Identity
            </button>
            <button type="button" onClick={() => signOut(auth)} className="w-full text-slate-400 font-black text-xs uppercase tracking-widest mt-4 hover:text-rose-600 transition-colors">Cancel & Sign Out</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc] dark:bg-slate-950 font-sans selection:bg-teal-100">
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-50">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="bg-teal-600 p-2 rounded-2xl shadow-lg shadow-teal-500/20"><HeartPulse className="text-white w-6 h-6" /></div>
          <span className="font-black text-3xl tracking-tighter text-slate-900 dark:text-white">NurseFlow</span>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setView('DASHBOARD')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl w-full transition-all ${view === 'DASHBOARD' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 font-black' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Activity className="w-5 h-5" /> Dashboard</button>
          <button onClick={() => setView('PATIENTS')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl w-full transition-all ${view === 'PATIENTS' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 font-black' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Users className="w-5 h-5" /> Patient Roster</button>
          <button onClick={() => setView('SETTINGS')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl w-full transition-all ${view === 'SETTINGS' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 font-black' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Settings className="w-5 h-5" /> Tools & Help</button>
        </nav>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-sm ${currentUser.color}`}>{currentUser.initials}</div>
            <div className="min-w-0"><p className="font-black text-sm truncate text-slate-900 dark:text-white tracking-tight">{currentUser.name}</p><p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{currentUser.designation}</p></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-32 md:pb-10">
        {view === 'DASHBOARD' && renderDashboard()}
        
        {view === 'PATIENTS' && (
          <div className="p-4 md:p-8 space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
               <div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Patient Admissions</h1>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Current Active Roster</p>
               </div>
               <button onClick={() => { setEditingPatient(null); setIsAddPatientOpen(true); }} className="bg-teal-600 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 shadow-2xl shadow-teal-600/30 active:scale-95 transition-all"><Plus /> Admit Patient</button>
            </div>
            
            {patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20">
                <EmptyPatientsGraphic />
                <p className="text-slate-500 dark:text-slate-400 mt-6 font-bold text-lg">No current admissions.</p>
                <button onClick={() => setIsAddPatientOpen(true)} className="text-teal-600 font-black uppercase tracking-widest text-xs mt-2 hover:underline">Admit your first patient</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map(p => {
                  const activeMedsCount = medications.filter(m => m.patientId === p.id && !m.isCompleted).length;
                  const overdueCount = medications.filter(m => m.patientId === p.id && !m.isCompleted && m.nextDueAt && m.nextDueAt < Date.now()).length;
                  return (
                    <div key={p.id} onClick={() => { setSelectedPatientId(p.id); setView('PATIENT_DETAIL'); }} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">{p.name.charAt(0)}</div>
                        <div className="min-w-0">
                           <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight truncate">{p.name}</h3>
                           <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Room {p.roomNumber || 'TBD'}</p>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex gap-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activeMedsCount} Meds</span>
                           {overdueCount > 0 && <span className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md animate-pulse">{overdueCount} Overdue</span>}
                        </div>
                        <ChevronDown className="w-5 h-5 text-teal-600 -rotate-90" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'PATIENT_DETAIL' && renderPatientDetail()}
        {view === 'SETTINGS' && renderSettings()}

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-8 left-8 right-8 bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-around py-5 px-8 z-[100] border border-white/10">
          <button onClick={() => setView('DASHBOARD')} className={`transition-all duration-300 ${view === 'DASHBOARD' ? 'text-teal-400 scale-125' : 'text-slate-500 hover:text-slate-300'}`}><Activity className="w-6 h-6 stroke-[2.5px]" /></button>
          <button onClick={() => setView('PATIENTS')} className={`transition-all duration-300 ${view === 'PATIENTS' ? 'text-teal-400 scale-125' : 'text-slate-500 hover:text-slate-300'}`}><Users className="w-6 h-6 stroke-[2.5px]" /></button>
          <button onClick={() => setView('SETTINGS')} className={`transition-all duration-300 ${view === 'SETTINGS' ? 'text-teal-400 scale-125' : 'text-slate-500 hover:text-slate-300'}`}><Settings className="w-6 h-6 stroke-[2.5px]" /></button>
        </nav>

        {/* Admission Modal */}
        <Modal isOpen={isAddPatientOpen} onClose={() => { setIsAddPatientOpen(false); setEditingPatient(null); }} title={editingPatient ? "Edit Admission" : "New Admission"}>
          <form onSubmit={async e => {
            e.preventDefault();
            if (!firebaseUser) return;
            const fd = new FormData(e.currentTarget);
            const name = fd.get('name') as string;
            const room = fd.get('room') as string;
            if (editingPatient) {
              await updateDoc(doc(db, 'patients', editingPatient.id), { name, roomNumber: room });
            } else {
              await addDoc(collection(db, 'patients'), { name, roomNumber: room, createdBy: firebaseUser.uid });
            }
            setIsAddPatientOpen(false);
            setEditingPatient(null);
          }} className="space-y-6">
            <div>
               <label className={LABEL_CLASS}>Patient Full Name</label>
               <input name="name" required defaultValue={editingPatient?.name} className={INPUT_CLASS} placeholder="e.g. Jonathan Doe" />
            </div>
            <div>
               <label className={LABEL_CLASS}>Room / Bed Assignment</label>
               <input name="room" defaultValue={editingPatient?.roomNumber} className={INPUT_CLASS} placeholder="Room #" />
            </div>
            <button type="submit" className="w-full bg-teal-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-teal-600/30 active:scale-95 transition-all">
              {editingPatient ? "Save Changes" : "Confirm Admission"}
            </button>
          </form>
        </Modal>

        {/* Med Order Modal */}
        <Modal isOpen={isAddMedOpen} onClose={() => { setIsAddMedOpen(false); setEditingMed(null); }} title={editingMed ? "Update Order" : "Medication Order"}>
          {!editingMed && (
            <button onClick={isRecording ? () => mediaRecorderRef.current?.stop() : startRecording} className={`w-full py-8 mb-8 rounded-[2rem] flex flex-col items-center gap-3 transition-all border-4 border-dashed relative group overflow-hidden ${isRecording ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
              <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isProcessingAudio ? <Loader2 className="animate-spin w-10 h-10" /> : isRecording ? <Square className="w-10 h-10 fill-current" /> : <Mic className="w-10 h-10" />}
              <span className="text-xs font-black uppercase tracking-widest relative z-10">{isProcessingAudio ? 'AI Charting...' : isRecording ? 'Listening...' : 'Voice Dictate Order'}</span>
            </button>
          )}
          <form onSubmit={async e => {
            e.preventDefault();
            if (!firebaseUser) return;
            const fd = new FormData(e.currentTarget);
            const freq = fd.get('frequency') as FrequencyType;
            const interval = parseInt(fd.get('interval') as string) || FREQUENCY_HOURS[freq] || 0;
            const form = fd.get('form') as string;
            const baseNotes = fd.get('notes') as string;
            const notes = `Form: ${form}${baseNotes ? '\n' + baseNotes : ''}`;
            
            const medData = { 
              patientId: selectedPatientId!, 
              name: fd.get('name') as string, 
              dose: fd.get('dose') as string, 
              route: fd.get('route') as string, 
              frequency: freq, 
              intervalHours: interval, 
              notes: notes,
            };
            
            if (editingMed) {
              await updateDoc(doc(db, 'medications', editingMed.id), { 
                ...medData, 
                nextDueAt: (editingMed.frequency !== freq && freq === 'STAT') ? Date.now() : editingMed.nextDueAt 
              });
            } else {
              await addDoc(collection(db, 'medications'), { 
                ...medData, 
                lastServedAt: null, 
                nextDueAt: freq === FrequencyType.STAT ? Date.now() : null, 
                isCompleted: false,
                createdBy: firebaseUser.uid
              });
            }
            setIsAddMedOpen(false);
            setEditingMed(null);
          }} className="space-y-4">
            <div>
               <label className={LABEL_CLASS}>Medication Name</label>
               <input name="name" ref={nameInputRef} defaultValue={editingMed?.name} required className={INPUT_CLASS} placeholder="e.g. Ciprofloxacin" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className={LABEL_CLASS}>Dose & Form</label>
                 <div className="flex gap-2">
                   <input name="dose" ref={doseInputRef} defaultValue={editingMed?.dose} required className={`${INPUT_CLASS} flex-1`} placeholder="500mg" />
                   <select name="form" defaultValue={editingMed?.notes?.includes('Form: ') ? editingMed.notes.split('Form: ')[1].split('\n')[0] : "Tablet"} className={`${SELECT_CLASS} w-32`}>
                     <option value="Tablet">Tab</option>
                     <option value="Capsule">Cap</option>
                     <option value="Suspension">Susp</option>
                     <option value="Syrup">Syr</option>
                     <option value="Injection">Inj</option>
                     <option value="Cream">Cream</option>
                     <option value="Drops">Drops</option>
                     <option value="Inhaler">Inhaler</option>
                   </select>
                 </div>
              </div>
              <div>
                 <label className={LABEL_CLASS}>Route</label>
                 <select name="route" defaultValue={editingMed?.route || "PO"} className={SELECT_CLASS}>
                  <option value="PO">PO (Oral)</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IM">IM</option>
                  <option value="SC">Subcut</option>
                  <option value="PR">Rectal</option>
                  <option value="TOP">Topical</option>
                  <option value="INH">Inhalation</option>
                 </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className={LABEL_CLASS}>Frequency</label>
                 <select name="frequency" ref={freqInputRef} defaultValue={editingMed?.frequency || "STAT"} onChange={e => setFormFrequency(e.target.value as FrequencyType)} className={SELECT_CLASS}>
                  <option value="STAT">STAT (Now)</option>
                  <option value="DAILY">Daily (QD)</option>
                  <option value="BD">BID (12h)</option>
                  <option value="TID">TID (8h)</option>
                  <option value="PRN">PRN (Needed)</option>
                  <option value="CUSTOM">Custom</option>
                 </select>
              </div>
              <div>
                 <label className={LABEL_CLASS}>Interval (Hours)</label>
                 <input 
                    name="interval" 
                    ref={intervalInputRef} 
                    type="number" 
                    disabled={formFrequency !== 'CUSTOM' && formFrequency !== 'PRN'} 
                    defaultValue={editingMed?.intervalHours || (FREQUENCY_HOURS[formFrequency] || 0)} 
                    className={INPUT_CLASS + " disabled:opacity-50"} 
                    placeholder="e.g. 4" 
                 />
              </div>
            </div>
            <div>
               <label className={LABEL_CLASS}>Clinical Notes / Instructions</label>
               <textarea name="notes" defaultValue={editingMed?.notes} className={TEXTAREA_CLASS} placeholder="Check BP before dose, take with food..." />
            </div>
            <button type="submit" className="w-full bg-teal-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-teal-600/30 mt-4 active:scale-95 transition-all">
              {editingMed ? "Update Record" : "Add to Electronic MAR"}
            </button>
          </form>
        </Modal>

        {/* Administration Log Modal */}
        <Modal isOpen={!!loggingMed} onClose={() => setLoggingMed(null)} title="Log Clinical Event">
          <form onSubmit={e => { 
            e.preventDefault(); 
            const fd = new FormData(e.currentTarget); 
            handleManualLog(loggingMed!.id, fd.get('status') as LogStatus, Date.now(), fd.get('notes') as string); 
          }} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <label className="cursor-pointer group">
                <input type="radio" name="status" value="SERVED" defaultChecked className="hidden peer" />
                <div className="p-8 border-4 rounded-[2.5rem] transition-all peer-checked:border-teal-500 peer-checked:bg-teal-50 dark:peer-checked:bg-teal-900/20 text-center font-black text-slate-900 dark:text-white text-lg shadow-sm peer-checked:shadow-xl">GIVEN</div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="status" value="MISSED" className="hidden peer" />
                <div className="p-8 border-4 rounded-[2.5rem] transition-all peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-900/20 text-center font-black text-slate-900 dark:text-white text-lg shadow-sm peer-checked:shadow-xl">MISSED</div>
              </label>
            </div>
            <div>
               <label className={LABEL_CLASS}>Clinical Observations / Comments</label>
               <textarea name="notes" className={TEXTAREA_CLASS} placeholder="Patient tolerated well, vitals stable..." />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl active:scale-95 transition-all">Submit to Registry</button>
          </form>
        </Modal>

        {/* Drug Info Modal */}
        <Modal isOpen={drugInfoModal.isOpen} onClose={() => setDrugInfoModal(p => ({ ...p, isOpen: false }))} title={drugInfoModal.medName}>
          {drugInfoModal.loading ? (
            <div className="p-16 text-center text-indigo-600">
               <div className="relative inline-block">
                  <Loader2 className="animate-spin w-16 h-16 mb-4 opacity-30" />
                  <BrainCircuit className="w-8 h-8 absolute top-4 left-4 text-indigo-600 animate-pulse" />
               </div>
               <p className="font-black tracking-tight mt-4">Consulting Clinical Intelligence...</p>
            </div>
          ) : <AiResponseDisplay text={drugInfoModal.content} />}
        </Modal>

        {/* Generic Confirm Modal */}
        <Modal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(p => ({ ...p, isOpen: false }))} title={confirmConfig.title}>
          <div className="space-y-6">
            <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">{confirmConfig.message}</p>
            <div className="flex gap-4">
               <button onClick={() => setConfirmConfig(p => ({...p, isOpen: false}))} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-2xl">Cancel</button>
               <button onClick={confirmConfig.onConfirm} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-white bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/20">Confirm</button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}