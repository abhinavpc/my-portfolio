import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Loader2, UploadCloud, Lock, LogOut, Menu, Edit2 } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, updateDoc } from "firebase/firestore";

// --- Configuration ---
const ADMIN_EMAIL = "abhinav.pc@gmail.com"; 

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyAlp8Dz_vfJqV99d1qMEUMaLhpj0PBgDmM",
  authDomain: "my-project-sirisha.firebaseapp.com",
  projectId: "my-project-sirisha",
  storageBucket: "my-project-sirisha.firebasestorage.app",
  messagingSenderId: "1017726043126",
  appId: "1:1017726043126:web:0146247ccfa1db58023dd7",
  measurementId: "G-CXDF2EF5PQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-portfolio-v1';

// --- Default Data ---
const INITIAL_ARTWORKS = [
  { id: 'demo-1', title: 'Earthen Vessel', medium: 'Ceramic Study', url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=1000&auto=format&fit=crop' },
  { id: 'demo-2', title: 'Raw Linen', medium: 'Textile', url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=1000&auto=format&fit=crop' },
  { id: 'demo-3', title: 'Shadow & Form', medium: 'Oil on Canvas', url: 'https://images.unsplash.com/photo-1578320339912-3023b610c4d4?q=80&w=1000&auto=format&fit=crop' },
  { id: 'demo-4', title: 'Botanical I', medium: 'Graphite', url: 'https://images.unsplash.com/photo-1629196914168-3a9644338cfc?q=80&w=1000&auto=format&fit=crop' },
  { id: 'demo-5', title: 'Morning Light', medium: 'Photography', url: 'https://images.unsplash.com/photo-1507643179173-442f8552932c?q=80&w=1000&auto=format&fit=crop' },
  { id: 'demo-6', title: 'Clay Study', medium: 'Sculpture', url: 'https://images.unsplash.com/photo-1516981879613-9f5da904015f?q=80&w=1000&auto=format&fit=crop' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Login Modal State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null); // If not null, we are editing this ID
  const [newTitle, setNewTitle] = useState('');
  const [newMedium, setNewMedium] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('url');
  const [selectedFiles, setSelectedFiles] = useState([]); // For bulk upload

  // --- Auth & Initial Load ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth.currentUser) {
         try {
           if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
             await signInWithCustomToken(auth, __initial_auth_token);
           } else {
             await signInAnonymously(auth);
           }
         } catch (err) {
           console.error("Auth init error", err);
         }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore Sync ---
  useEffect(() => {
    if (!user) return;
    const artworksRef = collection(db, 'artifacts', appId, 'public', 'data', 'artworks');
    const q = query(artworksRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (docs.length === 0 && !snapshot.metadata.hasPendingWrites) {
         setArtworks(INITIAL_ARTWORKS); 
      } else {
         const sorted = docs.sort((a,b) => b.createdAt - a.createdAt);
         setArtworks(sorted);
      }
      setLoading(false);
    }, (error) => {
      console.error("Data fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Actions ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoginOpen(false);
      setEmail(''); setPassword('');
    } catch (err) {
      setAuthError("Incorrect email or password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    await signInAnonymously(auth);
  };

  // --- Add / Edit Logic ---

  const openAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewMedium('');
    setNewUrl('');
    setSelectedFiles([]);
    setUploadMode('url');
    setIsModalOpen(true);
  };

  const openEditModal = (e, art) => {
    e.stopPropagation(); // Stop lightbox from opening
    setEditingId(art.id);
    setNewTitle(art.title);
    setNewMedium(art.medium);
    setNewUrl(art.url); // We keep existing URL
    setIsModalOpen(true);
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 800 * 1024) {
        reject(`File ${file.name} too large (Max 800KB)`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setModalLoading(true);

    try {
      // --- UPDATE EXISTING ---
      if (editingId) {
        setLoadingText('Updating...');
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'artworks', editingId);
        await updateDoc(docRef, {
          title: newTitle,
          medium: newMedium
        });
      } 
      // --- CREATE NEW (BULK or SINGLE) ---
      else {
        // Mode 1: URL
        if (uploadMode === 'url') {
           if (!newUrl) throw new Error("Please enter a URL");
           setLoadingText('Saving...');
           await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'artworks'), {
             title: newTitle || 'Untitled',
             medium: newMedium || 'Mixed Media',
             url: newUrl,
             createdAt: Date.now()
           });
        } 
        // Mode 2: FILE (Bulk Support)
        else {
           if (selectedFiles.length === 0) throw new Error("Please select files");
           
           for (let i = 0; i < selectedFiles.length; i++) {
             const file = selectedFiles[i];
             setLoadingText(`Uploading ${i + 1}/${selectedFiles.length}...`);
             
             try {
               const base64Url = await processFile(file);
               
               // Logic for Title: If multiple files, use filename or auto-increment title
               let finalTitle = newTitle;
               if (selectedFiles.length > 1) {
                  // If user typed "Study", result is "Study 1", "Study 2"
                  // If user empty, result is filename (minus extension)
                  finalTitle = newTitle ? `${newTitle} ${i + 1}` : file.name.split('.')[0];
               } else {
                  finalTitle = newTitle || file.name.split('.')[0];
               }

               await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'artworks'), {
                 title: finalTitle,
                 medium: newMedium || 'Mixed Media',
                 url: base64Url,
                 createdAt: Date.now()
               });
             } catch (err) {
               console.error(`Error uploading ${file.name}`, err);
               // Continue to next file even if one fails
             }
           }
        }
      }

      setIsModalOpen(false);
      setNewTitle(''); setNewMedium(''); setNewUrl(''); setSelectedFiles([]);
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save. " + err.message);
    } finally {
      setModalLoading(false);
      setLoadingText('');
    }
  };

  const handleDelete = async (e, itemId) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (String(itemId).startsWith('demo-')) {
       alert("Cannot delete demo items.");
       return;
    }
    if (confirm("Remove this piece?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'artworks', itemId)); } 
      catch (err) { console.error("Error deleting:", err); }
    }
  };

  const openLightbox = (art) => {
    setCurrentImage(art); setLightboxOpen(true); document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setTimeout(() => setCurrentImage(null), 300);
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="min-h-screen bg-[#F2EAE6] text-[#2d2d2d] font-sans selection:bg-[#D6C7C0] selection:text-[#2d2d2d]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Italiana&family=Montserrat:wght@300;400;500&display=swap');
        .font-serif-display { font-family: 'Italiana', serif; }
        .font-sans-body { font-family: 'Montserrat', sans-serif; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DBCBC6; border-radius: 2px; }
        .fade-up { animation: fadeUp 1s ease-out forwards; opacity: 0; transform: translateY(15px); }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* --- Navigation --- */}
      <nav className="fixed top-0 w-full z-40 bg-[#F2EAE6]/80 backdrop-blur-sm transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-24 flex justify-between items-center">
          <a href="#" className="font-serif-display text-2xl md:text-3xl tracking-wide text-[#1a1a1a]">
            SIRISHA MANTRALA
          </a>
          <div className="hidden md:flex space-x-12 text-[11px] tracking-[0.2em] uppercase font-sans-body font-medium text-[#555]">
            <a href="#gallery" className="hover:text-black transition-colors relative group">
              Works
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full"></span>
            </a>
            <a href="#about" className="hover:text-black transition-colors relative group">
              Atelier
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full"></span>
            </a>
            <a href="#contact" className="hover:text-black transition-colors relative group">
              Contact
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full"></span>
            </a>
            {isAdmin && <span className="text-[#888]">Admin</span>}
          </div>
          <button className="md:hidden text-[#1a1a1a]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} strokeWidth={1} /> : <Menu size={24} strokeWidth={1} />}
          </button>
        </div>
        {mobileMenuOpen && (
           <div className="md:hidden absolute top-24 left-0 w-full bg-[#F2EAE6] border-b border-[#DBCBC6] py-8 flex flex-col items-center space-y-6 text-sm uppercase tracking-widest font-sans-body animate-fade-in">
             <a href="#gallery" onClick={() => setMobileMenuOpen(false)}>Works</a>
             <a href="#about" onClick={() => setMobileMenuOpen(false)}>Atelier</a>
             <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
           </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <header className="min-h-screen flex flex-col justify-center items-center px-6 relative pt-20">
        <div className="max-w-4xl text-center space-y-8 fade-up">
           <p className="font-sans-body text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#666]">
             Artist & Illustrator
           </p>
           <h1 className="font-serif-display text-5xl md:text-7xl lg:text-8xl text-[#1a1a1a] leading-[1.1]">
             The Art of <br/> Slow Living
           </h1>
           <div className="h-[1px] w-24 bg-[#1a1a1a] mx-auto my-8 opacity-20"></div>
           <p className="font-sans-body text-[#444] text-sm md:text-base leading-loose max-w-lg mx-auto font-light">
             A collection of works exploring texture, silence, and the organic forms found in nature.
           </p>
        </div>
      </header>

      {/* --- Gallery Section --- */}
      <main id="gallery" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24">
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-[#ccc] w-6 h-6" />
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 md:gap-16 space-y-16">
            {artworks.map((art, index) => (
              <div 
                key={art.id}
                className="break-inside-avoid group cursor-pointer relative fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => openLightbox(art)}
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={art.url} 
                    alt={art.title} 
                    className="w-full h-auto object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-[1.2s] ease-out"
                    loading="lazy"
                  />
                  
                  {/* Admin Controls */}
                  {isAdmin && !String(art.id).startsWith('demo-') && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        onClick={(e) => openEditModal(e, art)}
                        className="bg-white/50 hover:bg-white p-2 text-black transition-colors rounded-full"
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, art.id)}
                        className="bg-white/50 hover:bg-white p-2 text-black transition-colors rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-between items-baseline border-b border-[#DBCBC6] pb-2 group-hover:border-[#999] transition-colors duration-500">
                  <h3 className="font-serif-display text-xl text-[#1a1a1a]">
                    {art.title}
                  </h3>
                  <span className="font-sans-body text-[10px] uppercase tracking-widest text-[#888]">
                    {art.medium}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- Atelier / About Section --- */}
      <section id="about" className="py-32 px-6 md:px-12 bg-[#E8DFDB]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-16 md:gap-32 items-center">
           <div className="w-full md:w-1/2">
              <span className="font-sans-body text-[10px] uppercase tracking-[0.3em] text-[#888] block mb-8">The Studio</span>
              <h2 className="font-serif-display text-4xl md:text-5xl text-[#1a1a1a] mb-8 leading-tight">
                Crafting stories <br/> from dust & light.
              </h2>
              <div className="font-sans-body text-sm leading-8 text-[#555] font-light space-y-6">
                 <p>
                   Sirisha Mantrala is an artist whose work is rooted in the observation of quiet moments. 
                   Her atelier is a space of contemplation, where traditional Indian aesthetics meet 
                   contemporary minimalism.
                 </p>
                 <p>
                   Using natural pigments, oils, and earth, she constructs a visual language that speaks 
                   to the permanence of heritage and the fleeting nature of memory.
                 </p>
              </div>
           </div>
           
           <div className="w-full md:w-1/2 aspect-[4/5] bg-[#DBCBC6] relative overflow-hidden">
             <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop" 
                  alt="Atelier Detail" 
                  className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
           </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer id="contact" className="py-24 px-6 md:px-12 border-t border-[#DBCBC6] relative">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div className="space-y-6">
               <a href="#" className="font-serif-display text-2xl tracking-wide text-[#1a1a1a]">
                  SIRISHA MANTRALA
               </a>
               <p className="font-sans-body text-xs text-[#666] leading-relaxed max-w-xs">
                 © 2025 Studio Mantrala.<br/>
                 All rights reserved.
               </p>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-4">
               <a href="mailto:hello@sirishamantrala.art" className="font-serif-display text-2xl md:text-3xl text-[#1a1a1a] hover:opacity-60 transition-opacity">
                 hello@sirishamantrala.art
               </a>
               <div className="flex gap-8 font-sans-body text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]">
                  <a href="#" className="hover:text-[#888] transition-colors">Instagram</a>
                  <a href="#" className="hover:text-[#888] transition-colors">Pinterest</a>
               </div>
            </div>
         </div>
         <div className="absolute bottom-6 right-6 opacity-30 hover:opacity-100 transition-opacity">
            {isAdmin ? (
               <button onClick={handleLogout} title="Sign Out"><LogOut size={14}/></button>
            ) : (
               <button onClick={() => setIsLoginOpen(true)} title="Artist Access"><Lock size={14}/></button>
            )}
         </div>
      </footer>

      {/* --- Lightbox --- */}
      {lightboxOpen && currentImage && (
        <div className="fixed inset-0 z-50 bg-[#F2EAE6]/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-6 right-6 text-[#1a1a1a] hover:opacity-50 transition-opacity z-50">
            <X size={32} strokeWidth={0.5} />
          </button>
          <div className="max-w-6xl max-h-screen flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={currentImage.url} 
              alt={currentImage.title} 
              className="max-h-[85vh] w-auto shadow-sm" 
            />
            <div className="mt-4 text-center">
              <span className="font-serif-display text-2xl text-[#1a1a1a] block">{currentImage.title}</span>
              <span className="font-sans-body text-[10px] uppercase tracking-widest text-[#888]">{currentImage.medium}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Artwork FAB (Admin) --- */}
      {isAdmin && (
        <button 
          onClick={openAddModal}
          className="fixed bottom-8 right-8 z-40 bg-[#1a1a1a] text-[#F2EAE6] w-12 h-12 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <Plus size={20} strokeWidth={1} />
        </button>
      )}

      {/* --- Add/Edit Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2EAE6]/90 backdrop-blur-sm p-6">
          <div className="bg-white p-12 max-w-lg w-full shadow-xl border border-[#DBCBC6] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#1a1a1a]"><X size={20} strokeWidth={1}/></button>
            
            <h2 className="font-serif-display text-3xl mb-8 text-center">{editingId ? 'Edit Work' : 'New Work'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-8 font-sans-body">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest text-[#888]">{selectedFiles.length > 1 ? 'Title Prefix (Optional)' : 'Title'}</label>
                 <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full border-b border-[#ddd] py-2 text-lg outline-none focus:border-black transition-colors" 
                        placeholder={selectedFiles.length > 1 ? "e.g. Study" : ""} 
                        required={!selectedFiles.length}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest text-[#888]">Medium</label>
                 <input type="text" value={newMedium} onChange={(e) => setNewMedium(e.target.value)}
                        className="w-full border-b border-[#ddd] py-2 text-lg outline-none focus:border-black transition-colors" />
              </div>
              
              {!editingId && (
                <>
                  <div className="flex gap-4 text-[10px] uppercase tracking-widest">
                     <button type="button" onClick={() => setUploadMode('url')} className={`pb-1 border-b ${uploadMode === 'url' ? 'border-black text-black' : 'border-transparent text-[#999]'}`}>Link</button>
                     <button type="button" onClick={() => setUploadMode('file')} className={`pb-1 border-b ${uploadMode === 'file' ? 'border-black text-black' : 'border-transparent text-[#999]'}`}>Upload</button>
                  </div>

                  {uploadMode === 'url' ? (
                     <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..."
                            className="w-full border-b border-[#ddd] py-2 text-base outline-none focus:border-black" required />
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border border-[#ddd] border-dashed cursor-pointer hover:bg-[#fafafa]">
                        <UploadCloud className="text-[#ccc] mb-2" size={20}/>
                        <span className="text-[10px] uppercase tracking-widest text-[#999]">
                          {selectedFiles.length > 0 ? `${selectedFiles.length} Files Selected` : 'Select Files (Bulk Supported)'}
                        </span>
                        {/* INPUT CHANGED TO ACCEPT MULTIPLE FILES */}
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                    </label>
                  )}
                </>
              )}
              
              <button type="submit" disabled={modalLoading} className="w-full bg-[#1a1a1a] text-white py-4 text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity">
                {modalLoading ? (loadingText || 'Processing...') : (editingId ? 'Update Details' : 'Add to Collection')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Login Modal --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2EAE6]/95 backdrop-blur-md p-6">
          <div className="bg-white p-10 max-w-sm w-full shadow-xl border border-[#DBCBC6] relative">
             <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4"><X size={18} strokeWidth={1}/></button>
             <h2 className="font-serif-display text-2xl text-center mb-6">Atelier Login</h2>
             <form onSubmit={handleLogin} className="space-y-5 font-sans-body">
               <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                      className="w-full border border-[#eee] p-3 text-sm outline-none focus:border-black transition-colors" required />
               <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                      className="w-full border border-[#eee] p-3 text-sm outline-none focus:border-black transition-colors" required />
               {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
               <button type="submit" className="w-full bg-[#1a1a1a] text-white py-3 text-[10px] uppercase tracking-[0.2em]">
                 Enter
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}