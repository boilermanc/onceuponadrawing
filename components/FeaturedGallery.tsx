import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import TeaserModal from './TeaserModal';

interface FeaturedCreation {
  id: string;
  title: string;
  artist_name?: string;
  artist_age: number;
  featured_thumbnail_url: string;
  featured_page_url: string;
  featured_pages?: { url: string; text: string; }[];
  analysis_json?: { artistAge?: string };
  created_at: string;
}

interface FeaturedGalleryProps {
  onStartCreating?: () => void;
}

const FeaturedGallery: React.FC<FeaturedGalleryProps> = ({ onStartCreating }) => {
  const [featuredCreations, setFeaturedCreations] = useState<FeaturedCreation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCreation, setSelectedCreation] = useState<FeaturedCreation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchFeaturedCreations();
  }, []);

  const fetchFeaturedCreations = async () => {
    try {
      const { data, error } = await supabase
        .from('creations')
        .select('id, title, artist_name, artist_age, featured_thumbnail_url, featured_page_url, featured_pages, analysis_json, created_at')
        .eq('is_featured', true)
        .order('featured_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('[FeaturedGallery] Error fetching featured creations:', error);
        return;
      }

      if (data && data.length > 0) {
        setFeaturedCreations(data as FeaturedCreation[]);
      }
    } catch (err) {
      console.error('[FeaturedGallery] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreationClick = (creation: FeaturedCreation) => {
    setSelectedCreation(creation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCreation(null);
  };

  // Fallback placeholder data if no featured creations exist
  const placeholderGallery = [
    { img: "https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=800", label: "The Cosmic Voyager", category: "Animation" },
    { img: "https://images.unsplash.com/photo-1635324748177-3843e9900c14?auto=format&fit=crop&q=80&w=800", label: "Midnight Spirit", category: "Alchemy" },
    { img: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?auto=format&fit=crop&q=80&w=800", label: "Sweetwater Castle", category: "Vision" },
    { img: "https://images.unsplash.com/photo-1616628188502-413f2fe46e5e?auto=format&fit=crop&q=80&w=800", label: "Mechanized Saurian", category: "Render" },
    { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800", label: "Watercolor Abyss", category: "Vision" },
    { img: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&q=80&w=800", label: "The Glass Butterfly", category: "Alchemy" }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="relative rounded-[3rem] overflow-hidden shadow-2xl border-[1px] border-silver/30 bg-slate-100 animate-pulse">
            <div className="aspect-[4/5] bg-slate-200"></div>
          </div>
        ))}
      </div>
    );
  }

  // Show real featured creations if available, otherwise show placeholders
  const galleryItems = featuredCreations.length > 0 ? featuredCreations : null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {galleryItems ? (
          // Real featured creations
          galleryItems.map((creation) => (
            <div 
              key={creation.id} 
              onClick={() => handleCreationClick(creation)}
              className="relative group rounded-[3rem] overflow-hidden shadow-2xl border-[1px] border-silver/30 transition-all hover:-translate-y-4 duration-700 bg-white cursor-pointer"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img 
                  src={creation.featured_thumbnail_url} 
                  alt={creation.title} 
                  className="w-full h-full object-cover transition-all duration-[2000ms] group-hover:scale-110 grayscale group-hover:grayscale-0"
                  style={{ transition: 'transform 2000ms, filter 400ms' }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-10 flex flex-col justify-end pointer-events-none">
                <p className="text-soft-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2">
                  {creation.artist_name}, Age {creation.artist_age}
                </p>
                <p className="text-white text-3xl font-black uppercase tracking-tighter">{creation.title}</p>
              </div>
            </div>
          ))
        ) : (
          // Fallback placeholders
          placeholderGallery.map((item, i) => (
            <div key={i} className="relative group rounded-[3rem] overflow-hidden shadow-2xl border-[1px] border-silver/30 transition-all hover:-translate-y-4 duration-700 bg-white">
              <div className="aspect-[4/5] overflow-hidden">
                <img 
                  src={item.img} 
                  alt={item.label} 
                  className="w-full h-full object-cover transition-all duration-[2000ms] group-hover:scale-110 grayscale group-hover:grayscale-0"
                  style={{ transition: 'transform 2000ms, filter 400ms' }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-10 flex flex-col justify-end">
                <p className="text-soft-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2">{item.category}</p>
                <p className="text-white text-3xl font-black uppercase tracking-tighter">{item.label}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Teaser Modal */}
      {selectedCreation && isModalOpen && (
        <TeaserModal
          creation={{
            id: selectedCreation.id,
            title: selectedCreation.title,
            featured_thumbnail_url: selectedCreation.featured_thumbnail_url,
            featured_pages: selectedCreation.featured_pages || [],
            analysis_json: selectedCreation.analysis_json || { artistAge: String(selectedCreation.artist_age) },
          }}
          onClose={handleCloseModal}
          onStartCreating={onStartCreating}
        />
      )}
    </>
  );
};

export default FeaturedGallery;
