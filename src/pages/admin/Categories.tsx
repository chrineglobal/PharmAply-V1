import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, deleteDoc, onSnapshot, addDoc, serverTimestamp, updateDoc } from '../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Search, Plus, Edit2, Trash2, Tags, Image as ImageIcon, Database, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { seedData } from '../../seed_data';
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../../lib/icons";

export function AdminCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredCategories = categories.filter(c => 
    (c.name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length && filteredCategories.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCategories.map(c => c.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ces ${selectedIds.size} catégories ?`)) return;
    
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "categories", id));
        successCount++;
      }
      toast.success(`${successCount} catégories supprimées`);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error("Échec de la suppression de certaines catégories");
      console.error(e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "categories"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSeed = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir injecter les catégories de base ?")) return;
    setSeeding(true);
    try {
      const uniqueCategories = [...new Set(seedData.map((p: any) => p.category))].filter(Boolean);
      
      toast.loading(`Seeding ${uniqueCategories.length} categories...`, { id: 'seed_cat' });
      
      let successCount = 0;
      for (const cat of uniqueCategories) {
        try {
           await addDoc(collection(db, "categories"), {
             name: cat,
             imageUrl: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&q=80",
             createdAt: serverTimestamp(),
             isActive: true,
           });
           successCount++;
        } catch (e) {
           console.warn("Failed to seed category", cat, e);
        }
      }
      
      toast.success(`Succès : ${successCount} catégories ajoutées !`, { id: 'seed_cat' });
    } catch (e) {
      toast.error("Erreur lors de l'insertion des catégories.", { id: 'seed_cat' });
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette catégorie ?")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("Catégorie supprimée avec succès");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `categories/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (category: any) => {
    setEditingId(category.id);
    setNewCatName(category.name || "");
    setNewCatImage(category.imageUrl || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!newCatName.trim()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "categories", editingId), {
          name: newCatName,
          imageUrl: newCatImage,
        });
        toast.success("Catégorie mise à jour");
      } else {
        await addDoc(collection(db, "categories"), {
          name: newCatName,
          imageUrl: newCatImage,
          createdAt: serverTimestamp(),
          isActive: true,
        });
        toast.success("Catégorie créée");
      }
      setShowModal(false);
      setNewCatName("");
      setNewCatImage("");
      setEditingId(null);
    } catch (e) {
      handleFirestoreError(e, editingId ? OperationType.UPDATE : OperationType.CREATE, `categories`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden relative">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-xs z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between">
         <div>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('categories_directory', 'Categories Directory')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('organize_store_structure_and_v', 'Organize store structure and visual navigation')} </p>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
             <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={18} />
                <input 
                  type="text" 
                  placeholder={t('search_categories', 'Search categories...')} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] py-2.5 pl-12 pr-4 rounded-full text-sm text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] focus:border-[#0E7673] dark:focus:border-[#38B794] outline-none transition shadow-xs"
                />
             </div>
             <div className="flex flex-wrap gap-3">
               {selectedIds.size > 0 && (
                 <button 
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-xs hover:bg-red-100 transition flex items-center gap-2 disabled:opacity-50"
                 >
                    {isBulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    {isBulkDeleting ? "Suppression..." : `Delete Selected (${selectedIds.size})`}
                 </button>
               )}
               <button 
                  onClick={handleSeed}
                  disabled={seeding}
                  className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xs hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition flex items-center gap-2 disabled:opacity-50"
               >
                  {seeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} className="text-[#0E7673] dark:text-[#38B794]" />}
                  {seeding ? "Seeding..." : "Seed Global Categories"}
               </button>
               <button 
                  onClick={() => {
                    setEditingId(null);
                    setNewCatName("");
                    setNewCatImage("");
                    setShowModal(true);
                  }}
                  className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xs transition flex items-center gap-2"
               >
                  <Plus size={18} />  {t('add_category', 'Add Category')} </button>
             </div>
          </div>

          <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl shadow-xs border border-[#CFE4E3] dark:border-[#145250] overflow-hidden">
             {loading ? (
                <div className="p-8 text-center text-[#5C807F] dark:text-[#9FC8C7]"> {t('loading_categories', 'Loading categories...')} </div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="text-xs text-[#5C807F] dark:text-[#9FC8C7] bg-[#F5FAFA] dark:bg-[#062625]/70 border-b border-[#CFE4E3] dark:border-[#145250] uppercase">
                         <tr>
                            <th className="py-4 px-6 font-semibold w-12">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded text-[#0E7673] focus:ring-[#0E7673] border-[#CFE4E3] dark:border-[#145250] cursor-pointer"
                                checked={selectedIds.size === filteredCategories.length && filteredCategories.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th className="py-4 px-6 font-semibold"> {t('icon', 'Icon')} </th>
                            <th className="py-4 px-6 font-semibold"> {t('name', 'Name')} </th>
                            <th className="py-4 px-6 font-semibold"> {t('status', 'Status')} </th>
                            <th className="py-4 px-6 font-semibold text-right"> {t('actions', 'Actions')} </th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7F1F1] dark:divide-[#145250]">
                         {filteredCategories.map((c) => (
                           <tr key={c.id} className="hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/60 transition-colors">
                              <td className="py-4 px-6">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded text-[#0E7673] focus:ring-[#0E7673] border-[#CFE4E3] dark:border-[#145250] cursor-pointer"
                                  checked={selectedIds.has(c.id)}
                                  onChange={() => toggleSelection(c.id)}
                                />
                              </td>
                              <td className="py-4 px-6">
                                 <div className="w-10 h-10 rounded-2xl bg-[#D7F1EA] dark:bg-[#0E4A47] flex items-center justify-center shrink-0 text-[#0E7673] dark:text-[#38B794]">
                                    {c.imageUrl ? (
                                      <img src={c.imageUrl} className="w-full h-full object-cover rounded-2xl" alt="" />
                                    ) : (
                                      getCategoryIcon(c.name, 20)
                                    )}
                                 </div>
                              </td>
                              <td className="py-4 px-6">
                                 <span className="font-bold text-[#0A3D3B] dark:text-white">{c.name}</span>
                              </td>
                              <td className="py-4 px-6">
                                 {c.isActive ? (
                                   <span className="px-2.5 py-1 bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] rounded-full text-xs font-bold uppercase"> {t('active', 'Active')} </span>
                                 ) : (
                                   <span className="px-2.5 py-1 bg-[#E7F1F1] dark:bg-[#062625] text-[#5C807F] dark:text-[#9FC8C7] rounded-full text-xs font-bold uppercase"> {t('inactive', 'Inactive')} </span>
                                 )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleEditClick(c)} className="p-2 text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] dark:hover:text-[#38B794] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] rounded-full transition" title={t('edit', 'Edit')}>
                                       <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(c.id)} 
                                      disabled={deletingId === c.id}
                                      className="p-2 text-[#5C807F] dark:text-[#9FC8C7] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition disabled:opacity-50" 
                                      title={t('delete', 'Delete')}
                                    >
                                       {deletingId === c.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                         {filteredCategories.length === 0 && (
                           <tr>
                              <td colSpan={5} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7]"> {t('no_categories_found', 'No categories found.')} </td>
                           </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#062625]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 w-full max-w-md shadow-xl border border-[#CFE4E3] dark:border-[#145250]">
              <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6">{editingId ? "Edit Category" : "Create New Category"}</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-[#0A3D3B] dark:text-white mb-1.5"> {t('category_name', 'Category Name')} </label>
                    <input 
                      type="text" 
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:border-[#0E7673] dark:focus:border-[#38B794] outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-[#0A3D3B] dark:text-white mb-1.5">Image URL (Optional)</label>
                    <input 
                      type="text" 
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      placeholder={t('https_images_unsplash', 'https://images.unsplash...')}
                      className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] focus:border-[#0E7673] dark:focus:border-[#38B794] outline-none"
                    />
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => {
                         setShowModal(false);
                         setEditingId(null);
                         setNewCatName("");
                         setNewCatImage("");
                      }}
                      className="px-5 py-2.5 text-sm font-bold text-[#0A3D3B] dark:text-white bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] rounded-full transition"
                    >
                       {t('cancel', 'Cancel')} </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-[#0E7673] hover:bg-[#0A5A58] rounded-full transition shadow-xs disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving && <Loader2 size={14} className="animate-spin" />}
                      {isSaving ? "Enregistrement..." : (editingId ? "Enregistrer" : "Créer la catégorie")}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
