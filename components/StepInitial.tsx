
import React, { useState } from 'react';
import FeaturedGallery from './FeaturedGallery';

const faqData = [
  {
    question: "How does the transformation process work?",
    answer: "Simply upload a photo of any drawing, scribble, or painting. Our AI Vision engine analyzes the colors, strokes, and intent behind the artwork. Then our Alchemy process transforms it into 12 cinematic storybook spreads and a high-definition animation—all in just a few minutes."
  },
  {
    question: "What kind of drawings can I upload?",
    answer: "Anything! Crayon masterpieces, pencil sketches, finger paintings, watercolors—if a child (or adult!) drew it, we can transform it. The AI works with any style, from abstract scribbles to detailed scenes. Even that crinkled drawing from the attic works perfectly."
  },
  {
    question: "How long does it take to create a storybook?",
    answer: "The digital storybook and animation are generated in about 2-3 minutes. If you order a printed hardcover book, it's printed on museum-grade archival paper and typically ships within 5-7 business days."
  },
  {
    question: "Can I edit the story after it's generated?",
    answer: "Yes! After the initial generation, you can regenerate individual pages, adjust the narrative, and fine-tune the story until it's perfect. Your creation is saved to your account so you can return to edit it anytime."
  },
  {
    question: "What's included in the printed book?",
    answer: "Each hardcover book is museum-quality: 12 full-spread cinematic illustrations, printed on archival paper designed to last generations. The books feature premium binding, vibrant colors, and a dust jacket. It's designed to be a family heirloom."
  },
  {
    question: "Do my credits expire?",
    answer: "Credits are valid for one year from the date of purchase. Your free credits never expire as long as your account is active. Each creation uses one credit, which includes the digital storybook, animation, and the option to order a printed book."
  }
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle, index }) => {
  return (
    <div className={`border-b border-silver/20 last:border-b-0 ${index === 0 ? '' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full py-6 md:py-8 px-6 md:px-10 flex items-center justify-between gap-4 hover:bg-pacific-cyan/5 transition-all duration-300 group text-left"
      >
        <h4 className="text-lg md:text-xl font-black text-gunmetal group-hover:text-pacific-cyan transition-colors pr-4">
          {question}
        </h4>
        <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-pacific-cyan rotate-180' : 'bg-silver/20 group-hover:bg-pacific-cyan/20'}`}>
          <svg
            className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-300 ${isOpen ? 'text-white' : 'text-gunmetal/60 group-hover:text-pacific-cyan'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className={`grid transition-all duration-500 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-6 md:px-10 pb-8 pt-2">
            <p className="text-blue-slate text-base md:text-lg leading-relaxed font-medium">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StepInitialProps {
  onStart: () => void;
  onLogin?: () => void;
}

const StepInitial: React.FC<StepInitialProps> = ({ onStart, onLogin }) => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="flex flex-col items-center py-0 px-0 max-w-full mx-auto animate-in fade-in duration-1000 overflow-x-hidden bg-off-white">
      
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto text-center py-24 md:py-40 px-6 relative">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-pacific-cyan/10 blur-[120px] rounded-full -z-10"></div>
        <div className="absolute top-10 right-10 text-6xl opacity-20 animate-pulse">✨</div>
        <div className="absolute bottom-20 left-10 text-6xl opacity-20 animate-bounce duration-[5000ms]">🎨</div>

        <div className="inline-block px-6 py-2 bg-soft-gold/10 text-soft-gold rounded-full text-xs font-black uppercase tracking-[0.4em] mb-8 border border-soft-gold/20">
          Drawing to Cinema
        </div>

        <h2 className="text-6xl md:text-9xl font-black text-gunmetal mb-8 tracking-tighter leading-[0.9]">
          Give Their Scribbles <br/>
          <span className="text-pacific-cyan italic font-serif">A Story.</span>
        </h2>
        
        <p className="text-xl md:text-3xl text-blue-slate mb-16 max-w-3xl mx-auto font-medium leading-relaxed italic font-serif opacity-80">
          "That crinkled drawing in the attic isn't just paper—it's a portal to a world that only they can see. We're here to open it."
        </p>

        {/* Video Hero Showcase */}
        <div className="relative group max-w-5xl mx-auto mb-20 px-4">
          <div className="absolute -inset-4 bg-gradient-to-r from-pacific-cyan via-soft-gold to-pacific-cyan rounded-[4rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-gunmetal rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-3xl border-[12px] border-white ring-1 ring-silver/20">
            <div className="aspect-video w-full relative">
              <video 
                src="/4ee7ac08-941f-4360-a47a-301a6f15d1f3.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gunmetal/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between">
                <div className="text-left">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Studio Render Output</p>
                  <p className="text-white text-2xl font-black tracking-tight">Project: "The Space Dragon"</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-pacific-cyan animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-soft-gold animate-pulse delay-75"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={onStart}
            className="group relative px-20 py-10 bg-pacific-cyan text-white rounded-[4rem] font-black text-4xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-pacific-cyan/40 border-b-[16px] border-blue-slate overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-6">
              ENTER THE STUDIO
              <span className="text-5xl group-hover:rotate-12 transition-transform">✨</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none"></div>
          </button>
          <p className="text-[12px] text-silver font-black uppercase tracking-[0.6em] mt-4">Every Scribble has a Story</p>
        </div>
      </section>

      {/* Thin Horizontal White Line Divider */}
      <div className="w-full h-px bg-white/20 z-30"></div>

      {/* Process Section with Restored Gunmetal Background */}
      <section className="w-full bg-gunmetal relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-48 relative z-20">
          <div className="text-center mb-40">
            <h3 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-6 italic font-serif">The Path to Alchemy</h3>
            <div className="h-1.5 w-32 bg-pacific-cyan mx-auto mb-8 rounded-full"></div>
            <p className="text-silver text-2xl font-medium max-w-2xl mx-auto opacity-80">Three definitive steps from a child's humble scribble to a cinematic archival masterpiece.</p>
          </div>

          <div className="space-y-64">
            {/* 01: Vision Input */}
            <div className="flex flex-col lg:flex-row items-center gap-20 lg:gap-40">
              <div className="w-full lg:w-1/2 space-y-10">
                <div className="relative">
                  <span className="text-[15rem] font-black text-white/5 italic leading-none absolute -top-24 -left-12 select-none">01</span>
                  <div className="relative z-10 space-y-2">
                    <p className="text-xs font-black text-pacific-cyan uppercase tracking-[0.5em]">The Beginning</p>
                    <h4 className="text-5xl font-black text-white uppercase tracking-tighter">Vision Input</h4>
                  </div>
                </div>
                <p className="text-2xl text-silver/80 leading-relaxed font-medium">
                  Snap a photo of any drawing, scribble, or painting. Our AI "Vision" engine doesn't just see pixels—it looks through the years to find the <span className="text-white font-black border-b-8 border-soft-gold/30">original character's heart</span>. We extract colors, intent, and personality from every stroke.
                </p>
                <div className="flex gap-6">
                  <div className="flex items-center gap-4 text-white/40">
                    <span className="text-4xl">📸</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">High-Res Capture</span>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="flex items-center gap-4 text-white/40">
                    <span className="text-4xl">🔬</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Stroke Analysis</span>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-1/2 relative group">
                <div className="absolute -inset-10 bg-pacific-cyan/20 blur-[100px] rounded-full group-hover:bg-pacific-cyan/30 transition-all opacity-50"></div>
                <div className="relative bg-white/5 p-6 rounded-[5rem] shadow-4xl backdrop-blur-sm border border-white/10 overflow-hidden aspect-[4/3] flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200" 
                    className="w-full h-full object-cover rounded-[4rem] grayscale group-hover:grayscale-0 transition-all duration-1000" 
                    alt="Vision Input Example" 
                  />
                </div>
              </div>
            </div>

            {/* 02: Alchemy */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-20 lg:gap-40">
              <div className="w-full lg:w-1/2 space-y-10">
                <div className="relative">
                  <span className="text-[15rem] font-black text-white/5 italic leading-none absolute -top-24 -right-12 select-none">02</span>
                  <div className="relative z-10 space-y-2 text-right lg:text-left">
                    <p className="text-xs font-black text-soft-gold uppercase tracking-[0.5em]">The Transformation</p>
                    <h4 className="text-5xl font-black text-white uppercase tracking-tighter">The Alchemy</h4>
                  </div>
                </div>
                <p className="text-2xl text-silver/80 leading-relaxed font-medium">
                  This is where the sketch becomes cinema. We transform the flat drawing into a <span className="text-white font-black border-b-8 border-pacific-cyan/30">Pixar-style 3D world</span>. Our studio generates 12 cinematic spreads and a high-definition animation using state-of-the-art Veo technology.
                </p>
              </div>
              <div className="w-full lg:w-1/2 relative group">
                <div className="absolute -inset-10 bg-soft-gold/20 blur-[100px] rounded-full group-hover:bg-soft-gold/30 transition-all opacity-50"></div>
                <div className="relative bg-white/5 p-6 rounded-[5rem] shadow-4xl backdrop-blur-sm border border-white/10 overflow-hidden aspect-[4/3]">
                  <video
                    src="https://cdhymstkzhlxcucbzipr.supabase.co/storage/v1/object/public/public-videos/1769035958537-jec6ru-story.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-[4rem]"
                  />
                </div>
              </div>
            </div>

            {/* 03: Archival */}
            <div className="flex flex-col lg:flex-row items-center gap-20 lg:gap-40">
              <div className="w-full lg:w-1/2 space-y-10">
                <div className="relative">
                  <span className="text-[15rem] font-black text-white/5 italic leading-none absolute -top-24 -left-12 select-none">03</span>
                  <div className="relative z-10 space-y-2">
                    <p className="text-xs font-black text-silver uppercase tracking-[0.5em]">The Legacy</p>
                    <h4 className="text-5xl font-black text-white uppercase tracking-tighter">Archival</h4>
                  </div>
                </div>
                <p className="text-2xl text-silver/80 leading-relaxed font-medium">
                  The memory is now permanent. Access an <span className="text-white font-black border-b-8 border-white/20">instant digital storybook</span> to share with family, or order a museum-grade hardcover. Every book is printed on archival paper, designed to sit on your coffee table for generations.
                </p>
              </div>
              <div className="w-full lg:w-1/2 relative group">
                <div className="absolute -inset-10 bg-white/10 blur-[100px] rounded-full group-hover:bg-white/20 transition-all opacity-50"></div>
                <div className="relative bg-white/5 p-6 rounded-[5rem] shadow-4xl backdrop-blur-sm border border-white/10 overflow-hidden aspect-[4/3]">
                  <img 
                    src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1200" 
                    className="w-full h-full object-cover rounded-[4rem]" 
                    alt="Archival Example" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Thin Horizontal White Line Divider */}
      <div className="w-full h-px bg-white/20 z-30"></div>

      {/* Gallery Section */}
      <section className="w-full py-48 bg-off-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-24">
              <div className="inline-block px-4 py-1.5 bg-pacific-cyan/10 text-pacific-cyan rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-6">Studio Specimens</div>
              <h3 className="text-5xl md:text-8xl font-black text-gunmetal tracking-tighter italic font-serif">The Gallery</h3>
              <p className="text-blue-slate font-medium text-2xl mt-6 max-w-3xl mx-auto opacity-70 italic">Witness the alchemy. From crayon scribbles to cinematic frames, these are the stories that were never meant to be forgotten.</p>
           </div>

           <FeaturedGallery onStartCreating={onStart} />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full py-32 bg-off-white relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-6xl font-black text-gunmetal tracking-tighter mb-4">
              Simple Pricing
            </h3>
            <p className="text-blue-slate text-xl font-medium opacity-70">
              Start free. Pay only when you need more.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white rounded-[3rem] border-2 border-silver/30 p-8 md:p-12 shadow-xl">
            {/* Free Tier Hero */}
            <div className="flex items-center justify-center gap-4 mb-10 pb-10 border-b border-silver/20">
              <span className="text-5xl">🎁</span>
              <div className="text-center sm:text-left">
                <p className="text-2xl md:text-3xl font-black text-gunmetal">3 Free Creations</p>
                <p className="text-blue-slate font-medium">No credit card required</p>
              </div>
            </div>

            {/* Paid Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="p-6 bg-white rounded-2xl border-2 border-silver/20 text-center hover:border-silver/40 transition-colors">
                <p className="text-xs font-black text-silver uppercase tracking-[0.3em] mb-2">Starter</p>
                <p className="text-4xl font-black text-gunmetal mb-1">$12.99</p>
                <p className="text-blue-slate font-semibold text-lg">3 creations</p>
                <p className="text-sm text-silver mt-2">$4.33 each</p>
              </div>

              {/* Popular */}
              <div className="p-6 bg-gradient-to-br from-pacific-cyan/10 to-white rounded-2xl border-2 border-pacific-cyan/40 text-center relative shadow-lg scale-[1.02]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-pacific-cyan text-white text-xs font-black rounded-full shadow-md">
                  Most Popular
                </span>
                <p className="text-xs font-black text-pacific-cyan uppercase tracking-[0.3em] mb-2 mt-2">Popular</p>
                <p className="text-4xl font-black text-gunmetal mb-1">$19.99</p>
                <p className="text-blue-slate font-semibold text-lg">5 creations</p>
                <p className="text-sm text-pacific-cyan font-semibold mt-2">$4.00 each — Save 8%</p>
              </div>

              {/* Best Value */}
              <div className="p-6 bg-gradient-to-br from-soft-gold/10 to-white rounded-2xl border-2 border-soft-gold/40 text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-soft-gold text-gunmetal text-xs font-black rounded-full shadow-md">
                  Best Value
                </span>
                <p className="text-xs font-black text-soft-gold uppercase tracking-[0.3em] mb-2 mt-2">Best Value</p>
                <p className="text-4xl font-black text-gunmetal mb-1">$34.99</p>
                <p className="text-blue-slate font-semibold text-lg">10 creations</p>
                <p className="text-sm text-soft-gold font-semibold mt-2">$3.50 each — Save 19%</p>
              </div>
            </div>

            <p className="text-center text-sm text-silver mt-8">
              Credits are valid for one year from purchase
            </p>

            {/* CTA Button */}
            <div className="flex flex-col items-center mt-10">
              <button
                onClick={onStart}
                className="w-full max-w-sm mx-auto px-8 py-4 bg-gradient-to-r from-pacific-cyan to-blue-500 text-white rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Get Started Free →
              </button>
              <p className="mt-4 text-sm text-blue-slate">
                Already have an account?{' '}
                <button
                  onClick={onLogin || onStart}
                  className="text-pacific-cyan font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-32 md:py-48 bg-gunmetal relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-pacific-cyan/10 rounded-full blur-[150px] animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-soft-gold/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <div className="inline-block px-4 py-1.5 bg-pacific-cyan/10 text-pacific-cyan rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-6">
              Got Questions?
            </div>
            <h3 className="text-4xl md:text-7xl font-black text-white tracking-tighter italic font-serif">
              Frequently Asked <span className="text-pacific-cyan">Questions</span>
            </h3>
            <p className="text-silver font-medium text-lg md:text-2xl mt-6 max-w-2xl mx-auto opacity-70">
              Everything you need to know about transforming drawings into stories.
            </p>
          </div>

          {/* FAQ Accordion Container */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-pacific-cyan/20 via-soft-gold/10 to-pacific-cyan/20 rounded-[4rem] blur-2xl opacity-40"></div>
            <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
              {faqData.map((faq, index) => (
                <FAQItem
                  key={index}
                  index={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onToggle={() => toggleFAQ(index)}
                />
              ))}
            </div>
          </div>

          {/* Additional help text */}
          <div className="text-center mt-12">
            <p className="text-silver/60 text-sm font-medium">
              Still have questions? We'd love to help — <a href="mailto:support@onceuponadrawing.com" className="text-pacific-cyan hover:underline transition-colors">support@onceuponadrawing.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* Thin Horizontal Divider before Final CTA */}
      <div className="w-full h-px bg-silver/20"></div>

      {/* Final CTA Section */}
      <section className="w-full py-48 text-center bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
           <h3 className="text-6xl md:text-9xl font-black text-gunmetal tracking-tighter mb-12 italic font-serif leading-none">Ready to start <br/> the <span className="text-pacific-cyan">alchemy?</span></h3>
           <button 
             onClick={onStart}
             className="px-24 py-12 bg-pacific-cyan text-white rounded-[5rem] font-black text-4xl hover:scale-105 active:scale-95 transition-all shadow-4xl shadow-pacific-cyan/40 border-b-[16px] border-blue-slate"
           >
              ENTER THE STUDIO ✨
           </button>
           <p className="text-[12px] text-silver font-black uppercase tracking-[0.6em] mt-12">No Credit Card Required • Free to Draft</p>
        </div>
      </section>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) }
          100% { transform: translateX(100%) }
        }
        .shadow-3xl {
          box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.4);
        }
        .shadow-4xl {
          box-shadow: 0 60px 120px -30px rgba(0, 0, 0, 0.3);
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 8s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default StepInitial;
