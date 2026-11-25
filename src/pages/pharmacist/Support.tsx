import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Plus, CheckCircle, Clock, AlertCircle, MessageSquare, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy, updateDoc, doc } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { useTranslation } from "react-i18next";
import { parseDate } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

export function PharmacistSupport() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  
  const [queries, setQueries] = useState<any[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Fetch pharmacist's pharmacy info for name context
  useEffect(() => {
    if (!user) return;
    const fetchPharm = async () => {
      const q = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPharmacies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    };
    fetchPharm();
  }, [user]);

  // Sync Support Queries (tickets) for this pharmacist
  useEffect(() => {
    if (!user) return;
    
    // Support queries where userId matches pharmacist's uid
    const q = query(
      collection(db, "support_queries"),
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedQueries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory decreasing of createdAt date
      fetchedQueries.sort((a, b) => {
        const timeA = parseDate(a.createdAt)?.getTime() || 0;
        const timeB = parseDate(b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      });
      setQueries(fetchedQueries);
      setLoadingQueries(false);
    }, (error) => {
      console.error("Support queries sync failed: ", error);
      setLoadingQueries(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Chat Messages of current active ticket/query
  useEffect(() => {
    if (!selectedQueryId) {
      setMessages([]);
      return;
    }

    const mQuery = query(
      collection(db, "messages"),
      where("relatedId", "==", selectedQueryId)
    );

    const unsub = onSnapshot(mQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedMessages.sort((a, b) => {
        const timeA = parseDate(a.createdAt)?.getTime() || 0;
        const timeB = parseDate(b.createdAt)?.getTime() || 0;
        return timeA - timeB;
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("Chat messages sync failed: ", error);
    });

    return () => unsub();
  }, [selectedQueryId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeTicket = queries.find(q => q.id === selectedQueryId);

  // Open a new support ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || !user) return;
    setSubmitting(true);

    try {
      const pharmName = pharmacies[0]?.name || userData?.name || user.displayName || "Pharmacy Manager";
      
      const newQueryDoc = {
        userId: user.uid,
        userName: pharmName,
        userRole: 'pharmacist',
        subject: newSubject.trim(),
        message: newMessage.trim(),
        status: 'open',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'support_queries'), newQueryDoc);
      
      // Auto-insert first chat message with pharmacist's question
      await addDoc(collection(db, 'messages'), {
        relatedId: docRef.id,
        senderId: user.uid,
        receiverId: 'admin',
        senderType: 'pharmacist',
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });

      // Notify the Administrator via general notification logs table
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        type: 'support_query',
        title: 'New Pharmacy Support Ticket',
        message: `${pharmName} submitted support ticket: "${newSubject.trim()}"`,
        isRead: false,
        relatedId: docRef.id,
        createdAt: serverTimestamp()
      });

      toast.success(t('support_ticket_created', 'Support ticket opened successfully!'));
      setNewSubject("");
      setNewMessage("");
      setShowNewTicketModal(false);
      setSelectedQueryId(docRef.id);
    } catch (error) {
      console.error("Error creating support ticket: ", error);
      toast.error(t('failed_to_create_ticket', 'Failed to open support ticket.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Send a new live chat message inside ticket
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedQueryId || !user) return;
    const textToSend = chatInput.trim();
    setChatInput("");

    try {
      await addDoc(collection(db, 'messages'), {
        relatedId: selectedQueryId,
        senderId: user.uid,
        receiverId: 'admin',
        senderType: 'pharmacist',
        text: textToSend,
        createdAt: serverTimestamp()
      });

      // Optional: Bump the query updatedAt timestamp
      await updateDoc(doc(db, 'support_queries', selectedQueryId), {
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending support message: ", error);
      toast.error(t('failed_to_send', 'Message failed to send.'));
    }
  };

  return (
    <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="px-6 lg:px-8 pt-8 pb-4 flex items-center justify-between z-10 shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-xs transition-colors hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">
               <ArrowLeft size={20} className="text-[#0A3D3B] dark:text-white" />
            </button>
            <div>
                 <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">
                   {t('support_technique', 'Support & Assistance')}
                </h1>
                <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium mt-1">
                  {t('chat_with_admins', 'Real-time chat with administration')}
                </p>
            </div>
         </div>
         <button 
           onClick={() => setShowNewTicketModal(true)} 
           className="px-5 py-2.5 bg-[#0E7673] text-white rounded-full text-sm font-bold hover:bg-[#0A5A58] transition flex items-center gap-2 shadow-xs"
         >
           <Plus size={16} />
           {t('new_ticket', 'New Ticket')}
         </button>
      </div>

      <div className="flex-1 flex overflow-hidden px-6 lg:px-8 pb-8 gap-4 custom-scrollbar">
         {/* Sidebar with Query List */}
         <div className={`w-full md:w-[320px] flex flex-col bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] shadow-xs rounded-3xl overflow-hidden shrink-0 ${selectedQueryId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-5 border-b border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625]/60">
               <h2 className="font-bold text-[#0A3D3B] dark:text-white text-sm">{t('un_mes_ticket', 'Your Tickets')} ({queries.length})</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-[#E7F1F1] dark:divide-[#145250] custom-scrollbar">
               {loadingQueries ? (
                  <div className="p-8 text-center text-sm text-[#5C807F] dark:text-[#9FC8C7]">
                    <Loader2 size={18} className="animate-spin mx-auto mb-3 text-[#0E7673] dark:text-[#38B794]" />
                    {t('loading_tickets', 'Synching tickets...')}
                  </div>
               ) : queries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] flex flex-col items-center gap-3 mt-4">
                     <div className="w-12 h-12 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] flex items-center justify-center">
                        <HelpCircle size={24} className="text-[#0E7673] dark:text-[#38B794]" />
                     </div>
                     <p className="font-bold text-[#0A3D3B] dark:text-white">{t('no_tickets_yet', 'No tickets opened yet.')}</p>
                     <p className="text-xs leading-relaxed">{t('no_tickets_desc', 'Click "New Ticket" to chat with an admin about any platform issues.')}</p>
                  </div>
               ) : (
                  queries.map((q) => {
                     const isSelected = q.id === selectedQueryId;
                     const isResolved = q.status === 'resolved';
                     return (
                        <div 
                          key={q.id}
                          onClick={() => setSelectedQueryId(q.id)}
                          className={`p-5 transition-colors cursor-pointer text-left flex flex-col gap-2 ${isSelected ? 'bg-[#D7F1EA]/50 dark:bg-[#0E4A47]' : 'hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/50'}`}
                        >
                           <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                 isResolved ? 'bg-[#D7F1EA] text-[#0E7673] border-[#CFE4E3] dark:bg-[#0E4A47] dark:text-[#38B794] dark:border-[#145250]' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              }`}>
                                 {isResolved ? t('resolved', 'Resolved') : t('open', 'Open')}
                              </span>
                              <span className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium">
                                 {parseDate(q.createdAt) ? parseDate(q.createdAt)!.toLocaleDateString() : ''}
                              </span>
                           </div>
                           <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm line-clamp-1">{q.subject}</h3>
                           <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] line-clamp-1">{q.message}</p>
                        </div>
                     );
                  })
               )}
            </div>
         </div>

         {/* Chat Workspace */}
         <div className={`flex-1 flex flex-col border border-[#CFE4E3] dark:border-[#145250] shadow-xs rounded-3xl overflow-hidden bg-white dark:bg-[#0A3D3B] ${!selectedQueryId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
            {selectedQueryId && activeTicket ? (
               <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  {/* Active Ticket Header */}
                  <div className="px-6 py-5 bg-[#F5FAFA] dark:bg-[#062625]/60 border-b border-[#CFE4E3] dark:border-[#145250] flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedQueryId(null)} className="md:hidden w-10 h-10 border border-[#CFE4E3] dark:border-[#145250] bg-white dark:bg-[#0A3D3B] rounded-full flex items-center justify-center text-[#0A3D3B] dark:text-white">
                          <ArrowLeft size={18} />
                        </button>
                        <div>
                           <div className="flex items-center gap-3">
                             <h2 className="font-bold text-base text-[#0A3D3B] dark:text-white max-w-[200px] sm:max-w-md truncate">{activeTicket.subject}</h2>
                             <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                 activeTicket.status === 'resolved' ? 'bg-[#D7F1EA] text-[#0E7673] border-[#CFE4E3] dark:bg-[#0E4A47] dark:text-[#38B794] dark:border-[#145250]' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                             }`}>
                                 {activeTicket.status === 'resolved' ? t('resolved', 'Resolved') : t('open', 'Open')}
                             </span>
                           </div>
                           <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium mt-1">Ticket #{activeTicket.id?.substring(0, 8).toUpperCase()}</p>
                        </div>
                     </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                     {/* Base Query/Ticket message from system/manager */}
                     <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl p-5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white rounded-tl-sm border border-[#CFE4E3] dark:border-[#145250] shadow-xs">
                           <p className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] mb-2 uppercase tracking-wider">{t('ticket_initial_subject', 'Initial Query')}</p>
                           <p className="text-sm font-medium leading-relaxed">{activeTicket.message}</p>
                           <p className="text-xs mt-3 font-semibold text-[#5C807F] dark:text-[#9FC8C7]">
                              {parseDate(activeTicket.createdAt) ? parseDate(activeTicket.createdAt)!.toLocaleString() : ''}
                           </p>
                        </div>
                     </div>

                     {messages.map((msg) => {
                        const isMe = msg.senderId === user?.uid;
                        return (
                           <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-2xl p-4 ${
                                 isMe ? 'bg-[#0E7673] text-white rounded-br-sm shadow-xs' : 'bg-[#F5FAFA] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-white rounded-bl-sm border border-[#CFE4E3] dark:border-[#145250] shadow-xs'
                              }`}>
                                 {!isMe && (
                                   <p className="text-[10px] font-bold text-[#0E7673] dark:text-[#38B794] uppercase tracking-widest mb-1">{t('administrator', 'Admin')}</p>
                                 )}
                                 <p className="text-sm leading-relaxed">{msg.text}</p>
                                 <p className={`text-[10px] mt-2 font-medium ${isMe ? 'text-[#D7F1EA]' : 'text-[#5C807F] dark:text-[#9FC8C7]'}`}>
                                    {parseDate(msg.createdAt) ? parseDate(msg.createdAt)!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('now', 'Now')}
                                 </p>
                              </div>
                           </div>
                        );
                     })}
                     <div ref={messageEndRef} />
                  </div>

                  {/* Message Input Box */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md dark:bg-[#0A3D3B]/95 border-t border-[#CFE4E3] dark:border-[#145250] p-4 px-6 z-20 flex gap-3 items-center">
                     <input 
                       disabled={activeTicket.status === 'resolved'}
                       type="text"
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder={activeTicket.status === 'resolved' ? t('ticket_resolved_chat_warning', 'This ticket is marked as resolved.') : t('type_your_message', 'Type your message...')}
                       className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] rounded-full py-3.5 px-6 text-sm font-medium focus:outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] disabled:opacity-50 transition-colors"
                     />
                     <button 
                       disabled={activeTicket.status === 'resolved' || !chatInput.trim()}
                       onClick={handleSendMessage} 
                       className="w-12 h-12 bg-[#0E7673] text-white rounded-full flex items-center justify-center shadow-xs hover:bg-[#0A5A58] transition shrink-0 disabled:opacity-50"
                     >
                        <Send size={18} className="translate-x-0.5" />
                     </button>
                  </div>
               </div>
            ) : (
               <div className="text-center p-12 text-[#5C807F] dark:text-[#9FC8C7] flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] flex items-center justify-center">
                    <MessageSquare size={32} className="text-[#0E7673] dark:text-[#38B794] stroke-[1.5]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0A3D3B] dark:text-white">{t('select_a_conversations', 'Select a support ticket')}</h3>
                  <p className="text-sm">{t('select_conversations_desc', 'Choose a ticket from the left column to view message thread.')}</p>
               </div>
            )}
         </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-[#062625]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-[#CFE4E3] dark:border-[#145250]"
            >
               <h2 className="text-xl font-bold text-[#0A3D3B] dark:text-white mb-2">{t('nouvelle_demande_support', 'Submit Issue to Admin')}</h2>
               <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] mb-8">{t('support_sub_desc', 'Open a support card. Administrators will assist you in real-time.')}</p>
               
               <form onSubmit={handleCreateTicket} className="space-y-5">
                  <div>
                     <label className="block text-sm font-bold text-[#0A3D3B] dark:text-white mb-2">{t('sujet_probleme', 'Subject / Topic')}</label>
                     <select 
                       value={newSubject}
                       onChange={(e) => setNewSubject(e.target.value)}
                       required
                       className="w-full border border-[#CFE4E3] dark:border-[#145250] p-4 rounded-2xl bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white text-sm font-medium focus:border-[#0E7673] dark:focus:border-[#38B794] outline-none transition"
                     >
                       <option value="">{t('select_issue_type', 'What is the issue about?')}</option>
                       <option value="Problème de Paiement">{t('payment_issue', 'Payment & Payout / Finances')}</option>
                       <option value="Erreur de Stock ou Inventaire">{t('stock_error', 'Stock & Inventory Synchronization')}</option>
                       <option value="Retard de validation KYC">{t('kyc_delay', 'KYC & Approval Request Delay')}</option>
                       <option value="Bug de l'application">{t('app_bug', 'Technical Bug or Offline Warning')}</option>
                       <option value="Autre demande">{t('other_request', 'Other Request')}</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-[#0A3D3B] dark:text-white mb-2">{t('details_explication', 'Detailed Explanation')}</label>
                     <textarea 
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       required
                       placeholder={t('explain_problem_placeholder', 'Please provide error messages, order IDs or other details to help us investigate...')}
                       className="w-full border border-[#CFE4E3] dark:border-[#145250] p-4 rounded-2xl bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] text-sm font-medium focus:border-[#0E7673] dark:focus:border-[#38B794] outline-none h-32 resize-none"
                     ></textarea>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button 
                       type="button"
                       onClick={() => setShowNewTicketModal(false)}
                       disabled={submitting}
                       className="flex-1 py-3.5 bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white rounded-full font-bold transition hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] focus:outline-none"
                     >
                       {t('cancel', 'Cancel')}
                     </button>
                     <button 
                       type="submit"
                       disabled={submitting || !newSubject || !newMessage.trim()}
                       className="flex-1 py-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 focus:outline-none"
                     >
                       {submitting && <Loader2 size={16} className="animate-spin" />}
                       {t('submit', 'Send Ticket')}
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
