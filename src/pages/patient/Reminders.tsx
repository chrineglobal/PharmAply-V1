import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, Clock, ChevronLeft, ChevronRight, Stethoscope, Pill, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, deleteDoc } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarEvent {
  id: string;
  patientId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'medication' | 'appointment' | 'other';
  completed: boolean;
  notes?: string;
  createdAt?: any;
}

export function PatientReminders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'calendar' | 'add'>('calendar');
  const [isSaving, setIsSaving] = useState(false);
  const [tableError, setTableError] = useState(false);
  
  // Form State
  const [newEvent, setNewEvent] = useState({
     title: '',
     date: format(new Date(), 'yyyy-MM-dd'),
     time: '08:00',
     type: 'medication' as 'medication' | 'appointment' | 'other',
     notes: ''
  });

  useEffect(() => {
    if (!user) return;

    // Load active calendar events for the user
    const qEvents = query(collection(db, 'calendar_events'), where('patientId', '==', user.uid));
    
    const unsub = onSnapshot(qEvents, (snapshot: any) => {
      const loadedEvents = snapshot.docs.map((docRef: any) => ({ id: docRef.id, ...docRef.data() } as CalendarEvent));
      setEvents(loadedEvents);
      setTableError(false);
    }, (error: any) => {
      if (error?.message?.includes('Could not find the table')) {
         setTableError(true);
         // Fallback to local storage
         const localEvents = localStorage.getItem('local_calendar_events');
         if (localEvents) {
            setEvents(JSON.parse(localEvents));
         }
      }
    });

    return () => unsub();
  }, [user]);

  const handleCreateEvent = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newEvent.title || !newEvent.date || !newEvent.time) {
        toast.error(t('please_fill_all_fields', 'Please fill out all required fields'));
        return;
     }
     
     setIsSaving(true);
     try {
        if (tableError) {
           const newLocalEvent = {
              id: Math.random().toString(36).substring(7),
              patientId: user?.uid,
              ...newEvent,
              completed: false,
              createdAt: new Date().toISOString()
           };
           const updatedEvents = [...events, newLocalEvent];
           setEvents(updatedEvents);
           localStorage.setItem('local_calendar_events', JSON.stringify(updatedEvents));
           
           toast.success(t('event_added_success', 'Event added (Local)'));
           setView('calendar');
           setNewEvent({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '08:00', type: 'medication', notes: '' });
           setIsSaving(false);
           return;
        }

        await addDoc(collection(db, 'calendar_events'), {
           patientId: user?.uid,
           ...newEvent,
           completed: false,
           createdAt: serverTimestamp()
        });
        toast.success(t('event_added_success', 'Event added successfully!'));
        setView('calendar');
        setNewEvent({
           title: '',
           date: format(selectedDate, 'yyyy-MM-dd'),
           time: '08:00',
           type: 'medication',
           notes: ''
        });
     } catch (error: any) {
        toast.error(t('event_added_error', 'Failed to create event'));
     } finally {
        setIsSaving(false);
     }
  };

  const toggleEventStatus = async (event: CalendarEvent) => {
      try {
         if (tableError) {
             const updatedEvents = events.map(e => e.id === event.id ? { ...e, completed: !e.completed } : e);
             setEvents(updatedEvents);
             localStorage.setItem('local_calendar_events', JSON.stringify(updatedEvents));
             return;
         }
         const ref = doc(db, 'calendar_events', event.id);
         await updateDoc(ref, { completed: !event.completed });
      } catch (error) {
         toast.error(t('error_updating_event', 'Error updating event'));
      }
  };

  const deleteEvent = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(t('confirm_delete_event', 'Are you sure you want to delete this event?'))) {
         try {
            if (tableError) {
               const updatedEvents = events.filter(e => e.id !== id);
               setEvents(updatedEvents);
               localStorage.setItem('local_calendar_events', JSON.stringify(updatedEvents));
               toast.success(t('event_deleted', 'Event deleted'));
               return;
            }
            await deleteDoc(doc(db, 'calendar_events', id));
            toast.success(t('event_deleted', 'Event deleted'));
         } catch (error) {
            toast.error(t('error_deleting_event', 'Error deleting event'));
         }
      }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const eventsForSelectedDate = events
    .filter(e => e.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (view === 'add') {
     return (
        <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full relative">
          <div className="bg-white dark:bg-[#0A3D3B] px-4 py-3 shadow-sm z-10 flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] sticky top-0 md:px-6">
             <div className="flex items-center gap-2">
               <button onClick={() => setView('calendar')} className="p-2 -ml-2 text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition flex items-center justify-center">
                 <ArrowLeft size={24} />
               </button>
               <h1 className="text-lg font-bold text-[#0A3D3B] dark:text-white">{t('add_calendar_event', 'New Event')}</h1>
             </div>
             <div className="w-10"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
             <form id="event-form" onSubmit={handleCreateEvent} className="space-y-5 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-[#0A3D3B] p-5 rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm">
                   <div className="mb-5">
                     <label className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-2 block uppercase tracking-wider">{t('event_type', 'Event Type')}</label>
                     <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setNewEvent({...newEvent, type: 'medication'})} className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition ${newEvent.type === 'medication' ? 'bg-[#D7F1EA] border-[#0E7673] text-[#0A3D3B] dark:bg-[#0E4A47] dark:border-[#38B794] dark:text-[#D7F1EA] border-2' : 'bg-[#F5FAFA] dark:bg-[#062625] border-[#CFE4E3] text-[#5C807F] dark:border-[#145250] dark:text-[#9FC8C7] border hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]'}`}>
                           <Pill size={18} /> {t('medication', 'Medication')}
                        </button>
                        <button type="button" onClick={() => setNewEvent({...newEvent, type: 'appointment'})} className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition ${newEvent.type === 'appointment' ? 'bg-[#D7F1EA] border-[#0E7673] text-[#0A3D3B] dark:bg-[#0E4A47] dark:border-[#38B794] dark:text-[#D7F1EA] border-2' : 'bg-[#F5FAFA] dark:bg-[#062625] border-[#CFE4E3] text-[#5C807F] dark:border-[#145250] dark:text-[#9FC8C7] border hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]'}`}>
                           <Stethoscope size={18} /> {t('appointment', 'Appointment')}
                        </button>
                     </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1.5 block uppercase tracking-wider">{t('title', 'Title')}</label>
                        <input 
                           required 
                           value={newEvent.title}
                           onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-4 py-3.5 rounded-xl text-sm font-medium outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] transition-colors text-[#0A3D3B] dark:text-white"
                           placeholder={newEvent.type === 'medication' ? t('e_g_panadol', 'e.g., Vitamin C, 1 Tablet') : t('e_g_doctor_visit', 'e.g., Dr. Smith Checkup')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1.5 block uppercase tracking-wider">{t('date', 'Date')}</label>
                          <input 
                             type="date"
                             required 
                             value={newEvent.date}
                             onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                             className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-4 py-3.5 rounded-xl text-sm font-medium outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] transition-colors text-[#0A3D3B] dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1.5 block uppercase tracking-wider">{t('time', 'Time')}</label>
                          <input 
                             type="time"
                             required 
                             value={newEvent.time}
                             onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                             className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-4 py-3.5 rounded-xl text-sm font-medium outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] transition-colors text-[#0A3D3B] dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1.5 block uppercase tracking-wider">{t('notes_optional', 'Notes (Optional)')}</label>
                        <textarea 
                           rows={3}
                           value={newEvent.notes}
                           onChange={e => setNewEvent({...newEvent, notes: e.target.value})}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-4 py-3 rounded-xl text-sm outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] transition-colors text-[#0A3D3B] dark:text-white"
                           placeholder={t('add_any_details', 'Add any extra details...')}
                        />
                      </div>
                   </div>
                </div>
             </form>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#0A3D3B]/90 backdrop-blur-md border-t border-[#CFE4E3] dark:border-[#145250] z-10 md:pb-6">
             <button disabled={isSaving} form="event-form" type="submit" className="w-full max-w-2xl mx-auto block bg-[#0E7673] hover:bg-[#0A5A58] text-white py-4 rounded-full font-bold transition-colors disabled:opacity-50 shadow-md">
                {isSaving ? t('saving', 'Saving...') : t('save_event', 'Save Event')}
             </button>
          </div>
        </div>
     );
  }

  // Calendar View
  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full relative h-[100dvh]">
      {/* Header */}
      <div className="px-4 py-3 shadow-sm flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] bg-white dark:bg-[#0A3D3B] shrink-0 md:px-6">
         <div className="flex items-center gap-2">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
              <ArrowLeft size={24} />
           </button>
           <h1 className="text-[1.25rem] font-bold text-[#0A3D3B] dark:text-white">{t('my_calendar', 'My Calendar')}</h1>
         </div>
         <button onClick={() => { setNewEvent({...newEvent, date: format(selectedDate, 'yyyy-MM-dd')}); setView('add'); }} className="w-10 h-10 rounded-full bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794] flex items-center justify-center hover:bg-[#38B794] hover:text-[#0A3D3B] transition cursor-pointer">
           <Plus size={20} />
         </button>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24 h-full">
         <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
            {tableError && (
               <div className="m-4 md:mx-6 md:mt-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-400 p-4 rounded-xl text-sm">
                  <strong>Database Setup Required:</strong> The <code>calendar_events</code> table is missing in Supabase. You are currently using <strong>local offline storage</strong> on this device.
                  <br className="mb-2"/>
                  To enable cloud sync, execute the following SQL in your Supabase SQL Editor:
                  <pre className="mt-2 p-3 bg-amber-100 dark:bg-amber-500/20 rounded font-mono text-[11px] overflow-x-auto text-amber-900 dark:text-amber-200">
                     {`CREATE TABLE public.calendar_events (
  id TEXT PRIMARY KEY,
  patientId TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  createdAt TIMESTAMPTZ DEFAULT now()
);`}
                  </pre>
               </div>
            )}
            {/* Calendar Navigation & Grid */}
            <div className="bg-white dark:bg-[#0A3D3B] border-b lg:border border-[#CFE4E3] dark:border-[#145250] px-4 py-4 md:px-6 md:rounded-2xl md:mt-6 shrink-0 md:shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[1.1rem] sm:text-lg font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2 capitalize">
                     {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <div className="flex items-center gap-1">
                     <button onClick={prevMonth} className="p-2 rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition text-[#5C807F] dark:text-[#9FC8C7]">
                        <ChevronLeft size={22} />
                     </button>
                     <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm font-bold text-[#0E7673] dark:text-[#38B794] hover:opacity-80 transition">
                        {t('today', 'Today')}
                     </button>
                     <button onClick={nextMonth} className="p-2 rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition text-[#5C807F] dark:text-[#9FC8C7]">
                        <ChevronRight size={22} />
                     </button>
                  </div>
               </div>

               {/* Days of Week */}
               <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                     <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] py-1 uppercase tracking-wider">
                        {day}
                     </div>
                  ))}
               </div>

               {/* Calendar Grid */}
               <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {days.map((day) => {
                     const dateStr = format(day, 'yyyy-MM-dd');
                     const isCurMonth = isSameMonth(day, monthStart);
                     const isSelDate = isSameDay(day, selectedDate);
                     const isTod = isToday(day);
                     const dayEvents = events.filter(e => e.date === dateStr);
                     
                     return (
                        <div 
                           key={day.toString()} 
                           onClick={() => setSelectedDate(day)}
                           className={`aspect-square sm:aspect-auto sm:h-[4.5rem] rounded-xl flex flex-col items-center justify-center sm:justify-start sm:p-2 cursor-pointer transition relative
                              ${!isCurMonth ? 'text-[#9FC8C7] dark:text-[#5C807F]/50' : 'text-[#0A3D3B] dark:text-[#D7F1EA]'}
                              ${isSelDate ? 'bg-[#0E7673] text-white shadow-md' : 'hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]'}
                              ${isTod && !isSelDate ? 'bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794] font-bold border border-[#38B794]/50' : ''}
                           `}
                        >
                           <span className={`text-[13px] sm:text-[15px] ${isSelDate ? 'font-bold' : ''}`}>{format(day, dateFormat)}</span>
                           
                           {/* Event Indicators */}
                           <div className="flex gap-[3px] mt-1 sm:mt-auto">
                              {dayEvents.slice(0, 3).map((e, i) => (
                                 <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelDate ? 'bg-white' : e.type === 'appointment' ? 'bg-[#0E7673] dark:bg-[#9FC8C7]' : 'bg-[#38B794]'}`} />
                              ))}
                              {dayEvents.length > 3 && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelDate ? 'bg-white' : 'bg-[#5C807F]'}`} />}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
            
            {/* Events List */}
            <div className="p-4 sm:p-6 md:px-0 flex-1 flex flex-col">
               <h3 className="font-bold text-[#0A3D3B] dark:text-white text-[1rem] sm:text-lg mb-4 flex items-center justify-between">
                  <span>{isToday(selectedDate) ? t('today', 'Today') : format(selectedDate, 'MMM d, yyyy')}</span>
                  {eventsForSelectedDate.length > 0 && <span className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] bg-[#D7F1EA] dark:bg-[#0E4A47] px-2.5 py-1 rounded-full">{eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? t('item', 'item') : t('items', 'items')}</span>}
               </h3>
               
               {eventsForSelectedDate.length === 0 ? (
                  <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-8 border border-[#CFE4E3] dark:border-[#145250] text-center flex-1 flex flex-col items-center justify-center">
                     <div className="w-16 h-16 bg-[#F5FAFA] dark:bg-[#062625] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#CFE4E3] dark:border-[#145250]">
                        <CalendarIcon size={24} className="text-[#0E7673] dark:text-[#38B794]" />
                     </div>
                     <p className="text-[15px] font-bold text-[#0A3D3B] dark:text-white mb-1">{t('no_events_on_date', 'No events scheduled for this day.')}</p>
                     <p className="text-[13px] text-[#5C807F] dark:text-[#9FC8C7] mb-5 max-w-xs">{t('create_events_to_track', 'Create events to keep track of your appointments and health reminders.')}</p>
                     <button onClick={() => { setNewEvent({...newEvent, date: format(selectedDate, 'yyyy-MM-dd')}); setView('add'); }} className="px-5 py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold rounded-full transition active:scale-95 shadow-sm">
                        {t('add_the_first_event', 'Add an Event')}
                     </button>
                  </div>
               ) : (
                  <div className="space-y-3 pb-8">
                     {eventsForSelectedDate.map(event => (
                        <div key={event.id} className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-4 border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden group">
                           {/* Color Strip Indicator */}
                           <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${event.type === 'appointment' ? 'bg-[#0E7673]' : 'bg-[#38B794]'}`}></div>
                           
                           <div className="flex-1 flex items-start gap-4 pl-1">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${event.type === 'appointment' ? 'bg-[#E7F1F1] text-[#0E7673] border-[#CFE4E3] dark:bg-[#062625] dark:text-[#9FC8C7] dark:border-[#145250]' : 'bg-[#D7F1EA] text-[#0A3D3B] border-[#CFE4E3] dark:bg-[#0E4A47] dark:text-[#38B794] dark:border-[#145250]'}`}>
                                 {event.type === 'appointment' ? <Stethoscope size={24} /> : <Pill size={24} />}
                              </div>
                              
                              <div className="flex-1 min-w-0 pr-2">
                                 <div className="flex items-center justify-between mb-1">
                                    <h4 className={`font-bold text-[15px] truncate pr-2 ${event.completed ? 'text-[#5C807F] line-through' : 'text-[#0A3D3B] dark:text-white'}`}>{event.title}</h4>
                                    <div className="flex items-center gap-1.5 shrink-0 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-2 py-1 rounded-lg text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA]">
                                       <Clock size={12} className={event.completed ? "text-[#5C807F]" : "text-[#0E7673] dark:text-[#38B794]"} />
                                       {event.time}
                                    </div>
                                 </div>
                                 <p className={`text-[13px] font-medium mb-1.5 ${event.completed ? 'text-[#5C807F]/70' : 'text-[#5C807F] dark:text-[#9FC8C7]'}`}>
                                    {event.type === 'appointment' ? t('medical_appointment', 'Medical Appointment') : t('medication', 'Medication')}
                                 </p>
                                 {event.notes && (
                                    <p className="text-[12px] text-[#0A3D3B] dark:text-[#D7F1EA] bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] px-3 py-2 rounded-lg mt-1 block max-w-full truncate">{event.notes}</p>
                                 )}
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-3 self-end sm:self-center pl-14 sm:pl-0 pt-2 sm:pt-0 pb-1 sm:pb-0">
                              <button 
                                 onClick={(e) => deleteEvent(event.id, e)}
                                 className="p-2 text-[#5C807F] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition"
                              >
                                 <Trash2 size={18} />
                              </button>
                              <button 
                                 onClick={() => toggleEventStatus(event)}
                                 className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${event.completed ? 'border-[#38B794] bg-[#38B794] text-[#0A3D3B] shadow-sm' : 'border-[#CFE4E3] dark:border-[#145250] bg-white dark:bg-[#062625] text-transparent hover:border-[#0E7673] hover:text-[#0E7673]'}`}
                              >
                                 <Check size={16} strokeWidth={3} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Floating Action Button */}
      <button onClick={() => { setNewEvent({...newEvent, date: format(selectedDate, 'yyyy-MM-dd')}); setView('add'); }} className="fixed bottom-24 sm:bottom-6 right-6 w-14 h-14 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-40">
         <Plus size={28} />
      </button>
    </div>
  );
}
