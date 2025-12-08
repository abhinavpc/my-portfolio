import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Loader2, UploadCloud, ChevronDown, Lock, LogOut } from 'lucide-react';
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
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";

// --- Configuration ---
// REPLACE THIS WITH YOUR EMAIL so only you can edit!
const ADMIN_EMAIL = "abhinav.pc@gmail.com"; 

// --- Firebase Initialization ---
// We use the environment config if available (Preview), otherwise fall back to your specific keys (Local)
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
  {
    id: 'demo-1',
    title: 'Study of Jasmine',
    medium: 'Oil on Linen',
    url: 'https://images.unsplash.com/photo-1599577789404-58674d5300f8?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'demo-2',
    title: 'The Silent Prayer',
    medium: 'Charcoal Portrait',
    url: 'https://images.unsplash.com/photo-1637612347372-13c544d67310?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'demo-3',
    title: 'Offering at Dusk',
    medium: 'Acrylic',
    url: 'https://images.unsplash.com/photo-1628097032731-0305545d9492?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'demo-4',
    title: 'Still Life with Brass',
    medium: 'Oil on Canvas',
    url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'demo-5',
    title: 'Deity Study',
    medium: 'Watercolor',
    url: 'https://images.unsplash.com/photo-1628081469502-0e3a6c2f37c4?q=80&w=1000&auto=format&fit=crop',
  },
   {
    id: 'demo-6',
    title: 'Morning Light',
    medium: 'Photography',
    url: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=1000&auto=format&fit=crop',
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Login Modal State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMedium, setNewMedium] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('url');

  // --- Auth & Initial Load ---
  useEffect(() => {
    const initAuth = async () => {
      // We wait for onAuthStateChanged to handle the actual user state
      // If no user is logged in at all, we sign in anonymously for READ access
      if (!auth.currentUser) {
         try {
           if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
             await signInWithCustomToken(auth, __initial_auth_token);
           } else {
             // Only sign in anonymously if we aren't trying to be an admin
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
      // Check if the logged-in user matches the admin email
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore Sync (PUBLIC DATA) ---
  useEffect(() => {
    // SECURITY FIX: Wait for user to be authenticated before fetching data
    if (!user) return;

    // Note: We removed 'user.uid' from the path. Now checking 'public/data'.
    // This ensures everyone sees the same artwork!
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
  }, [user]); // SECURITY FIX: Added user to dependency array

  // --- Actions ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsLoginOpen(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    await signInAnonymously(auth); // Go back to being a visitor
  };

  const handleFileRead = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) { 
      alert("Image is too large for this demo. Limit: 800KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => { setNewUrl(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleAddArtwork = async (e) => {
    e.preventDefault();
    if (!isAdmin || !newUrl || !newTitle) return; // Security check
    setUploadLoading(true);
    try {
      // Saving to PUBLIC collection now
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'artworks'), {
        title: newTitle,
        medium: newMedium || 'Mixed Media',
        url: newUrl,
        createdAt: Date.now()
      });
      setNewTitle(''); setNewMedium(''); setNewUrl(''); setIsModalOpen(false);
    } catch (err) {
      console.error("Error adding doc:", err);
      alert("Failed to save. Try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (e, itemId) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    if (String(itemId).startsWith('demo-')) {
       alert("Cannot delete demo items. Add your own to replace them.");
       return;
    }
    if (confirm("Remove this piece from the collection?")) {
      try { 
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'artworks', itemId)); 
      } catch (err) { console.error("Error deleting:", err); }
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
    <div className="min-h-screen bg-[#F5F2EF] text-[#2A2A2A] font-serif selection:bg-[#963F3F] selection:text-white">
      {/* --- Styles --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Inter:wght@300;400&display=swap');
        
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .font-sans-clean { font-family: 'Inter', sans-serif; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F5F2EF; }
        ::-webkit-scrollbar-thumb { background: #D1CEC7; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #A09D96; }
        
        .fade-in { animation: fadeIn 1.2s ease-out forwards; opacity: 0; }
        @keyframes fadeIn { to { opacity: 1; } }
      `}</style>

      {/* --- Navigation --- */}
      <nav className="fixed top-0 w-full bg-[#F5F2EF]/90 backdrop-blur-md z-40 py-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <a href="#" className="font-cormorant text-2xl tracking-wide font-semibold text-[#2A2A2A]">
            Sirisha Mantrala
          </a>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex space-x-10 text-xs tracking-[0.2em] uppercase font-sans-clean text-[#666]">
              <a href="#gallery" className="hover:text-[#963F3F] transition-colors">Selected Works</a>
              <a href="#about" className="hover:text-[#963F3F] transition-colors">Artist</a>
              <a href="#contact" className="hover:text-[#963F3F] transition-colors">Inquiries</a>
            </div>
            {isAdmin && (
               <span className="text-[10px] uppercase tracking-widest text-[#963F3F] border border-[#963F3F] px-2 py-1 rounded-full">
                 Artist Mode
               </span>
            )}
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header className="min-h-[90vh] flex flex-col justify-center items-center text-center px-4 relative">
        <div className="max-w-2xl fade-in mt-12">
          <p className="font-sans-clean text-xs uppercase tracking-[0.3em] text-[#963F3F] mb-6">
            Contemporary Indian Art
          </p>
          <h1 className="font-cormorant text-6xl md:text-8xl lg:text-9xl mb-8 font-light text-[#1a1a1a] leading-tight">
            Stillness <br/> & Devotion
          </h1>
          <p className="text-lg md:text-xl font-cormorant text-[#555] italic leading-relaxed max-w-lg mx-auto">
            Exploring the sacred in the everyday object and the divine in the human face.
          </p>
          
          <div className="mt-16 animate-bounce opacity-40">
            <ChevronDown size={24} />
          </div>
        </div>
      </header>

      {/* --- Gallery Section --- */}
      <main id="gallery" className="max-w-[1600px] mx-auto px-6 py-24 min-h-[50vh]">
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-[#963F3F] opacity-50 w-8 h-8" />
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-12 space-y-12">
            {artworks.map((art, index) => (
              <div 
                key={art.id}
                className="break-inside-avoid group cursor-pointer relative fade-in mb-12"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => openLightbox(art)}
              >
                {/* Minimalist Image Container */}
                <div className="relative overflow-hidden bg-[#EBE8E4]">
                  <img 
                    src={art.url} 
                    alt={art.title} 
                    className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-in-out group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-700"></div>
                  
                  {/* Delete Button - ONLY VISIBLE TO ADMIN */}
                  {isAdmin && !String(art.id).startsWith('demo-') && (
                    <button 
                      onClick={(e) => handleDelete(e, art.id)}
                      className="absolute top-4 right-4 bg-white/80 p-2 text-red-500 hover:bg-white transition-colors rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                {/* Caption */}
                <div className="mt-4 flex flex-col items-start px-1">
                  <h3 className="font-cormorant text-2xl text-[#2A2A2A] italic group-hover:text-[#963F3F] transition-colors">
                    {art.title}
                  </h3>
                  <span className="font-sans-clean text-[10px] uppercase tracking-widest text-[#888] mt-1">
                    {art.medium}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- About Section --- */}
      <section id="about" className="py-32 px-6 bg-[#EBE8E4] mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
           <div className="w-full md:w-1/2 aspect-[3/4] bg-[#D1CEC7] relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1544867885-2333f61544ad?q=80&w=800&auto=format&fit=crop" 
                   alt="Studio Texture" className="w-full h-full object-cover grayscale opacity-80" />
           </div>
           
           <div className="w-full md:w-1/2 text-left">
              <span className="font-sans-clean text-xs uppercase tracking-[0.2em] text-[#963F3F] block mb-6">Biography</span>
              <h2 className="font-cormorant text-5xl mb-8 text-[#2A2A2A]">A dialogue with <br/> tradition.</h2>
              <div className="font-cormorant text-xl text-[#555] space-y-6 leading-relaxed">
                <p>
                  Sirisha Mantrala works at the intersection of observation and reverence. Her practice moves fluidly between the rigorous demands of classical portraiture and the symbolic depth of Indian iconography.
                </p>
                <p>
                  Whether capturing the sheen on a brass vessel or the gaze of a deity, her work seeks to evoke a sense of 'Darshan'—the act of seeing and being seen by the divine.
                </p>
              </div>
              <img src="https://images.unsplash.com/photo-1551029506-0807df4e2031?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80" alt="Signature" className="mt-12 opacity-40 w-32 mix-blend-multiply" />
           </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer id="contact" className="bg-[#1A1A1A] text-[#888] py-24 px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-cormorant text-3xl text-[#E5E5E5] mb-8">Acquisitions & Commissions</h2>
          <p className="font-sans-clean text-xs tracking-widest uppercase mb-12">Studio Mantrala, 2025</p>
          
          <a href="mailto:hello@sirishamantrala.art" className="inline-block border border-[#444] text-[#E5E5E5] px-12 py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#963F3F] hover:border-[#963F3F] transition-all duration-300">
            Contact the Studio
          </a>
        </div>
        
        {/* Admin Login Trigger (Subtle Lock Icon) */}
        <div className="absolute bottom-4 right-4">
           {isAdmin ? (
             <button onClick={handleLogout} className="text-[#333] hover:text-[#555] p-2" title="Logout">
               <LogOut size={16} />
             </button>
           ) : (
             <button onClick={() => setIsLoginOpen(true)} className="text-[#222] hover:text-[#333] p-2" title="Artist Login">
               <Lock size={14} />
             </button>
           )}
        </div>
      </footer>

      {/* --- Lightbox Modal --- */}
      {lightboxOpen && currentImage && (
        <div className="fixed inset-0 z-50 bg-[#F5F2EF]/98 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fade-in" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-8 right-8 text-[#2A2A2A] hover:text-[#963F3F] transition-colors z-50">
            <X size={32} strokeWidth={1} />
          </button>
          
          <div className="relative max-w-7xl max-h-screen flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={currentImage.url} 
              alt={currentImage.title} 
              className="max-h-[85vh] max-w-full object-contain shadow-2xl" 
            />
            <div className="mt-6 text-center">
              <h3 className="font-cormorant text-3xl text-[#2A2A2A]">{currentImage.title}</h3>
              <p className="font-sans-clean text-[10px] text-[#888] uppercase tracking-[0.2em] mt-2">{currentImage.medium}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Artwork Button (ADMIN ONLY) --- */}
      {isAdmin && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-8 right-8 z-40 bg-[#1A1A1A] text-white p-4 rounded-full shadow-2xl hover:bg-[#963F3F] transition-colors duration-300 animate-in fade-in zoom-in"
          title="Add Artwork"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      )}

      {/* --- Upload Modal (ADMIN ONLY) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2A2A]/40 backdrop-blur-sm p-4">
          <div className="bg-[#F5F2EF] p-10 max-w-lg w-full shadow-2xl relative animate-fade-in">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#888] hover:text-[#2A2A2A]">
              <X size={20} />
            </button>
            <h2 className="font-cormorant text-4xl text-[#2A2A2A] mb-8">New Piece</h2>
            <form onSubmit={handleAddArtwork} className="space-y-8">
              {/* Form Inputs (Same as before) */}
              <div className="group">
                <label className="block text-[10px] uppercase tracking-wider text-[#888] mb-2 font-sans-clean">Title</label>
                <input 
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D1CEC7] py-2 font-cormorant text-2xl text-[#2A2A2A] focus:outline-none focus:border-[#963F3F] transition-colors"
                  placeholder="Title of work" required
                />
              </div>
              <div className="group">
                <label className="block text-[10px] uppercase tracking-wider text-[#888] mb-2 font-sans-clean">Medium</label>
                <input 
                  type="text" value={newMedium} onChange={(e) => setNewMedium(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D1CEC7] py-2 font-cormorant text-2xl text-[#2A2A2A] focus:outline-none focus:border-[#963F3F] transition-colors"
                  placeholder="Material used"
                />
              </div>
              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setUploadMode('url')} className={`text-xs uppercase tracking-widest pb-1 border-b transition-all ${uploadMode === 'url' ? 'border-[#963F3F] text-[#2A2A2A]' : 'border-transparent text-[#888]'}`}>Link URL</button>
                <button type="button" onClick={() => setUploadMode('file')} className={`text-xs uppercase tracking-widest pb-1 border-b transition-all ${uploadMode === 'file' ? 'border-[#963F3F] text-[#2A2A2A]' : 'border-transparent text-[#888]'}`}>Upload File</button>
              </div>
              {uploadMode === 'url' ? (
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="w-full bg-transparent border-b border-[#D1CEC7] py-2 font-cormorant text-lg text-[#2A2A2A] focus:outline-none focus:border-[#963F3F]" placeholder="https://..." required={uploadMode === 'url'} />
              ) : (
                <div className="pt-2">
                   <label className="flex flex-col items-center justify-center w-full h-24 border border-[#D1CEC7] border-dashed cursor-pointer hover:bg-[#EBE8E4] transition-colors">
                      <UploadCloud className="w-6 h-6 text-[#888] mb-2" />
                      <p className="text-[10px] text-[#888] font-sans-clean uppercase tracking-widest">Select Image</p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileRead} />
                  </label>
                  {newUrl && <p className="text-[10px] text-[#963F3F] mt-2 text-center font-sans-clean uppercase tracking-widest">Image Ready</p>}
                </div>
              )}
              <button type="submit" disabled={uploadLoading} className="w-full bg-[#1A1A1A] text-white py-4 mt-6 uppercase tracking-[0.2em] text-[10px] hover:bg-[#963F3F] transition-colors disabled:opacity-50">
                {uploadLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Save to Collection'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Login Modal --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/80 backdrop-blur-md p-4">
          <div className="bg-[#F5F2EF] p-8 max-w-sm w-full shadow-2xl relative">
             <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-[#888] hover:text-[#2A2A2A]">
              <X size={20} />
            </button>
            <h2 className="font-cormorant text-3xl text-[#2A2A2A] mb-6 text-center">Studio Access</h2>
            <form onSubmit={handleLogin} className="space-y-4">
               <div>
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full bg-white border border-[#D1CEC7] p-3 font-sans-clean text-sm focus:outline-none focus:border-[#963F3F]"
                   placeholder="Email"
                   required
                 />
               </div>
               <div>
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-white border border-[#D1CEC7] p-3 font-sans-clean text-sm focus:outline-none focus:border-[#963F3F]"
                   placeholder="Password"
                   required
                 />
               </div>
               {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
               
               <button type="submit" className="w-full bg-[#1A1A1A] text-white py-3 uppercase tracking-[0.2em] text-[10px] hover:bg-[#963F3F] transition-colors">
                 {isSignUp ? 'Create Account' : 'Enter'}
               </button>
               
               <div className="text-center pt-2">
                 <button 
                   type="button" 
                   onClick={() => setIsSignUp(!isSignUp)}
                   className="text-[10px] uppercase tracking-widest text-[#888] hover:text-[#963F3F]"
                 >
                   {isSignUp ? 'Back to Login' : 'First time? Create Account'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}